import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { formatISTTimestamp, formatINR } from '@/lib/utils/ist-time';

/**
 * Compliance Oversight Page — Phase 2 Module 2.9
 *
 * Sections:
 *  1. EPR Filing Deadline countdown
 *  2. Approval status overview (AGG/REC/PIBO/PRO)
 *  3. Weight variance compliance rates
 *  4. Lab certification status
 *  5. Compliance action items
 */

// ─── Server-side data fetching ───────────────────────────────────────

async function getComplianceData() {
    const admin = createServiceRoleClient();

    const [
        configRes,
        aggRes,
        recRes,
        piboRes,
        proRes,
        certRes,
        disputeRes,
        escrowRes,
    ] = await Promise.all([
        admin.from('system_config')
            .select('key, value')
            .in('key', ['epr_annual_deadline', 'platform_fee_percent', 'weight_variance_threshold_amber', 'weight_variance_threshold_red']),

        admin.from('aggregator_profiles')
            .select('approval_status'),

        admin.from('recycler_facilities')
            .select('approval_status'),

        admin.from('pibo_entities')
            .select('approval_status'),

        admin.from('pro_organisations')
            .select('approval_status'),

        admin.from('epr_certificates')
            .select('lab_status, trust_score, weight_mt'),

        admin.from('weight_disputes')
            .select('variance_percent, resolved_at'),

        admin.from('payment_escrows')
            .select('status, amount'),
    ]);

    // Parse config
    const configMap = new Map((configRes.data || []).map((c: any) => [c.key, c.value]));
    const eprDeadline = configMap.get('epr_annual_deadline') || '2026-06-30';
    const amberThreshold = Number(configMap.get('weight_variance_threshold_amber')) || 10;
    const redThreshold = Number(configMap.get('weight_variance_threshold_red')) || 15;

    // Approval counts
    const countApproval = (data: any[]) => ({
        approved: data.filter((d: any) => d.approval_status === 'APPROVED').length,
        pending: data.filter((d: any) => d.approval_status === 'PENDING_ADMIN_REVIEW').length,
        rejected: data.filter((d: any) => d.approval_status === 'REJECTED').length,
        total: data.length,
    });

    const approvals = {
        aggregators: countApproval(aggRes.data || []),
        recyclers: countApproval(recRes.data || []),
        pibos: countApproval(piboRes.data || []),
        pros: countApproval(proRes.data || []),
    };

    // Certificate compliance
    const certs = certRes.data || [];
    const labCompliance = {
        nablVerified: certs.filter((c: any) => c.lab_status === 'NABL_VERIFIED').length,
        uploaded: certs.filter((c: any) => c.lab_status === 'UPLOADED').length,
        selfDeclared: certs.filter((c: any) => c.lab_status === 'SELF_DECLARED').length,
        none: certs.filter((c: any) => c.lab_status === 'NONE').length,
        totalCerts: certs.length,
        avgTrustScore: certs.length ? Math.round(certs.reduce((s: number, c: any) => s + (c.trust_score || 0), 0) / certs.length) : 0,
        totalWeightMT: certs.reduce((s: number, c: any) => s + (Number(c.weight_mt) || 0), 0),
    };

    // Dispute compliance
    const disputes = disputeRes.data || [];
    const resolvedDisputes = disputes.filter((d: any) => d.resolved_at !== null);
    const withinAmber = disputes.filter((d: any) => Number(d.variance_percent) < amberThreshold).length;
    const withinRed = disputes.filter((d: any) => Number(d.variance_percent) >= redThreshold).length;

    // Financial compliance
    const escrows = escrowRes.data || [];
    const heldEscrow = escrows.filter((e: any) => e.status === 'HELD').reduce((s: number, e: any) => s + (Number(e.amount) || 0), 0);
    const releasedEscrow = escrows.filter((e: any) => e.status === 'RELEASED').reduce((s: number, e: any) => s + (Number(e.amount) || 0), 0);

    return {
        eprDeadline,
        amberThreshold,
        redThreshold,
        approvals,
        labCompliance,
        disputes: {
            total: disputes.length,
            resolved: resolvedDisputes.length,
            withinAmber,
            redFlags: withinRed,
            resolutionRate: disputes.length > 0 ? Math.round((resolvedDisputes.length / disputes.length) * 100) : 100,
        },
        financial: {
            heldEscrow,
            releasedEscrow,
            totalTransactions: escrows.length,
        },
    };
}

// ─── Components ──────────────────────────────────────────────────────

