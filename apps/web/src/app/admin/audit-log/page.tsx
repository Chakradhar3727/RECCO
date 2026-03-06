import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { formatISTTimestamp, getRelativeTime } from '@/lib/utils/ist-time';

/**
 * Audit Log Page — Phase 2 Module 2.13
 *
 * Immutable admin activity log.
 * Full traceability: who did what, when, with before/after snapshots.
 */

interface AuditEntry {
    id: string;
    adminId: string | null;
    adminName: string;
    action: string;
    entityType: string | null;
    entityId: string | null;
    previousData: any;
    newData: any;
    ipAddress: string | null;
    createdAt: string;
}

async function getAuditLog(filter: string, page: number): Promise<{ entries: AuditEntry[]; totalCount: number }> {
    const admin = createServiceRoleClient();
    const pageSize = 50;
    const offset = (page - 1) * pageSize;

    let query = admin.from('admin_audit_log')
        .select('id, admin_id, action, entity_type, entity_id, previous_data, new_data, ip_address, created_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1);

    if (filter && filter !== 'ALL') {
        query = query.eq('action', filter);
    }

    const { data, count } = await query;
    if (!data || data.length === 0) return { entries: [], totalCount: 0 };

    // Fetch admin names
    const adminIds = Array.from(new Set((data as any[]).map((d: any) => d.admin_id).filter(Boolean)));
    const { data: profiles } = adminIds.length > 0
        ? await admin.from('user_profiles').select('id, full_name').in('id', adminIds)
        : { data: [] };

    const nameMap = new Map((profiles || []).map((p: any) => [p.id, p.full_name || 'Unknown']));

    return {
        entries: (data as any[]).map((d: any) => ({
            id: d.id,
            adminId: d.admin_id,
            adminName: nameMap.get(d.admin_id) || 'System',
            action: d.action || 'UNKNOWN',
            entityType: d.entity_type || null,
            entityId: d.entity_id || null,
            previousData: d.previous_data || null,
            newData: d.new_data || null,
            ipAddress: d.ip_address || null,
            createdAt: d.created_at,
        })),
        totalCount: count || 0,
    };
}

async function getActionTypes(): Promise<{ action: string; count: number }[]> {
    const admin = createServiceRoleClient();
    const { data } = await admin.from('admin_audit_log')
        .select('action')
        .limit(1000);

    if (!data) return [];

    const countMap = new Map<string, number>();
    (data as any[]).forEach((d: any) => {
        const a = d.action || 'UNKNOWN';
        countMap.set(a, (countMap.get(a) || 0) + 1);
    });

    return Array.from(countMap.entries())
        .map(([action, count]) => ({ action, count }))
        .sort((a, b) => b.count - a.count);
}

// ─── Components ──────────────────────────────────────────────────────

function ActionBadge({ action }: { action: string }) {
    const colorMap: Record<string, { bg: string; color: string }> = {
        UPDATE_USER: { bg: '#EFF6FF', color: '#2563EB' },
        APPROVE_USER: { bg: '#F0FAF4', color: '#1B6B35' },
        REJECT_USER: { bg: '#FEF2F2', color: '#DC2626' },
        RESOLVE_DISPUTE: { bg: '#F0FAF4', color: '#1B6B35' },
        ESCALATE_DISPUTE: { bg: '#FEF2F2', color: '#DC2626' },
        UPDATE_CONFIG: { bg: '#FFFBEB', color: '#B45309' },
        FLAG_FRAUD: { bg: '#FEF2F2', color: '#DC2626' },
        DISMISS_FRAUD: { bg: '#F0FAF4', color: '#1B6B35' },
    };
    const c = colorMap[action] || { bg: '#F5F5F5', color: '#666' };

    return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap" style={{ backgroundColor: c.bg, color: c.color }}>
            {action.replace(/_/g, ' ')}
        </span>
    );
}

function DataDiff({ previous, next }: { previous: any; next: any }) {
    if (!previous && !next) return <span className="text-[10px] text-gray-300">No data</span>;

    const prevStr = previous ? JSON.stringify(previous, null, 1) : '';
    const nextStr = next ? JSON.stringify(next, null, 1) : '';

    return (
        <div className="flex gap-2 text-[10px] font-mono">
            {prevStr && (
                <div className="bg-red-50 border border-red-100 rounded px-2 py-1 max-w-[200px] overflow-hidden">
                    <span className="text-red-400 block text-[9px] uppercase mb-0.5">Before</span>
                    <pre className="text-red-600 whitespace-pre-wrap text-[9px] line-clamp-3">{prevStr}</pre>
                </div>
            )}
            {nextStr && (
                <div className="bg-green-50 border border-green-100 rounded px-2 py-1 max-w-[200px] overflow-hidden">
                    <span className="text-green-400 block text-[9px] uppercase mb-0.5">After</span>
                    <pre className="text-green-600 whitespace-pre-wrap text-[9px] line-clamp-3">{nextStr}</pre>
                </div>
            )}
        </div>
    );
}

