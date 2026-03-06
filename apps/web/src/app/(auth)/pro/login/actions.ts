"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { encryptBankDetails, type BankDetails } from "@/lib/encryption/bank";

// ─── Types ──────────────────────────────────────────────────────────

interface AuthResult {
    success: boolean;
    error?: string;
    step?: string;
    userId?: string;
}

// ─── PRO Login ──────────────────────────────────────────────────────

export async function proLogin(email: string, password: string): Promise<AuthResult> {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { success: false, error: "Invalid email or password.", step: "credentials" };
    return { success: true };
}

export async function sendProOtp(email: string): Promise<AuthResult> {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
    if (error) return { success: false, error: "Failed to send OTP.", step: "otp" };
    return { success: true, step: "otp" };
}

export async function verifyProOtp(email: string, otp: string): Promise<AuthResult> {
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: "email" });
    if (error) return { success: false, error: "Invalid or expired OTP.", step: "otp" };
    return { success: true };
}

// ─── PRO Registration (OTP-Only, Admin-Created) ─────────────────────

/**
 * Step 1a: Create user via Admin API (no confirmation email) → send OTP.
 */
export async function proRegisterSendOtp(email: string): Promise<AuthResult> {
    const admin = createServiceRoleClient();

    // 1. Create user (auto-confirmed, no email sent)
    const { error: createErr } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { role: "pro" },
    });

    if (createErr) {
        if (createErr.message.includes("already been registered") || createErr.message.includes("already exists")) {
            // Fall through to send OTP
        } else {
            return { success: false, error: createErr.message, step: "credentials" };
        }
    }

    // 2. Send OTP to the existing user
    const supabase = createClient();
    const { error: otpErr } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false },
    });

    if (otpErr) {
        return { success: false, error: otpErr.message, step: "credentials" };
    }

    return { success: true, step: "otp" };
}

/**
 * Step 1b: Verify OTP and set password to complete account creation.
 */
export async function verifyProRegistrationOtp(
    email: string,
    otp: string,
    password: string
): Promise<AuthResult> {
    const supabase = createClient();

    const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: "email",
    });

    if (error || !data.user) {
        return { success: false, error: "Invalid or expired OTP. Please try again.", step: "otp" };
    }

    // Set password for future login (use admin API for reliability)
    const admin = createServiceRoleClient();
    const { error: pwError } = await admin.auth.admin.updateUserById(
        data.user.id,
        { password }
    );
    if (pwError) {
        return { success: false, error: "Account created but failed to set password. Please try again.", step: "otp" };
    }

    // Create user_profiles entry immediately so user shows in admin
    await admin.from("user_profiles").upsert({
        id: data.user.id,
        email: email.toLowerCase(),
        portal_role: "PRO",
        full_name: email.split("@")[0],
    });

    return { success: true, step: "cpcb", userId: data.user.id };
}

/**
 * Step 2: Upload CPCB PRO cert → OCR extracts reg number → generate User ID.
 * P5: Uses CPCB last-6 characters, not org name.
 */
export async function proRegisterStep2(
    userId: string,
    cpcbRegNumber: string,
    stateCode: string,
    orgName: string
): Promise<AuthResult> {
    const adminClient = createServiceRoleClient();

    // P5: Generate PRO User ID via database function
    let generatedId: string;
    try {
        const { data, error } = await adminClient.rpc("generate_pro_user_id", {
            cpcb_reg: cpcbRegNumber,
            state_code: stateCode,
        });

        if (error || !data) {
            // Fallback: use CPCB last-6 chars
            const last6 = cpcbRegNumber.replace(/[^A-Za-z0-9]/g, "").slice(-6).toUpperCase();
            const seq = String(Math.floor(100 + Math.random() * 900));
            generatedId = `PRO-${last6}-${stateCode}-${seq}`;
        } else {
            generatedId = data;
        }
    } catch {
        const last6 = cpcbRegNumber.replace(/[^A-Za-z0-9]/g, "").slice(-6).toUpperCase();
        const seq = String(Math.floor(100 + Math.random() * 900));
        generatedId = `PRO-${last6}-${stateCode}-${seq}`;
    }

    const { error } = await adminClient
        .from("pro_organisations")
        .upsert({
            user_id: userId,
            organisation_name: orgName,
            cpcb_pro_reg_number: cpcbRegNumber,
            state_code: stateCode,
            pro_user_id: generatedId,
            registration_step: 2,
            consent_token_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        }, { onConflict: "user_id" });

    if (error) {
        return { success: false, error: "Failed to save registration details.", step: "cpcb" };
    }

    return { success: true, step: "documents", userId: generatedId };
}

/**
 * Step 4: Encrypt and save PRO bank details.
 * P6: Uses same lib/encryption/bank.ts as Recycler.
 */
export async function proRegisterStep4(
    userId: string,
    bankDetails: BankDetails,
    contactDetails: { phone: string; address: string }
): Promise<AuthResult> {
    const adminClient = createServiceRoleClient();

    const encrypted = encryptBankDetails(bankDetails);

    const { error } = await adminClient
        .from("pro_organisations")
        .update({
            bank_details_encrypted: encrypted,
            contact_phone: contactDetails.phone,
            contact_address: contactDetails.address,
            registration_step: 4,
        })
        .eq("user_id", userId);

    if (error) return { success: false, error: "Failed to save bank details.", step: "bank" };

    return { success: true, step: "review" };
}

/**
 * Step 5: Submit PRO registration for admin review.
 */
export async function proRegisterSubmit(userId: string): Promise<AuthResult> {
    const adminClient = createServiceRoleClient();

    const { error } = await adminClient
        .from("pro_organisations")
        .update({
            approval_status: "PENDING_ADMIN_REVIEW",
            registration_step: 5,
            submitted_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

    if (error) return { success: false, error: "Failed to submit.", step: "review" };

    await adminClient.from("user_profiles").upsert({ id: userId, portal_role: "PRO" });

    return { success: true };
}
