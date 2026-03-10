'use client';

import React, { useState, useEffect, useRef } from 'react';
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
// ANIMATED COUNTER
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

// ═══════════════════════════════════════════════════════════════════════
// ROW 1 — STAT CARDS (4 Columns)
// ═══════════════════════════════════════════════════════════════════════

interface MetricCardProps {
    label: string;
    value: number;
    subtitle: string;
    icon: string;
    borderColor: string;
    color: string;
    isPercentage?: boolean;
    linkText: string;
    linkHref: string;
}

function MetricCard({ label, value, subtitle, icon, borderColor, color, isPercentage, linkText, linkHref }: MetricCardProps) {
    const animatedValue = useAnimatedCounter(value);

    return (
        <div className="stitch-metric-card group">
            <div
                className="absolute left-0 top-0 bottom-0 w-[4px] rounded-l-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                style={{ backgroundColor: borderColor }}
            />
            <div className="flex items-start justify-between">
                <div>
                    <h3 className="stitch-metric-label">{label}</h3>
                    <div className="flex items-baseline gap-1 mt-2 mb-1">
                        <span className="stitch-metric-lg" style={{ color: color }}>
                            {animatedValue.toLocaleString('en-IN')}
                        </span>
                        {isPercentage && <span className="text-xl font-bold" style={{ color: color }}>%</span>}
                    </div>
                    <p className="stitch-metric-subtitle">{subtitle}</p>
                </div>
                <div className="stitch-icon-circle bg-gray-50 flex items-center justify-center text-xl">
                    {icon}
                </div>
            </div>

            {isPercentage && (
                <div className="mt-4 mb-2">
                    <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${value}%`, backgroundColor: borderColor }}
                        />
                    </div>
                </div>
            )}

            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                <a href={linkHref} className="stitch-link !text-[13px] font-semibold" style={{ color: borderColor }}>
                    {linkText}
                </a>
            </div>
        </div>
    );
}

export function LiveMetrics({ data }: { data: DashboardMetrics | null }) {
    if (!data) {
        return (
            <div className="stitch-grid-4 mb-6">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="stitch-card h-40 stitch-skeleton" />
                ))}
            </div>
        );
    }

    return (
        <div className="stitch-grid-4 mb-6">
            <MetricCard
                label="Pending User Approvals"
                value={data.pendingApprovals}
                subtitle="Awaiting review across all portals"
                icon="👥"
                color="inherit"
                borderColor="var(--recco-amber-700)"
                linkText="Review Approvals &rarr;"
                linkHref="/admin/users"
            />
            <MetricCard
                label="Active Weight Disputes"
                value={data.openDisputes}
                subtitle="Resolved within 24h SLA: 84%"
                icon="⚖️"
                color="inherit"
                borderColor="var(--recco-red-700)"
                linkText="Resolve Disputes &rarr;"
                linkHref="/admin/disputes"
            />
            <MetricCard
                label="Suspicious Transactions"
                value={data.fraudAlerts.total}
                subtitle={`${data.fraudAlerts.critical} Critical Alerts Active`}
                icon="🛡️"
                color="inherit"
                borderColor="var(--recco-teal-700)"
                linkText="Investigate Alerts &rarr;"
                linkHref="/admin/fraud"
            />
            <MetricCard
                label="Overall CPCB Target"
                value={78} // Simulated metric since not in standard DashboardMetrics
                subtitle="FY 24-25 Compliance Trajectory"
                icon="📈"
                color="var(--recco-green-700)"
                borderColor="var(--recco-green-700)"
                isPercentage={true}
                linkText="View Analytics &rarr;"
                linkHref="/admin/analytics"
            />
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════
// LEFT PANEL (60%) — High-Priority Actions & Operations
// ═══════════════════════════════════════════════════════════════════════

export function HighPriorityActions({ actions, transport }: { actions: AuditEntry[], transport: TransportStats | null }) {
    return (
        <div className="space-y-6">
            <div className="stitch-card p-0 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <div>
                        <h2 className="stitch-section-title !mb-1">High-Priority Actions</h2>
                        <p className="text-sm text-gray-500">Items requiring immediate intervention</p>
                    </div>
                    <span className="stitch-count-badge">{actions.length}</span>
                </div>

                <div className="divide-y divide-gray-100">
                    {actions.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 text-sm">No critical actions pending.</div>
                    ) : (
                        actions.map((entry) => (
                            <div key={entry.id} className="p-4 px-6 flex items-start gap-4 hover:bg-gray-50 transition-colors">
                                <div className="mt-1 w-2 h-2 rounded-full bg-red-600 flex-shrink-0" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900">{entry.action}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs text-gray-500">Initiated by {entry.adminName}</span>
                                        <span className="text-xs text-gray-300">•</span>
                                        <span className="text-xs text-gray-500">{getRelativeTime(entry.createdAt)}</span>
                                    </div>
                                </div>
                                <button className="stitch-btn stitch-btn-outline !h-8 !text-xs !py-0 !px-3">
                                    Review
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {transport && (
                <div className="stitch-card">
                    <h2 className="stitch-section-title">Logistics & Transport Engine</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 border divide-x divide-gray-100 rounded-lg bg-gray-50 mt-4 overflow-hidden">
                        <div className="p-4 text-center">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Picked Up</p>
                            <p className="text-2xl font-bold">{transport.pickedUp}</p>
                        </div>
                        <div className="p-4 text-center bg-blue-50/50">
                            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-2">In Transit</p>
                            <p className="text-2xl font-bold text-blue-900">{transport.inTransit}</p>
                        </div>
                        <div className="p-4 text-center bg-green-50/50">
                            <p className="text-xs font-semibold text-green-700 uppercase tracking-wider mb-2">Delivered</p>
                            <p className="text-2xl font-bold text-green-900">{transport.delivered}</p>
                        </div>
                        <div className="p-4 text-center bg-red-50/50">
                            <p className="text-xs font-semibold text-red-700 uppercase tracking-wider mb-2">SLA Breach</p>
                            <p className="text-2xl font-bold text-red-900">{transport.stale72hrs}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


// ═══════════════════════════════════════════════════════════════════════
// RIGHT PANEL (40%) — Platform Health & Alerts
// ═══════════════════════════════════════════════════════════════════════

export function PlatformHealthPanel({ health, financials }: { health: SystemHealth | null, financials: FinancialSnapshot | null }) {
    const [refreshIn, setRefreshIn] = useState(10);

    useEffect(() => {
        const interval = setInterval(() => {
            setRefreshIn((p) => (p <= 0 ? 10 : p - 1));
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="space-y-6">
            <div className="stitch-card">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="stitch-section-title !mb-0">Platform Health</h2>
                    <span className="text-xs text-gray-400">Refreshes in {refreshIn}s</span>
                </div>

                {!health ? (
                    <div className="h-40 stitch-skeleton rounded-lg" />
                ) : (
                    <div className="space-y-4">
                        {/* System core status */}
                        <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                            <div className="flex items-center gap-3">
                                <div className={`stitch-pulse-dot ${health.system === 'OPERATIONAL' ? 'stitch-pulse-dot-green' : 'stitch-pulse-dot-red'}`} />
                                <span className="font-semibold text-sm">Core Systems</span>
                            </div>
                            <span className={`text-xs font-bold px-2 py-1 rounded bg-white border ${health.system === 'OPERATIONAL' ? 'text-green-700 border-green-200' : 'text-red-700 border-red-200'}`}>
                                {health.system}
                            </span>
                        </div>

                        {/* Blockchain Status */}
                        <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                            <div className="flex items-center gap-3">
                                <span className="text-teal-700">⬡</span>
                                <span className="font-semibold text-sm">Blockchain Ledger</span>
                            </div>
                            <span className={`text-xs font-bold px-2 py-1 rounded bg-white border ${health.blockchainSynced ? 'text-teal-700 border-teal-200' : 'text-amber-700 border-amber-200'}`}>
                                {health.blockchainSynced ? 'SYNCED' : 'SYNCING'}
                            </span>
                        </div>

                        {/* Financial Snapshot inside Health for layout compactness */}
                        {financials && (
                            <div className="mt-8 pt-6 border-t border-gray-100">
                                <h3 className="stitch-subsection-title mb-4">Live Escrow Volume</h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-500">Today&apos;s Tx Value</span>
                                        <strong className="stitch-value-mono">{formatINR(financials.todayValue)}</strong>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-500">Held in Escrow</span>
                                        <strong className="stitch-value-mono text-amber-700">{formatINR(financials.pendingEscrow)}</strong>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* SLA Tracker Box */}
            <div className="stitch-card bg-slate-900 border-slate-800 text-white shadow-lg">
                <h3 className="text-slate-300 text-xs font-bold uppercase tracking-widest mb-4">SLA Breach Tracker</h3>
                <div className="space-y-3">
                    <div className="flex justify-between items-center bg-slate-800 p-3 rounded">
                        <span className="text-sm">Pending Disposals &gt; 48hr</span>
                        <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded">12 Critical</span>
                    </div>
                    <div className="flex justify-between items-center bg-slate-800 p-3 rounded">
                        <span className="text-sm">Unresponsive PIBOs</span>
                        <span className="bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded">8 Warnings</span>
                    </div>
                </div>
            </div>
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

    // Polling for aggregate metrics (10s)
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

    // Supabase Realtime for event-driven updates
    useEffect(() => {
        const supabase = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        );

        const batchChannel = supabase
            .channel('batch-events')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'batches' }, () => {
                setMetrics((prev) => ({ ...prev }));
            })
            .subscribe();

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

        return () => {
            supabase.removeChannel(batchChannel);
            supabase.removeChannel(fraudChannel);
        };
    }, []);

    return (
        <div className="stitch-page">
            <LiveMetrics data={metrics} />

            <div className="stitch-split-panel">
                <HighPriorityActions actions={actions} transport={transport} />
                <PlatformHealthPanel health={health} financials={financials} />
            </div>
        </div>
    );
}
