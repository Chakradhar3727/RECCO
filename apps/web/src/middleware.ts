import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { createClient } from "@supabase/supabase-js";

// ─── Portal route prefixes that require authentication ──────────────
const PROTECTED_PREFIXES = ["/admin", "/aggregator", "/recycler", "/pibo", "/pro"];

// ─── Auth routes are public (login/register pages) ─────────────────
const AUTH_PREFIX = "/(auth)";
const AUTH_ROUTES = ["/login", "/register", "/forgot-pin"];

// ─── Public routes that bypass middleware entirely ──────────────────
const PUBLIC_ROUTES = ["/pickup", "/delivery", "/verify", "/api/auth"];

// ─── Admin session timeout: 15 minutes (900 seconds) ───────────────
const ADMIN_SESSION_TIMEOUT_MS = 15 * 60 * 1000;

/**
 * Checks if a path matches any of the given prefixes.
 */
function matchesPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => pathname.startsWith(prefix));
}

/**
 * Checks if the current path is an auth page (login/register).
 */
function isAuthPage(pathname: string): boolean {
  return AUTH_ROUTES.some((route) => pathname.includes(route));
}

/**
 * Determines the portal type from the URL path.
 */
function getPortalFromPath(pathname: string): string | null {
  for (const prefix of PROTECTED_PREFIXES) {
    if (pathname.startsWith(prefix)) {
      return prefix.replace("/", "");
    }
  }
  return null;
}

/**
 * Creates a Supabase admin client for server-side JWT revocation.
 * P2: Used ONLY in middleware for Admin session timeout enforcement.
 */
function createAdminSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── 1. Skip public routes entirely ──────────────────────────────
  if (matchesPrefix(pathname, PUBLIC_ROUTES)) {
    return NextResponse.next();
  }

  // ── 2. Refresh session via Supabase middleware helper ────────────
  //    Wrapped in try-catch: if Supabase is unreachable (DNS/network),
  //    treat user as unauthenticated so redirects still work.
  let response = NextResponse.next({ request: { headers: request.headers } });
  let user = null;

  try {
    const session = await updateSession(request);
    response = session.response;
    user = session.user;
  } catch (err) {
    console.error("Middleware: Supabase session check failed:", err);
    // Continue with user = null → will redirect to login
  }

  // ── 3. Auth pages — redirect logged-in users to their dashboard ─
  if (isAuthPage(pathname)) {
    if (user) {
      // If user is already logged in, redirect to portal root
      // Try to determine which portal from the URL
      const portal = getPortalFromPath(pathname);
      if (portal) {
        return NextResponse.redirect(new URL(`/${portal}`, request.url));
      }
    }
    return response;
  }

  // ── 4. Protected routes — redirect unauthenticated users ────────
  if (matchesPrefix(pathname, PROTECTED_PREFIXES)) {
    if (!user) {
      const portal = getPortalFromPath(pathname);
      const loginPath = portal
        ? `/${portal}/login`
        : "/";
      const redirectUrl = new URL(loginPath, request.url);
      redirectUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(redirectUrl);
    }

    // ── 5. Admin-specific: Session timeout enforcement ──────────
    if (pathname.startsWith("/admin")) {
      try {
        const adminClient = createAdminSupabaseClient();

        // Query admin_sessions for this user's active session
        const { data: session } = await adminClient
          .from("admin_sessions")
          .select("id, last_active_at")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (session) {
          const lastActive = new Date(session.last_active_at).getTime();
          const now = Date.now();

          // P2: JWT Revocation — if session expired, sign out server-side
          if (now - lastActive > ADMIN_SESSION_TIMEOUT_MS) {
            // Revoke the JWT server-side
            await adminClient.auth.admin.signOut(user.id);

            // Mark session as inactive
            await adminClient
              .from("admin_sessions")
              .update({ is_active: false })
              .eq("id", session.id);

            // Redirect to login with timeout reason
            const loginUrl = new URL("/admin/login", request.url);
            loginUrl.searchParams.set("reason", "timeout");
            return NextResponse.redirect(loginUrl);
          }

          // Update last_active_at for this request
          await adminClient
            .from("admin_sessions")
            .update({ last_active_at: new Date().toISOString() })
            .eq("id", session.id);
        }

        // ── 5b. Admin RBAC — restrict sub-routes by role ─────────
        try {
          const { data: profile } = await adminClient
            .from("user_profiles")
            .select("admin_role")
            .eq("id", user.id)
            .single();

          const role = profile?.admin_role || "UNKNOWN";

          // RBAC route map: which roles can access which sub-routes
          const RBAC_ROUTES: Record<string, string[]> = {
            "/admin/compliance": ["COMPLIANCE", "SUPERADMIN"],
            "/admin/fraud": ["ANALYST", "SUPERADMIN"],
            "/admin/analytics": ["ANALYST", "SUPERADMIN"],
            "/admin/config": ["SUPERADMIN"],
            "/admin/users": ["SUPPORT", "SUPERADMIN"],
            "/admin/support": ["SUPPORT", "SUPERADMIN"],
          };

          for (const [routePrefix, allowedRoles] of Object.entries(RBAC_ROUTES)) {
            if (pathname.startsWith(routePrefix) && !allowedRoles.includes(role)) {
              const forbiddenUrl = new URL("/admin", request.url);
              forbiddenUrl.searchParams.set("reason", "forbidden");
              return NextResponse.redirect(forbiddenUrl);
            }
          }
        } catch (rbacError) {
          // If user_profiles query fails, allow through (table may not exist yet)
          console.error("Admin RBAC check error:", rbacError);
        }
      } catch (error) {
        // If admin_sessions table doesn't exist yet, allow through
        console.error("Admin session check error:", error);
      }
    }
  }

  return response;
}

/**
 * P12: Middleware matcher — excludes static assets, PWA files, and auth callbacks.
 * CRITICAL: /api/auth/** must be excluded for OTP verification to work.
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     * - manifest.json (PWA manifest)
     * - offline.html (PWA offline page)
     * - icons/ (PWA icons)
     * - api/auth/ (Supabase auth callbacks)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json|offline\\.html|icons/|api/auth/).*)",
  ],
};
