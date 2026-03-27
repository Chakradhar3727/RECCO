import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Refreshes the Supabase session and returns the updated response.
 * Called from the root middleware.ts on every protected request.
 * P14: TODO comments mark lines that need update for Next.js 15.
 */
export async function updateSession(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                // TODO: Next.js 15 upgrade — change to async cookie handling
                get(name: string) {
                    return request.cookies.get(name)?.value;
                },
                set(name: string, value: string, options: CookieOptions) {
                    const isHttps = request.headers.get("x-forwarded-proto") === "https";
                    const secureOpt = options.secure ?? isHttps;
                    
                    // Update request cookies so later calls in this request see it
                    request.cookies.set({ name, value, ...options, secure: secureOpt });
                    // Only assign response once if it hasn't been instantiated correctly
                    // But in our setup, `response` is already created before the client
                    // so we just mutate response.cookies
                    response.cookies.set({ name, value, ...options, secure: secureOpt });
                },
                remove(name: string, options: CookieOptions) {
                    const isHttps = request.headers.get("x-forwarded-proto") === "https";
                    const secureOpt = options.secure ?? isHttps;
                    
                    request.cookies.set({ name, value: "", ...options, secure: secureOpt });
                    response.cookies.set({ name, value: "", ...options, secure: secureOpt });
                },
            },
        }
    );

    // Refreshes the session if expired — required for Server Components
    const {
        data: { user },
    } = await supabase.auth.getUser();

    return { response, user, supabase };
}
