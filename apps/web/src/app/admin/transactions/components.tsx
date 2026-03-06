'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';
import {
    type TransactionStats,
    type TransactionEvent,
    type DisputeCard,
    type ChartDataPoint,
    getTransactionStats,
    getRecentTransactions,
    getDisputesByStatus,
    getFinancialChartData,
} from './actions';
import { formatINR, formatISTTimestamp, getRelativeTime } from '@/lib/utils/ist-time';

// ─── Recharts Imports (dynamic) ──────────────────────────────────────

import {
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Area,
    CartesianGrid,
} from 'recharts';

// ═══════════════════════════════════════════════════════════════════════
// STAT CARD
// ═══════════════════════════════════════════════════════════════════════

function StatCard({
    label,
    value,
    isCurrency = false,
    color = '#1A2F4B',
}: {
    label: string;
    value: number;
    isCurrency?: boolean;
    color?: string;
}) {
    return (
        <div className="group bg-white rounded-lg border border-[#E5E5E5] p-4 transition-all hover:border-l-[3px] hover:border-l-[#1B6B35] hover:shadow-sm">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{label}</p>
            <p className="text-2xl font-bold" style={{ color, fontFamily: 'Courier New, monospace' }}>
                {isCurrency ? formatINR(value) : value.toLocaleString('en-IN')}
            </p>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════
// TRANSACTION FEED
// ═══════════════════════════════════════════════════════════════════════

function TransactionFeed({ events }: { events: TransactionEvent[] }) {
    if (events.length === 0) {
        return (
            <div className="bg-[#F0FAF4] border border-[#1B6B35]/20 rounded-lg p-6 text-center">
                <p className="text-[#1B6B35] font-medium text-sm">No transactions recorded yet</p>
                <p className="text-gray-400 text-xs mt-1">
                    Transaction feed will populate when the payment system goes live in Phase 6.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-0 max-h-[480px] overflow-y-auto">
            {events.map((event, i) => (
                <div
                    key={event.id}
                    className="flex items-center gap-3 py-2.5 px-3 transition-colors hover:bg-gray-50"
                    style={{
                        backgroundColor: i % 2 === 1 ? '#F5F5F5' : 'white',
                        borderLeft: `3px solid ${event.barColor}`,
                    }}
                >
                    <div className="flex-1 min-w-0">
                        <p className="text-xs text-[#1A2F4B] truncate">{event.description}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                            {formatISTTimestamp(event.timestamp)}
                        </p>
                    </div>
                    <p
                        className="text-sm font-bold whitespace-nowrap"
                        style={{ fontFamily: 'Courier New, monospace', color: event.barColor }}
                    >
                        {formatINR(event.amount)}
                    </p>
                    {event.disputeId && (
                        <Link
                            href={`/admin/disputes/${event.disputeId}`}
                            className="text-[10px] text-[#0E5A6E] hover:underline"
                        >
                            View
                        </Link>
                    )}
                </div>
            ))}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════
// DISPUTE TRACKER (4-column kanban)
// ═══════════════════════════════════════════════════════════════════════

function SLACountdown({ deadline }: { deadline: string | null }) {
    const [remaining, setRemaining] = useState('');
    const [urgency, setUrgency] = useState<'normal' | 'warning' | 'critical' | 'breached'>('normal');

    useEffect(() => {
        if (!deadline) {
            setRemaining('No SLA');
            return;
        }

        const update = () => {
            const now = new Date();
            const sla = new Date(deadline);
            const diffMs = sla.getTime() - now.getTime();

            if (diffMs <= 0) {
                const overMs = Math.abs(diffMs);
                const overHrs = Math.floor(overMs / (1000 * 60 * 60));
                setRemaining(`BREACHED ${overHrs}h ago`);
                setUrgency('breached');
                return;
            }

            const hours = Math.floor(diffMs / (1000 * 60 * 60));
            const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            setRemaining(`${hours}h ${mins}m`);
            setUrgency(hours < 6 ? 'critical' : hours < 12 ? 'warning' : 'normal');
        };

        update();
        const interval = setInterval(update, 60000);
        return () => clearInterval(interval);
    }, [deadline]);

    const colorMap = {
        normal: '#B45309',
        warning: '#B45309',
        critical: '#DC2626',
        breached: '#DC2626',
    };

    return (
        <span
            className={`text-[10px] font-bold ${urgency === 'breached' ? 'animate-pulse' : ''}`}
            style={{ color: colorMap[urgency] }}
        >
            {remaining}
        </span>
    );
}

function DisputeCardItem({ dispute }: { dispute: DisputeCard }) {
    const varianceColor = dispute.variancePercent > 15 ? '#DC2626' : '#B45309';

    return (
        <Link
            href={`/admin/disputes/${dispute.id}`}
            className="block p-2.5 rounded-md border transition-all hover:shadow-sm"
            style={{
                backgroundColor:
                    dispute.status === 'OPEN' ? '#FFFBEB' :
                        dispute.status === 'IN_REVIEW' ? '#F0FDFA' :
                            dispute.status === 'RESOLVED' ? '#F0FAF4' :
                                '#FEF2F2',
                borderColor:
                    dispute.status === 'OPEN' ? '#B45309' :
                        dispute.status === 'IN_REVIEW' ? '#0E5A6E' :
                            dispute.status === 'RESOLVED' ? '#1B6B35' :
                                '#DC2626',
            }}
        >
            <p className="text-[11px] font-mono text-[#1A2F4B] font-bold truncate">
                {dispute.batchId ? `BATCH-${dispute.batchId.slice(0, 8)}` : dispute.id.slice(0, 8)}
            </p>
            <p className="text-[10px] text-gray-500 mt-0.5">
                AGG {dispute.aggregatorId.slice(0, 8)}
            </p>
            <div className="flex items-center justify-between mt-1.5">
                <span className="text-[11px] font-bold" style={{ color: varianceColor }}>
                    {dispute.variancePercent.toFixed(1)}%
                </span>
                {dispute.status === 'OPEN' && <SLACountdown deadline={dispute.slaDeadline} />}
                {dispute.status === 'RESOLVED' && dispute.adminDecision && (
                    <span className="text-[9px] bg-[#F0FAF4] text-[#1B6B35] px-1.5 py-0.5 rounded-full">
                        {dispute.adminDecision.replace(/_/g, ' ')}
                    </span>
                )}
                {dispute.status === 'ESCALATED' && (
                    <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full animate-pulse">
                        Escalated
                    </span>
                )}
            </div>
        </Link>
    );
}

function DisputeTracker({
    disputes,
}: {
    disputes: {
        open: DisputeCard[];
        inReview: DisputeCard[];
        resolved: DisputeCard[];
        escalated: DisputeCard[];
    };
}) {
    const columns = [
        { key: 'open', label: 'Open', data: disputes.open, headerColor: '#B45309' },
        { key: 'inReview', label: 'In-Review', data: disputes.inReview, headerColor: '#0E5A6E' },
        { key: 'resolved', label: 'Resolved', data: disputes.resolved, headerColor: '#1B6B35' },
        { key: 'escalated', label: 'Escalated', data: disputes.escalated, headerColor: '#DC2626' },
    ];

    return (
        <div className="grid grid-cols-4 gap-2">
            {columns.map((col) => (
                <div key={col.key}>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold" style={{ color: col.headerColor }}>
                            {col.label}
                        </span>
                        <span
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                            style={{
                                backgroundColor: `${col.headerColor}15`,
                                color: col.headerColor,
                            }}
                        >
                            {col.data.length}
                        </span>
                    </div>
                    <div className="space-y-1.5 max-h-[320px] overflow-y-auto">
                        {col.data.length === 0 ? (
                            <p className="text-[10px] text-gray-300 text-center py-4">
                                No disputes
                            </p>
                        ) : (
                            col.data.map((d) => <DisputeCardItem key={d.id} dispute={d} />)
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════
// FINANCIAL CHARTS (Recharts)
// ═══════════════════════════════════════════════════════════════════════

type Period = 'daily' | 'weekly' | 'monthly' | 'fy';

const PERIOD_LABELS: Record<Period, string> = {
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    fy: 'FY',
};

function RevenueTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-md text-xs">
            <p className="font-bold text-[#1A2F4B] mb-1">{label}</p>
            <p className="text-[#1B6B35]">Revenue: {formatINR(payload[0]?.value || 0)}</p>
            <p className="text-gray-400">Transactions: {payload[0]?.payload?.count || 0}</p>
        </div>
    );
}

function VolumeTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-md text-xs">
            <p className="font-bold text-[#1A2F4B] mb-1">{label}</p>
            <p className="text-[#1A2F4B]">Transactions: {payload[0]?.value || 0}</p>
            <p className="text-gray-400">Value: {formatINR(payload[0]?.payload?.totalValue || 0)}</p>
        </div>
    );
}

function FinancialCharts({
    initialData,
}: {
    initialData: ChartDataPoint[];
}) {
    const [activePeriod, setActivePeriod] = useState<Period>('daily');
    const [chartData, setChartData] = useState<ChartDataPoint[]>(initialData);
    const [loading, setLoading] = useState(false);

    const switchPeriod = useCallback(async (period: Period) => {
        if (period === activePeriod) return;
        setActivePeriod(period);
        setLoading(true);
        try {
            const data = await getFinancialChartData(period);
            setChartData(data);
        } catch {
            setChartData([]);
        }
        setLoading(false);
    }, [activePeriod]);

    return (
        <div className="bg-white rounded-lg border border-[#E5E5E5] p-4">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-[#1A2F4B]">Financial Summary</h3>
                <div className="flex gap-1">
                    {(Object.entries(PERIOD_LABELS) as [Period, string][]).map(([key, label]) => (
                        <button
                            key={key}
                            onClick={() => switchPeriod(key)}
                            className={`text-[11px] px-2.5 py-1 rounded-md transition-colors ${activePeriod === key
                                    ? 'bg-[#1A2F4B] text-white'
                                    : 'text-gray-400 hover:bg-gray-100'
                                }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="h-[200px] flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-[#1B6B35] border-t-transparent rounded-full animate-spin" />
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-4">
                    {/* Revenue Trend Line Chart */}
                    <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-2">
                            Platform Revenue (2%)
                        </p>
                        <ResponsiveContainer width="100%" height={200}>
                            <LineChart data={chartData}>
                                <XAxis
                                    dataKey="label"
                                    tick={{ fontSize: 10, fill: '#9CA3AF' }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis hide />
                                <CartesianGrid horizontal={false} stroke="#E5E5E5" strokeDasharray="3 3" />
                                <Tooltip content={<RevenueTooltip />} />
                                <defs>
                                    <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#F0FAF4" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#F0FAF4" stopOpacity={0.1} />
                                    </linearGradient>
                                </defs>
                                <Area
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="transparent"
                                    fill="url(#revenueFill)"
                                />
                                <Line
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#1B6B35"
                                    strokeWidth={2}
                                    dot={false}
                                    activeDot={{ r: 4, fill: '#1B6B35' }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Transaction Volume Bar Chart */}
                    <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-2">
                            Transaction Volume
                        </p>
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={chartData}>
                                <XAxis
                                    dataKey="label"
                                    tick={{ fontSize: 10, fill: '#9CA3AF' }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis hide />
                                <Tooltip content={<VolumeTooltip />} />
                                <Bar
                                    dataKey="count"
                                    fill="#1A2F4B"
                                    radius={[4, 4, 0, 0]}
                                    barSize={20}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {activePeriod === 'fy' && (
                <p className="text-[10px] text-gray-400 mt-2 text-center">
                    India FY: April 1 – March 31. Period starts April 1, {new Date().getFullYear()}.
                </p>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN CLIENT WRAPPER (Realtime + Polling)
// ═══════════════════════════════════════════════════════════════════════

export default function TransactionDashboardClient({
    initialStats,
    initialEvents,
    initialDisputes,
    initialChartData,
}: {
    initialStats: TransactionStats;
    initialEvents: TransactionEvent[];
    initialDisputes: {
        open: DisputeCard[];
        inReview: DisputeCard[];
        resolved: DisputeCard[];
        escalated: DisputeCard[];
    };
    initialChartData: ChartDataPoint[];
}) {
    const [stats, setStats] = useState(initialStats);
    const [events, setEvents] = useState(initialEvents);
    const [disputes, setDisputes] = useState(initialDisputes);

    // ─── Supabase Realtime for payment_escrows + marketplace_purchases ──
    useEffect(() => {
        const supabase = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        // Channel: payment events
        const paymentChannel = supabase
            .channel('payment-events')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'payment_escrows' },
                (payload) => {
                    const row = payload.new;
                    const newEvent: TransactionEvent = {
                        id: row.id,
                        eventType: 'ESCROW_CREATED',
                        description: `Escrow created — AGG ${(row.aggregator_id || '').slice(0, 8)}`,
                        amount: Number(row.amount) || 0,
                        timestamp: row.created_at,
                        barColor: '#B45309',
                    };
                    setEvents((prev) => [newEvent, ...prev].slice(0, 50));
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'payment_escrows' },
                (payload) => {
                    const row = payload.new;
                    const status = row.status;
                    if (status === 'RELEASED') {
                        const newEvent: TransactionEvent = {
                            id: `${row.id}-released`,
                            eventType: 'PAYMENT_RELEASED',
                            description: `Payment released → AGG ${(row.aggregator_id || '').slice(0, 8)}`,
                            amount: Number(row.amount) || 0,
                            timestamp: new Date().toISOString(),
                            barColor: '#1B6B35',
                        };
                        setEvents((prev) => [newEvent, ...prev].slice(0, 50));
                    }
                }
            )
            .subscribe();

        // Channel: marketplace events
        const marketChannel = supabase
            .channel('marketplace-events')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'marketplace_purchases' },
                (payload) => {
                    const row = payload.new;
                    const newEvent: TransactionEvent = {
                        id: row.id,
                        eventType: 'CERT_PURCHASED',
                        description: `Certificate sold — ${(row.seller_id || '').slice(0, 8)} → ${(row.buyer_id || '').slice(0, 8)}`,
                        amount: Number(row.purchase_price) || 0,
                        timestamp: row.created_at,
                        barColor: '#0E5A6E',
                    };
                    setEvents((prev) => [newEvent, ...prev].slice(0, 50));
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(paymentChannel);
            supabase.removeChannel(marketChannel);
        };
    }, []);

    // ─── Polling: stats every 60s, disputes every 30s ────────────────
    useEffect(() => {
        const statsInterval = setInterval(async () => {
            try {
                const newStats = await getTransactionStats();
                setStats(newStats);
            } catch { /* silent */ }
        }, 60000);

        const disputeInterval = setInterval(async () => {
            try {
                const newDisputes = await getDisputesByStatus();
                setDisputes(newDisputes);
            } catch { /* silent */ }
        }, 30000);

        return () => {
            clearInterval(statsInterval);
            clearInterval(disputeInterval);
        };
    }, []);

    return (
        <div className="space-y-4">
            {/* ─── ROW 1: Stat Cards ─── */}
            <div className="grid grid-cols-4 gap-3">
                <StatCard label="Today's Value" value={stats.todayValue} isCurrency color="#1B6B35" />
                <StatCard label="Platform Revenue (2%)" value={stats.platformRevenue} isCurrency color="#0E5A6E" />
                <StatCard label="Pending Escrow" value={stats.pendingEscrow} isCurrency color="#B45309" />
                <StatCard label="Open Disputes" value={stats.openDisputes} color="#DC2626" />
            </div>

            {/* ─── ROW 2: Transaction Feed + Dispute Tracker ─── */}
            <div className="grid grid-cols-5 gap-4">
                {/* Left: Transaction Feed (60%) */}
                <div className="col-span-3 bg-white rounded-lg border border-[#E5E5E5] overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#E5E5E5]">
                        <h3 className="text-sm font-bold text-[#1A2F4B]">Transaction Feed</h3>
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#1B6B35] opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#1B6B35]" />
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-[#F0FAF4] text-[#1B6B35] rounded">
                            LIVE
                        </span>
                    </div>
                    <TransactionFeed events={events} />
                </div>

                {/* Right: Dispute Tracker (40%) */}
                <div className="col-span-2 bg-white rounded-lg border border-[#E5E5E5] p-3">
                    <h3 className="text-sm font-bold text-[#1A2F4B] mb-3">Dispute Tracker</h3>
                    <DisputeTracker disputes={disputes} />
                </div>
            </div>

            {/* ─── ROW 3: Financial Charts ─── */}
            <FinancialCharts initialData={initialChartData} />
        </div>
    );
}
