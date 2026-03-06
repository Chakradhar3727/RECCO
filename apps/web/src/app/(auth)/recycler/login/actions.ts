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

// ─── Recycler Login ─────────────────────────────────────────────────

export async function recyclerLogin(
    email: string,
    password: string
): Promise<AuthResult> {
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        return { success: false, error: "Invalid email or password.", step: "credentials" };
    }

    return { success: true };
}

export async function sendRecyclerOtp(email: string): Promise<AuthResult> {
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false },
    });

    if (error) {
        return { success: false, error: "Failed to send OTP.", step: "otp" };
    }

    return { success: true, step: "otp" };
}

export async function verifyRecyclerOtp(email: string, otp: string): Promise<AuthResult> {
    const supabase = createClient();

    const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: "email",
    });

    if (error) {
        return { success: false, error: "Invalid or expired OTP.", step: "otp" };
    }

    return { success: true };
}

// ─── Recycler Registration (OTP-Only, Admin-Created) ────────────────

/**
 * Step 1a: Create user via Admin API (no confirmation email) → send OTP.
 */
export async function recyclerRegisterSendOtp(email: string): Promise<AuthResult> {
    const admin = createServiceRoleClient();

    // 1. Create user (auto-confirmed, no email sent)
    const { error: createErr } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { role: "recycler" },
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
export async function verifyRecyclerRegistrationOtp(
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
        portal_role: "RECYCLER",
        full_name: email.split("@")[0],
    });

    return { success: true, step: "regulatory", userId: data.user.id };
}

/**
 * Step 2: Save regulatory identity (CPCB/SPCB/EPR numbers).
 * P11: Client-side regex warnings — not blocking.
 */
export async function recyclerRegisterStep2(
    userId: string,
    data: {
        cpcb_number?: string;
        spcb_number?: string;
        epr_number?: string;
        cpcb_format_warning?: boolean;
    }
): Promise<AuthResult> {
    const adminClient = createServiceRoleClient();

    const { error } = await adminClient
        .from("recycler_facilities")
        .upsert({
            user_id: userId,
            cpcb_registration_number: data.cpcb_number,
            spcb_consent_number: data.spcb_number,
            epr_registration_number: data.epr_number,
            cpcb_format_warning: data.cpcb_format_warning || false,
            registration_step: 2,
        }, { onConflict: "user_id" });

    if (error) {
        console.error("Recycler step2 upsert error:", error);
        return { success: false, error: `Failed to save regulatory details: ${error.message}`, step: "regulatory" };
    }

    return { success: true, step: "facility" };
}

/**
 * Step 3: Save facility details (address, GPS, capacity).
 */
export async function recyclerRegisterStep3(
    userId: string,
    data: {
        facility_name: string;
        address: string;
        latitude: number;
        longitude: number;
        processing_capacity_kg: number;
    }
): Promise<AuthResult> {
    const adminClient = createServiceRoleClient();

    const { error } = await adminClient
        .from("recycler_facilities")
        .update({
            facility_name: data.facility_name,
            address: data.address,
            gps_latitude: data.latitude,
            gps_longitude: data.longitude,
            processing_capacity_kg: data.processing_capacity_kg,
            registration_step: 3,
        })
        .eq("user_id", userId);

    if (error) {
        return { success: false, error: "Failed to save facility details.", step: "facility" };
    }

    return { success: true, step: "documents" };
}

/**
 * Step 4: Upload regulatory documents to Supabase Storage.
 * Files stored in `documents/recycler/{userId}/` bucket path.
 * Metadata saved in `recycler_documents` table.
 */
export async function recyclerRegisterStep4(
    userId: string,
    formData: FormData
): Promise<AuthResult> {
    const adminClient = createServiceRoleClient();

    const files = formData.getAll("documents") as File[];

    if (!files || files.length === 0) {
        // Allow skipping if no files — mark step as complete
        await adminClient
            .from("recycler_facilities")
            .update({ registration_step: 4 })
            .eq("user_id", userId);
        return { success: true, step: "bank" };
    }

    const uploadErrors: string[] = [];

    for (const file of files) {
        const fileExt = file.name.split(".").pop() || "pdf";
        const filePath = `recycler/${userId}/${Date.now()}_${file.name}`;

        // Upload to Supabase Storage
        const { error: uploadError } = await adminClient.storage
            .from("documents")
            .upload(filePath, file, {
                contentType: file.type || "application/pdf",
                upsert: false,
            });

        if (uploadError) {
            uploadErrors.push(`${file.name}: ${uploadError.message}`);
            continue;
        }

        // Record document metadata
        await adminClient.from("recycler_documents").insert({
            facility_id: userId,
            document_type: fileExt.toUpperCase(),
            file_name: file.name,
            storage_path: filePath,
            uploaded_at: new Date().toISOString(),
        });
    }

    if (uploadErrors.length > 0 && uploadErrors.length === files.length) {
        return {
            success: false,
            error: `Upload failed: ${uploadErrors.join("; ")}`,
            step: "documents",
        };
    }

    // Update registration step
    await adminClient
        .from("recycler_facilities")
        .update({ registration_step: 4 })
        .eq("user_id", userId);

    return { success: true, step: "bank" };
}

/**
 * Step 5: Encrypt and save bank/UPI details.
 * P6: AES-256-GCM encryption via lib/encryption/bank.ts
 */
export async function recyclerRegisterStep5(
    userId: string,
    bankDetails: BankDetails
): Promise<AuthResult> {
    const adminClient = createServiceRoleClient();

    // Encrypt bank details before storing
    const encrypted = encryptBankDetails(bankDetails);

    const { error } = await adminClient
        .from("recycler_facilities")
        .update({
            bank_details_encrypted: encrypted,
            registration_step: 5,
        })
        .eq("user_id", userId);

    if (error) {
        return { success: false, error: "Failed to save bank details.", step: "bank" };
    }

    return { success: true, step: "review" };
}

/**
 * Step 6: Submit for admin review.
 */
export async function recyclerRegisterStep6(userId: string): Promise<AuthResult> {
    const adminClient = createServiceRoleClient();

    const { error } = await adminClient
        .from("recycler_facilities")
        .update({
            approval_status: "PENDING_ADMIN_REVIEW",
            registration_step: 6,
            submitted_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

    if (error) {
        return { success: false, error: "Failed to submit registration.", step: "review" };
    }

    // Update user profile with correct portal_role
    await adminClient
        .from("user_profiles")
        .upsert({
            id: userId,
            portal_role: "RECYCLER",
        });

    return { success: true };
}
