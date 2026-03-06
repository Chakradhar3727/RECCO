"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

// ─── Types ──────────────────────────────────────────────────────────

interface LoginResult {
    success: boolean;
    error?: string;
    step?: "email" | "password" | "otp" | "lockout";
    lockoutMinutes?: number;
}

// ─── Constants ──────────────────────────────────────────────────────

const MAX_FAILED_ATTEMPTS = 3;
const LOCKOUT_DURATION_MINUTES = 60;

// ─── Helpers ────────────────────────────────────────────────────────

/**
 * P10: ADMIN_ALLOWED_EMAILS — Fail-closed check.
 * If the env var is undefined or empty, ALL logins are rejected.
 */
function isEmailAllowed(email: string): { allowed: boolean; misconfigured: boolean } {
    const allowedEmails = process.env.ADMIN_ALLOWED_EMAILS;

    if (!allowedEmails || allowedEmails.trim() === "") {
        return { allowed: false, misconfigured: true };
    }

    const emailList = allowedEmails
        .split(",")
        .map((e) => e.trim().toLowerCase());

    return {
        allowed: emailList.includes(email.toLowerCase()),
        misconfigured: false,
    };
}

// ─── Server Actions ─────────────────────────────────────────────────

/**
 * Step 1: Validate admin email against the allow-list.
 */
export async function validateAdminEmail(email: string): Promise<LoginResult> {
    const { allowed, misconfigured } = isEmailAllowed(email);

    if (misconfigured) {
        return {
            success: false,
            error: "Admin login is misconfigured. Contact the system administrator.",
            step: "email",
        };
    }

    if (!allowed) {
        return {
            success: false,
            error: "This email is not authorized for admin access.",
            step: "email",
        };
    }

    // Check lockout status (P1)
    const adminClient = createServiceRoleClient();
    const { data: lockout } = await adminClient
        .from("admin_lockouts")
        .select("lockout_until, failed_attempts")
        .eq("admin_email", email.toLowerCase())
        .single();

    if (lockout?.lockout_until) {
        const lockoutEnd = new Date(lockout.lockout_until);
        if (lockoutEnd > new Date()) {
            const remainingMs = lockoutEnd.getTime() - Date.now();
            const remainingMinutes = Math.ceil(remainingMs / 60000);
            return {
                success: false,
                error: `Account locked. Try again in ${remainingMinutes} minutes.`,
                step: "lockout",
                lockoutMinutes: remainingMinutes,
            };
        } else {
            // Lockout expired — clear it
            await adminClient
                .from("admin_lockouts")
                .delete()
                .eq("admin_email", email.toLowerCase());
        }
    }

    return { success: true, step: "password" };
}

/**
 * Step 2: Verify admin password and send OTP.
 * If the admin email is in the allowlist but the auth user doesn't exist yet,
 * we auto-create the user with the provided password (first-time setup).
 */
export async function verifyAdminPassword(
    email: string,
    password: string
): Promise<LoginResult> {
    const supabase = createClient();
    const adminClient = createServiceRoleClient();

    // Auto-create admin user if they're in the allowlist but don't exist in auth
    const { data: userList } = await adminClient.auth.admin.listUsers();
    const existingUser = userList?.users?.find(
        (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (!existingUser) {
        // First-time admin setup: create the auth user with the provided password
        const { error: createError } = await adminClient.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { role: "admin" },
        });

        if (createError) {
            console.error("Admin user creation error:", createError);
            return {
                success: false,
                error: `Failed to create admin account: ${createError.message}`,
                step: "password",
            };
        }

        // Also create the user_profiles entry
        const { data: newUserList } = await adminClient.auth.admin.listUsers();
        const newUser = newUserList?.users?.find(
            (u) => u.email?.toLowerCase() === email.toLowerCase()
        );
        if (newUser) {
            await adminClient.from("user_profiles").upsert({
                id: newUser.id,
                email: email.toLowerCase(),
                portal_role: "ADMIN",
                full_name: email.split("@")[0],
                admin_role: "SUPERADMIN",
            });
        }
    }

    // Attempt sign-in with password
    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        // Record failed attempt (P1)
        const { data: existing } = await adminClient
            .from("admin_lockouts")
            .select("id, failed_attempts")
            .eq("admin_email", email.toLowerCase())
            .single();

        const currentAttempts = (existing?.failed_attempts || 0) + 1;

        if (existing) {
            if (currentAttempts >= MAX_FAILED_ATTEMPTS) {
                // Lock the account for 60 minutes
                const lockoutUntil = new Date(
                    Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000
                ).toISOString();

                await adminClient
                    .from("admin_lockouts")
                    .update({
                        failed_attempts: currentAttempts,
                        lockout_until: lockoutUntil,
                        last_attempt_at: new Date().toISOString(),
                    })
                    .eq("id", existing.id);

                // G16 / P1: INSERT CRITICAL notification for SUPERADMIN alert
                await adminClient.from("notifications").insert({
                    notification_type: "CRITICAL",
                    message: `Admin account ${email} locked after ${MAX_FAILED_ATTEMPTS} failed login attempts at ${new Date().toISOString()}.`,
                    target_portal: "ADMIN",
                    is_read: false,
                });

                return {
                    success: false,
                    error: `Account locked for ${LOCKOUT_DURATION_MINUTES} minutes after ${MAX_FAILED_ATTEMPTS} failed attempts.`,
                    step: "lockout",
                    lockoutMinutes: LOCKOUT_DURATION_MINUTES,
                };
            } else {
                await adminClient
                    .from("admin_lockouts")
                    .update({
                        failed_attempts: currentAttempts,
                        last_attempt_at: new Date().toISOString(),
                    })
                    .eq("id", existing.id);
            }
        } else {
            await adminClient.from("admin_lockouts").insert({
                admin_email: email.toLowerCase(),
                failed_attempts: 1,
                last_attempt_at: new Date().toISOString(),
            });
        }

        const remaining = MAX_FAILED_ATTEMPTS - currentAttempts;
        return {
            success: false,
            error:
                remaining > 0
                    ? `Invalid password. ${remaining} attempt(s) remaining.`
                    : `Account locked for ${LOCKOUT_DURATION_MINUTES} minutes.`,
            step: remaining > 0 ? "password" : "lockout",
            lockoutMinutes: remaining <= 0 ? LOCKOUT_DURATION_MINUTES : undefined,
        };
    }

    // Password correct — clear lockout record
    await adminClient
        .from("admin_lockouts")
        .delete()
        .eq("admin_email", email.toLowerCase());

    // Send OTP via email for 2FA
    const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
            shouldCreateUser: false,
        },
    });

    if (otpError) {
        return {
            success: false,
            error: "Failed to send OTP. Please try again.",
            step: "password",
        };
    }

    return { success: true, step: "otp" };
}
/**
 * Step 3b: Create admin session AFTER client-side OTP verification.
 * OTP verification now happens client-side so auth cookies are set
 * directly in the browser (fixing the redirect issue).
 */
export async function createAdminSession(
    userId: string
): Promise<LoginResult> {
    const adminClient = createServiceRoleClient();

    // ── Create admin session (1-active-session max) ─────────────────
    // First, deactivate any existing active sessions for this user
    await adminClient
        .from("admin_sessions")
        .update({ is_active: false })
        .eq("user_id", userId)
        .eq("is_active", true);

    // Create new active session
    await adminClient.from("admin_sessions").insert({
        user_id: userId,
        is_active: true,
        last_active_at: new Date().toISOString(),
    });

    return { success: true };
}
