'use server';

import { createServiceRoleClient } from '@/lib/supabase/server';
import {
    getTodayISTMidnight,
    getTomorrowISTMidnight,
    getIndiaFYStart,
} from '@/lib/utils/ist-time';

/**
 * Transaction Monitoring Server Actions — Phase 2 Module 2.6
 *
 * Provides data for:
 *  - 4 stat cards (Today's Value, Platform Revenue, Pending Escrow, Open Disputes)
 *  - Real-time transaction feed (initial load)
 *  - Dispute tracker (4-column kanban)
 *  - Financial summary charts (Recharts data)
 */

// ─── Types ───────────────────────────────────────────────────────────

export interface TransactionStats {
    todayValue: number;
    platformRevenue: number;
    pendingEscrow: number;
    openDisputes: number;
}

export interface TransactionEvent {
    id: string;
    eventType: 'ESCROW_CREATED' | 'PAYMENT_RELEASED' | 'PAYMENT_FAILED' | 'CERT_PURCHASED' | 'ESCROW_HELD' | 'DISPUTE_OPENED' | 'DISPUTE_RESOLVED' | 'PLATFORM_FEE';
    description: string;
    amount: number;
    timestamp: string;
    barColor: string;
    disputeId?: string;
}

export interface DisputeCard {
    id: string;
    batchId: string;
    aggregatorId: string;
    recyclerId: string;
    variancePercent: number;
    status: 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'ESCALATED';
    slaDeadline: string | null;
    adminDecision: string | null;
    createdAt: string;
    resolvedAt: string | null;
}

export interface ChartDataPoint {
    label: string;
    revenue: number;
    count: number;
    totalValue: number;
}

// ─── Event Type Mapping ──────────────────────────────────────────────

const EVENT_COLORS: Record<string, string> = {
    HELD: '#B45309',       // amber-700
    RELEASED: '#1B6B35',   // green-700
    REFUNDED: '#1A2F4B',   // navy-900
    DISPUTED: '#DC2626',   // red-700
};

function mapEscrowToEvent(row: any): TransactionEvent {
    const status = row.status || 'HELD';
    let eventType: TransactionEvent['eventType'] = 'ESCROW_CREATED';
    let description = '';
    let barColor = EVENT_COLORS.HELD;

    switch (status) {
        case 'RELEASED':
            eventType = 'PAYMENT_RELEASED';
            description = `Payment released → AGG ${(row.aggregator_id || '').slice(0, 8)}`;
            barColor = EVENT_COLORS.RELEASED;
            break;
        case 'HELD':
            eventType = 'ESCROW_HELD';
            description = `Escrow held — AGG ${(row.aggregator_id || '').slice(0, 8)}`;
            barColor = EVENT_COLORS.HELD;
            break;
        case 'DISPUTED':
            eventType = 'DISPUTE_OPENED';
            description = `Dispute opened — escrow ${(row.id || '').slice(0, 8)}`;
            barColor = EVENT_COLORS.DISPUTED;
            break;
        case 'REFUNDED':
            eventType = 'PAYMENT_FAILED';
            description = `Refund processed — AGG ${(row.aggregator_id || '').slice(0, 8)}`;
            barColor = EVENT_COLORS.REFUNDED;
            break;
        default:
            eventType = 'ESCROW_CREATED';
            description = `Escrow created — AGG ${(row.aggregator_id || '').slice(0, 8)}`;
            barColor = EVENT_COLORS.HELD;
    }

    return {
        id: row.id,
        eventType,
        description,
        amount: Number(row.amount) || 0,
        timestamp: row.created_at,
        barColor,
    };
}

function mapPurchaseToEvent(row: any): TransactionEvent {
    return {
        id: row.id,
        eventType: 'CERT_PURCHASED',
        description: `Certificate sold — ${(row.seller_id || '').slice(0, 8)} → ${(row.buyer_id || '').slice(0, 8)}`,
        amount: Number(row.purchase_price) || 0,
        timestamp: row.created_at,
        barColor: '#0E5A6E', // teal-700
    };
}

// ─── Stat Cards ──────────────────────────────────────────────────────

export async function getTransactionStats(): Promise<TransactionStats> {
    const admin = createServiceRoleClient();
    const todayIST = getTodayISTMidnight().toISOString();
    const tomorrowIST = getTomorrowISTMidnight().toISOString();

    const [todayRes, pendingRes, disputesRes] = await Promise.all([
        // Today's released payments (IST boundary)
        admin.from('payment_escrows')
            .select('amount')
            .eq('status', 'RELEASED')
            .gte('created_at', todayIST)
            .lt('created_at', tomorrowIST),

        // Pending escrow (HELD)
        admin.from('payment_escrows')
            .select('amount')
            .eq('status', 'HELD'),

        // Open disputes
        admin.from('weight_disputes')
            .select('id', { count: 'exact', head: true })
            .is('resolved_at', null),
    ]);

    const todayValue = (todayRes.data || []).reduce(
        (s: number, r: any) => s + (Number(r.amount) || 0), 0
    );
    const pendingEscrow = (pendingRes.data || []).reduce(
        (s: number, r: any) => s + (Number(r.amount) || 0), 0
    );

    return {
        todayValue,
        platformRevenue: Math.round(todayValue * 0.02),
        pendingEscrow,
        openDisputes: disputesRes.count || 0,
    };
}

// ─── Transaction Feed (initial load) ─────────────────────────────────

