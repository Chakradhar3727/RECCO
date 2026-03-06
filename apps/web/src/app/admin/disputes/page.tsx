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
        AUTO_ACCEPT: { bg: '#F0FAF4', color: '#1B6B35', label: '< 10%' },
        STRUCTURED_REVIEW: { bg: '#FFFBEB', color: '#B45309', label: '10–15%' },
        AUTO_REJECT: { bg: '#FEF2F2', color: '#DC2626', label: '> 15%' },
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
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F0FAF4] text-[#1B6B35]">
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
        OPEN: '#B45309',
        IN_REVIEW: '#0E5A6E',
        RESOLVED: '#1B6B35',
        ESCALATED: '#DC2626',
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
        AUTO_ACCEPT: '#1B6B35',
        STRUCTURED_REVIEW: '#B45309',
        AUTO_REJECT: '#DC2626',
    };

    return (
        <Link
            href={`/admin/disputes/${dispute.id}`}
            className="block"
        >
            <div
                className="flex items-center gap-4 py-3 px-4 transition-all hover:bg-gray-50 border-b border-[#E5E5E5]"
                style={{ borderLeft: `3px solid ${tierBorder[dispute.varianceTier] || '#999'}` }}
            >
                {/* Batch ID + Status */}
                <div className="w-[140px] flex-shrink-0">
                    <p className="text-xs font-mono font-bold text-[#1A2F4B]">
                        BATCH-{dispute.batchId.slice(0, 8)}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5 flex items-center">
                        <StatusDot status={dispute.status} />
                        {dispute.status.replace(/_/g, ' ')}
                    </p>
                </div>

                {/* Weights */}
                <div className="flex-1 grid grid-cols-3 gap-2">
                    <div>
                        <p className="text-[10px] text-gray-400 uppercase">AGG Weight</p>
                        <p className="text-xs font-mono font-bold text-[#1A2F4B]">
                            {dispute.aggWeight.toFixed(2)} kg
                        </p>
                    </div>
                    <div>
                        <p className="text-[10px] text-gray-400 uppercase">REC Weight</p>
                        <p className="text-xs font-mono font-bold text-[#1A2F4B]">
                            {dispute.recWeight.toFixed(2)} kg
                        </p>
                    </div>
                    <div>
                        <p className="text-[10px] text-gray-400 uppercase">Variance</p>
                        <VarianceBadge tier={dispute.varianceTier} percent={dispute.variancePercent} />
                    </div>
                </div>

                {/* SLA + Date */}
                <div className="w-[140px] flex-shrink-0 text-right">
                    <SLABadge deadline={dispute.slaDeadline} resolved={!!dispute.resolvedAt} />
                    <p className="text-[10px] text-gray-400 mt-1">
                        {formatISTTimestamp(dispute.createdAt)}
                    </p>
                </div>

                {/* Arrow */}
                <div className="text-gray-300 text-sm">→</div>
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
        { key: 'ALL', label: 'All', count: counts.all, color: '#1A2F4B' },
        { key: 'OPEN', label: 'Open', count: counts.open, color: '#B45309' },
        { key: 'IN_REVIEW', label: 'In Review', count: counts.inReview, color: '#0E5A6E' },
        { key: 'RESOLVED', label: 'Resolved', count: counts.resolved, color: '#1B6B35' },
        { key: 'ESCALATED', label: 'Escalated', count: counts.escalated, color: '#DC2626' },
    ];

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-[#1A2F4B]">Weight Dispute Engine</h1>
                    <p className="text-xs text-gray-400 mt-0.5">
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
            <div className="flex gap-1 bg-white rounded-lg border border-[#E5E5E5] p-1">
                {tabs.map((tab) => (
                    <Link
                        key={tab.key}
                        href={`/admin/disputes${tab.key === 'ALL' ? '' : `?status=${tab.key.toLowerCase()}`}`}
                        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md transition-colors ${filter === tab.key
                                ? 'text-white'
                                : 'text-gray-500 hover:bg-gray-50'
                            }`}
                        style={filter === tab.key ? { backgroundColor: tab.color } : {}}
                    >
                        {tab.label}
                        <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${filter === tab.key
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
            <div className="bg-white rounded-lg border border-[#E5E5E5] overflow-hidden">
                {/* Column Headers */}
                <div className="flex items-center gap-4 py-2 px-4 bg-[#F5F5F5] border-b border-[#E5E5E5]">
                    <div className="w-[140px] text-[10px] text-gray-400 uppercase font-bold">Batch / Status</div>
                    <div className="flex-1 grid grid-cols-3 gap-2">
                        <span className="text-[10px] text-gray-400 uppercase font-bold">AGG Weight</span>
                        <span className="text-[10px] text-gray-400 uppercase font-bold">REC Weight</span>
                        <span className="text-[10px] text-gray-400 uppercase font-bold">Variance</span>
                    </div>
                    <div className="w-[140px] text-[10px] text-gray-400 uppercase font-bold text-right">SLA / Date</div>
                    <div className="w-4" />
                </div>

                {disputes.length === 0 ? (
                    <div className="py-12 text-center">
                        <p className="text-sm text-gray-400">No disputes found</p>
                        <p className="text-xs text-gray-300 mt-1">
                            Disputes will appear here when weight variance is detected between aggregator and recycler.
                        </p>
                    </div>
                ) : (
                    disputes.map((d) => <DisputeRow key={d.id} dispute={d} />)
                )}
            </div>
        </div>
    );
}
