import React from 'react';
import Link from 'next/link';
import { getUserList, type PortalFilter } from './actions';
import { formatISTTimestamp } from '@/lib/utils/ist-time';
import { createServiceRoleClient } from '@/lib/supabase/server';

// ─── Portal badge config (Stitch bordered pills) ───────────────────
const PORTAL_BADGES: Record<string, { bg: string; text: string; border: string }> = {
    ADMIN: { bg: 'rgba(26,47,75,0.08)', text: 'var(--recco-navy-900)', border: 'rgba(26,47,75,0.2)' },
    AGGREGATOR: { bg: 'rgba(27,107,53,0.08)', text: 'var(--recco-green-700)', border: 'rgba(27,107,53,0.2)' },
    RECYCLER: { bg: 'rgba(14,90,110,0.08)', text: 'var(--recco-teal-700)', border: 'rgba(14,90,110,0.2)' },
    PIBO: { bg: 'rgba(180,83,9,0.08)', text: 'var(--recco-amber-700)', border: 'rgba(180,83,9,0.2)' },
    PRO: { bg: 'rgba(109,40,217,0.08)', text: 'var(--recco-purple-600)', border: 'rgba(109,40,217,0.2)' },
};

const PORTAL_TABS: Array<{ key: PortalFilter; label: string }> = [
    { key: 'all', label: 'All Portals' },
    { key: 'pending', label: 'Pending Approval' },
    { key: 'aggregator', label: 'Aggregators' },
    { key: 'recycler', label: 'Recyclers' },
    { key: 'pibo', label: 'PIBOs' },
    { key: 'pro', label: 'PROs' },
];

function getFraudScoreColor(score: number) {
    if (score >= 80) return { bar: 'var(--recco-critical-500)', text: 'text-red-600' };
    if (score >= 50) return { bar: 'var(--recco-warning-500)', text: 'text-amber-600' };
    if (score > 0) return { bar: 'var(--recco-warning-500)', text: 'text-slate-700' };
    return { bar: 'var(--recco-primary-dark)', text: 'text-slate-700' };
}

function getStatusConfig(approvalStatus: string | null, isApproved: boolean) {
    if (approvalStatus === 'PENDING_ADMIN_REVIEW')
        return { label: 'PENDING', dotColor: 'bg-amber-500', textColor: 'text-amber-600', pulse: true };
    if (isApproved)
        return { label: 'ACTIVE', dotColor: 'bg-green-500', textColor: 'text-green-600', pulse: false };
    return { label: 'INACTIVE', dotColor: 'bg-slate-400', textColor: 'text-slate-500', pulse: false };
}

interface PageProps {
    searchParams: { q?: string; portal?: string; page?: string };
}