function DeadlineCountdown({ deadline }: { deadline: string }) {
    const now = new Date();
    const target = new Date(deadline);
    const diffMs = target.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    const urgency = diffDays < 30 ? 'critical' : diffDays < 90 ? 'warning' : 'normal';

    // Stitch standard statuses
    const colorClasses = {
        normal: 'bg-[#F0FAF4] border-[#1B6B35]/20 text-[#1B6B35]',
        warning: 'bg-[#FFFBEB] border-[#B45309]/20 text-[#B45309]',
        critical: 'bg-[#FEF2F2] border-[#DC2626]/20 text-[#DC2626]',
    };

    return (
        <div className={`rounded-xl border p-5 ${colorClasses[urgency]}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <p className="text-xs font-bold uppercase tracking-wider opacity-80">EPR Annual Filing Deadline</p>
                    <p className="text-xl font-bold mt-1">
                        {formatISTTimestamp(deadline).split(',')[0]}
                    </p>
                </div>
                <div className="text-left sm:text-right">
                    <p className="text-3xl font-bold font-mono leading-none">
                        {diffDays > 0 ? diffDays : 0}
                    </p>
                    <p className="text-xs mt-1 font-medium opacity-80">days remaining</p>
                </div>
            </div>
        </div>
    );
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
    const pct = max > 0 ? Math.round((value / max) * 100) : 0;
    return (
        <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
            </div>
            <span className="text-xs font-bold text-gray-500 min-w-[32px] text-right">{pct}%</span>
        </div>
    );
}

function ApprovalCard({ title, data, color }: { title: string; data: any; color: string }) {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-4">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                <h4 className="text-sm font-bold stitch-text-navy">{title}</h4>
                <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md ml-auto border border-gray-100">
                    {data.total} total
                </span>
            </div>
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 font-medium">Approved</span>
                    <span className="text-xs font-bold stitch-text-green">{data.approved}</span>
                </div>
                <ProgressBar value={data.approved} max={data.total} color="#1B6B35" />
                <div className="flex items-center justify-between mt-1 pt-1 border-t border-gray-50">
                    <span className="text-xs text-gray-500 font-medium">Pending</span>
                    <span className="text-xs font-bold text-[#B45309]">{data.pending}</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 font-medium">Rejected</span>
                    <span className="text-xs font-bold text-[#DC2626]">{data.rejected}</span>
                </div>
            </div>
        </div>
    );
}

// ─── Page ────────────────────────────────────────────────────────────

export default async function CompliancePage() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/admin/login');

    const data = await getComplianceData();

    return (
        <div className="stitch-page p-8 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold stitch-text-navy tracking-tight">Compliance Oversight</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Entity approvals, weight variance compliance, lab certifications, and EPR filing status
                    </p>
                </div>
            </div>

            {/* EPR Deadline */}
            <DeadlineCountdown deadline={data.eprDeadline} />

            {/* Entity Approval Status */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold stitch-text-navy tracking-tight">Entity Approval Status</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <ApprovalCard title="Aggregators" data={data.approvals.aggregators} color="#B45309" />
                    <ApprovalCard title="Recyclers" data={data.approvals.recyclers} color="#1B6B35" />
                    <ApprovalCard title="PIBOs" data={data.approvals.pibos} color="#0E5A6E" />
                    <ApprovalCard title="PROs" data={data.approvals.pros} color="#6B21A8" />
                </div>
            </div>

            {/* Compliance Metrics Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Weight Variance Compliance */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col">
                    <h3 className="text-sm font-bold stitch-text-navy mb-4">Weight Variance</h3>
                    <div className="space-y-3 flex-1">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500 font-medium">Total Disputes</span>
                            <span className="text-sm font-bold stitch-text-navy">{data.disputes.total}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500 font-medium">Within Amber ({`<${data.amberThreshold}%`})</span>
                            <span className="text-sm font-bold stitch-text-green">{data.disputes.withinAmber}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500 font-medium">Red Flags ({`≥${data.redThreshold}%`})</span>
                            <span className="text-sm font-bold text-[#DC2626]">{data.disputes.redFlags}</span>
                        </div>
                        <hr className="border-gray-100 my-4" />
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-gray-500 font-medium">Resolution Rate</span>
                            <span className="text-base font-bold font-mono stitch-text-green">{data.disputes.resolutionRate}%</span>
                        </div>
                        <ProgressBar value={data.disputes.resolved} max={data.disputes.total} color="#1B6B35" />
                    </div>
                </div>

                {/* Lab Certification */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col">
                    <h3 className="text-sm font-bold stitch-text-navy mb-4">Lab Certifications</h3>
                    <div className="space-y-3 flex-1">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500 font-medium">NABL Verified</span>
                            <span className="text-sm font-bold stitch-text-green">{data.labCompliance.nablVerified}</span>
                        </div>
                        <div className="mb-2">
                            <ProgressBar value={data.labCompliance.nablVerified} max={data.labCompliance.totalCerts} color="#1B6B35" />
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500 font-medium">Uploaded / Parsing</span>
                            <span className="text-sm font-bold text-[#B45309]">{data.labCompliance.uploaded}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500 font-medium">Self-Declared</span>
                            <span className="text-sm font-bold text-gray-500">{data.labCompliance.selfDeclared}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500 font-medium">No Lab Report</span>
                            <span className="text-sm font-bold text-[#DC2626]">{data.labCompliance.none}</span>
                        </div>
                        <hr className="border-gray-100 my-4" />
                        <div className="flex items-center justify-between mt-auto">
                            <span className="text-xs text-gray-500 font-medium">Avg Trust Score</span>
                            <span className="text-base font-bold font-mono text-[#0D5C63]">{data.labCompliance.avgTrustScore}/100</span>
                        </div>
                    </div>
                </div>

                {/* Financial Compliance */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col">
                    <h3 className="text-sm font-bold stitch-text-navy mb-4">Financial Status</h3>
                    <div className="space-y-3 flex-1">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500 font-medium">Total Transactions</span>
                            <span className="text-sm font-bold stitch-text-navy">{data.financial.totalTransactions}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500 font-medium">Released Escrow</span>
                            <span className="text-sm font-bold font-mono stitch-text-green">{formatINR(data.financial.releasedEscrow)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500 font-medium">Held Escrow</span>
                            <span className="text-sm font-bold font-mono text-[#B45309]">{formatINR(data.financial.heldEscrow)}</span>
                        </div>
                        <hr className="border-gray-100 my-4" />
                        <div className="flex items-center justify-between mt-auto">
                            <span className="text-xs text-gray-500 font-medium">EPR Weight Processed</span>
                            <span className="text-base font-bold font-mono stitch-text-navy">
                                {data.labCompliance.totalWeightMT.toFixed(2)} MT
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Items */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-4">
                    <h3 className="text-sm font-bold stitch-text-navy">Compliance Action Items</h3>
                </div>
                <div className="p-6 space-y-3">
                    {data.approvals.aggregators.pending > 0 && (
                        <ActionItem
                            icon="👤"
                            text={`${data.approvals.aggregators.pending} aggregator(s) pending approval`}
                            href="/admin/users?status=pending"
                            urgency="warning"
                        />
                    )}
                    {data.approvals.recyclers.pending > 0 && (
                        <ActionItem
                            icon="🏭"
                            text={`${data.approvals.recyclers.pending} recycler(s) pending approval`}
                            href="/admin/users?status=pending"
                            urgency="warning"
                        />
                    )}
                    {data.labCompliance.none > 0 && (
                        <ActionItem
                            icon="🔬"
                            text={`${data.labCompliance.none} certificate(s) without lab report`}
                            href="/admin/blockchain?filter=pending"
                            urgency="critical"
                        />
                    )}
                    {data.disputes.total > 0 && data.disputes.resolutionRate < 80 && (
                        <ActionItem
                            icon="⚖️"
                            text={`Dispute resolution rate below 80% (${data.disputes.resolutionRate}%)`}
                            href="/admin/disputes"
                            urgency="critical"
                        />
                    )}
                    {data.approvals.aggregators.pending === 0 &&
                        data.approvals.recyclers.pending === 0 &&
                        data.labCompliance.none === 0 &&
                        (data.disputes.total === 0 || data.disputes.resolutionRate >= 80) && (
                            <div className="flex items-center gap-3 py-3 px-4 bg-[#F0FAF4] border border-[#1B6B35]/20 rounded-lg">
                                <span className="text-lg">✅</span>
                                <span className="text-sm stitch-text-green font-bold">All compliance checks passing</span>
                            </div>
                        )}
                </div>
            </div>
        </div>
    );
}

function ActionItem({ icon, text, href, urgency }: { icon: string; text: string; href: string; urgency: 'warning' | 'critical' }) {
    const bg = urgency === 'critical' ? 'bg-[#FEF2F2] border-[#DC2626]/20 hover:bg-[#FEE2E2]' : 'bg-[#FFFBEB] border-[#B45309]/20 hover:bg-[#FEF3C7]';
    const color = urgency === 'critical' ? 'text-[#DC2626]' : 'text-[#B45309]';
    return (
        <a href={href} className={`flex items-center gap-3 py-3 px-4 rounded-lg transition-all border shadow-sm ${bg}`}>
            <span className="text-lg">{icon}</span>
            <span className={`text-sm font-bold flex-1 ${color}`}>{text}</span>
            <span className={`${color} opacity-50`}>→</span>
        </a>
    );
}
