'use server';

import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * Weight Dispute Engine Server Actions — Phase 2 Module 2.7
 *
 * Provides:
 *  - Dispute list with filtering
 *  - Evidence card assembly (AGG + Transport + Recycler data)
 *  - Dispute resolution (approve/reject/split/escalate)
 *  - SLA breach detection
 */

// ─── Types ───────────────────────────────────────────────────────────

export type DisputeStatus = 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'ESCALATED' | 'ALL';
export type DecisionType = 'ACCEPT_AGG' | 'ACCEPT_RECYCLER' | 'SPLIT' | 'ESCALATE';
export type VarianceTier = 'AUTO_ACCEPT' | 'STRUCTURED_REVIEW' | 'AUTO_REJECT';

export interface DisputeListItem {
    id: string;
    batchId: string;
    aggregatorId: string;
    recyclerId: string;
    aggWeight: number;
    recWeight: number;
    variancePercent: number;
    varianceTier: VarianceTier;
    status: 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'ESCALATED';
    adminDecision: string | null;
    slaDeadline: string | null;
    createdAt: string;
    resolvedAt: string | null;
}

export interface EvidenceCardData {
    dispute: DisputeListItem;
    // AGG Evidence
    aggPhotos: { url: string | null; ocrWeight: number; gpsLat: number; gpsLng: number }[];
    aggMedianWeight: number;
    aggGps: { lat: number; lng: number };
    aggTimestamp: string;
    // Transport Chain
    transport: {
        collectionGps: { lat: number; lng: number } | null;
        collectionTime: string | null;
        pickupGps: { lat: number; lng: number } | null;
        pickupTime: string | null;
        carrierName: string;
        deliveryGps: { lat: number; lng: number } | null;
        deliveryTime: string | null;
        transitDuration: string | null;
    };
    // Recycler Evidence
    recycler: {
        scalePhotoUrl: string | null;
        inputWeight: number;
        gps: { lat: number; lng: number } | null;
        cpTimestamp: string | null;
    };
}

// ─── Helpers ─────────────────────────────────────────────────────────

function deriveStatus(d: any): DisputeListItem['status'] {
    if (d.resolved_at) return 'RESOLVED';
    if (d.admin_decision === 'ESCALATED_TO_SENIOR' || d.admin_decision === 'ESCALATE') return 'ESCALATED';
    if (d.admin_decision && d.admin_decision !== '') return 'IN_REVIEW';
    return 'OPEN';
}

function deriveTier(variance: number): VarianceTier {
    if (variance < 10) return 'AUTO_ACCEPT';
    if (variance <= 15) return 'STRUCTURED_REVIEW';
    return 'AUTO_REJECT';
}

