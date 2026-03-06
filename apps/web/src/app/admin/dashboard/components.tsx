'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { formatINR, getRelativeTime } from '@/lib/utils/ist-time';
import type {
    DashboardMetrics,
    SystemHealth,
    TransportStats,
    FinancialSnapshot,
    AuditEntry,
} from './actions';

// ═══════════════════════════════════════════════════════════════════════
// ANIMATED COUNTER — requestAnimationFrame ease-out 800ms
// ═══════════════════════════════════════════════════════════════════════
function useAnimatedCounter(target: number, duration = 800) {
    const [value, setValue] = useState(0);
    const frameRef = useRef<number>(0);

    useEffect(() => {
        const start = performance.now();
        const from = 0;

        function tick(now: number) {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            // Ease-out: fast start, slow end
            const eased = 1 - Math.pow(1 - progress, 3);
            setValue(Math.round(from + (target - from) * eased));

            if (progress < 1) {
                frameRef.current = requestAnimationFrame(tick);
            }
        }

        frameRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frameRef.current);
    }, [target, duration]);

    return value;
}

// Skeleton loader
function Skeleton({ w = 'w-20', h = 'h-8' }: { w?: string; h?: string }) {
    return <div className={`${w} ${h} bg-gray-200 rounded animate-pulse`} />;
}

