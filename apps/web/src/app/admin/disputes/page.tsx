import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getDisputeList, getDisputeStatusCounts, type DisputeStatus, type DisputeListItem } from './actions';
import { formatINR, formatISTTimestamp } from '@/lib/utils/ist-time';

/**
 * Disputes List Page — Phase 2 Module 2.7
 *
 * Top: Status filter tabs with counts
 * Main: Card list of all disputes, colour-coded by variance tier
 * Each card links to /admin/disputes/[id] evidence card
 */

function VarianceBadge({ tier, percent }: { tier: string; percent: number }) {
    const config = {
        AUTO_ACCEPT: { bg: 'var(--recco-green-100)', color: 'var(--recco-green-700)', label: '< 10%' },
        STRUCTURED_REVIEW: { bg: '#FFFBEB', color: 'var(--recco-amber-700)', label: '10–15%' },
        AUTO_REJECT: { bg: '#FEF2F2', color: 'var(--recco-red-700)', label: '> 15%' },
    }[tier] || { bg: '#F5F5F5', color: '#666', label: '?' };

    return (
        <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: config.bg, color: config.color }}
        >
            {percent.toFixed(1)}% ({config.label})
        </span>
    );
}

function SLABadge({ deadline, resolved }: { deadline: string | null; resolved: boolean }) {
    if (resolved) {
        return (
            <span className="stitch-badge stitch-badge-active">
                Resolved
            </span>
        );
    }
    if (!deadline) return null;

    const now = new Date();
    const sla = new Date(deadline);
    const diffMs = sla.getTime() - now.getTime();

    if (diffMs <= 0) {
        const overHrs = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60));
        return (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 animate-pulse">
                SLA BREACHED {overHrs}h
            </span>
        );
    }

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const isUrgent = hours < 6;
    return (
        <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isUrgent ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}
        >
            {hours}h left
        </span>
    );
}

function StatusDot({ status }: { status: string }) {
    const colors: Record<string, string> = {
        OPEN: 'var(--recco-amber-700)',
        IN_REVIEW: 'var(--recco-teal-700)',
        RESOLVED: 'var(--recco-green-700)',
        ESCALATED: 'var(--recco-red-700)',
    };
    return (
        <span
            className="inline-block w-2 h-2 rounded-full mr-1.5"
            style={{ backgroundColor: colors[status] || '#999' }}
        />
    );
}