function formatDuration(ms: number): string {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${mins}m`;
}

function mapDisputeRow(d: any): DisputeListItem {
    const variance = Number(d.variance_percent) || 0;
    return {
        id: d.id,
        batchId: d.batch_id || '',
        aggregatorId: d.aggregator_id || '',
        recyclerId: d.recycler_id || '',
        aggWeight: Number(d.agg_weight) || 0,
        recWeight: Number(d.rec_weight) || 0,
        variancePercent: variance,
        varianceTier: deriveTier(variance),
        status: deriveStatus(d),
        adminDecision: d.admin_decision || null,
        slaDeadline: d.sla_deadline || null,
        createdAt: d.created_at,
        resolvedAt: d.resolved_at || null,
    };
}

// ─── Dispute List ────────────────────────────────────────────────────

export async function getDisputeList(
    filter: DisputeStatus = 'ALL'
): Promise<DisputeListItem[]> {
    const admin = createServiceRoleClient();

    const { data } = await admin.from('weight_disputes')
        .select('id, batch_id, aggregator_id, recycler_id, agg_weight, rec_weight, variance_percent, admin_decision, resolution_notes, sla_deadline, created_at, resolved_at')
        .order('created_at', { ascending: false })
        .limit(200);

    if (!data) return [];

    const disputes = data.map(mapDisputeRow);

    if (filter === 'ALL') return disputes;
    if (filter === 'OPEN') return disputes.filter(d => d.status === 'OPEN');
    if (filter === 'IN_REVIEW') return disputes.filter(d => d.status === 'IN_REVIEW');
    if (filter === 'RESOLVED') return disputes.filter(d => d.status === 'RESOLVED');
    if (filter === 'ESCALATED') return disputes.filter(d => d.status === 'ESCALATED');

    return disputes;
}

export async function getDisputeStatusCounts(): Promise<Record<string, number>> {
    const admin = createServiceRoleClient();

    const { data } = await admin.from('weight_disputes')
        .select('admin_decision, resolved_at, sla_deadline')
        .limit(500);

    if (!data) return { all: 0, open: 0, inReview: 0, resolved: 0, escalated: 0, breached: 0 };

    const mapped = data.map((d: any) => ({
        status: deriveStatus(d),
        slaBreached: d.sla_deadline && !d.resolved_at && new Date(d.sla_deadline) < new Date(),
    }));

    return {
        all: mapped.length,
        open: mapped.filter(d => d.status === 'OPEN').length,
        inReview: mapped.filter(d => d.status === 'IN_REVIEW').length,
        resolved: mapped.filter(d => d.status === 'RESOLVED').length,
        escalated: mapped.filter(d => d.status === 'ESCALATED').length,
        breached: mapped.filter(d => d.slaBreached).length,
    };
}

// ─── Evidence Card Assembly ──────────────────────────────────────────

export async function assembleEvidenceCard(disputeId: string): Promise<EvidenceCardData | null> {
    const admin = createServiceRoleClient();

    // 1. Read the dispute
    const { data: dispute } = await admin.from('weight_disputes')
        .select('*')
        .eq('id', disputeId)
        .single();

    if (!dispute) return null;

    const mappedDispute = mapDisputeRow(dispute);
    const batchId = dispute.batch_id;

    // 2. Parallel queries for evidence
    const [collectionRes, transportRes, checkpointRes] = await Promise.all([
        // AGG evidence: find collection(s) linked to this batch
        batchId
            ? admin.from('batch_collections')
                .select('collection_id')
                .eq('batch_id', batchId)
                .limit(1)
            : Promise.resolve({ data: null }),

        // Transport chain
        batchId
            ? admin.from('batch_transport_events')
                .select('*')
                .eq('batch_id', batchId)
                .order('created_at', { ascending: true })
            : Promise.resolve({ data: null }),

        // Recycler CP1 evidence
        batchId
            ? admin.from('batch_checkpoints')
                .select('*')
                .eq('batch_id', batchId)
                .limit(1)
                .single()
            : Promise.resolve({ data: null }),
    ]);

    // 3. Fetch the actual collection data
    let collectionData: any = null;
    if (collectionRes.data && collectionRes.data.length > 0) {
        const collId = (collectionRes.data[0] as any).collection_id;
        const { data: coll } = await admin.from('collections')
            .select('*')
            .eq('id', collId)
            .single();
        collectionData = coll;
    }

    // 4. Parse transport events
    const transportEvents = transportRes.data || [];
    const pickup = transportEvents.find((e: any) => e.event_type === 'PICKUP');
    const delivery = transportEvents.find((e: any) => e.event_type === 'DELIVERY');

    let transitDuration: string | null = null;
    if (pickup && delivery) {
        const diffMs = new Date(delivery.created_at).getTime() - new Date(pickup.created_at).getTime();
        transitDuration = formatDuration(diffMs);
    }

    const checkpoint = checkpointRes.data as any;

    return {
        dispute: mappedDispute,
        aggPhotos: [
            {
                url: collectionData?.photo_url_1 || null,
                ocrWeight: Number(collectionData?.ocr_weight_1) || 0,
                gpsLat: Number(collectionData?.gps_lat) || 0,
                gpsLng: Number(collectionData?.gps_lng) || 0,
            },
            {
                url: collectionData?.photo_url_2 || null,
                ocrWeight: Number(collectionData?.ocr_weight_2) || 0,
                gpsLat: Number(collectionData?.gps_lat) || 0,
                gpsLng: Number(collectionData?.gps_lng) || 0,
            },
            {
                url: collectionData?.photo_url_3 || null,
                ocrWeight: Number(collectionData?.ocr_weight_3) || 0,
                gpsLat: Number(collectionData?.gps_lat) || 0,
                gpsLng: Number(collectionData?.gps_lng) || 0,
            },
        ],
        aggMedianWeight: Number(collectionData?.median_weight) || Number(dispute.agg_weight) || 0,
        aggGps: {
            lat: Number(collectionData?.gps_lat) || 0,
            lng: Number(collectionData?.gps_lng) || 0,
        },
        aggTimestamp: collectionData?.created_at || dispute.created_at,
        transport: {
            collectionGps: collectionData
                ? { lat: Number(collectionData.gps_lat) || 0, lng: Number(collectionData.gps_lng) || 0 }
                : null,
            collectionTime: collectionData?.created_at || null,
            pickupGps: pickup ? { lat: Number(pickup.gps_lat) || 0, lng: Number(pickup.gps_lng) || 0 } : null,
            pickupTime: pickup?.created_at || null,
            carrierName: 'Anonymous',
            deliveryGps: delivery ? { lat: Number(delivery.gps_lat) || 0, lng: Number(delivery.gps_lng) || 0 } : null,
            deliveryTime: delivery?.created_at || null,
            transitDuration,
        },
        recycler: {
            scalePhotoUrl: checkpoint?.cp1_scale_photo_url || null,
            inputWeight: Number(checkpoint?.cp1_input_weight) || Number(dispute.rec_weight) || 0,
            gps: checkpoint
                ? { lat: Number(checkpoint.cp1_gps_lat) || 0, lng: Number(checkpoint.cp1_gps_lng) || 0 }
                : null,
            cpTimestamp: checkpoint?.created_at || null,
        },
    };
}

// ─── Resolve Dispute ─────────────────────────────────────────────────

export async function resolveDispute(
    disputeId: string,
    decision: DecisionType,
    adminNotes: string,
    adminUserId: string
): Promise<{ success: boolean; error?: string }> {
    // Validate
    if (!['ACCEPT_AGG', 'ACCEPT_RECYCLER', 'SPLIT', 'ESCALATE'].includes(decision)) {
        return { success: false, error: 'Invalid decision type.' };
    }
    if (adminNotes.length < 20) {
        return { success: false, error: 'Decision notes must be at least 20 characters.' };
    }

    const admin = createServiceRoleClient();

    try {
        // 1. Read the dispute to get weights
        const { data: dispute, error: fetchErr } = await admin.from('weight_disputes')
            .select('*')
            .eq('id', disputeId)
            .single();

        if (fetchErr || !dispute) {
            return { success: false, error: 'Dispute not found.' };
        }

        if (dispute.resolved_at) {
            return { success: false, error: 'Dispute is already resolved.' };
        }

        // 2. Update dispute status
        const isEscalate = decision === 'ESCALATE';
        const newDecision = isEscalate ? 'ESCALATED_TO_SENIOR' : decision;
        const newSlaDeadline = isEscalate
            ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            : dispute.sla_deadline;

        const { error: updateErr } = await admin.from('weight_disputes')
            .update({
                admin_decision: newDecision,
                resolution_notes: adminNotes,
                resolved_at: isEscalate ? null : new Date().toISOString(),
                sla_deadline: newSlaDeadline,
            })
            .eq('id', disputeId);

        if (updateErr) {
            return { success: false, error: `Failed to update dispute: ${updateErr.message}` };
        }

        // 3. Update payment escrow if not escalating
        if (!isEscalate && dispute.batch_id) {
            const { error: escrowErr } = await admin.from('payment_escrows')
                .update({
                    status: 'RELEASED',
                    released_at: new Date().toISOString(),
                })
                .eq('status', 'HELD')
                .or(`aggregator_id.eq.${dispute.aggregator_id}`);

            // Partial failure — log but don't fail
            if (escrowErr) {
                console.error('Escrow update failed (partial):', escrowErr.message);
            }
        }

        // 4. Insert notifications
        try {
            const decisionText = isEscalate
                ? `Dispute escalated to senior admin.`
                : `Dispute resolved: ${decision.replace(/_/g, ' ')}. ${adminNotes.slice(0, 100)}`;

            // Notification to aggregator
            if (dispute.aggregator_id) {
                await admin.from('notifications').insert({
                    target_user_id: dispute.aggregator_id,
                    target_portal: 'AGGREGATOR',
                    notification_type: 'HIGH',
                    message: decisionText,
                    is_read: false,
                });
            }

            // Notification to recycler
            if (dispute.recycler_id) {
                await admin.from('notifications').insert({
                    target_user_id: dispute.recycler_id,
                    target_portal: 'RECYCLER',
                    notification_type: 'HIGH',
                    message: decisionText,
                    is_read: false,
                });
            }
        } catch {
            console.error('Notification insert failed (partial).');
        }

        // 5. Audit log
        try {
            await admin.from('admin_audit_log').insert({
                admin_user_id: adminUserId,
                action_type: isEscalate ? 'DISPUTE_ESCALATED' : 'DISPUTE_RESOLVED',
                entity_type: 'WEIGHT_DISPUTE',
                entity_id: disputeId,
                detail: {
                    decision,
                    aggWeight: dispute.agg_weight,
                    recWeight: dispute.rec_weight,
                    variancePercent: dispute.variance_percent,
                    notes: adminNotes,
                },
                outcome: 'SUCCESS',
            });
        } catch {
            console.error('Audit log insert failed (partial).');
        }

        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message || 'Unknown error during resolution.' };
    }
}
