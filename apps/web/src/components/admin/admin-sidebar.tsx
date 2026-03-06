'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Users,
    ShieldAlert,
    IndianRupee,
    Scale,
    Link2,
    ClipboardCheck,
    BarChart3,
    Bell,
    Settings,
    FileText,
    Lock,
    LogOut,
    ShieldCheck,
    X,
} from 'lucide-react';
import type { AdminRole, AdminSection } from '@/lib/admin/rbac';
import { canAccessSection, ADMIN_NAV_ITEMS } from '@/lib/admin/rbac';

// ─── Icon mapping ────────────────────────────────────────────────────
const ICON_MAP: Record<string, React.ElementType> = {
    LayoutDashboard,
    Users,
    ShieldAlert,
    IndianRupee,
    Scale,
    Link2,
    ClipboardCheck,
    BarChart3,
    Bell,
    Settings,
    FileText,
};

interface AdminSidebarProps {
    adminRole: AdminRole;
    isOpen: boolean;
    onClose: () => void;
}

export default function AdminSidebar({ adminRole, isOpen, onClose }: AdminSidebarProps) {
    const pathname = usePathname();

    // Get current section from pathname
    const currentSection = (() => {
        const segments = pathname.split('/').filter(Boolean);
        return (segments[1] || 'dashboard') as AdminSection;
    })();

    return (
        <>
            {/* Mobile overlay backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={onClose}
                    aria-hidden="true"
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
          fixed top-0 left-0 h-full w-[240px] md:w-[240px] bg-[#1A2F4B] text-white z-50
          flex flex-col transition-transform duration-300 ease-in-out
          md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
            >
                {/* Logo Header */}
                <div className="p-5 flex items-center justify-between border-b border-white/10">
                    <div className="flex items-center gap-2">
                        <ShieldCheck size={24} className="text-[#1B6B35]" />
                        <span className="text-lg font-bold tracking-tight">RECCO Admin</span>
                    </div>
                    {/* Close button for mobile */}
                    <button
                        onClick={onClose}
                        className="md:hidden text-white/60 hover:text-white p-1 rounded transition-colors"
                        aria-label="Close navigation"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="px-3 pt-3 pb-1">
                    <span className="text-[10px] text-white/30 uppercase tracking-[0.15em] font-semibold px-3">
                        Platform Control
                    </span>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 py-2 flex flex-col gap-0.5 overflow-y-auto">
                    {ADMIN_NAV_ITEMS.map((item) => {
                        const Icon = ICON_MAP[item.icon] || FileText;
                        const hasAccess = canAccessSection(adminRole, item.section);
                        const isActive = currentSection === item.section;

                        if (hasAccess) {
                            return (
                                <Link
                                    key={item.section}
                                    href={item.href}
                                    onClick={onClose}
                                    className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                    transition-all duration-150
                    ${isActive
                                            ? 'bg-[#1B6B35]/20 text-[#1B6B35] border-l-[3px] border-[#1B6B35] pl-[9px]'
                                            : 'text-white/70 hover:bg-white/8 hover:text-white'
                                        }
                  `}
                                >
                                    <Icon size={18} className={isActive ? 'text-[#1B6B35]' : ''} />
                                    <span>{item.label}</span>
                                </Link>
                            );
                        }

                        // Greyed + locked items — visible but not clickable
                        return (
                            <div
                                key={item.section}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/25 cursor-not-allowed select-none"
                                title={`Your ${adminRole} role does not have access to ${item.label}`}
                            >
                                <Icon size={18} />
                                <span className="flex-1">{item.label}</span>
                                <Lock size={14} className="text-white/20" />
                            </div>
                        );
                    })}
                </nav>

                {/* Footer — Sign Out */}
                <div className="p-3 border-t border-white/10">
                    <form action="/api/auth/signout" method="POST">
                        <button
                            type="submit"
                            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-red-300 hover:bg-white/10 transition-colors"
                        >
                            <LogOut size={18} />
                            Sign Out
                        </button>
                    </form>
                </div>
            </aside>
        </>
    );
}
