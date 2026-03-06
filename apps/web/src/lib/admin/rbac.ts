/**
 * RECCO Admin RBAC — Role-Based Access Control Matrix
 * Phase 2 Module 2.2 — Authoritative permission source
 *
 * 4 Admin Roles: SUPERADMIN | COMPLIANCE | SUPPORT | ANALYST
 * 10 Admin Sections + Activity Log = 11 navigation items
 */

export type AdminRole = 'SUPERADMIN' | 'COMPLIANCE' | 'SUPPORT' | 'ANALYST';

export type AdminSection =
  | 'dashboard'
  | 'users'
  | 'fraud'
  | 'transactions'
  | 'blockchain'
  | 'compliance'
  | 'analytics'
  | 'disputes'
  | 'notifications'
  | 'config'
  | 'audit-log';

export interface SectionPermission {
  /** Whether the role can access this section */
  canAccess: boolean;
  /** Whether the role can only view (no write actions) */
  viewOnly: boolean;
  /** Additional restriction flags */
  ownActionsOnly?: boolean;
}

/**
 * Complete RBAC permission matrix from Phase 2 Implementation Plan.
 * Every access control decision in Phase 2 references this matrix.
 */
const PERMISSION_MATRIX: Record<AdminRole, Record<AdminSection, SectionPermission>> = {
  SUPERADMIN: {
    dashboard:     { canAccess: true,  viewOnly: false },
    users:         { canAccess: true,  viewOnly: false },
    fraud:         { canAccess: true,  viewOnly: false },
    transactions:  { canAccess: true,  viewOnly: false },
    blockchain:    { canAccess: true,  viewOnly: false },
    compliance:    { canAccess: true,  viewOnly: false },
    analytics:     { canAccess: true,  viewOnly: false },
    disputes:      { canAccess: true,  viewOnly: false },
    notifications: { canAccess: true,  viewOnly: false },
    config:        { canAccess: true,  viewOnly: false },
    'audit-log':   { canAccess: true,  viewOnly: false },
  },
  COMPLIANCE: {
    dashboard:     { canAccess: true,  viewOnly: true  },
    users:         { canAccess: true,  viewOnly: true  },
    fraud:         { canAccess: false, viewOnly: false },
    transactions:  { canAccess: false, viewOnly: false },
    blockchain:    { canAccess: true,  viewOnly: true  },
    compliance:    { canAccess: true,  viewOnly: false },
    analytics:     { canAccess: true,  viewOnly: false },
    disputes:      { canAccess: false, viewOnly: false },
    notifications: { canAccess: false, viewOnly: false },
    config:        { canAccess: false, viewOnly: false },
    'audit-log':   { canAccess: false, viewOnly: false },
  },
  SUPPORT: {
    dashboard:     { canAccess: true,  viewOnly: true  },
    users:         { canAccess: true,  viewOnly: true  },
    fraud:         { canAccess: false, viewOnly: false },
    transactions:  { canAccess: true,  viewOnly: false },
    blockchain:    { canAccess: false, viewOnly: false },
    compliance:    { canAccess: false, viewOnly: false },
    analytics:     { canAccess: false, viewOnly: false },
    disputes:      { canAccess: true,  viewOnly: false },
    notifications: { canAccess: true,  viewOnly: true  },
    config:        { canAccess: false, viewOnly: false },
    'audit-log':   { canAccess: true,  viewOnly: false, ownActionsOnly: true },
  },
  ANALYST: {
    dashboard:     { canAccess: true,  viewOnly: true  },
    users:         { canAccess: false, viewOnly: false },
    fraud:         { canAccess: false, viewOnly: false },
    transactions:  { canAccess: false, viewOnly: false },
    blockchain:    { canAccess: true,  viewOnly: true  },
    compliance:    { canAccess: true,  viewOnly: true  },
    analytics:     { canAccess: true,  viewOnly: false },
    disputes:      { canAccess: false, viewOnly: false },
    notifications: { canAccess: false, viewOnly: false },
    config:        { canAccess: false, viewOnly: false },
    'audit-log':   { canAccess: true,  viewOnly: true  },
  },
};

/**
 * Get the permission for a specific role and section.
 */
export function getPermission(role: AdminRole, section: AdminSection): SectionPermission {
  return PERMISSION_MATRIX[role]?.[section] ?? { canAccess: false, viewOnly: false };
}

/**
 * Check if a role can access a given admin section.
 */
export function canAccessSection(role: AdminRole, section: AdminSection): boolean {
  return getPermission(role, section).canAccess;
}

/**
 * Check if a role has view-only access for a section.
 */
export function isViewOnly(role: AdminRole, section: AdminSection): boolean {
  return getPermission(role, section).viewOnly;
}

/**
 * Get the admin section from a URL pathname.
 * Returns null if the pathname doesn't match any known admin section.
 */
export function getSectionFromPath(pathname: string): AdminSection | null {
  const segments = pathname.split('/').filter(Boolean);
  // /admin/[section]/...
  if (segments[0] !== 'admin') return null;
  if (!segments[1]) return 'dashboard'; // /admin/ = dashboard
  const section = segments[1] as AdminSection;
  if (section in PERMISSION_MATRIX.SUPERADMIN) return section;
  return null;
}

/**
 * Get all sections accessible by a role.
 */
export function getAccessibleSections(role: AdminRole): AdminSection[] {
  const sections = Object.entries(PERMISSION_MATRIX[role] || {});
  return sections
    .filter(([, perm]) => perm.canAccess)
    .map(([section]) => section as AdminSection);
}

/** Navigation item definition for sidebar */
export interface NavItem {
  section: AdminSection;
  label: string;
  href: string;
  icon: string; // Lucide icon name
}

/** All 11 admin navigation items in display order */
export const ADMIN_NAV_ITEMS: NavItem[] = [
  { section: 'dashboard',     label: 'Dashboard',           href: '/admin/dashboard',      icon: 'LayoutDashboard' },
  { section: 'users',         label: 'User Management',     href: '/admin/users',           icon: 'Users' },
  { section: 'fraud',         label: 'Fraud Detection',     href: '/admin/fraud',           icon: 'ShieldAlert' },
  { section: 'transactions',  label: 'Transactions',        href: '/admin/transactions',    icon: 'IndianRupee' },
  { section: 'disputes',      label: 'Disputes',            href: '/admin/disputes',        icon: 'Scale' },
  { section: 'blockchain',    label: 'Blockchain',          href: '/admin/blockchain',      icon: 'Link2' },
  { section: 'compliance',    label: 'Compliance',          href: '/admin/compliance',      icon: 'ClipboardCheck' },
  { section: 'analytics',     label: 'Analytics',           href: '/admin/analytics',       icon: 'BarChart3' },
  { section: 'notifications', label: 'Notifications',       href: '/admin/notifications',   icon: 'Bell' },
  { section: 'config',        label: 'Configuration',       href: '/admin/config',          icon: 'Settings' },
  { section: 'audit-log',     label: 'Activity Log',        href: '/admin/audit-log',       icon: 'FileText' },
];

/** Role badge color mapping (for top bar role badge) */
export const ROLE_BADGE_COLORS: Record<AdminRole, { bg: string; text: string }> = {
  SUPERADMIN: { bg: 'bg-[#B91C1C]', text: 'text-white' },
  COMPLIANCE: { bg: 'bg-[#0E5A6E]', text: 'text-white' },
  SUPPORT:    { bg: 'bg-[#B45309]', text: 'text-white' },
  ANALYST:    { bg: 'bg-gray-600',  text: 'text-white' },
};
