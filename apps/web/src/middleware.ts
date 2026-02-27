import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { CookieOptions } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
    let supabaseResponse = NextResponse.next({ request });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    );
                    supabaseResponse = NextResponse.next({ request });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options as Record<string, unknown>)
                    );
                },
            },
        }
    );

    // Refresh session
    const {
        data: { user },
    } = await supabase.auth.getUser();

    const pathname = request.nextUrl.pathname;

    // Protected portal routes → redirect to login if unauthenticated
    const portalRoutes = ["/admin", "/aggregator", "/recycler", "/pibo", "/pro"];
    const isPortalRoute = portalRoutes.some(
        (route) => pathname.startsWith(route) && !pathname.startsWith("/auth")
    );

    if (isPortalRoute && !user) {
        // Extract the portal name and redirect to its login
        const portal = portalRoutes.find((r) => pathname.startsWith(r));
        const portalName = portal?.replace("/", "") || "admin";
        const url = request.nextUrl.clone();
        url.pathname = `/auth/${portalName}/login`;
        url.searchParams.set("redirect", pathname);
        return NextResponse.redirect(url);
    }

    // Auth routes → redirect to portal if already authenticated
    if (pathname.startsWith("/auth/") && user) {
        // Fetch user role to redirect to correct portal
        const { data: profile } = await supabase
            .from("user_profiles")
            .select("role")
            .eq("id", user.id)
            .single();

        if (profile?.role) {
            const url = request.nextUrl.clone();
            url.pathname = `/${profile.role}`;
            return NextResponse.redirect(url);
        }
    }

    return supabaseResponse;
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|logo.png|manifest.json|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
