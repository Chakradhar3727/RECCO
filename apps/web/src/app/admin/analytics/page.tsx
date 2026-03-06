import React from 'react';
import { redirect } from 'next/navigation';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { formatINR, formatISTTimestamp, getIndiaFYStart } from '@/lib/utils/ist-time';

/**
 * Analytics Dashboard — Phase 2 Module 2.11
 *
 * Sections:
 *  1. Platform KPI cards (7 metrics)
 *  2. Growth trends (user registrations by month)
 *  3. Material flow breakdown
 *  4. Geographic coverage
 *  5. Platform health metrics
 */

async function getAnalyticsData() {
    const admin = createServiceRoleClient();
    const fyStart = getIndiaFYStart();

    const [
        usersRes,
        aggRes,
        recRes,
        piboRes,
        proRes,
        batchRes,
        certsRes,
        escrowRes,
        disputeRes,
        collectionsRes,
    ] = await Promise.all([
        admin.from('user_profiles').select('id, portal_role, created_at'),
        admin.from('aggregator_profiles').select('id, approval_status, created_at'),
        admin.from('recycler_facilities').select('id, approval_status, created_at'),
        admin.from('pibo_entities').select('id, approval_status, created_at'),
        admin.from('pro_organisations').select('id, approval_status, created_at'),
        admin.from('batches').select('id, status, created_at'),
        admin.from('epr_certificates').select('id, weight_mt, material_type, created_at'),
        admin.from('payment_escrows').select('id, amount, status, created_at'),
        admin.from('weight_disputes').select('id, variance_percent, resolved_at, created_at'),
        admin.from('collections').select('id, material_type, total_weight_kg, amount_inr, created_at'),
    ]);

    const users = usersRes.data || [];
    const aggs = aggRes.data || [];
    const recs = recRes.data || [];
    const pibos = piboRes.data || [];
    const pros = proRes.data || [];
    const batches = batchRes.data || [];
    const certs = certsRes.data || [];
    const escrows = escrowRes.data || [];
    const disputes = disputeRes.data || [];
    const collections = collectionsRes.data || [];

    // ─── KPI Cards ───
    const totalUsers = users.length;
    const activeEntities = aggs.filter((a: any) => a.approval_status === 'APPROVED').length
        + recs.filter((r: any) => r.approval_status === 'APPROVED').length;
    const totalBatches = batches.length;
    const totalCerts = certs.length;
    const totalWeightMT = certs.reduce((s: number, c: any) => s + (Number(c.weight_mt) || 0), 0);
    const totalRevenue = escrows.reduce((s: number, e: any) => s + (Number(e.amount) || 0), 0);
    const collectionRevenue = collections.reduce((s: number, c: any) => s + (Number(c.amount_inr) || 0), 0);
    const disputeRate = batches.length > 0 ? Math.round((disputes.length / batches.length) * 100) : 0;

    // ─── Monthly User Growth (last 6 months) ───
    const monthlyGrowth: { month: string; users: number; entities: number }[] = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
        const userCount = users.filter((u: any) => u.created_at?.startsWith(yearMonth)).length;
        const entityCount = aggs.filter((a: any) => a.created_at?.startsWith(yearMonth)).length
            + recs.filter((r: any) => r.created_at?.startsWith(yearMonth)).length;
        monthlyGrowth.push({ month: label, users: userCount, entities: entityCount });
    }

    // ─── Material Breakdown ───
    const materialMap = new Map<string, { weight: number; count: number }>();
    collections.forEach((c: any) => {
        const mt = c.material_type || 'Unknown';
        const existing = materialMap.get(mt) || { weight: 0, count: 0 };
        materialMap.set(mt, {
            weight: existing.weight + (Number(c.total_weight_kg) || 0),
            count: existing.count + 1,
        });
    });
    const materialBreakdown = Array.from(materialMap.entries())
        .map(([type, data]) => ({ type, ...data }))
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 8);

    // ─── Entity Distribution ───
    const entityDistribution = [
        { type: 'Aggregators', total: aggs.length, approved: aggs.filter((a: any) => a.approval_status === 'APPROVED').length, color: '#B45309' },
        { type: 'Recyclers', total: recs.length, approved: recs.filter((r: any) => r.approval_status === 'APPROVED').length, color: '#1B6B35' },
        { type: 'PIBOs', total: pibos.length, approved: pibos.filter((p: any) => p.approval_status === 'APPROVED').length, color: '#0E5A6E' },
        { type: 'PROs', total: pros.length, approved: pros.filter((p: any) => p.approval_status === 'APPROVED').length, color: '#6B21A8' },
    ];

    // ─── Platform Health ───
    const resolvedDisputes = disputes.filter((d: any) => d.resolved_at !== null).length;
    const avgVariance = disputes.length > 0
        ? disputes.reduce((s: number, d: any) => s + (Number(d.variance_percent) || 0), 0) / disputes.length
        : 0;
    const escrowReleased = escrows.filter((e: any) => e.status === 'RELEASED').length;
    const escrowHeld = escrows.filter((e: any) => e.status === 'HELD').length;

    return {
        kpi: {
            totalUsers,
            activeEntities,
            totalBatches,
            totalCerts,
            totalWeightMT: Math.round(totalWeightMT * 100) / 100,
            totalRevenue,
            collectionRevenue,
            disputeRate,
        },
        monthlyGrowth,
        materialBreakdown,
        entityDistribution,
        health: {
            disputeResolutionRate: disputes.length > 0 ? Math.round((resolvedDisputes / disputes.length) * 100) : 100,
            avgVariance: Math.round(avgVariance * 100) / 100,
            escrowReleased,
            escrowHeld,
            totalCollections: collections.length,
        },
    };
}

