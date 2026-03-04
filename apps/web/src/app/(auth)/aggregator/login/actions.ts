"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

// ─── Types ──────────────────────────────────────────────────────────

interface AuthResult {
    success: boolean;
    error?: string;
    step?: string;
    lockoutMinutes?: number;
}

// ─── Constants ──────────────────────────────────────────────────────

// PIN padding: Supabase requires passwords >= 6 chars. We pad 4-digit PINs.
const PIN_SUFFIX = "##";

const MAX_PIN_ATTEMPTS = 5;
const PIN_LOCKOUT_DURATION_MINUTES = 30;

// ─── Aggregator Login ───────────────────────────────────────────────

/**
 * Verify Aggregator login with Email/UserID + 4-digit PIN.
 * Falls back to auth.users lookup if aggregators table has no row.
 */
export async function verifyAggregatorPin(
    emailOrUserId: string,
    pin: string
): Promise<AuthResult> {
    const supabase = createClient();
    const adminClient = createServiceRoleClient();

    // Look up the aggregator by email or user_id
    const { data: aggregator } = await adminClient
        .from("aggregators")
        .select("id, user_id, email")
        .or(`email.eq.${emailOrUserId.toLowerCase()},user_id.eq.${emailOrUserId.toUpperCase()}`)
        .single();

    // Determine the email to use for auth
    let loginEmail: string;
    let authUserId: string | null = null;

    if (aggregator) {
        loginEmail = aggregator.email;
        authUserId = aggregator.id;
    } else {
        // Fallback: try treating the input as an email and look up in auth.users
        const inputLower = emailOrUserId.toLowerCase();
        if (inputLower.includes("@")) {
            loginEmail = inputLower;
            // Look up user ID from auth.users for lockout tracking
            try {
                const { data: userList } = await adminClient.auth.admin.listUsers();
                const user = userList?.users?.find(
                    (u) => u.email?.toLowerCase() === inputLower
                );
                if (user) {
                    authUserId = user.id;
                } else {
                    return { success: false, error: "Account not found.", step: "login" };
                }
            } catch {
                // If list fails, still try to login directly
                loginEmail = inputLower;
            }
        } else {
            return { success: false, error: "Account not found.", step: "login" };
        }
    }

    // Check lockout (5-attempt limit) — only if we have a user ID
    let attempts: { failed_attempts: number; lockout_until: string | null } | null = null;
    if (authUserId) {
        const { data } = await adminClient
            .from("aggregator_pin_attempts")
            .select("failed_attempts, lockout_until")
            .eq("user_id", authUserId)
            .single();
        attempts = data;
    }

    if (attempts?.lockout_until) {
        const lockoutEnd = new Date(attempts.lockout_until);
        if (lockoutEnd > new Date()) {
            const remaining = Math.ceil((lockoutEnd.getTime() - Date.now()) / 60000);
            return {
                success: false,
                error: `Account locked. Try again in ${remaining} minutes.`,
                step: "lockout",
                lockoutMinutes: remaining,
            };
        } else if (authUserId) {
            // Lockout expired — reset
            await adminClient
                .from("aggregator_pin_attempts")
                .delete()
                .eq("user_id", authUserId);
        }
    }

    // Verify PIN using Supabase auth (PIN stored as password)
    const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: pin + PIN_SUFFIX,
    });

    if (error) {
        // Record failed PIN attempt
        const currentAttempts = (attempts?.failed_attempts || 0) + 1;

        if (authUserId && attempts) {
            if (currentAttempts >= MAX_PIN_ATTEMPTS) {
                const lockoutUntil = new Date(
                    Date.now() + PIN_LOCKOUT_DURATION_MINUTES * 60 * 1000
                ).toISOString();

                await adminClient
                    .from("aggregator_pin_attempts")
                    .update({
                        failed_attempts: currentAttempts,
                        lockout_until: lockoutUntil,
                        last_attempt_at: new Date().toISOString(),
                    })
                    .eq("user_id", authUserId);

                return {
                    success: false,
                    error: `Account locked for ${PIN_LOCKOUT_DURATION_MINUTES} minutes.`,
                    step: "lockout",
                    lockoutMinutes: PIN_LOCKOUT_DURATION_MINUTES,
                };
            }

            await adminClient
                .from("aggregator_pin_attempts")
                .update({
                    failed_attempts: currentAttempts,
                    last_attempt_at: new Date().toISOString(),
                })
                .eq("user_id", authUserId);
        } else if (authUserId) {
            await adminClient.from("aggregator_pin_attempts").insert({
                user_id: authUserId,
                failed_attempts: 1,
                last_attempt_at: new Date().toISOString(),
            });
        }

        const remaining = MAX_PIN_ATTEMPTS - currentAttempts;
        return {
            success: false,
            error: remaining > 0
                ? `Invalid PIN. ${remaining} attempt(s) remaining.`
                : `Account locked for ${PIN_LOCKOUT_DURATION_MINUTES} minutes.`,
            step: remaining > 0 ? "login" : "lockout",
        };
    }

    // PIN correct — clear attempts and auto-create aggregator row if missing
    if (authUserId) {
        await adminClient
            .from("aggregator_pin_attempts")
            .delete()
            .eq("user_id", authUserId);

        // If no aggregator row exists, create one now
        if (!aggregator) {
            const emailPrefix = loginEmail.split("@")[0].substring(0, 5).toUpperCase();
            const randomSuffix = String(Math.floor(100000 + Math.random() * 900000));
            const genUserId = `AGG-${emailPrefix}-${randomSuffix}`;
            await adminClient.from("aggregators").upsert({
                id: authUserId,
                user_id: genUserId,
                email: loginEmail,
                name: loginEmail.split("@")[0],
                status: "active",
            });
        }
    }

    return { success: true };
}

