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
    const colorMap = {
        normal: { bg: '#F0FAF4', text: '#1B6B35', border: '#1B6B35' },
        warning: { bg: '#FFFBEB', text: '#B45309', border: '#B45309' },
        critical: { bg: '#FEF2F2', text: '#DC2626', border: '#DC2626' },
    };
    const c = colorMap[urgency];

    return (
        <div className="rounded-lg p-4" style={{ backgroundColor: c.bg, border: `1px solid ${c.border}` }}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs text-gray-400 uppercase">EPR Annual Filing Deadline</p>
                    <p className="text-lg font-bold mt-0.5" style={{ color: c.text }}>
                        {formatISTTimestamp(deadline)}
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-2xl font-bold font-mono" style={{ color: c.text }}>
                        {diffDays > 0 ? diffDays : 0}
                    </p>
                    <p className="text-[10px]" style={{ color: c.text }}>days remaining</p>
                </div>
            </div>
        </div>
    );
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
    const pct = max > 0 ? Math.round((value / max) * 100) : 0;
    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
            </div>
            <span className="text-[10px] font-bold text-gray-500">{pct}%</span>
        </div>
    );
}

function ApprovalCard({ title, data, color }: { title: string; data: any; color: string }) {
    return (
        <div className="bg-white rounded-lg border border-[#E5E5E5] p-3">
            <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                <h4 className="text-xs font-bold text-[#1A2F4B]">{title}</h4>
                <span className="text-[10px] text-gray-400 ml-auto">{data.total} total</span>
            </div>
            <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-500">Approved</span>
                    <span className="text-[10px] font-bold text-[#1B6B35]">{data.approved}</span>
                </div>
                <ProgressBar value={data.approved} max={data.total} color="#1B6B35" />
                <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-500">Pending</span>
                    <span className="text-[10px] font-bold text-[#B45309]">{data.pending}</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-500">Rejected</span>
                    <span className="text-[10px] font-bold text-[#DC2626]">{data.rejected}</span>
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
        <div className="space-y-4">
            {/* Header */}
            <div>
                <h1 className="text-xl font-bold text-[#1A2F4B]">Compliance Oversight</h1>
                <p className="text-xs text-gray-400 mt-0.5">
                    Entity approvals, weight variance compliance, lab certifications, and EPR filing status
                </p>
            </div>

            {/* EPR Deadline */}
            <DeadlineCountdown deadline={data.eprDeadline} />

            {/* Entity Approval Status */}
            <div>
                <h2 className="text-sm font-bold text-[#1A2F4B] mb-2">Entity Approval Status</h2>
                <div className="grid grid-cols-4 gap-3">
                    <ApprovalCard title="Aggregators" data={data.approvals.aggregators} color="#B45309" />
                    <ApprovalCard title="Recyclers" data={data.approvals.recyclers} color="#1B6B35" />
                    <ApprovalCard title="PIBOs" data={data.approvals.pibos} color="#0E5A6E" />
                    <ApprovalCard title="PROs" data={data.approvals.pros} color="#6B21A8" />
                </div>
            </div>

            {/* Compliance Metrics Grid */}
            <div className="grid grid-cols-3 gap-3">
                {/* Weight Variance Compliance */}
                <div className="bg-white rounded-lg border border-[#E5E5E5] p-4">
                    <h3 className="text-xs font-bold text-[#1A2F4B] mb-3">Weight Variance Compliance</h3>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] text-gray-500">Total Disputes</span>
                            <span className="text-xs font-bold text-[#1A2F4B]">{data.disputes.total}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] text-gray-500">Within Amber ({`<${data.amberThreshold}%`})</span>
                            <span className="text-xs font-bold text-[#1B6B35]">{data.disputes.withinAmber}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] text-gray-500">Red Flags ({`≥${data.redThreshold}%`})</span>
                            <span className="text-xs font-bold text-[#DC2626]">{data.disputes.redFlags}</span>
                        </div>
                        <hr className="border-gray-100" />
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] text-gray-500">Resolution Rate</span>
                            <span className="text-sm font-bold font-mono text-[#1B6B35]">{data.disputes.resolutionRate}%</span>
                        </div>
                        <ProgressBar value={data.disputes.resolved} max={data.disputes.total} color="#1B6B35" />
                    </div>
                </div>

                {/* Lab Certification */}
                <div className="bg-white rounded-lg border border-[#E5E5E5] p-4">
                    <h3 className="text-xs font-bold text-[#1A2F4B] mb-3">Lab Certification Status</h3>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] text-gray-500">NABL Verified</span>
                            <span className="text-xs font-bold text-[#1B6B35]">{data.labCompliance.nablVerified}</span>
                        </div>
                        <ProgressBar value={data.labCompliance.nablVerified} max={data.labCompliance.totalCerts} color="#1B6B35" />
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] text-gray-500">Uploaded</span>
                            <span className="text-xs font-bold text-[#B45309]">{data.labCompliance.uploaded}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] text-gray-500">Self-Declared</span>
                            <span className="text-xs font-bold text-gray-500">{data.labCompliance.selfDeclared}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] text-gray-500">No Lab Report</span>
                            <span className="text-xs font-bold text-[#DC2626]">{data.labCompliance.none}</span>
                        </div>
                        <hr className="border-gray-100" />
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] text-gray-500">Avg Trust Score</span>
                            <span className="text-sm font-bold font-mono text-[#0E5A6E]">{data.labCompliance.avgTrustScore}/100</span>
                        </div>
                    </div>
                </div>

                {/* Financial Compliance */}
                <div className="bg-white rounded-lg border border-[#E5E5E5] p-4">
                    <h3 className="text-xs font-bold text-[#1A2F4B] mb-3">Financial Compliance</h3>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] text-gray-500">Total Transactions</span>
                            <span className="text-xs font-bold text-[#1A2F4B]">{data.financial.totalTransactions}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] text-gray-500">Released Escrow</span>
                            <span className="text-xs font-bold font-mono text-[#1B6B35]">{formatINR(data.financial.releasedEscrow)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] text-gray-500">Held Escrow</span>
                            <span className="text-xs font-bold font-mono text-[#B45309]">{formatINR(data.financial.heldEscrow)}</span>
                        </div>
                        <hr className="border-gray-100" />
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] text-gray-500">EPR Weight Processed</span>
                            <span className="text-sm font-bold font-mono text-[#1A2F4B]">
                                {data.labCompliance.totalWeightMT.toFixed(2)} MT
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Items */}
            <div className="bg-white rounded-lg border border-[#E5E5E5] p-4">
                <h3 className="text-xs font-bold text-[#1A2F4B] mb-2">Compliance Action Items</h3>
                <div className="space-y-1.5">
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
                            <div className="flex items-center gap-2 py-2 px-3 bg-[#F0FAF4] rounded-lg">
                                <span>✅</span>
                                <span className="text-xs text-[#1B6B35] font-medium">All compliance checks passing</span>
                            </div>
                        )}
                </div>
            </div>
        </div>
    );
}

function ActionItem({ icon, text, href, urgency }: { icon: string; text: string; href: string; urgency: 'warning' | 'critical' }) {
    const bg = urgency === 'critical' ? '#FEF2F2' : '#FFFBEB';
    const color = urgency === 'critical' ? '#DC2626' : '#B45309';
    return (
        <a href={href} className="flex items-center gap-2 py-2 px-3 rounded-lg transition-colors hover:opacity-80" style={{ backgroundColor: bg }}>
            <span>{icon}</span>
            <span className="text-xs font-medium flex-1" style={{ color }}>{text}</span>
            <span className="text-gray-300 text-sm">→</span>
        </a>
    );
}