export default async function UsersPage({ searchParams }: PageProps) {
    const q = searchParams.q || '';
    const portal = (searchParams.portal || 'all') as PortalFilter;
    const page = parseInt(searchParams.page || '1', 10);

    const { users, total, pendingCount } = await getUserList(q, portal, page);
    const totalPages = Math.ceil(total / 20);

    // Fetch Stats for Stat Strip
    const admin = createServiceRoleClient();
    const [aggCount, recCount, piboCount, proCount] = await Promise.all([
        admin.from('user_profiles').select('id', { count: 'exact', head: true }).eq('portal_role', 'AGGREGATOR'),
        admin.from('user_profiles').select('id', { count: 'exact', head: true }).eq('portal_role', 'RECYCLER'),
        admin.from('user_profiles').select('id', { count: 'exact', head: true }).eq('portal_role', 'PIBO'),
        admin.from('user_profiles').select('id', { count: 'exact', head: true }).eq('portal_role', 'PRO'),
    ]);

    return (
        <div className="stitch-page">
            {/* ── Header Row ─────────────────────────────────────── */}
            <div className="stitch-page-header">
                <div>
                    <h1 className="stitch-page-title">User Management & Approval Engine</h1>
                    <p className="stitch-page-subtitle">Centralized oversight for {total} registered entities</p>
                </div>
                <div>
                    <Link href="/admin/users/invite" className="stitch-btn stitch-btn-primary">
                        + Invite Entity
                    </Link>
                </div>
            </div>

            {/* ── Stat Strip (Interactive Analytical Representation) ─────────────────────────────────────── */}
            <div className="stitch-card p-6 mb-8 flex flex-col md:flex-row items-center gap-8">
                <div className="flex-shrink-0 text-center md:text-left">
                    <div className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-1">Total Network Size</div>
                    <div className="text-4xl font-bold font-mono stitch-text-navy">{total}</div>
                </div>

                <div className="flex-1 w-full pl-0 md:pl-8 md:border-l border-gray-100">
                    <div className="flex justify-between text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                        <span>Platform Distribution</span>
                    </div>
                    {/* Visual Segment Bar */}
                    <div className="w-full h-3 rounded-full overflow-hidden flex gap-0.5 bg-gray-100">
                        {total > 0 && (
                            <>
                                <div style={{ width: `${((aggCount.count || 0) / total) * 100}%`, backgroundColor: 'var(--recco-green-700)' }} title={`Aggregators: ${aggCount.count}`} />
                                <div style={{ width: `${((recCount.count || 0) / total) * 100}%`, backgroundColor: 'var(--recco-teal-700)' }} title={`Recyclers: ${recCount.count}`} />
                                <div style={{ width: `${((piboCount.count || 0) / total) * 100}%`, backgroundColor: 'var(--recco-amber-700)' }} title={`PIBOs: ${piboCount.count}`} />
                                <div style={{ width: `${((proCount.count || 0) / total) * 100}%`, backgroundColor: 'var(--recco-purple-600)' }} title={`PROs: ${proCount.count}`} />
                                <div style={{ width: `${((total - ((aggCount.count || 0) + (recCount.count || 0) + (piboCount.count || 0) + (proCount.count || 0))) / total) * 100}%`, backgroundColor: 'var(--recco-navy-900)' }} title="Others" />
                            </>
                        )}
                    </div>
                    {/* Legend */}
                    <div className="flex flex-wrap items-center gap-5 mt-4">
                        <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--recco-green-700)' }} /><span className="text-xs text-gray-600 font-semibold">Aggregators ({aggCount.count})</span></div>
                        <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--recco-teal-700)' }} /><span className="text-xs text-gray-600 font-semibold">Recyclers ({recCount.count})</span></div>
                        <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--recco-amber-700)' }} /><span className="text-xs text-gray-600 font-semibold">PIBOs ({piboCount.count})</span></div>
                        <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--recco-purple-600)' }} /><span className="text-xs text-gray-600 font-semibold">PROs ({proCount.count})</span></div>
                    </div>
                </div>
            </div>

            {/* ── Search + Tab Bar ────────────────────────────────── */}
            <div className="flex items-center gap-6 mb-6">
                {/* Search */}
                <div className="relative w-[320px] shrink-0">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <form method="GET">
                        <input type="hidden" name="portal" value={portal} />
                        <input
                            name="q"
                            defaultValue={q}
                            placeholder="Global Search (Name, Email)..."
                            className="stitch-input w-full h-10"
                            style={{ paddingLeft: '2.5rem' }}
                        />
                    </form>
                </div>

                {/* Quick Filters */}
                <nav className="flex items-center gap-2">
                    {PORTAL_TABS.map((tab) => {
                        const isActive = portal === tab.key;
                        return (
                            <Link
                                key={tab.key}
                                href={`/admin/users?portal=${tab.key}${q ? `&q=${q}` : ''}`}
                                className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${isActive
                                    ? 'bg-[#1B6B35] text-white shadow-sm'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                            >
                                {tab.label}
                                {tab.key === 'pending' && pendingCount > 0 && (
                                    <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${isActive ? 'bg-white text-green-800' : 'bg-amber-500 text-white'}`}>
                                        {pendingCount}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            {/* ── Users Table (Stitch dark-header design) ─────────── */}
            <div className="stitch-card p-0 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="stitch-table">
                        <thead>
                            <tr>
                                <th className="px-6 py-4 w-12 text-center">
                                    <input type="checkbox" className="rounded border-slate-400 accent-[#1B6B35] bg-slate-800" />
                                </th>
                                <th className="px-6 py-4">User Details</th>
                                <th className="px-6 py-4">Reg Type / Entity</th>
                                <th className="px-6 py-4">Approval Status</th>
                                <th className="px-6 py-4">Fraud Index</th>
                                <th className="px-6 py-4">Registered On</th>
                                <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100/50">
                            {users.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-16 text-center text-slate-400 text-sm font-medium">
                                        {q ? `No users matching "${q}"` : 'No users found in this category'}
                                    </td>
                                </tr>
                            ) : (
                                users.map((user) => {
                                    const badge = PORTAL_BADGES[user.portalRole] || PORTAL_BADGES.ADMIN;
                                    const fraud = getFraudScoreColor(user.fraudScore);
                                    const status = getStatusConfig(user.approvalStatus, user.isApproved);

                                    return (
                                        <tr key={user.id} className="cursor-pointer">
                                            <td className="px-6 py-4 text-center">
                                                <input type="checkbox" className="rounded border-slate-300 accent-[#1B6B35]" />
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-[#0F172A] text-sm tracking-wider">
                                                        {(user.fullName || 'U').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-[#0F172A]">{user.fullName}</p>
                                                        <p className="text-xs text-slate-500 font-medium">{user.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1 items-start">
                                                    <span
                                                        className="px-2 py-0.5 rounded-[4px] text-[10px] uppercase font-bold tracking-widest"
                                                        style={{
                                                            background: badge.bg,
                                                            color: badge.text,
                                                            border: `1px solid ${badge.border}`,
                                                        }}
                                                    >
                                                        {user.portalRole}
                                                    </span>
                                                    <span className="font-bold text-sm text-[#0F172A]">
                                                        {user.entityName || <span className="text-slate-300">—</span>}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${status.label === 'PENDING' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                                    status.label === 'ACTIVE' ? 'bg-green-50 text-green-700 border border-green-200' :
                                                        'bg-slate-50 text-slate-700 border border-slate-200'
                                                    }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${status.dotColor} ${status.pulse ? 'animate-pulse' : ''}`} />
                                                    {status.label}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <span className={`text-xs font-bold font-mono w-6 ${fraud.text}`}>
                                                        {user.fraudScore}
                                                    </span>
                                                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden w-[60px]">
                                                        <div
                                                            className="h-full rounded-full transition-all duration-500"
                                                            style={{
                                                                width: `${Math.min(user.fraudScore, 100)}%`,
                                                                background: fraud.bar,
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 text-sm font-medium font-mono">
                                                {formatISTTimestamp(user.createdAt)}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Link
                                                    href={`/admin/users/${user.id}`}
                                                    className="stitch-btn stitch-btn-outline !py-1.5 !px-3 !text-xs"
                                                >
                                                    Review
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* ── Pagination ──────────────────────────────────────── */}
                {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-500">
                            Showing page {page} of {totalPages}
                        </span>
                        <div className="flex gap-2">
                            {page > 1 && (
                                <Link
                                    href={`/admin/users?portal=${portal}&page=${page - 1}${q ? `&q=${q}` : ''}`}
                                    className="stitch-btn stitch-btn-outline !py-1 !px-3"
                                >
                                    Prev
                                </Link>
                            )}
                            {page < totalPages && (
                                <Link
                                    href={`/admin/users?portal=${portal}&page=${page + 1}${q ? `&q=${q}` : ''}`}
                                    className="stitch-btn stitch-btn-outline !py-1 !px-3"
                                >
                                    Next
                                </Link>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