// ─── Components ──────────────────────────────────────────────────────

function KPICard({ label, value, suffix, color }: { label: string; value: string | number; suffix?: string; color: string }) {
    return (
        <div className="bg-white rounded-lg border border-[#E5E5E5] p-3">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider">{label}</p>
            <p className="text-lg font-bold font-mono mt-0.5" style={{ color }}>
                {value}{suffix && <span className="text-xs text-gray-400 ml-0.5">{suffix}</span>}
            </p>
        </div>
    );
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
    const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
            </div>
            <span className="text-[10px] font-bold text-gray-500 w-8 text-right">{pct}%</span>
        </div>
    );
}

function GrowthChart({ data }: { data: { month: string; users: number; entities: number }[] }) {
    const maxVal = Math.max(...data.map(d => Math.max(d.users, d.entities)), 1);
    return (
        <div className="flex items-end gap-2 h-24">
            {data.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                    <div className="flex gap-0.5 items-end w-full justify-center" style={{ height: '80px' }}>
                        <div
                            className="w-3 rounded-t bg-[#1A2F4B] transition-all"
                            style={{ height: `${Math.max(4, (d.users / maxVal) * 70)}px` }}
                            title={`${d.users} users`}
                        />
                        <div
                            className="w-3 rounded-t bg-[#1B6B35] transition-all"
                            style={{ height: `${Math.max(4, (d.entities / maxVal) * 70)}px` }}
                            title={`${d.entities} entities`}
                        />
                    </div>
                    <span className="text-[9px] text-gray-400">{d.month}</span>
                </div>
            ))}
        </div>
    );
}

// ─── Page ────────────────────────────────────────────────────────────