export async function getRecentTransactions(limit = 20): Promise<TransactionEvent[]> {
    const admin = createServiceRoleClient();

    const [escrowRes, purchaseRes] = await Promise.all([
        admin.from('payment_escrows')
            .select('id, amount, status, aggregator_id, recycler_id, created_at')
            .order('created_at', { ascending: false })
            .limit(limit),

        admin.from('marketplace_purchases')
            .select('id, purchase_price, buyer_id, seller_id, created_at')
            .order('created_at', { ascending: false })
            .limit(limit),
    ]);

    const escrowEvents = (escrowRes.data || []).map(mapEscrowToEvent);
    const purchaseEvents = (purchaseRes.data || []).map(mapPurchaseToEvent);

    // Merge and sort by timestamp DESC
    const combined = [...escrowEvents, ...purchaseEvents]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);

    return combined;
}

// ─── Dispute Tracker ─────────────────────────────────────────────────

export async function getDisputesByStatus(): Promise<{
    open: DisputeCard[];
    inReview: DisputeCard[];
    resolved: DisputeCard[];
    escalated: DisputeCard[];
}> {
    const admin = createServiceRoleClient();

    const { data } = await admin.from('weight_disputes')
        .select('id, batch_id, aggregator_id, recycler_id, variance_percent, admin_decision, resolution_notes, sla_deadline, created_at, resolved_at')
        .order('created_at', { ascending: false })
        .limit(100);

    const disputes = (data || []).map((d: any) => {
        // Derive status from available fields
        let status: DisputeCard['status'] = 'OPEN';
        if (d.resolved_at) {
            status = 'RESOLVED';
        } else if (d.admin_decision === 'ESCALATED_TO_SENIOR') {
            status = 'ESCALATED';
        } else if (d.admin_decision && d.admin_decision !== '') {
            status = 'IN_REVIEW';
        }

        return {
            id: d.id,
            batchId: d.batch_id || '',
            aggregatorId: d.aggregator_id || '',
            recyclerId: d.recycler_id || '',
            variancePercent: Number(d.variance_percent) || 0,
            status,
            slaDeadline: d.sla_deadline || null,
            adminDecision: d.admin_decision || null,
            createdAt: d.created_at,
            resolvedAt: d.resolved_at || null,
        } as DisputeCard;
    });

    return {
        open: disputes.filter(d => d.status === 'OPEN'),
        inReview: disputes.filter(d => d.status === 'IN_REVIEW'),
        resolved: disputes.filter(d => d.status === 'RESOLVED'),
        escalated: disputes.filter(d => d.status === 'ESCALATED'),
    };
}

// ─── Financial Chart Data ────────────────────────────────────────────

export async function getFinancialChartData(
    period: 'daily' | 'weekly' | 'monthly' | 'fy'
): Promise<ChartDataPoint[]> {
    const admin = createServiceRoleClient();

    // Determine date range and grouping
    let startDate: Date;
    const now = new Date();

    switch (period) {
        case 'daily':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
        case 'weekly':
            startDate = new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000);
            break;
        case 'monthly':
            startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            break;
        case 'fy':
            startDate = getIndiaFYStart();
            break;
    }

    const { data } = await admin.from('payment_escrows')
        .select('amount, status, created_at')
        .eq('status', 'RELEASED')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

    if (!data || data.length === 0) {
        return generateEmptyChartData(period, startDate, now);
    }

    // Group by period bucket
    const buckets = new Map<string, { revenue: number; count: number; totalValue: number }>();

    for (const row of data) {
        const date = new Date(row.created_at);
        const label = getBucketLabel(date, period);

        if (!buckets.has(label)) {
            buckets.set(label, { revenue: 0, count: 0, totalValue: 0 });
        }
        const bucket = buckets.get(label)!;
        const amount = Number(row.amount) || 0;
        bucket.totalValue += amount;
        bucket.revenue += Math.round(amount * 0.02);
        bucket.count += 1;
    }

    return Array.from(buckets.entries()).map(([label, data]) => ({
        label,
        revenue: data.revenue,
        count: data.count,
        totalValue: data.totalValue,
    }));
}

function getBucketLabel(date: Date, period: string): string {
    const istDate = new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
    const day = istDate.getUTCDate();
    const month = istDate.toLocaleString('en-IN', { month: 'short', timeZone: 'Asia/Kolkata' });
    const year = istDate.getUTCFullYear();

    switch (period) {
        case 'daily':
            return `${day} ${month}`;
        case 'weekly': {
            const weekStart = new Date(istDate);
            weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay());
            return `${weekStart.getUTCDate()} ${month}`;
        }
        case 'monthly':
        case 'fy':
            return `${month} ${year}`;
        default:
            return `${day} ${month}`;
    }
}

function generateEmptyChartData(
    period: string,
    startDate: Date,
    endDate: Date
): ChartDataPoint[] {
    const points: ChartDataPoint[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
        const label = getBucketLabel(current, period);
        if (!points.find(p => p.label === label)) {
            points.push({ label, revenue: 0, count: 0, totalValue: 0 });
        }

        switch (period) {
            case 'daily':
                current.setDate(current.getDate() + 1);
                break;
            case 'weekly':
                current.setDate(current.getDate() + 7);
                break;
            case 'monthly':
            case 'fy':
                current.setMonth(current.getMonth() + 1);
                break;
        }
    }

    return points;
}
