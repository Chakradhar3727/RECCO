import React from 'react';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import AdminShell from '@/components/admin/admin-shell';
import type { AdminRole, AdminSection } from '@/lib/admin/rbac';
import { canAccessSection, getSectionFromPath } from '@/lib/admin/rbac';



/**
 * Admin Layout — Server Component
 *
 * Module 2.2 Phase 2: Full production admin shell.
 * - Reads admin_role from user_profiles server-side
 * - Enforces RBAC via redirect (not just visual hiding)
 * - Computes session time remaining for client countdown
 * - Counts unread notifications for bell badge
 * - Passes all data to AdminShell client component
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // ─── 0. Skip auth for login page (avoid redirect loop) ─────────
  const earlyHeaders = headers();
  const earlyPath = earlyHeaders.get('x-pathname') || '';
  if (earlyPath === '/admin/login') {
    return <>{children}</>;
  }

  // ─── 1. Authenticate ────────────────────────────────────────────
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/admin/login');
  }

  // ─── 2. Read portal_role + admin_role from user_profiles ────────
  const adminClient = createServiceRoleClient();

  const { data: profile } = await adminClient
    .from('user_profiles')
    .select('full_name, portal_role, admin_role')
    .eq('id', user.id)
    .single();

  // ─── 2b. Restrict to ADMIN portal_role only ─────────────────────
  const portalRole = profile?.portal_role || '';
  if (portalRole !== 'ADMIN') {
    // Non-admin users cannot access the admin portal
    redirect('/?reason=admin_only');
  }

  const adminRole = (profile?.admin_role || 'ANALYST') as AdminRole;
  const adminName = profile?.full_name || user.email || 'Admin';
  const adminEmail = user.email || '';

  // ─── 3. RBAC Route Guard (server-side enforcement) ──────────────
  const headersList = headers();
  const pathname = headersList.get('x-pathname') || '';
  const section = getSectionFromPath(pathname);

  if (section && !canAccessSection(adminRole, section)) {
    redirect('/admin/dashboard?reason=insufficient_permissions');
  }

  // ─── 5. Unread notification count ───────────────────────────────
  let unreadCount = 0;
  try {
    const { count } = await adminClient
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('is_read', false)
      .or(`target_user_id.eq.${user.id},target_user_id.is.null`)
      .in('target_portal', ['ADMIN', 'ALL']);

    unreadCount = count || 0;
  } catch {
    // Silent fail — badge shows 0
  }

  // ─── 6. Render shell with server-computed props ─────────────────
  return (
    <AdminShell
      adminRole={adminRole}
      adminName={adminName}
      adminEmail={adminEmail}
      unreadNotificationCount={unreadCount}
    >
      {children}
    </AdminShell>
  );
}
