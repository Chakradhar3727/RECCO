import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Auth callback handler for Supabase email verification / OTP link.
 * Supabase sends users here after they click the verification link.
 * P12: This route is excluded from middleware matcher to prevent interception.
 * Uses the ISP-bypass Supabase client for reliable connectivity.
 */
export async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get("code");
    const next = requestUrl.searchParams.get("next") ?? "/";

    if (code) {
        const supabase = createClient();
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
            return NextResponse.redirect(new URL(next, requestUrl.origin));
        }
    }

    // If code exchange fails, redirect to an error page
    return NextResponse.redirect(
        new URL("/?error=otp_verification_failed", requestUrl.origin)
    );
}
