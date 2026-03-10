import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
    getTransactionStats,
    getRecentTransactions,
    getDisputesByStatus,
    getFinancialChartData,
} from './actions';
import TransactionDashboardClient from './components';

/**
 * Transaction Monitoring — Server Component
 *
 * Module 2.6 Phase 2:
 *  Row 1: 4 stat cards (Today's Value, Revenue, Pending Escrow, Open Disputes)
 *  Row 2: Real-time transaction feed (60%) + Dispute tracker kanban (40%)
 *  Row 3: Financial summary charts (Revenue line + Volume bar) with period switcher
 *
 * Data is fetched server-side via Promise.all for fast first paint.
 * Client component handles Realtime subscriptions and polling.
 */
export default async function TransactionMonitoringPage() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/admin/login');

    const [stats, events, disputes, chartData] = await Promise.all([
        getTransactionStats(),
        getRecentTransactions(20),
        getDisputesByStatus(),
        getFinancialChartData('daily'),
    ]);

    return (
        <div className="stitch-page p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold stitch-text-navy tracking-tight">Financial Operations</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Real-time payment feed, dispute tracking, and financial analytics
                    </p>
                </div>
            </div>

            <TransactionDashboardClient
                initialStats={stats}
                initialEvents={events}
                initialDisputes={disputes}
                initialChartData={chartData}
            />
        </div>
    );
}
