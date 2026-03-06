import React from 'react';
import {
    getDashboardMetrics,
    getSystemHealth,
    getTransportStats,
    getFinancialSnapshot,
    getRecentActions,
} from './actions';
import { DashboardRealtime } from './components';
import { formatISTTimestamp } from '@/lib/utils/ist-time';

/**
 * Admin Dashboard — Server Component
 *
 * Module 2.3 Phase 2: 5-row live dashboard.
 * Row 1: Platform Health Strip (system, blockchain, OCR)
 * Row 2: Live Metric Cards (6 animated counters)
 * Row 3: Portal Breakdown Table (sparklines)
 * Row 4: Transport Chain Monitor + Financial Snapshot
 * Row 5: Recent Admin Actions
 *
 * Data is fetched server-side and hydrated via DashboardRealtime
 * client component, which handles 10s polling + 3 Supabase Realtime channels.
 */
export default async function AdminDashboardPage() {
    const [metrics, health, transport, financials, actions] = await Promise.all([
        getDashboardMetrics(),
        getSystemHealth(),
        getTransportStats(),
        getFinancialSnapshot(),
        getRecentActions(),
    ]);

    return (
        <div className="space-y-1">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h1 className="text-xl font-bold text-[#1A2F4B]">Unified Admin Dashboard</h1>
                    <p className="text-xs text-gray-400 mt-0.5">
                        Last refreshed: {formatISTTimestamp(new Date().toISOString())}
                    </p>
                </div>
            </div>

            {/* Live Dashboard — Client Component with Realtime */}
            <DashboardRealtime
                initialMetrics={metrics}
                initialHealth={health}
                initialTransport={transport}
                initialFinancials={financials}
                initialActions={actions}
            />
        </div>
    );
}
