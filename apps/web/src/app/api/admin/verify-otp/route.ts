import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import nodeFetch from "node-fetch";
import https from "https";

// ISP bypass agent (same as server.ts)
const SUPABASE_HOSTNAME = "aqvdhbyrqgnglfvhcurb.supabase.co";
const SUPABASE_REAL_IP = "104.21.36.196";

const bypassAgent = new https.Agent({
    lookup: (hostname, options, callback) => {
        if (hostname === SUPABASE_HOSTNAME) {
            callback(null, [{ address: SUPABASE_REAL_IP, family: 4 }] as any);
        } else {
            require("dns").lookup(hostname, options, callback);
        }
    },
});

/**
 * POST /api/admin/verify-otp
 *
 * Verifies the admin OTP SERVER-SIDE (bypassing ISP block) and sets
 * auth cookies on the response so the browser stores them.
 *
 * This solves:
 *  1) ISP blocking direct browser→Supabase requests ("Failed to fetch")
 *  2) Server action cookies not propagating to the browser
 */
export async function POST(request: NextRequest) {
    const { email, otp } = await request.json();

    if (!email || !otp) {
        return NextResponse.json(
            { error: "Email and OTP are required" },
            { status: 400 }
        );
    }

    // Build a response we can attach cookies to
    let response = NextResponse.json({ success: false });

    // Create Supabase client that reads/writes cookies on the request/response
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value;
                },
                set(name: string, value: string, options: CookieOptions) {
                    // Set cookie on both request (for subsequent reads) and response
                    request.cookies.set({ name, value, ...options });
                    response.cookies.set({ name, value, ...options });
                },
                remove(name: string, options: CookieOptions) {
                    request.cookies.set({ name, value: "", ...options });
                    response.cookies.set({ name, value: "", ...options });
                },
            },
            global: {
                // @ts-ignore - ISP bypass
                fetch: (url: any, init: any) => {
                    return nodeFetch(url.toString(), {
                        ...init,
                        body: (init?.body ?? undefined) as any,
                        agent: bypassAgent,
                        signal: AbortSignal.timeout(45000) as any,
                    } as any) as any;
                },
            },
        }
    );

    // Verify OTP
    const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: "email",
    });

    if (error || !data.user) {
        return NextResponse.json(
            { error: error?.message || "Invalid or expired OTP" },
            { status: 400 }
        );
    }

    // Create admin session record
    const adminClient = createServiceRoleClient();

    await adminClient
        .from("admin_sessions")
        .update({ is_active: false })
        .eq("user_id", data.user.id)
        .eq("is_active", true);

    await adminClient.from("admin_sessions").insert({
        user_id: data.user.id,
        is_active: true,
        last_active_at: new Date().toISOString(),
    });

    // Return success — we need to build a new response body but carry over cookies
    const successResponse = NextResponse.json(
        { success: true, userId: data.user.id },
        { status: 200 }
    );

    // Copy all Set-Cookie headers from the accumulator response
    response.headers.getSetCookie().forEach((cookie) => {
        successResponse.headers.append("Set-Cookie", cookie);
    });

    return successResponse;
}
