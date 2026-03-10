'use client';

import React, { useState } from 'react';
import AdminSidebar from '@/components/admin/admin-sidebar';
import AdminTopBar from '@/components/admin/admin-top-bar';
import type { AdminRole } from '@/lib/admin/rbac';

interface AdminShellProps {
  adminRole: AdminRole;
  adminName: string;
  adminEmail: string;
  unreadNotificationCount: number;
  children: React.ReactNode;
}

/**
 * Client Component shell that composes sidebar + top bar + content area.
 * The parent Server Component (layout.tsx) passes admin data as props.
 */
export default function AdminShell({
  adminRole,
  adminName,
  adminEmail,
  unreadNotificationCount,
  children,
}: AdminShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white">
      {/* Sidebar — RBAC-aware navigation */}
      <AdminSidebar
        adminRole={adminRole}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Top Bar — Notification bell, role badge, profile dropdown */}
      <AdminTopBar
        adminName={adminName}
        adminEmail={adminEmail}
        adminRole={adminRole}
        unreadNotificationCount={unreadNotificationCount}
        onMenuToggle={() => setSidebarOpen((prev) => !prev)}
      />

      {/* Main Content Area */}
      <main className="md:ml-[240px] mt-16 p-6 min-h-[calc(100vh-64px)] stitch-admin">
        {children}
      </main>
    </div>
  );
}
