'use server';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { getTodayISTMidnight, getTomorrowISTMidnight } from '@/lib/utils/ist-time';

/**
 * Dashboard Server Actions — Phase 2 Module 2.3
 * All data fetching for the Unified Admin Dashboard.
 * Uses service role client to bypass RLS for admin aggregate queries.
 */

export interface DashboardMetrics {
    activeUsers: number;
    batchesInTransit: number;
    pendingApprovals: number;
    fraudAlerts: { total: number; critical: number; medium: number; low: number };
    openDisputes: number;
    todayTransactions: { count: number; value: number };
}

export interface SystemHealth {
    system: 'OPERATIONAL' | 'DEGRADED' | 'DOWN';
    systemLatency: number;
    blockchainSynced: boolean;
    blockchainLastSync: string | null;
    ocrRemaining: number;
    ocrTotal: number;
}

export interface PortalRow {
    portal: string;
    color: string;
    collections: number;
    batches: number;
    statusBreakdown: string;
    sparkline: number[];
}

export interface TransportStats {
    pickedUp: number;
    inTransit: number;
    delivered: number;
    stale72hrs: number;
}

export interface FinancialSnapshot {
    todayValue: number;
    platformRevenue: number;
    pendingEscrow: number;
    revenueMTD: number;
}

export interface AuditEntry {
    id: string;
    adminName: string;
    action: string;
    createdAt: string;
}

// ─── System Health ───────────────────────────────────────────────────
export async function getSystemHealth(): Promise<SystemHealth> {
    const admin = createServiceRoleClient();
    const start = Date.now();

    try {
        await admin.from('system_config').select('key').limit(1).single();
        const latency = Date.now() - start;

        // Blockchain sync check
        const { data: lastCP } = await admin
            .from('batch_checkpoints')
            .select('created_at')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        const blockchainSynced = lastCP
            ? (Date.now() - new Date(lastCP.created_at).getTime()) < 5 * 60 * 1000
            : true; // No checkpoints yet = considered synced

        // OCR quota
        const { data: ocrConfig } = await admin
            .from('system_config')
            .select('value')
            .eq('key', 'ocr_calls_this_month')
            .single();

        const ocrUsed = ocrConfig ? parseInt(ocrConfig.value, 10) : 0;

        return {
            system: latency < 500 ? 'OPERATIONAL' : latency < 2000 ? 'DEGRADED' : 'DOWN',
            systemLatency: latency,
            blockchainSynced,
            blockchainLastSync: lastCP?.created_at || null,
            ocrRemaining: 25000 - ocrUsed,
            ocrTotal: 25000,
        };
    } catch {
        return {
            system: 'DOWN',
            systemLatency: 9999,
            blockchainSynced: false,
            blockchainLastSync: null,
            ocrRemaining: 0,
            ocrTotal: 25000,
        };
    }
}

// ─── Live Metrics ────────────────────────────────────────────────────
export async function getDashboardMetrics(): Promise<DashboardMetrics> {
    const admin = createServiceRoleClient();
    const todayIST = getTodayISTMidnight().toISOString();
    const tomorrowIST = getTomorrowISTMidnight().toISOString();

    const [
        activeUsersRes,
        batchesRes,
        pendingAggRes,
        pendingRecRes,
        pendingPiboRes,
        pendingProRes,
        fraudRes,
        disputesRes,
        txRes,
    ] = await Promise.all([
        // Active users: updated in last 15 minutes
        admin.from('user_profiles')
            .select('id', { count: 'exact', head: true })
            .gte('updated_at', new Date(Date.now() - 15 * 60 * 1000).toISOString()),

        // Batches in transit
        admin.from('batches')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'IN_TRANSIT'),

        // Pending approvals — aggregators
        admin.from('aggregator_profiles')
            .select('id', { count: 'exact', head: true })
            .eq('approval_status', 'PENDING_ADMIN_REVIEW')
            .not('user_id', 'is', null),

        // Pending approvals — recyclers
        admin.from('recycler_facilities')
            .select('id', { count: 'exact', head: true })
            .eq('approval_status', 'PENDING_ADMIN_REVIEW')
            .not('user_id', 'is', null),

        // Pending approvals — PIBOs
        admin.from('pibo_entities')
            .select('id', { count: 'exact', head: true })
            .eq('approval_status', 'PENDING_ADMIN_REVIEW')
            .not('user_id', 'is', null),

        // Pending approvals — PROs
        admin.from('pro_organisations')
            .select('id', { count: 'exact', head: true })
            .eq('approval_status', 'PENDING_ADMIN_REVIEW')
            .not('user_id', 'is', null),

        // Fraud alerts by severity (unresolved)
        admin.from('fraud_flags')
            .select('severity')
            .is('resolved_at', null),

        // Open disputes
        admin.from('weight_disputes')
            .select('id', { count: 'exact', head: true })
            .is('resolved_at', null),

        // Today's transactions (IST boundary)
        admin.from('payment_escrows')
            .select('amount_inr')
            .gte('created_at', todayIST)
            .lt('created_at', tomorrowIST),
    ]);

    const fraudData = fraudRes.data || [];
    const txData = txRes.data || [];

    return {
        activeUsers: activeUsersRes.count || 0,
        batchesInTransit: batchesRes.count || 0,
        pendingApprovals:
            (pendingAggRes.count || 0) +
            (pendingRecRes.count || 0) +
            (pendingPiboRes.count || 0) +
            (pendingProRes.count || 0),
        fraudAlerts: {
            total: fraudData.length,
            critical: fraudData.filter((f: any) => f.severity === 'CRITICAL').length,
            medium: fraudData.filter((f: any) => f.severity === 'MEDIUM').length,
            low: fraudData.filter((f: any) => f.severity === 'LOW').length,
        },
        openDisputes: disputesRes.count || 0,
        todayTransactions: {
            count: txData.length,
            value: txData.reduce((sum: number, t: any) => sum + (t.amount_inr || 0), 0),
        },
    };
}