function AuditRow({ entry }: { entry: AuditEntry }) {
    return (
        <div className="flex items-start gap-3 py-3 px-4 border-b border-[#E5E5E5] hover:bg-gray-50 transition-colors">
            {/* Timestamp */}
            <div className="w-[110px] flex-shrink-0">
                <p className="text-[10px] text-gray-400">{formatISTTimestamp(entry.createdAt)}</p>
                <p className="text-[9px] text-gray-300">{getRelativeTime(entry.createdAt)}</p>
            </div>

            {/* Admin */}
            <div className="w-[90px] flex-shrink-0">
                <p className="text-[11px] font-medium text-[#1A2F4B] truncate">{entry.adminName}</p>
                {entry.ipAddress && (
                    <p className="text-[9px] font-mono text-gray-300">{entry.ipAddress}</p>
                )}
            </div>

            {/* Action */}
            <div className="w-[120px] flex-shrink-0">
                <ActionBadge action={entry.action} />
            </div>

            {/* Entity */}
            <div className="w-[120px] flex-shrink-0">
                {entry.entityType && (
                    <p className="text-[10px] text-gray-500">{entry.entityType}</p>
                )}
                {entry.entityId && (
                    <p className="text-[9px] font-mono text-gray-300">{entry.entityId.slice(0, 12)}...</p>
                )}
            </div>

            {/* Data Diff */}
            <div className="flex-1 min-w-0">
                <DataDiff previous={entry.previousData} next={entry.newData} />
            </div>
        </div>
    );
}

// ─── Page ────────────────────────────────────────────────────────────

export default async function AuditLogPage({
    searchParams,
}: {
    searchParams: { filter?: string; page?: string };
}) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/admin/login');

    const filter = searchParams.filter?.toUpperCase() || 'ALL';
    const page = parseInt(searchParams.page || '1', 10);

    const [{ entries, totalCount }, actionTypes] = await Promise.all([
        getAuditLog(filter, page),
        getActionTypes(),
    ]);

    const totalPages = Math.ceil(totalCount / 50);

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-[#1A2F4B]">Audit Log</h1>
                    <p className="text-xs text-gray-400 mt-0.5">
                        Immutable record of all admin actions. {totalCount} total entries.
                    </p>
                </div>
                <div className="flex items-center gap-2 bg-[#F0FAF4] border border-[#1B6B35]/20 rounded-lg px-3 py-1.5">
                    <span className="text-[10px] text-[#1B6B35] font-medium">🔒 Tamper-proof · Immutable</span>
                </div>
            </div>

            {/* Action Type Filter */}
            <div className="flex flex-wrap gap-1 bg-white rounded-lg border border-[#E5E5E5] p-1.5">
                <Link
                    href="/admin/audit-log"
                    className={`text-[10px] px-2.5 py-1 rounded-md transition-colors ${filter === 'ALL' ? 'bg-[#1A2F4B] text-white' : 'text-gray-500 hover:bg-gray-50'
                        }`}
                >
                    All ({totalCount})
                </Link>
                {actionTypes.slice(0, 8).map((at) => (
                    <Link
                        key={at.action}
                        href={`/admin/audit-log?filter=${at.action.toLowerCase()}`}
                        className={`text-[10px] px-2.5 py-1 rounded-md transition-colors ${filter === at.action ? 'bg-[#1A2F4B] text-white' : 'text-gray-500 hover:bg-gray-50'
                            }`}
                    >
                        {at.action.replace(/_/g, ' ')} ({at.count})
                    </Link>
                ))}
            </div>

            {/* Log Table */}
            <div className="bg-white rounded-lg border border-[#E5E5E5] overflow-hidden">
                {/* Headers */}
                <div className="flex items-center gap-3 py-2 px-4 bg-[#F5F5F5] border-b border-[#E5E5E5]">
                    <span className="w-[110px] text-[10px] text-gray-400 uppercase font-bold">Timestamp</span>
                    <span className="w-[90px] text-[10px] text-gray-400 uppercase font-bold">Admin</span>
                    <span className="w-[120px] text-[10px] text-gray-400 uppercase font-bold">Action</span>
                    <span className="w-[120px] text-[10px] text-gray-400 uppercase font-bold">Entity</span>
                    <span className="flex-1 text-[10px] text-gray-400 uppercase font-bold">Changes</span>
                </div>

                {entries.length === 0 ? (
                    <div className="py-12 text-center">
                        <p className="text-sm text-gray-400">No audit entries found</p>
                        <p className="text-xs text-gray-300 mt-1">
                            Admin actions will be recorded here automatically.
                        </p>
                    </div>
                ) : (
                    entries.map((entry) => <AuditRow key={entry.id} entry={entry} />)
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                    {page > 1 && (
                        <Link
                            href={`/admin/audit-log?page=${page - 1}${filter !== 'ALL' ? `&filter=${filter.toLowerCase()}` : ''}`}
                            className="text-xs px-3 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200"
                        >
                            ← Previous
                        </Link>
                    )}
                    <span className="text-xs text-gray-400">
                        Page {page} of {totalPages}
                    </span>
                    {page < totalPages && (
                        <Link
                            href={`/admin/audit-log?page=${page + 1}${filter !== 'ALL' ? `&filter=${filter.toLowerCase()}` : ''}`}
                            className="text-xs px-3 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200"
                        >
                            Next →
                        </Link>
                    )}
                </div>
            )}
        </div>
    );
}
