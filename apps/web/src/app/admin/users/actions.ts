'use server';

import { createServiceRoleClient } from '@/lib/supabase/server';

// ─── Types ───────────────────────────────────────────────────────────
export type PortalFilter = 'all' | 'aggregator' | 'recycler' | 'pibo' | 'pro' | 'pending';
export type EntityType = 'AGGREGATOR' | 'RECYCLER' | 'PIBO' | 'PRO';

export interface UserRow {
    id: string;
    email: string;
    fullName: string;
    portalRole: string;
    fraudScore: number;
    isApproved: boolean;
    createdAt: string;
    approvalStatus: string | null;
    entityName: string | null;
}

export interface UserListResult {
    users: UserRow[];
    total: number;
    pendingCount: number;
}

export interface EntityDetail {
    userId: string;
    email: string;
    fullName: string;
    portalRole: string;
    fraudScore: number;
    isApproved: boolean;
    createdAt: string;
    entityType: EntityType | null;
    entityData: Record<string, any>;
    approvalStatus: string | null;
    slaSecondsRemaining: number | null;
    documents: any[];
    auditHistory: any[];
}

// ─── User List with Search, Filter, Pagination ───────────────────────
export async function getUserList(
    q: string = '',
    portal: PortalFilter = 'all',
    page: number = 1,
    pageSize: number = 20,
): Promise<UserListResult> {
    const admin = createServiceRoleClient();
    const offset = (page - 1) * pageSize;

    // Base query
    let query = admin
        .from('user_profiles')
        .select('id, email, full_name, portal_role, fraud_score, is_approved, created_at', { count: 'exact' });

    // Portal filter
    if (portal === 'aggregator') query = query.eq('portal_role', 'AGGREGATOR');
    else if (portal === 'recycler') query = query.eq('portal_role', 'RECYCLER');
    else if (portal === 'pibo') query = query.eq('portal_role', 'PIBO');
    else if (portal === 'pro') query = query.eq('portal_role', 'PRO');
    else if (portal !== 'all' && portal !== 'pending') query = query.neq('portal_role', 'ADMIN');

    // Search filter
    if (q) {
        query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`);
    }

    // Exclude admins from user management
    if (portal !== 'all') {
        query = query.neq('portal_role', 'ADMIN');
    }

    query = query.order('created_at', { ascending: false }).range(offset, offset + pageSize - 1);

    const { data: profiles, count } = await query;

    // Get pending count
    const [pendingRec, pendingPibo, pendingPro] = await Promise.all([
        admin.from('recycler_facilities').select('id', { count: 'exact', head: true }).eq('approval_status', 'PENDING_ADMIN_REVIEW'),
        admin.from('pibo_entities').select('id', { count: 'exact', head: true }).eq('approval_status', 'PENDING_ADMIN_REVIEW'),
        admin.from('pro_organisations').select('id', { count: 'exact', head: true }).eq('approval_status', 'PENDING_ADMIN_REVIEW'),
    ]);

    const pendingCount = (pendingRec.count || 0) + (pendingPibo.count || 0) + (pendingPro.count || 0);

    // If pending filter, get only pending entities
    if (portal === 'pending') {
        const [recPending, piboPending, proPending] = await Promise.all([
            admin.from('recycler_facilities').select('owner_id, facility_name, approval_status, submitted_at').eq('approval_status', 'PENDING_ADMIN_REVIEW'),
            admin.from('pibo_entities').select('id, company_name, approval_status, submitted_at').eq('approval_status', 'PENDING_ADMIN_REVIEW'),
            admin.from('pro_organisations').select('id, org_name, approval_status, submitted_at').eq('approval_status', 'PENDING_ADMIN_REVIEW'),
        ]);

        const pendingIds = [
            ...(recPending.data || []).map((r: any) => r.owner_id),
            ...(piboPending.data || []).map((p: any) => p.id),
            ...(proPending.data || []).map((p: any) => p.id),
        ].filter(Boolean);

        if (pendingIds.length === 0) return { users: [], total: 0, pendingCount };

        const { data: pendingProfiles, count: pCount } = await admin
            .from('user_profiles')
            .select('id, email, full_name, portal_role, fraud_score, is_approved, created_at', { count: 'exact' })
            .in('id', pendingIds)
            .range(offset, offset + pageSize - 1);

        return {
            users: (pendingProfiles || []).map((p: any) => ({
                id: p.id,
                email: p.email,
                fullName: p.full_name || p.email,
                portalRole: p.portal_role,
                fraudScore: p.fraud_score || 0,
                isApproved: p.is_approved || false,
                createdAt: p.created_at,
                approvalStatus: 'PENDING_ADMIN_REVIEW',
                entityName: null,
            })),
            total: pCount || 0,
            pendingCount,
        };
    }

    return {
        users: await enrichUsersWithEntityNames(admin, profiles || []),
        total: count || 0,
        pendingCount,
    };
}

/**
 * Enriches user rows with entity names from their respective entity tables.
 * This ensures recycler/PIBO/PRO user details show in admin just like aggregator details.
 */
async function enrichUsersWithEntityNames(admin: any, profiles: any[]): Promise<UserRow[]> {
    if (profiles.length === 0) return [];

    const userIds = profiles.map((p: any) => p.id);

    // Fetch entity names from all 4 tables in parallel
    const [aggRes, recRes, piboRes, proRes] = await Promise.all([
        admin.from('aggregator_profiles').select('id, business_name').in('id', userIds),
        admin.from('recycler_facilities').select('owner_id, facility_name').in('owner_id', userIds),
        admin.from('pibo_entities').select('id, company_name').in('id', userIds),
        admin.from('pro_organisations').select('id, org_name').in('id', userIds),
    ]);

    // Build userId -> entityName map
    const entityNameMap = new Map<string, string>();
    (aggRes.data || []).forEach((a: any) => entityNameMap.set(a.id, a.business_name || ''));
    (recRes.data || []).forEach((r: any) => entityNameMap.set(r.owner_id, r.facility_name || ''));
    (piboRes.data || []).forEach((p: any) => entityNameMap.set(p.id, p.company_name || ''));
    (proRes.data || []).forEach((p: any) => entityNameMap.set(p.id, p.org_name || ''));

    // Also build userId -> approvalStatus map
    const approvalMap = new Map<string, string>();
    (recRes.data || []).forEach((r: any) => { if (r.approval_status) approvalMap.set(r.owner_id, r.approval_status); });
    (piboRes.data || []).forEach((p: any) => { if (p.approval_status) approvalMap.set(p.id, p.approval_status); });
    (proRes.data || []).forEach((p: any) => { if (p.approval_status) approvalMap.set(p.id, p.approval_status); });

    return profiles.map((p: any) => ({
        id: p.id,
        email: p.email,
        fullName: p.full_name || p.email,
        portalRole: p.portal_role,
        fraudScore: p.fraud_score || 0,
        isApproved: p.is_approved || false,
        createdAt: p.created_at,
        approvalStatus: approvalMap.get(p.id) || null,
        entityName: entityNameMap.get(p.id) || null,
    }));
}

// ─── Entity Detail ───────────────────────────────────────────────────
export async function getEntityDetail(userId: string): Promise<EntityDetail | null> {
    const admin = createServiceRoleClient();

    const { data: profile } = await admin
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (!profile) return null;

    let entityType: EntityType | null = null;
    let entityData: Record<string, any> = {};
    let approvalStatus: string | null = null;
    let slaSecondsRemaining: number | null = null;
    let documents: any[] = [];

    const portalRole = profile.portal_role;

    if (portalRole === 'RECYCLER') {
        entityType = 'RECYCLER';
        const { data } = await admin.from('recycler_facilities').select('*').eq('owner_id', userId).single();
        if (data) {
            entityData = data;
            approvalStatus = data.approval_status;
            if (approvalStatus === 'PENDING_ADMIN_REVIEW' && data.submitted_at) {
                const deadline = new Date(data.submitted_at).getTime() + 48 * 60 * 60 * 1000;
                slaSecondsRemaining = Math.floor((deadline - Date.now()) / 1000);
            }
            // Get documents
            const { data: docs } = await admin.from('recycler_documents').select('*').eq('facility_id', data.id);
            documents = docs || [];
        }
    } else if (portalRole === 'PIBO') {
        entityType = 'PIBO';
        const { data } = await admin.from('pibo_entities').select('*').eq('id', userId).single();
        if (data) {
            entityData = data;
            approvalStatus = data.approval_status;
            if (approvalStatus === 'PENDING_ADMIN_REVIEW' && data.submitted_at) {
                const deadline = new Date(data.submitted_at).getTime() + 48 * 60 * 60 * 1000;
                slaSecondsRemaining = Math.floor((deadline - Date.now()) / 1000);
            }
        }
    } else if (portalRole === 'PRO') {
        entityType = 'PRO';
        const { data } = await admin.from('pro_organisations').select('*').eq('id', userId).single();
        if (data) {
            entityData = data;
            approvalStatus = data.approval_status;
            if (approvalStatus === 'PENDING_ADMIN_REVIEW' && data.submitted_at) {
                const deadline = new Date(data.submitted_at).getTime() + 48 * 60 * 60 * 1000;
                slaSecondsRemaining = Math.floor((deadline - Date.now()) / 1000);
            }
        }
    } else if (portalRole === 'AGGREGATOR') {
        entityType = 'AGGREGATOR';
        const { data } = await admin.from('aggregator_profiles').select('*').eq('id', userId).single();
        if (data) entityData = data;
    }

    // Audit history
    const { data: auditLogs } = await admin
        .from('admin_audit_log')
        .select('*')
        .eq('entity_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

    return {
        userId: profile.id,
        email: profile.email,
        fullName: profile.full_name || profile.email,
        portalRole: profile.portal_role,
        fraudScore: profile.fraud_score || 0,
        isApproved: profile.is_approved || false,
        createdAt: profile.created_at,
        entityType,
        entityData,
        approvalStatus,
        slaSecondsRemaining,
        documents,
        auditHistory: auditLogs || [],
    };
}

// ─── Approve Entity ──────────────────────────────────────────────────
export async function approveEntity(
    entityUserId: string,
    entityType: EntityType,
    adminUserId: string,
): Promise<{ success: boolean; error?: string }> {
    const admin = createServiceRoleClient();

    try {
        // Step 1: Update entity approval status
        let updateResult;
        if (entityType === 'RECYCLER') {
            updateResult = await admin
                .from('recycler_facilities')
                .update({ approval_status: 'APPROVED', submitted_at: new Date().toISOString() })
                .eq('owner_id', entityUserId);
        } else if (entityType === 'PIBO') {
            updateResult = await admin
                .from('pibo_entities')
                .update({ approval_status: 'APPROVED' })
                .eq('id', entityUserId);
        } else if (entityType === 'PRO') {
            updateResult = await admin
                .from('pro_organisations')
                .update({ approval_status: 'APPROVED' })
                .eq('id', entityUserId);
        }

        if (updateResult?.error) {
            return { success: false, error: `Approval failed: ${updateResult.error.message}` };
        }

        // Step 2: Mark user as approved
        await admin.from('user_profiles').update({ is_approved: true }).eq('id', entityUserId);

        // Step 3: Insert notification
        await admin.from('notifications').insert({
            user_id: entityUserId,
            title: 'Registration Approved',
            body: `Your ${entityType} registration has been approved. You can now access your portal.`,
            type: 'APPROVAL',
            notification_type: 'INFO',
            target_portal: entityType,
            is_read: false,
        });

        // Step 4: Audit log
        await admin.from('admin_audit_log').insert({
            admin_id: adminUserId,
            action: 'ENTITY_APPROVED',
            entity_type: entityType,
            entity_id: entityUserId,
            new_data: { approval_status: 'APPROVED' },
        });

        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message || 'Approval failed' };
    }
}

// ─── Reject Entity ───────────────────────────────────────────────────
export async function rejectEntity(
    entityUserId: string,
    entityType: EntityType,
    adminUserId: string,
    rejectionReason: string,
): Promise<{ success: boolean; error?: string }> {
    if (!rejectionReason || rejectionReason.length < 10) {
        return { success: false, error: 'Rejection reason must be at least 10 characters' };
    }

    const admin = createServiceRoleClient();

    try {
        // Step 1: Update entity status
        if (entityType === 'RECYCLER') {
            await admin.from('recycler_facilities')
                .update({ approval_status: 'REJECTED' })
                .eq('owner_id', entityUserId);
        } else if (entityType === 'PIBO') {
            await admin.from('pibo_entities')
                .update({ approval_status: 'REJECTED' })
                .eq('id', entityUserId);
        } else if (entityType === 'PRO') {
            await admin.from('pro_organisations')
                .update({ approval_status: 'REJECTED' })
                .eq('id', entityUserId);
        }

        // Step 2: Notification
        await admin.from('notifications').insert({
            user_id: entityUserId,
            title: 'Registration Rejected',
            body: `Your ${entityType} registration was rejected. Reason: ${rejectionReason}`,
            type: 'REJECTION',
            notification_type: 'WARNING',
            target_portal: entityType,
            is_read: false,
        });

        // Step 3: Audit log
        await admin.from('admin_audit_log').insert({
            admin_id: adminUserId,
            action: 'ENTITY_REJECTED',
            entity_type: entityType,
            entity_id: entityUserId,
            new_data: { approval_status: 'REJECTED', rejection_reason: rejectionReason },
        });

        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message || 'Rejection failed' };
    }
}

// ─── Bulk Approve ────────────────────────────────────────────────────
export async function bulkApprove(
    entities: Array<{ userId: string; entityType: EntityType }>,
    adminUserId: string,
): Promise<{ succeeded: number; failed: number; errors: string[] }> {
    let succeeded = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const entity of entities) {
        const result = await approveEntity(entity.userId, entity.entityType, adminUserId);
        if (result.success) {
            succeeded++;
        } else {
            failed++;
            errors.push(`${entity.userId}: ${result.error}`);
        }
    }

    return { succeeded, failed, errors };
}
