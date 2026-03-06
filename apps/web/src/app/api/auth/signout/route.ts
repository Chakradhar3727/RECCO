import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * POST /api/auth/signout
 *
 * Signs the user out of Supabase and redirects to the home page.
 * Uses the ISP-bypass-enabled server client.
 */
export async function POST(request: NextRequest) {
    const supabase = createClient();

    // Sign out from Supabase (clears server-side session)
    await supabase.auth.signOut();

    // Clear all Supabase auth cookies by setting them to expire immediately
    const response = NextResponse.redirect(new URL("/", request.url));

    // Clear common Supabase auth cookie names
    const cookieNames = [
        "sb-access-token",
        "sb-refresh-token",
        `sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.split("//")[1]?.split(".")[0]}-auth-token`,
    ];

    for (const name of cookieNames) {
        response.cookies.set(name, "", {
            maxAge: 0,
            path: "/",
        });
    }

    // Also delete any cookies that start with 'sb-'
    const requestCookies = request.cookies.getAll();
    for (const cookie of requestCookies) {
        if (cookie.name.startsWith("sb-")) {
            response.cookies.set(cookie.name, "", {
                maxAge: 0,
                path: "/",
            });
        }
    }

    return response;
}

/**
 * GET /api/auth/signout — also support GET for direct navigation
 */
export async function GET(request: NextRequest) {
    return POST(request);
}