// ─── Transport Stats ─────────────────────────────────────────────────
export async function getTransportStats(): Promise<TransportStats> {
    const admin = createServiceRoleClient();

    const [pickupRes, transitRes, deliveryRes, staleRes] = await Promise.all([
        // Batches Picked Up
        admin.from('batches')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'IN_TRANSIT')
            .not('picked_up_at', 'is', null),

        // Batches In Transit
        admin.from('batches')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'IN_TRANSIT'),

        // Batches Delivered (ARRIVED status)
        admin.from('batches')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'ARRIVED'),

        // Transit > 72 Hours (From fraud_flags JOIN batches)
        // Since we can't easily do a pure inner join with count via supabase-js without complex PostgREST syntax,
        // we can fetch the distinct batch_ids from fraud_flags and filter by status
        admin.from('fraud_flags')
            .select('batch_id, batches!inner(status)')
            .eq('flag_type', 'TRANSIT_TIME')
            .eq('batches.status', 'IN_TRANSIT')
    ]);

    // Distinct batch IDs for stale flags
    const staleBatchIds = new Set(staleRes.data?.map(f => f.batch_id) || []);

    return {
        pickedUp: pickupRes.count || 0,
        inTransit: transitRes.count || 0,
        delivered: deliveryRes.count || 0,
        stale72hrs: staleBatchIds.size,
    };
}

// ─── Financial Snapshot ──────────────────────────────────────────────
export async function getFinancialSnapshot(): Promise<FinancialSnapshot> {
    const admin = createServiceRoleClient();
    const todayIST = getTodayISTMidnight().toISOString();
    const tomorrowIST = getTomorrowISTMidnight().toISOString();

    // Get first day of month (IST)
    const now = new Date();
    const istNow = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
    const monthStart = new Date(Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), 1));
    const monthStartIST = new Date(monthStart.getTime() - 5.5 * 60 * 60 * 1000).toISOString();

    const [todayRes, pendingRes, mtdRes] = await Promise.all([
        admin.from('payment_escrows')
            .select('amount_inr')
            .gte('created_at', todayIST)
            .lt('created_at', tomorrowIST),

        admin.from('payment_escrows')
            .select('amount_inr')
            .eq('status', 'HELD'),

        admin.from('payment_escrows')
            .select('amount_inr')
            .gte('created_at', monthStartIST),
    ]);

    const todayValue = (todayRes.data || []).reduce((s: number, r: any) => s + (r.amount_inr || 0), 0);
    const pendingEscrow = (pendingRes.data || []).reduce((s: number, r: any) => s + (r.amount_inr || 0), 0);
    const mtdTotal = (mtdRes.data || []).reduce((s: number, r: any) => s + (r.amount_inr || 0), 0);

    return {
        todayValue,
        platformRevenue: Math.round(todayValue * 0.02),
        pendingEscrow,
        revenueMTD: Math.round(mtdTotal * 0.02),
    };
}

// ─── Recent Admin Actions ────────────────────────────────────────────
export async function getRecentActions(): Promise<AuditEntry[]> {
    const admin = createServiceRoleClient();

    const { data } = await admin
        .from('admin_audit_log')
        .select('id, admin_user_id, action_type, entity_type, entity_id, outcome, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

    if (!data || data.length === 0) return [];

    // Fetch admin names
    const adminIds = Array.from(new Set(data.map((d: any) => d.admin_user_id)));
    const { data: profiles } = await admin
        .from('user_profiles')
        .select('id, full_name')
        .in('id', adminIds);

    const nameMap = new Map((profiles || []).map((p: any) => [p.id, p.full_name]));

    return data.map((entry: any) => ({
        id: entry.id,
        adminName: nameMap.get(entry.admin_user_id) || 'Admin',
        action: `${entry.action_type} ${entry.entity_type || ''} ${entry.entity_id ? '#' + String(entry.entity_id).slice(0, 8) : ''}`.trim(),
        createdAt: entry.created_at,
    }));
}
