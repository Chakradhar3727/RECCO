'use client';

import React, { useState, useRef, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { AdminRole } from '@/lib/admin/rbac';
import { ROLE_BADGE_COLORS } from '@/lib/admin/rbac';

// ─── Section name mapping ────────────────────────────────────────────
const SECTION_NAMES: Record<string, string> = {
    dashboard: 'Dashboard',
    users: 'User Management',
    fraud: 'Fraud Detection',
    transactions: 'Transactions',
    disputes: 'Disputes',
    blockchain: 'Blockchain',
    compliance: 'Compliance',
    analytics: 'Analytics',
    notifications: 'Notifications',
    config: 'Configuration',
    'audit-log': 'Activity Log',
};

function getSectionName(pathname: string): string {
    const segments = pathname.split('/').filter(Boolean);
    const section = segments[1] || 'dashboard';
    return SECTION_NAMES[section] || 'Admin';
}

// ─── Props ───────────────────────────────────────────────────────────
interface AdminTopBarProps {
    adminName: string;
    adminEmail: string;
    adminRole: AdminRole;
    unreadNotificationCount: number;
    onMenuToggle: () => void;
}

export default function AdminTopBar({
    adminName,
    adminEmail,
    adminRole,
    unreadNotificationCount,
    onMenuToggle,
}: AdminTopBarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [showProfile, setShowProfile] = useState(false);
    const profileRef = useRef<HTMLDivElement>(null);

    // Click outside to close
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
                setShowProfile(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const roleBadge = ROLE_BADGE_COLORS[adminRole];
    const initials = adminName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    return (
        <header className="fixed top-0 left-0 md:left-[240px] right-0 h-16 backdrop-blur-sm z-40 flex items-center justify-between px-4 md:px-6 border-b border-white/10" style={{ backgroundColor: 'var(--recco-navy-900)' }}>
            {/* Left: Hamburger (mobile) + Section Name */}
            <div className="flex items-center gap-3">
                <button
                    onClick={onMenuToggle}
                    className="md:hidden text-white p-2 hover:bg-white/10 rounded-lg transition-colors"
                    aria-label="Toggle navigation menu"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="3" y1="6" x2="21" y2="6" />
                        <line x1="3" y1="12" x2="21" y2="12" />
                        <line x1="3" y1="18" x2="21" y2="18" />
                    </svg>
                </button>
                <span className="text-white font-medium text-sm md:text-base">
                    {getSectionName(pathname)}
                </span>
            </div>

            {/* Right: Bell + Role + Avatar with dropdown */}
            <div className="flex items-center gap-3">

                {/* Notification Bell */}
                <button
                    onClick={() => router.push('/admin/notifications')}
                    className="relative text-white p-2 hover:bg-white/10 rounded-lg transition-colors"
                    aria-label={`${unreadNotificationCount} unread notifications`}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                    {unreadNotificationCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1" style={{ backgroundColor: 'var(--recco-red-700)' }}>
                            {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                        </span>
                    )}
                </button>

                {/* Role Badge */}
                <span className={`${roleBadge.bg} ${roleBadge.text} text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider hidden sm:inline`}>
                    {adminRole}
                </span>

                {/* Admin Avatar + Profile Dropdown */}
                <div className="relative" ref={profileRef}>
                    <button
                        onClick={() => setShowProfile(!showProfile)}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold cursor-pointer hover:ring-2 hover:ring-white/30 transition-all"
                        style={{ backgroundColor: 'var(--recco-green-700)' }}
                        aria-label="Profile menu"
                    >
                        {initials}
                    </button>

                    {/* Profile Dropdown */}
                    {showProfile && (
                        <div className="absolute right-0 top-12 w-72 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-50">
                            {/* Profile Header */}
                            <div className="p-4 text-white" style={{ backgroundColor: 'var(--recco-navy-900)' }}>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ backgroundColor: 'var(--recco-green-700)' }}>
                                        {initials}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold truncate">{adminName}</p>
                                        <p className="text-[11px] text-white/60 truncate">{adminEmail}</p>
                                    </div>
                                </div>
                                <div className="mt-2">
                                    <span className={`${roleBadge.bg} ${roleBadge.text} text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider`}>
                                        {adminRole}
                                    </span>
                                </div>
                            </div>

                            {/* Profile Details */}
                            <div className="p-3 space-y-2 border-b border-gray-100">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-gray-400 uppercase">Portal</span>
                                    <span className="text-xs font-medium stitch-text-navy">Admin</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-gray-400 uppercase">Email</span>
                                    <span className="text-xs text-gray-600 truncate max-w-[160px]">{adminEmail}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-gray-400 uppercase">Role</span>
                                    <span className="text-xs font-medium stitch-text-navy">{adminRole}</span>
                                </div>
                            </div>

                            {/* Sign Out */}
                            <div className="p-2">
                                <form action="/api/auth/signout" method="POST">
                                    <button
                                        type="submit"
                                        className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                            <polyline points="16 17 21 12 16 7" />
                                            <line x1="21" y1="12" x2="9" y2="12" />
                                        </svg>
                                        Sign Out
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
