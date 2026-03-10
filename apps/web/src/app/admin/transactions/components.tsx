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
    color = 'var(--recco-navy-900)',
}: {
    label: string;
    value: number;
    isCurrency?: boolean;
    color?: string;
}) {
    return (
        <div className="stitch-metric-card">
            <h3 className="stitch-metric-label">{label}</h3>
            <div className="stitch-metric-value" style={{ color }}>
                {isCurrency ? formatINR(value) : value.toLocaleString('en-IN')}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════
// TRANSACTION FEED
// ═══════════════════════════════════════════════════════════════════════

function TransactionFeed({ events }: { events: TransactionEvent[] }) {
    if (events.length === 0) {
        return (
            <div className="bg-[var(--recco-green-50)] border border-[rgba(27,107,53,0.2)] rounded-lg p-8 text-center">
                <p className="stitch-text-green font-medium">No transactions recorded yet</p>
                <p className="text-gray-500 text-sm mt-1">
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
                    className={`flex items-center gap-4 py-3 px-4 transition-colors hover:bg-gray-100 border-b border-gray-100 last:border-0 ${i % 2 === 1 ? 'bg-gray-50/50' : 'bg-white'}`}
                    style={{
                        borderLeft: `4px solid ${event.barColor}`,
                    }}
                >
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium stitch-text-navy truncate">{event.description}</p>
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
                            className="text-[10px] hover:underline" style={{ color: 'var(--recco-teal-700)' }}
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
        normal: 'var(--recco-amber-600)',
        warning: 'var(--recco-amber-600)',
        critical: 'var(--recco-red-600)',
        breached: 'var(--recco-red-600)',
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
    const varianceColor = dispute.variancePercent > 15 ? 'var(--recco-red-600)' : 'var(--recco-amber-600)';

    return (
        <Link
            href={`/admin/disputes/${dispute.id}`}
            className={`block p-3 rounded-lg border transition-all hover:shadow-md ${dispute.status === 'OPEN' ? 'bg-[#FFFBEB] border-[#D97706]' :
                dispute.status === 'IN_REVIEW' ? 'bg-[#F0FDFA] border-[#0D5C63]' :
                    dispute.status === 'RESOLVED' ? 'bg-[#F0FAF4] border-[#1B6B35]' :
                        'bg-[#FEF2F2] border-[#DC2626]'
                }`}
        >
            <p className="text-[11px] font-mono stitch-text-navy font-bold truncate">
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
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--recco-green-50)', color: 'var(--recco-green-700)' }}>
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
        { key: 'open', label: 'Open', data: disputes.open, headerColor: 'var(--recco-amber-600)' },
        { key: 'inReview', label: 'In-Review', data: disputes.inReview, headerColor: 'var(--recco-teal-700)' },
        { key: 'resolved', label: 'Resolved', data: disputes.resolved, headerColor: 'var(--recco-green-700)' },
        { key: 'escalated', label: 'Escalated', data: disputes.escalated, headerColor: 'var(--recco-red-600)' },
    ];

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
            <p className="font-bold stitch-text-navy mb-1">{label}</p>
            <p className="stitch-text-green">Revenue: {formatINR(payload[0]?.value || 0)}</p>
            <p className="text-gray-400">Transactions: {payload[0]?.payload?.count || 0}</p>
        </div>
    );
}

function VolumeTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-md text-xs">
            <p className="font-bold stitch-text-navy mb-1">{label}</p>
            <p className="stitch-text-navy">Transactions: {payload[0]?.value || 0}</p>
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
        <div className="stitch-card hover:shadow-md transition-shadow">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                <h3 className="text-lg font-bold stitch-text-navy">Financial Summary</h3>
                <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                    {(Object.entries(PERIOD_LABELS) as [Period, string][]).map(([key, label]) => (
                        <button
                            key={key}
                            onClick={() => switchPeriod(key)}
                            className={`text-[11px] px-2.5 py-1 rounded-md transition-colors ${activePeriod === key
                                ? 'text-white'
                                : 'text-gray-400 hover:bg-gray-100'
                                }`} style={activePeriod === key ? { backgroundColor: 'var(--recco-navy-900)' } : {}}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="h-[200px] flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--recco-green-700)', borderTopColor: 'transparent' }} />
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
                        barColor: 'var(--recco-amber-600)',
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
                            barColor: 'var(--recco-green-700)',
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
                        barColor: 'var(--recco-teal-700)',
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
        <div className="space-y-6">
            {/* ─── ROW 1: Stat Cards ─── */}
            <div className="stitch-grid-4">
                <StatCard label="Today's Value" value={stats.todayValue} isCurrency color="var(--recco-green-700)" />
                <StatCard label="Platform Revenue (2%)" value={stats.platformRevenue} isCurrency color="var(--recco-teal-700)" />
                <StatCard label="Pending Escrow" value={stats.pendingEscrow} isCurrency color="var(--recco-amber-600)" />
                <StatCard label="Open Disputes" value={stats.openDisputes} color="var(--recco-red-600)" />
            </div>

            {/* ─── ROW 2: Transaction Feed + Dispute Tracker ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Left: Transaction Feed (60%) */}
                <div className="stitch-card col-span-1 lg:col-span-3 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-4">
                        <h3 className="text-lg font-bold stitch-text-navy">Transaction Feed</h3>
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-[var(--recco-green-700)]" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--recco-green-700)]" />
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded stitch-text-green bg-[var(--recco-green-50)]">
                            LIVE
                        </span>
                    </div>
                    <TransactionFeed events={events} />
                </div>

                {/* Right: Dispute Tracker (40%) */}
                <div className="stitch-card col-span-1 lg:col-span-2 hover:shadow-md transition-shadow">
                    <h3 className="text-lg font-bold stitch-text-navy mb-4">Dispute Tracker</h3>
                    <DisputeTracker disputes={disputes} />
                </div>
            </div>

            {/* ─── ROW 3: Financial Charts ─── */}
            <FinancialCharts initialData={initialChartData} />
        </div>
    );
}
