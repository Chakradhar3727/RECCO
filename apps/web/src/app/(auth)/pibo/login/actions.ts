"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

// ─── Types ──────────────────────────────────────────────────────────

interface AuthResult {
    success: boolean;
    error?: string;
    step?: string;
    userId?: string;
}

// ─── PIBO Login ─────────────────────────────────────────────────────

export async function piboLogin(email: string, password: string): Promise<AuthResult> {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { success: false, error: "Invalid email or password.", step: "credentials" };
    return { success: true };
}

export async function sendPiboOtp(email: string): Promise<AuthResult> {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
    if (error) return { success: false, error: "Failed to send OTP.", step: "otp" };
    return { success: true, step: "otp" };
}

export async function verifyPiboOtp(email: string, otp: string): Promise<AuthResult> {
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: "email" });
    if (error) return { success: false, error: "Invalid or expired OTP.", step: "otp" };
    return { success: true };
}

// ─── PIBO Registration (OTP-Only, Admin-Created) ────────────────────

/**
 * Step 1a: Create user via Admin API (no confirmation email) → send OTP.
 *
 * Flow:
 *  1. admin.createUser() with email_confirm: true → instantly verified, no email sent
 *  2. signInWithOtp() on the now-existing user → sends only the OTP/magic-link email
 *
 * This avoids the "Confirm your signup" email that supabase.co links trigger,
 * which fail due to ISP DNS hijacking.
 */
export async function piboRegisterSendOtp(email: string): Promise<AuthResult> {
    const admin = createServiceRoleClient();

    // 1. Create the user (auto-confirmed, password set later after OTP)
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        email_confirm: true, // auto-confirm → no confirmation email sent
        user_metadata: { role: "pibo" },
    });

    if (createErr) {
        // User already exists → still send OTP for login/re-registration
        if (createErr.message.includes("already been registered") || createErr.message.includes("already exists")) {
            // Fall through to send OTP
        } else {
            return { success: false, error: createErr.message, step: "credentials" };
        }
    }

    // 2. Send OTP to the existing (or just-created) user
    const supabase = createClient();
    const { error: otpErr } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false }, // user already exists
    });

    if (otpErr) {
        return { success: false, error: otpErr.message, step: "credentials" };
    }

    return { success: true, step: "otp" };
}

/**
 * Step 1b: Verify OTP and set password to complete account creation.
 */
export async function verifyPiboRegistrationOtp(
    email: string,
    otp: string,
    password: string
): Promise<AuthResult> {
    const supabase = createClient();

    // Verify the OTP — this creates a user session
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
        portal_role: "PIBO",
        full_name: email.split("@")[0],
    });

    return { success: true, step: "company", userId: data.user.id };
}

/**
 * Step 2: Set company name + PIBO type → generate User ID via Supabase RPC.
 * P4: Atomic User ID generation using PostgreSQL sequences.
 */
export async function piboRegisterStep2(
    userId: string,
    companyName: string,
    piboType: "producer" | "importer" | "brand_owner"
): Promise<AuthResult> {
    const adminClient = createServiceRoleClient();

    // P4: Generate PIBO User ID atomically via PostgreSQL function
    let generatedId: string;
    try {
        const { data, error } = await adminClient.rpc("generate_pibo_user_id", {
            pibo_type: piboType,
            pibo_year: new Date().getFullYear(),
        });

        if (error || !data) {
            // Fallback: generate client-side if function doesn't exist yet
            const prefix = piboType === "producer" ? "PROD" : piboType === "importer" ? "IMP" : "BO";
            const year = new Date().getFullYear().toString().slice(-2);
            const seq = String(Math.floor(1000 + Math.random() * 9000));
            generatedId = `PIBO-${prefix}-${year}-${seq}`;
        } else {
            generatedId = data;
        }
    } catch {
        const prefix = piboType === "producer" ? "PROD" : piboType === "importer" ? "IMP" : "BO";
        const year = new Date().getFullYear().toString().slice(-2);
        const seq = String(Math.floor(1000 + Math.random() * 9000));
        generatedId = `PIBO-${prefix}-${year}-${seq}`;
    }

    const { error } = await adminClient
        .from("pibo_entities")
        .upsert({
            user_id: userId,
            company_name: companyName,
            pibo_type: piboType,
            pibo_user_id: generatedId,
            registration_step: 2,
        }, { onConflict: "user_id" });

    if (error) {
        console.error("PIBO step2 upsert error:", error);
        return { success: false, error: `Failed to save company details: ${error.message}`, step: "company" };
    }

    return { success: true, step: "gst", userId: generatedId };
}

/**
 * Step 5: Submit PIBO registration.
 */
export async function piboRegisterSubmit(userId: string): Promise<AuthResult> {
    const adminClient = createServiceRoleClient();

    const { error } = await adminClient
        .from("pibo_entities")
        .update({
            approval_status: "PENDING_ADMIN_REVIEW",
            registration_step: 5,
            submitted_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

    if (error) return { success: false, error: "Failed to submit.", step: "review" };

    await adminClient.from("user_profiles").upsert({ id: userId, portal_role: "PIBO" });

    return { success: true };
}