// ─── Aggregator Registration (OTP-Only, Admin-Created) ──────────────

/**
 * Step 1: Create user via Admin API (no confirmation email) → send OTP.
 */
export async function sendAggregatorOtp(email: string): Promise<AuthResult> {
    const admin = createServiceRoleClient();

    // 1. Create user (auto-confirmed, no email sent)
    const { error: createErr } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { role: "aggregator" },
    });

    if (createErr) {
        if (createErr.message.includes("already been registered") || createErr.message.includes("already exists")) {
            // Fall through to send OTP
        } else {
            return { success: false, error: createErr.message, step: "email" };
        }
    }

    // 2. Send OTP to the existing user
    const supabase = createClient();
    const { error: otpErr } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false },
    });

    if (otpErr) {
        return { success: false, error: otpErr.message, step: "email" };
    }

    return { success: true, step: "otp" };
}

/**
 * Step 2: Verify OTP for aggregator registration.
 */
export async function verifyAggregatorOtp(
    email: string,
    otp: string
): Promise<AuthResult> {
    const supabase = createClient();

    const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: "email",
    });

    if (error) {
        return { success: false, error: "Invalid or expired OTP.", step: "otp" };
    }

    return { success: true, step: "details" };
}

/**
 * Step 3: Complete aggregator registration with name and PIN.
 * Auto-generates User ID in format: AGG-EMAIL-######
 */
export async function completeAggregatorRegistration(
    email: string,
    name: string,
    pin: string
): Promise<AuthResult & { userId?: string }> {
    const adminClient = createServiceRoleClient();

    // Generate user ID: AGG-<first 5 chars of email>-<random 6 digits>
    const emailPrefix = email.split("@")[0].substring(0, 5).toUpperCase();
    const randomSuffix = String(Math.floor(100000 + Math.random() * 900000));
    const userId = `AGG-${emailPrefix}-${randomSuffix}`;

    // Look up the user by email via admin API (more reliable than cookie session)
    const { data: userList, error: listError } = await adminClient.auth.admin.listUsers();

    if (listError) {
        console.error("Admin listUsers error:", listError);
        return { success: false, error: `Admin API error: ${listError.message}`, step: "details" };
    }

    const user = userList.users.find(
        (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (!user) {
        return { success: false, error: "User not found. Please start over.", step: "email" };
    }

    // Set PIN as the password (use admin API to bypass min length restriction)
    const { error: updateError } = await adminClient.auth.admin.updateUserById(
        user.id,
        { password: pin + PIN_SUFFIX }
    );

    if (updateError) {
        console.error("PIN update error:", updateError);
        return { success: false, error: `Failed to set PIN: ${updateError.message}`, step: "details" };
    }

    // Update user profile
    const { error: profileError } = await adminClient
        .from("user_profiles")
        .upsert({
            id: user.id,
            role: "aggregator",
            display_name: name,
        });

    if (profileError) {
        console.error("Profile upsert error:", profileError);
    }

    // Insert/update aggregators table (upsert to handle retries)
    const { error: aggError } = await adminClient
        .from("aggregators")
        .upsert({
            id: user.id,
            user_id: userId,
            email: email.toLowerCase(),
            name,
            status: "active",
        });

    if (aggError) {
        console.error("Aggregator insert error:", aggError);
        return { success: false, error: `Registration failed: ${aggError.message}`, step: "details" };
    }

    return { success: true, userId };
}

// ─── Forgot PIN (Patch 3) ───────────────────────────────────────────

/**
 * P3: Reset aggregator PIN with global session invalidation.
 */
export async function resetAggregatorPin(
    email: string,
    otp: string,
    newPin: string
): Promise<AuthResult> {
    const supabase = createClient();
    const adminClient = createServiceRoleClient();

    // Verify OTP first
    const { data, error: otpError } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: "email",
    });

    if (otpError || !data.user) {
        return { success: false, error: "Invalid or expired OTP.", step: "otp" };
    }

    // P3: Global session invalidation — sign out ALL devices
    await adminClient.auth.admin.signOut(data.user.id, "global" as any);

    // Clear PIN lockout attempts (fresh slate)
    await adminClient
        .from("aggregator_pin_attempts")
        .delete()
        .eq("user_id", data.user.id);

    // Set new PIN
    const { error: updateError } = await adminClient.auth.admin.updateUserById(
        data.user.id,
        { password: newPin + PIN_SUFFIX }
    );

    if (updateError) {
        return { success: false, error: "Failed to reset PIN.", step: "pin" };
    }

    // Auto-login on current device
    await supabase.auth.signInWithPassword({
        email,
        password: newPin + PIN_SUFFIX,
    });

    return { success: true };
}