function DisputeRow({ dispute }: { dispute: DisputeListItem }) {
    const tierBorder: Record<string, string> = {
        AUTO_ACCEPT: 'var(--recco-green-700)',
        STRUCTURED_REVIEW: 'var(--recco-amber-700)',
        AUTO_REJECT: 'var(--recco-red-700)',
    };

    return (
        <Link
            href={`/admin/disputes/${dispute.id}`}
            className="block group"
        >
            <div
                className="flex items-center gap-4 py-4 px-6 transition-all hover:bg-gray-50 border-b border-gray-100 last:border-0"
                style={{ borderLeft: `4px solid ${tierBorder[dispute.varianceTier] || '#999'}` }}
            >
                {/* Batch ID + Status */}
                <div className="w-[140px] flex-shrink-0">
                    <p className="text-sm font-mono font-bold stitch-text-navy group-hover:text-[var(--recco-green-700)] transition-colors">
                        BATCH-{dispute.batchId.slice(0, 8)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1 flex items-center font-medium">
                        <StatusDot status={dispute.status} />
                        {dispute.status.replace(/_/g, ' ')}
                    </p>
                </div>

                {/* Weights */}
                <div className="flex-1 grid grid-cols-3 gap-2">
                    <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">AGG Weight</p>
                        <p className="text-sm font-mono font-bold stitch-text-navy">
                            {dispute.aggWeight.toFixed(2)} kg
                        </p>
                    </div>
                    <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">REC Weight</p>
                        <p className="text-sm font-mono font-bold stitch-text-navy">
                            {dispute.recWeight.toFixed(2)} kg
                        </p>
                    </div>
                    <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Variance</p>
                        <VarianceBadge tier={dispute.varianceTier} percent={dispute.variancePercent} />
                    </div>
                </div>

                {/* SLA + Date */}
                <div className="w-[140px] flex-shrink-0 text-right">
                    <SLABadge deadline={dispute.slaDeadline} resolved={!!dispute.resolvedAt} />
                    <p className="text-xs text-gray-500 mt-1.5 font-medium">
                        {formatISTTimestamp(dispute.createdAt)}
                    </p>
                </div>

                {/* Arrow */}
                <div className="text-gray-300 text-lg group-hover:text-[var(--recco-green-700)] transition-colors group-hover:translate-x-1">→</div>
            </div>
        </Link>
    );
}

export default async function DisputesPage({
    searchParams,
}: {
    searchParams: { status?: string };
}) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/admin/login');

    const filter = (searchParams.status?.toUpperCase() || 'ALL') as DisputeStatus;

    const [disputes, counts] = await Promise.all([
        getDisputeList(filter),
        getDisputeStatusCounts(),
    ]);

    const tabs = [
        { key: 'ALL', label: 'All', count: counts.all, color: 'var(--recco-navy-900)' },
        { key: 'OPEN', label: 'Open', count: counts.open, color: 'var(--recco-amber-700)' },
        { key: 'IN_REVIEW', label: 'In Review', count: counts.inReview, color: 'var(--recco-teal-700)' },
        { key: 'RESOLVED', label: 'Resolved', count: counts.resolved, color: 'var(--recco-green-700)' },
        { key: 'ESCALATED', label: 'Escalated', count: counts.escalated, color: 'var(--recco-red-700)' },
    ];

    return (
        <div className="stitch-page p-8 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold stitch-text-navy tracking-tight">Weight Dispute Engine</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        3-tier triage: auto-accept (&lt;10%), structured review (10–15%), auto-reject (&gt;15%)
                    </p>
                </div>
                {counts.breached > 0 && (
                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5 animate-pulse">
                        <span className="w-2 h-2 rounded-full bg-red-600" />
                        <span className="text-xs font-bold text-red-700">
                            {counts.breached} SLA Breach{counts.breached > 1 ? 'es' : ''}
                        </span>
                    </div>
                )}
            </div>

            {/* Status Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {tabs.map((tab) => (
                    <Link
                        key={tab.key}
                        href={`/admin/disputes${tab.key === 'ALL' ? '' : `?status=${tab.key.toLowerCase()}`}`}
                        className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-all ${filter === tab.key
                            ? 'text-white shadow-md'
                            : 'text-gray-600 bg-white border border-gray-200 hover:bg-gray-50'
                            }`}
                        style={filter === tab.key ? { backgroundColor: tab.color } : {}}
                    >
                        {tab.label}
                        <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${filter === tab.key
                                ? 'bg-white/20 text-white'
                                : 'bg-gray-100 text-gray-500'
                                }`}
                        >
                            {tab.count}
                        </span>
                    </Link>
                ))}
            </div>

            {/* Dispute List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Stitch dark navy header */}
                <div className="flex items-center gap-4 py-3 px-6 bg-[var(--recco-navy-900)] text-white">
                    <div className="w-[140px] text-[10px] uppercase font-bold tracking-wider">Batch / Status</div>
                    <div className="flex-1 grid grid-cols-3 gap-2">
                        <span className="text-[10px] uppercase font-bold tracking-wider">AGG Weight</span>
                        <span className="text-[10px] uppercase font-bold tracking-wider">REC Weight</span>
                        <span className="text-[10px] uppercase font-bold tracking-wider">Variance</span>
                    </div>
                    <div className="w-[140px] text-[10px] uppercase font-bold tracking-wider text-right">SLA / Date</div>
                    <div className="w-[20px]" />
                </div>

                {disputes.length === 0 ? (
                    <div className="py-16 text-center bg-gray-50/50">
                        <p className="text-sm font-medium stitch-text-navy">No disputes found</p>
                        <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
                            Disputes will appear here when weight variance is detected between aggregator and recycler.
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {disputes.map((d) => <DisputeRow key={d.id} dispute={d} />)}
                    </div>
                )}
            </div>
        </div>
    );
}