export default async function AnalyticsPage() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/admin/login');

    const data = await getAnalyticsData();

    return (
        <div className="space-y-4">
            {/* Header */}
            <div>
                <h1 className="text-xl font-bold text-[#1A2F4B]">Platform Analytics</h1>
                <p className="text-xs text-gray-400 mt-0.5">
                    Aggregate platform metrics, growth trends, and material flow analysis
                </p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-4 gap-2">
                <KPICard label="Total Users" value={data.kpi.totalUsers} color="#1A2F4B" />
                <KPICard label="Active Entities" value={data.kpi.activeEntities} color="#1B6B35" />
                <KPICard label="Total Batches" value={data.kpi.totalBatches} color="#0E5A6E" />
                <KPICard label="EPR Certificates" value={data.kpi.totalCerts} color="#6B21A8" />
            </div>
            <div className="grid grid-cols-4 gap-2">
                <KPICard label="EPR Weight Processed" value={data.kpi.totalWeightMT.toLocaleString('en-IN')} suffix="MT" color="#1A2F4B" />
                <KPICard label="Total Escrow Value" value={formatINR(data.kpi.totalRevenue)} color="#1B6B35" />
                <KPICard label="Collection Revenue" value={formatINR(data.kpi.collectionRevenue)} color="#B45309" />
                <KPICard label="Dispute Rate" value={`${data.kpi.disputeRate}%`} color={data.kpi.disputeRate > 20 ? '#DC2626' : '#1B6B35'} />
            </div>

            {/* Middle Row: Growth + Entity Distribution */}
            <div className="grid grid-cols-2 gap-3">
                {/* Growth Chart */}
                <div className="bg-white rounded-lg border border-[#E5E5E5] p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-bold text-[#1A2F4B]">Registration Growth (6 Months)</h3>
                        <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1 text-[9px] text-gray-400">
                                <span className="w-2 h-2 rounded-sm bg-[#1A2F4B]" /> Users
                            </span>
                            <span className="flex items-center gap-1 text-[9px] text-gray-400">
                                <span className="w-2 h-2 rounded-sm bg-[#1B6B35]" /> Entities
                            </span>
                        </div>
                    </div>
                    <GrowthChart data={data.monthlyGrowth} />
                </div>

                {/* Entity Distribution */}
                <div className="bg-white rounded-lg border border-[#E5E5E5] p-4">
                    <h3 className="text-xs font-bold text-[#1A2F4B] mb-3">Entity Distribution</h3>
                    <div className="space-y-2.5">
                        {data.entityDistribution.map((e) => (
                            <div key={e.type}>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="flex items-center gap-1.5 text-xs text-[#1A2F4B]">
                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: e.color }} />
                                        {e.type}
                                    </span>
                                    <span className="text-[10px] text-gray-400">
                                        {e.approved}/{e.total} approved
                                    </span>
                                </div>
                                <MiniBar value={e.approved} max={e.total} color={e.color} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom Row: Material Breakdown + Platform Health */}
            <div className="grid grid-cols-2 gap-3">
                {/* Material Breakdown */}
                <div className="bg-white rounded-lg border border-[#E5E5E5] p-4">
                    <h3 className="text-xs font-bold text-[#1A2F4B] mb-3">Material Flow Breakdown</h3>
                    {data.materialBreakdown.length === 0 ? (
                        <p className="text-xs text-gray-400 py-4 text-center">No collection data yet</p>
                    ) : (
                        <div className="space-y-1.5">
                            {data.materialBreakdown.map((m) => {
                                const maxWeight = data.materialBreakdown[0]?.weight || 1;
                                return (
                                    <div key={m.type} className="flex items-center gap-2">
                                        <span className="text-[10px] text-gray-500 w-20 truncate">{m.type}</span>
                                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-[#0E5A6E]"
                                                style={{ width: `${(m.weight / maxWeight) * 100}%` }}
                                            />
                                        </div>
                                        <span className="text-[10px] font-mono font-bold text-[#1A2F4B] w-16 text-right">
                                            {m.weight >= 1000 ? `${(m.weight / 1000).toFixed(1)}T` : `${m.weight.toFixed(0)}kg`}
                                        </span>
                                        <span className="text-[9px] text-gray-300 w-8 text-right">×{m.count}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Platform Health */}
                <div className="bg-white rounded-lg border border-[#E5E5E5] p-4">
                    <h3 className="text-xs font-bold text-[#1A2F4B] mb-3">Platform Health</h3>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] text-gray-500">Dispute Resolution Rate</span>
                            <span className={`text-xs font-bold ${data.health.disputeResolutionRate >= 80 ? 'text-[#1B6B35]' : 'text-[#DC2626]'}`}>
                                {data.health.disputeResolutionRate}%
                            </span>
                        </div>
                        <MiniBar value={data.health.disputeResolutionRate} max={100} color={data.health.disputeResolutionRate >= 80 ? '#1B6B35' : '#DC2626'} />

                        <div className="flex items-center justify-between">
                            <span className="text-[10px] text-gray-500">Avg Weight Variance</span>
                            <span className={`text-xs font-bold font-mono ${data.health.avgVariance < 10 ? 'text-[#1B6B35]' : 'text-[#B45309]'}`}>
                                {data.health.avgVariance}%
                            </span>
                        </div>

                        <hr className="border-gray-100" />

                        <div className="flex items-center justify-between">
                            <span className="text-[10px] text-gray-500">Escrow Released</span>
                            <span className="text-xs font-bold text-[#1B6B35]">{data.health.escrowReleased}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] text-gray-500">Escrow Held</span>
                            <span className="text-xs font-bold text-[#B45309]">{data.health.escrowHeld}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] text-gray-500">Total Collections</span>
                            <span className="text-xs font-bold text-[#1A2F4B]">{data.health.totalCollections}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
