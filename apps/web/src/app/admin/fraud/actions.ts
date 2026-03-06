'use server';

import { createServiceRoleClient } from '@/lib/supabase/server';

// ─── Types ───────────────────────────────────────────────────────────
export type Severity = 'CRITICAL' | 'MEDIUM' | 'LOW';

export interface FraudFlag {
    id: string;
    entityId: string | null;
    flagType: string;
    severity: string;
    evidenceData: Record<string, any>;
    isResolved: boolean;
    createdAt: string;
    entityEmail?: string;
}

export interface SeverityCounts {
    critical: number;
    medium: number;
    low: number;
}

export interface FraudScorePoint {
    date: string;
    score: number;
    flagType: string;
}

// ─── Get severity counts ─────────────────────────────────────────────
export async function getFraudSeverityCounts(): Promise<SeverityCounts> {
    const admin = createServiceRoleClient();

    const [critical, medium, low] = await Promise.all([
        admin.from('fraud_flags').select('id', { count: 'exact', head: true }).eq('severity', 'CRITICAL').eq('is_resolved', false),
        admin.from('fraud_flags').select('id', { count: 'exact', head: true }).eq('severity', 'MEDIUM').eq('is_resolved', false),
        admin.from('fraud_flags').select('id', { count: 'exact', head: true }).eq('severity', 'LOW').eq('is_resolved', false),
    ]);

    return {
        critical: critical.count || 0,
        medium: medium.count || 0,
        low: low.count || 0,
    };
}

// ─── Get fraud flags by severity ─────────────────────────────────────
export async function getFraudFlags(severity: Severity): Promise<FraudFlag[]> {
    const admin = createServiceRoleClient();

    const { data } = await admin
        .from('fraud_flags')
        .select('id, entity_id, flag_type, severity, evidence_data, is_resolved, created_at')
        .eq('severity', severity)
        .eq('is_resolved', false)
        .order('created_at', { ascending: false })
        .limit(20);

    if (!data || data.length === 0) return [];

    // Fetch entity emails for display
    const entityIds = Array.from(new Set(data.map((d: any) => d.entity_id).filter(Boolean)));
    let emailMap: Record<string, string> = {};

    if (entityIds.length > 0) {
        const { data: profiles } = await admin
            .from('user_profiles')
            .select('id, email')
            .in('id', entityIds);
        if (profiles) {
            emailMap = Object.fromEntries(profiles.map((p: any) => [p.id, p.email]));
        }
    }

    return data.map((d: any) => ({
        id: d.id,
        entityId: d.entity_id,
        flagType: d.flag_type,
        severity: d.severity,
        evidenceData: d.evidence_data || {},
        isResolved: d.is_resolved,
        createdAt: d.created_at,
        entityEmail: d.entity_id ? emailMap[d.entity_id] : undefined,
    }));
}

// ─── Resolve a fraud flag ────────────────────────────────────────────
export async function resolveFraudFlag(
    flagId: string,
    adminUserId: string,
    resolutionNote: string,
): Promise<{ success: boolean; error?: string }> {
    if (!resolutionNote || resolutionNote.length < 10) {
        return { success: false, error: 'Resolution note must be at least 10 characters' };
    }

    const admin = createServiceRoleClient();

    try {
        // Mark resolved
        const { error } = await admin
            .from('fraud_flags')
            .update({ is_resolved: true })
            .eq('id', flagId);

        if (error) return { success: false, error: error.message };

        // Audit log
        await admin.from('admin_audit_log').insert({
            admin_id: adminUserId,
            action: 'FRAUD_FLAG_RESOLVED',
            entity_type: 'FRAUD_FLAG',
            entity_id: flagId,
            new_data: { resolution_note: resolutionNote },
        });

        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

// ─── Get entities with fraud scores for chart ────────────────────────
export async function getFraudScoreEntities(): Promise<Array<{ id: string; email: string; score: number }>> {
    const admin = createServiceRoleClient();

    const { data } = await admin
        .from('user_profiles')
        .select('id, email, fraud_score')
        .gt('fraud_score', 0)
        .order('fraud_score', { ascending: false })
        .limit(50);

    return (data || []).map((d: any) => ({
        id: d.id,
        email: d.email,
        score: d.fraud_score,
    }));
}

// ─── Get fraud score history for an entity (running score over flags) ─
export async function getFraudScoreHistory(entityId: string): Promise<FraudScorePoint[]> {
    const admin = createServiceRoleClient();

    const { data } = await admin
        .from('fraud_flags')
        .select('created_at, flag_type, severity')
        .eq('entity_id', entityId)
        .order('created_at', { ascending: true });

    if (!data || data.length === 0) return [];

    // Build running score
    const WEIGHTS: Record<string, number> = { CRITICAL: 25, MEDIUM: 10, LOW: 3 };
    let runningScore = 0;

    return data.map((d: any) => {
        runningScore = Math.min(100, runningScore + (WEIGHTS[d.severity] || 0));
        return {
            date: d.created_at,
            score: runningScore,
            flagType: d.flag_type,
        };
    });
}

// ─── Get fraud score threshold from system_config ────────────────────
export async function getFraudThreshold(): Promise<number> {
    const admin = createServiceRoleClient();
    const { data } = await admin
        .from('system_config')
        .select('value')
        .eq('key', 'fraud_score_threshold')
        .single();

    return data?.value ? parseInt(data.value, 10) : 80;
}
