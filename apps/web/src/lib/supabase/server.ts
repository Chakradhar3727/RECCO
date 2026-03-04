import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import nodeFetch from "node-fetch";
import https from "https";

// ─── ISP BLOCK BYPASS (DNS HIJACKING FIX) ──────────────────────────
// In certain regions (e.g. Jio in India), the ISP intercepts DNS requests to 
// supabase.co and redirects them to a dead IP (139.5.241.93) which causes ETIMEDOUT.
// To bypass this without requiring a VPN or admin OS host file edits, we use a 
// custom HTTPS Agent to force the correct Cloudflare Edge IP for the Supabase project.

const SUPABASE_HOSTNAME = "aqvdhbyrqgnglfvhcurb.supabase.co";
const SUPABASE_REAL_IP = "104.21.36.196"; // Resolved via Cloudflare DoH manually

const bypassAgent = new https.Agent({
    lookup: (hostname, options, callback) => {
        if (hostname === SUPABASE_HOSTNAME) {
            // Force return the real IP, completely bypassing system/ISP DNS
            callback(null, [{ address: SUPABASE_REAL_IP, family: 4 }] as any);
        } else {
            // Fallback to default DNS for any other hosts
            require("dns").lookup(hostname, options, callback);
        }
    }
});

/**
 * Creates a Supabase client for use in Server Components, Server Actions,
 * and Route Handlers. Uses the anon key for user-scoped operations.
 */
export function createClient() {
    const cookieStore = cookies();

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value;
                },
                set(name: string, value: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value, ...options });
                    } catch (error) {
                        // Ignored in Server Components (read-only)
                    }
                },
                remove(name: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value: "", ...options });
                    } catch (error) {
                        // Ignored in Server Components (read-only)
                    }
                },
            },
            global: {
                // @ts-ignore
                fetch: (url, init) => {
                    return nodeFetch(url.toString(), {
                        ...init,
                        body: (init?.body ?? undefined) as any,
                        agent: bypassAgent, // Attach the ISP bypass agent
                        signal: AbortSignal.timeout(45000) as any,
                    } as any) as any;
                },
            },
        }
    );
}

/**
 * Creates a Supabase Admin client using the service-role key.
 * WARNING: This bypasses RLS. NEVER expose in client-side code.
 */
export function createServiceRoleClient() {
    return createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
            global: {
                // @ts-ignore
                fetch: (url, init) => {
                    return nodeFetch(url.toString(), {
                        ...init,
                        body: (init?.body ?? undefined) as any,
                        agent: bypassAgent, // Attach the ISP bypass agent
                        signal: AbortSignal.timeout(45000) as any,
                    } as any) as any;
                },
            },
        }
    );
}
