import React from 'react';
import Link from 'next/link';
import { getUserList, type PortalFilter } from './actions';
import { formatISTTimestamp } from '@/lib/utils/ist-time';

// ─── Portal badge colors ─────────────────────────────────────────────
const PORTAL_BADGES: Record<string, { bg: string; text: string }> = {
    ADMIN: { bg: 'bg-gray-100', text: 'text-gray-700' },
    AGGREGATOR: { bg: 'bg-green-100', text: 'text-[#1B6B35]' },
    RECYCLER: { bg: 'bg-teal-100', text: 'text-[#0E5A6E]' },
    PIBO: { bg: 'bg-amber-100', text: 'text-[#B45309]' },
    PRO: { bg: 'bg-purple-100', text: 'text-[#7C3AED]' },
};

const PORTAL_TABS: Array<{ key: PortalFilter; label: string }> = [
    { key: 'all', label: 'All Users' },
    { key: 'aggregator', label: 'Aggregators' },
    { key: 'recycler', label: 'Recyclers' },
    { key: 'pibo', label: 'PIBOs' },
    { key: 'pro', label: 'PROs' },
    { key: 'pending', label: 'Pending Approval' },
];

function getFraudScoreColor(score: number): string {
    if (score >= 80) return 'text-[#B91C1C] bg-red-50';
    if (score >= 50) return 'text-[#B45309] bg-amber-50';
    if (score > 0) return 'text-[#92400E] bg-yellow-50';
    return 'text-[#1B6B35] bg-green-50';
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

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-[#1A2F4B]">User Management</h1>
                    <p className="text-xs text-gray-400 mt-0.5">{total} users total</p>
                </div>
            </div>

            {/* Search */}
            <form method="GET" className="flex gap-3">
                <input type="hidden" name="portal" value={portal} />
                <input
                    name="q"
                    defaultValue={q}
                    placeholder="Search by name, email, CPCB number..."
                    className="flex-1 px-4 py-2.5 border border-[#E5E5E5] rounded-lg text-sm focus:outline-none focus:border-[#1B6B35] focus:ring-1 focus:ring-[#1B6B35] bg-white"
                />
                <button
                    type="submit"
                    className="px-5 py-2.5 bg-[#1A2F4B] text-white text-sm font-medium rounded-lg hover:bg-[#1A2F4B]/90 transition-colors"
                >
                    Search
                </button>
            </form>

            {/* Portal Filter Tabs */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg overflow-x-auto">
                {PORTAL_TABS.map((tab) => {
                    const isActive = portal === tab.key;
                    return (
                        <Link
                            key={tab.key}
                            href={`/admin/users?portal=${tab.key}${q ? `&q=${q}` : ''}`}
                            className={`
                px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-colors
                ${isActive
                                    ? 'bg-white text-[#1A2F4B] shadow-sm'
                                    : 'text-gray-500 hover:text-[#1A2F4B]'
                                }
              `}
                        >
                            {tab.label}
                            {tab.key === 'pending' && pendingCount > 0 && (
                                <span className="ml-1.5 bg-[#B91C1C] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                    {pendingCount}
                                </span>
                            )}
                        </Link>
                    );
                })}
            </div>

            {/* Users Table */}
            <div className="bg-white border border-[#E5E5E5] rounded-lg overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="bg-[#1A2F4B] text-white text-xs uppercase tracking-wider">
                            <th className="px-4 py-3 text-left font-medium">User</th>
                            <th className="px-4 py-3 text-left font-medium">Portal</th>
                            <th className="px-4 py-3 text-left font-medium">Entity / Company</th>
                            <th className="px-4 py-3 text-left font-medium">Fraud Score</th>
                            <th className="px-4 py-3 text-left font-medium">Status</th>
                            <th className="px-4 py-3 text-left font-medium">Registered</th>
                            <th className="px-4 py-3 text-right font-medium"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-4 py-12 text-center text-gray-400 text-sm">
                                    {q ? `No users matching "${q}"` : 'No users found in this category'}
                                </td>
                            </tr>
                        ) : (
                            users.map((user, i) => {
                                const badge = PORTAL_BADGES[user.portalRole] || PORTAL_BADGES.ADMIN;
                                const initials = (user.fullName || 'U')
                                    .split(' ')
                                    .map((n: string) => n[0])
                                    .join('')
                                    .toUpperCase()
                                    .slice(0, 2);

                                return (
                                    <tr
                                        key={user.id}
                                        className={`${i % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA]'} hover:bg-[#F0FAF4] transition-colors`}
                                    >
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-[#1A2F4B] flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                                                    {initials}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-[#1A2F4B]">{user.fullName}</p>
                                                    <p className="text-[11px] text-gray-400">{user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${badge.bg} ${badge.text}`}>
                                                {user.portalRole}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {user.entityName ? (
                                                <span className="text-xs text-[#1A2F4B] font-medium">{user.entityName}</span>
                                            ) : (
                                                <span className="text-[10px] text-gray-300">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`text-xs font-bold px-2 py-1 rounded ${getFraudScoreColor(user.fraudScore)}`}>
                                                {user.fraudScore}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {user.approvalStatus === 'PENDING_ADMIN_REVIEW' ? (
                                                <span className="text-[10px] px-2 py-1 rounded-full font-bold bg-amber-100 text-[#B45309] uppercase">
                                                    Pending
                                                </span>
                                            ) : user.isApproved ? (
                                                <span className="text-[10px] px-2 py-1 rounded-full font-bold bg-green-100 text-[#1B6B35] uppercase">
                                                    Active
                                                </span>
                                            ) : (
                                                <span className="text-[10px] px-2 py-1 rounded-full font-bold bg-gray-100 text-gray-500 uppercase">
                                                    Inactive
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-400">
                                            {formatISTTimestamp(user.createdAt)}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <Link
                                                href={`/admin/users/${user.id}`}
                                                className="text-xs text-[#1B6B35] font-medium hover:underline"
                                            >
                                                View →
                                            </Link>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                    {page > 1 && (
                        <Link
                            href={`/admin/users?portal=${portal}&page=${page - 1}${q ? `&q=${q}` : ''}`}
                            className="px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50"
                        >
                            ← Prev
                        </Link>
                    )}
                    <span className="text-xs text-gray-500">
                        Page {page} of {totalPages}
                    </span>
                    {page < totalPages && (
                        <Link
                            href={`/admin/users?portal=${portal}&page=${page + 1}${q ? `&q=${q}` : ''}`}
                            className="px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50"
                        >
                            Next →
                        </Link>
                    )}
                </div>
            )}
        </div>
    );
}