// ═══════════════════════════════════════════════════════════════════════
// ROW 1 — PLATFORM HEALTH STRIP
// ═══════════════════════════════════════════════════════════════════════
export function HealthStrip({ data }: { data: SystemHealth | null }) {
    const [refreshIn, setRefreshIn] = useState(10);

    useEffect(() => {
        const interval = setInterval(() => {
            setRefreshIn((p) => (p <= 0 ? 10 : p - 1));
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    if (!data) return <div className="h-14 bg-white border-b border-[#E5E5E5] animate-pulse" />;

    const systemColor = data.system === 'OPERATIONAL' ? '#1B6B35' : data.system === 'DEGRADED' ? '#B45309' : '#B91C1C';
    const ocrColor = data.ocrRemaining < 2500 ? '#B91C1C' : data.ocrRemaining < 5000 ? '#B45309' : '#1B6B35';

    return (
        <div className="w-full h-14 bg-white border-b border-[#E5E5E5] flex items-center px-6 gap-4">
            {/* System pill */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border" style={{ borderColor: systemColor }}>
                <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: systemColor }} />
                <span className="text-xs font-medium text-gray-600">System</span>
                <span className="text-xs font-bold" style={{ color: systemColor }}>{data.system}</span>
            </div>

            {/* Blockchain pill */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#0E5A6E]">
                <span className="text-xs">✓</span>
                <span className="text-xs font-medium text-gray-600">Blockchain</span>
                <span className="text-xs font-bold text-[#0E5A6E]">
                    {data.blockchainSynced ? 'Polygon Amoy ✓' : 'Syncing...'}
                </span>
            </div>

            {/* OCR pill */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border" style={{ borderColor: ocrColor }}>
                <span className="text-xs font-medium text-gray-600">OCR.space</span>
                <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${(data.ocrRemaining / data.ocrTotal) * 100}%`, backgroundColor: ocrColor }}
                    />
                </div>
                <span className="text-[10px] text-gray-500">
                    {data.ocrRemaining.toLocaleString()} / {data.ocrTotal.toLocaleString()}
                </span>
            </div>

            {/* Refresh countdown */}
            <div className="ml-auto flex items-center gap-1 text-gray-400 text-xs">
                <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 11-6.219-8.56" />
                </svg>
                Refreshing in {refreshIn}s
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════
// ROW 2 — LIVE METRIC CARDS
// ═══════════════════════════════════════════════════════════════════════
interface MetricCardProps {
    label: string;
    value: number;
    subtitle: string;
    icon: React.ReactNode;
    color: string;
    bgTint?: string;
    borderColor?: string;
    isCurrency?: boolean;
}

function MetricCard({ label, value, subtitle, icon, color, bgTint, borderColor, isCurrency }: MetricCardProps) {
    const animatedValue = useAnimatedCounter(value);

    return (
        <div
            className="relative bg-white border border-[#E5E5E5] rounded-lg p-4 transition-all group overflow-hidden cursor-pointer"
            style={{ backgroundColor: bgTint && value > 0 ? bgTint : 'white' }}
        >
            {/* Left border indicator — only visible on hover */}
            <div
                className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                style={{ backgroundColor: borderColor || '#1B6B35' }}
            />
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">{label}</p>
                    <p className="text-3xl font-bold" style={{ color }}>
                        {isCurrency ? formatINR(animatedValue) : animatedValue.toLocaleString('en-IN')}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-1">{subtitle}</p>
                </div>
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: bgTint || '#F0FAF4' }}>
                    {icon}
                </div>
            </div>
        </div>
    );
}

export function LiveMetrics({ data }: { data: DashboardMetrics | null }) {
    if (!data) {
        return (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="bg-white border rounded-lg p-4 h-28 animate-pulse">
                        <Skeleton w="w-32" h="h-4" />
                        <Skeleton w="w-20" h="h-8" />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <MetricCard
                label="Active Users" value={data.activeUsers} subtitle="Across all 5 portals"
                icon={<span className="text-[#1B6B35] text-sm">👥</span>}
                color="#1A2F4B" bgTint="#F0FAF4"
            />
            <MetricCard
                label="Batches in Transit" value={data.batchesInTransit} subtitle="RIGHT NOW"
                icon={<span className="text-[#B45309] text-sm">🚛</span>}
                color="#B45309" bgTint="#FEF3C7" borderColor="#B45309"
            />
            <MetricCard
                label="Pending Approvals" value={data.pendingApprovals}
                subtitle={data.pendingApprovals === 0 ? 'All caught up' : 'Needs review'}
                icon={<span className="text-sm">⚠️</span>}
                color={data.pendingApprovals > 0 ? '#B91C1C' : '#1B6B35'}
                bgTint={data.pendingApprovals > 0 ? '#FEE2E2' : undefined}
                borderColor={data.pendingApprovals > 0 ? '#B91C1C' : undefined}
            />
            <MetricCard
                label="Fraud Alerts" value={data.fraudAlerts.total}
                subtitle={`${data.fraudAlerts.critical} critical · ${data.fraudAlerts.medium} medium`}
                icon={<span className="text-sm">🔥</span>}
                color="#B91C1C" bgTint={data.fraudAlerts.total > 0 ? '#FEE2E2' : undefined}
            />
            <MetricCard
                label="Open Disputes" value={data.openDisputes} subtitle="Weight variance cases"
                icon={<span className="text-sm">⚖️</span>}
                color="#B45309" bgTint={data.openDisputes > 0 ? '#FEF3C7' : undefined}
            />
            <MetricCard
                label="Today's Transactions" value={data.todayTransactions.value}
                subtitle={`${data.todayTransactions.count} transactions today`}
                icon={<span className="text-[#1B6B35] text-sm">₹</span>}
                color="#1B6B35" bgTint="#F0FAF4" isCurrency
            />
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════
// ROW 3 — PORTAL BREAKDOWN TABLE
// ═══════════════════════════════════════════════════════════════════════
const PORTAL_CONFIG = [
    { name: 'Aggregator', badge: 'bg-green-100 text-[#1B6B35]', icon: '🟢' },
    { name: 'Recycler', badge: 'bg-teal-100 text-[#0E5A6E]', icon: '🔵' },
    { name: 'PIBO', badge: 'bg-amber-100 text-[#B45309]', icon: '🟡' },
    { name: 'PRO', badge: 'bg-purple-100 text-[#7C3AED]', icon: '🟣' },
];

function MiniSparkline({ data }: { data: number[] }) {
    if (!data.length) return <div className="w-12 h-6" />;
    const max = Math.max(...data, 1);
    const points = data.map((v, i) => `${(i / (data.length - 1)) * 48},${24 - (v / max) * 20}`).join(' ');

    return (
        <svg viewBox="0 0 48 24" className="w-12 h-6">
            <polyline fill="none" stroke="#1B6B35" strokeWidth="1.5" points={points} />
        </svg>
    );
}

export function PortalTable() {
    return (
        <div className="bg-white border border-[#E5E5E5] rounded-lg overflow-hidden">
            <table className="w-full">
                <thead>
                    <tr className="bg-[#1A2F4B] text-white text-xs uppercase tracking-wider">
                        <th className="px-4 py-3 text-left font-medium">Portal</th>
                        <th className="px-4 py-3 text-left font-medium">Collections / Batches</th>
                        <th className="px-4 py-3 text-left font-medium">Status</th>
                        <th className="px-4 py-3 text-center font-medium">7-Day Trend</th>
                        <th className="px-4 py-3 text-right font-medium"></th>
                    </tr>
                </thead>
                <tbody>
                    {PORTAL_CONFIG.map((portal, i) => (
                        <tr key={portal.name} className={i % 2 === 0 ? 'bg-white' : 'bg-[#F5F5F5]'}>
                            <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                    <span>{portal.icon}</span>
                                    <span className="text-sm font-medium text-[#1A2F4B]">{portal.name}</span>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${portal.badge}`}>
                                        {portal.name.toUpperCase()}
                                    </span>
                                </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-[#1A2F4B]">—</td>
                            <td className="px-4 py-3 text-sm text-gray-500">Operational</td>
                            <td className="px-4 py-3 flex justify-center">
                                <MiniSparkline data={[3, 5, 4, 7, 6, 8, 5]} />
                            </td>
                            <td className="px-4 py-3 text-right">
                                <a href={`/admin/users?portal=${portal.name.toLowerCase()}`} className="text-[#1B6B35] text-xs font-medium hover:underline">
                                    View All →
                                </a>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════
// ROW 4 — TRANSPORT CHAIN MONITOR + FINANCIAL SNAPSHOT
// ═══════════════════════════════════════════════════════════════════════
export function TransportMonitor({ data }: { data: TransportStats | null }) {
    const pickedUp = useAnimatedCounter(data?.pickedUp || 0);
    const inTransit = useAnimatedCounter(data?.inTransit || 0);
    const delivered = useAnimatedCounter(data?.delivered || 0);
    const stale = useAnimatedCounter(data?.stale72hrs || 0);

    return (
        <div className="bg-white border border-[#E5E5E5] rounded-lg p-4">
            <h3 className="text-sm font-bold text-[#1A2F4B] mb-3">Transport Chain Monitor</h3>
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-[#1B6B35]">{pickedUp}</p>
                    <p className="text-[10px] text-gray-500 mt-1">↑ Picked Up</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-[#B45309]">{inTransit}</p>
                    <p className="text-[10px] text-gray-500 mt-1">🚛 In Transit</p>
                </div>
                <div className="bg-teal-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-[#0E5A6E]">{delivered}</p>
                    <p className="text-[10px] text-gray-500 mt-1">✓ Delivered</p>
                </div>
                <div className={`bg-red-50 rounded-lg p-3 text-center ${(data?.stale72hrs || 0) > 0 ? 'animate-pulse border border-[#B91C1C]' : ''}`}>
                    <p className="text-2xl font-bold text-[#B91C1C]">{stale}</p>
                    <p className="text-[10px] text-gray-500 mt-1">⏰ Stale &gt;72hrs</p>
                </div>
            </div>
        </div>
    );
}

export function FinancialCard({ data }: { data: FinancialSnapshot | null }) {
    if (!data) return <div className="bg-white border rounded-lg p-4 h-48 animate-pulse" />;

    const rows = [
        { label: "Today's Transaction Value", value: data.todayValue },
        { label: 'Platform Revenue (2%)', value: data.platformRevenue },
        { label: 'Pending Escrow', value: data.pendingEscrow },
        { label: 'Revenue MTD', value: data.revenueMTD },
    ];

    return (
        <div className="bg-white border border-[#E5E5E5] rounded-lg p-4">
            <h3 className="text-sm font-bold text-[#1A2F4B] mb-3">Financial Snapshot</h3>
            <div className="space-y-3">
                {rows.map((row) => (
                    <div key={row.label} className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">{row.label}</span>
                        <span className="text-sm font-bold text-[#1A2F4B] font-mono">{formatINR(row.value)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════
// ROW 5 — RECENT ADMIN ACTIONS
// ═══════════════════════════════════════════════════════════════════════
export function RecentActions({ data }: { data: AuditEntry[] }) {
    return (
        <div className="bg-white border border-[#E5E5E5] rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold text-[#1A2F4B]">Recent Actions</h3>
                <a href="/admin/audit-log" className="text-xs text-[#1B6B35] font-medium hover:underline">
                    View Full Log →
                </a>
            </div>
            {data.length === 0 ? (
                <p className="text-xs text-gray-400 py-4 text-center">No recent admin actions</p>
            ) : (
                <div className="space-y-0 divide-y divide-gray-100">
                    {data.map((entry) => {
                        const initials = entry.adminName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
                        return (
                            <div key={entry.id} className="flex items-center gap-3 py-2">
                                <div className="w-8 h-8 rounded-full bg-[#1A2F4B] flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                                    {initials}
                                </div>
                                <span className="text-xs text-[#1A2F4B] flex-1">{entry.action}</span>
                                <span className="text-[10px] text-gray-400">{getRelativeTime(entry.createdAt)}</span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════
// REALTIME WRAPPER — Supabase Realtime subscriptions
// ═══════════════════════════════════════════════════════════════════════
interface DashboardRealtimeProps {
    initialMetrics: DashboardMetrics;
    initialHealth: SystemHealth;
    initialTransport: TransportStats;
    initialFinancials: FinancialSnapshot;
    initialActions: AuditEntry[];
}

export function DashboardRealtime({
    initialMetrics,
    initialHealth,
    initialTransport,
    initialFinancials,
    initialActions,
}: DashboardRealtimeProps) {
    const [metrics, setMetrics] = useState(initialMetrics);
    const [health, setHealth] = useState(initialHealth);
    const [transport, setTransport] = useState(initialTransport);
    const [financials, setFinancials] = useState(initialFinancials);
    const [actions] = useState(initialActions);

    // ─── Polling for aggregate metrics (10s) ─────────────────────────
    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                const res = await fetch('/api/admin/dashboard-poll', { cache: 'no-store' });
                if (res.ok) {
                    const data = await res.json();
                    if (data.metrics) setMetrics(data.metrics);
                    if (data.health) setHealth(data.health);
                    if (data.transport) setTransport(data.transport);
                    if (data.financials) setFinancials(data.financials);
                }
            } catch { /* silent */ }
        }, 10000);
        return () => clearInterval(interval);
    }, []);

    // ─── Supabase Realtime for event-driven updates ──────────────────
    useEffect(() => {
        const supabase = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        );

        // Channel 1: batch-events
        const batchChannel = supabase
            .channel('batch-events')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'batches' }, () => {
                setMetrics((prev) => ({ ...prev })); // Trigger re-render, poll will update
            })
            .subscribe();

        // Channel 2: fraud-monitor
        const fraudChannel = supabase
            .channel('fraud-monitor')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'fraud_flags' }, (payload) => {
                const severity = (payload.new as any)?.severity;
                setMetrics((prev) => ({
                    ...prev,
                    fraudAlerts: {
                        ...prev.fraudAlerts,
                        total: prev.fraudAlerts.total + 1,
                        critical: severity === 'CRITICAL' ? prev.fraudAlerts.critical + 1 : prev.fraudAlerts.critical,
                        medium: severity === 'MEDIUM' ? prev.fraudAlerts.medium + 1 : prev.fraudAlerts.medium,
                        low: severity === 'LOW' ? prev.fraudAlerts.low + 1 : prev.fraudAlerts.low,
                    },
                }));
            })
            .subscribe();

        // Channel 3: transport-chain
        const transportChannel = supabase
            .channel('transport-chain')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'batch_transport_events' }, (payload) => {
                const eventType = (payload.new as any)?.event_type;
                setTransport((prev) => ({
                    ...prev,
                    pickedUp: eventType === 'PICKUP' ? prev.pickedUp + 1 : prev.pickedUp,
                    delivered: eventType === 'DELIVERY' ? prev.delivered + 1 : prev.delivered,
                }));
            })
            .subscribe();

        return () => {
            supabase.removeChannel(batchChannel);
            supabase.removeChannel(fraudChannel);
            supabase.removeChannel(transportChannel);
        };
    }, []);

    return (
        <div className="space-y-4">
            {/* ROW 1 */}
            <HealthStrip data={health} />

            {/* ROW 2 */}
            <LiveMetrics data={metrics} />

            {/* ROW 3 */}
            <PortalTable />

            {/* ROW 4 */}
            <div className="grid grid-cols-1 lg:grid-cols-[55%_45%] gap-4">
                <TransportMonitor data={transport} />
                <FinancialCard data={financials} />
            </div>

            {/* ROW 5 */}
            <RecentActions data={actions} />
        </div>
    );
}
