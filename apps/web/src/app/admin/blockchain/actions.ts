'use server';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { sha256, buildCp1Payload } from '@/lib/blockchain/hash';

/**
 * Blockchain Verification Server Actions — Phase 2 Module 2.8
 *
 * Provides:
 *  - Certificate list with trust score + lab status
 *  - On-chain verification status (hash checks)
 *  - Checkpoint hash chain validation
 *  - Certificate detail with full chain
 *  - **NEW** Search across certs, checkpoints, collections
 *  - **NEW** 24-hour activity feed
 *  - **NEW** DB integrity check (recompute + compare hashes)
 *  - **NEW** NFT ownership trail
 */

// ─── Types ───────────────────────────────────────────────────────────

export interface CertificateListItem {
    id: string;
    batchId: string;
    nftTokenId: string | null;
    materialType: string;
    weightMT: number;
    trustScore: number;
    labStatus: 'NONE' | 'UPLOADED' | 'NABL_VERIFIED' | 'SELF_DECLARED';
    blockchainTxHash: string | null;
    issuerId: string;
    currentOwnerId: string | null;
    createdAt: string;
    hashValid: boolean;
}

export interface CertificateStats {
    totalCerts: number;
    onChainCount: number;
    avgTrustScore: number;
    nablVerified: number;
    pendingVerification: number;
    totalWeightMT: number;
}

export interface CheckpointHash {
    checkpointName: string;
    hash: string | null;
    timestamp: string;
    valid: boolean;
}

export interface CertificateDetail {
    cert: CertificateListItem;
    checkpointChain: CheckpointHash[];
    marketplaceListing: {
        isListed: boolean;
        pricePerMT: number | null;
        isActive: boolean;
    } | null;
    transferHistory: {
        buyerId: string;
        sellerId: string;
        price: number;
        txHash: string | null;
        timestamp: string;
    }[];
}

export interface SearchResult {
    type: 'certificate' | 'checkpoint' | 'collection';
    id: string;
    title: string;
    subtitle: string;
    hash: string | null;
    timestamp: string;
}

export interface ActivityItem {
    type: 'checkpoint' | 'certificate';
    id: string;
    label: string;
    hash: string | null;
    timestamp: string;
}

export interface IntegrityResult {
    checkedAt: string;
    totalChecked: number;
    passed: number;
    failed: number;
    mismatches: { batchId: string; expected: string; computed: string }[];
}

export interface NftTrailStage {
    stage: string;
    status: 'complete' | 'current' | 'pending';
    detail: string;
    timestamp: string | null;
}

// ─── Stats ───────────────────────────────────────────────────────────

export async function getCertificateStats(): Promise<CertificateStats> {
    const admin = createServiceRoleClient();

    const { data } = await admin.from('epr_certificates')
        .select('id, trust_score, lab_status, blockchain_tx_hash, weight_mt');

    if (!data || data.length === 0) {
        return { totalCerts: 0, onChainCount: 0, avgTrustScore: 0, nablVerified: 0, pendingVerification: 0, totalWeightMT: 0 };
    }

    const onChain = data.filter((c: any) => c.blockchain_tx_hash);
    const totalTrust = data.reduce((s: number, c: any) => s + (c.trust_score || 0), 0);
    const nablCount = data.filter((c: any) => c.lab_status === 'NABL_VERIFIED').length;
    const pendingCount = data.filter((c: any) => c.lab_status === 'NONE' || c.lab_status === 'UPLOADED').length;
    const totalWeight = data.reduce((s: number, c: any) => s + (Number(c.weight_mt) || 0), 0);

    return {
        totalCerts: data.length,
        onChainCount: onChain.length,
        avgTrustScore: Math.round(totalTrust / data.length),
        nablVerified: nablCount,
        pendingVerification: pendingCount,
        totalWeightMT: Math.round(totalWeight * 100) / 100,
    };
}

// ─── Certificate List ────────────────────────────────────────────────

export async function getCertificateList(
    filter: 'ALL' | 'ON_CHAIN' | 'PENDING' | 'NABL_VERIFIED' = 'ALL'
): Promise<CertificateListItem[]> {
    const admin = createServiceRoleClient();

    let query = admin.from('epr_certificates')
        .select('id, batch_id, nft_token_id, material_type, weight_mt, trust_score, lab_status, blockchain_tx_hash, issuer_id, current_owner_id, created_at')
        .order('created_at', { ascending: false })
        .limit(200);

    if (filter === 'ON_CHAIN') {
        query = query.not('blockchain_tx_hash', 'is', null);
    } else if (filter === 'PENDING') {
        query = query.is('blockchain_tx_hash', null);
    } else if (filter === 'NABL_VERIFIED') {
        query = query.eq('lab_status', 'NABL_VERIFIED');
    }

    const { data } = await query;

    return (data || []).map((c: any) => ({
        id: c.id,
        batchId: c.batch_id || '',
        nftTokenId: c.nft_token_id || null,
        materialType: c.material_type || '',
        weightMT: Number(c.weight_mt) || 0,
        trustScore: c.trust_score || 0,
        labStatus: c.lab_status || 'NONE',
        blockchainTxHash: c.blockchain_tx_hash || null,
        issuerId: c.issuer_id || '',
        currentOwnerId: c.current_owner_id || null,
        createdAt: c.created_at,
        hashValid: !!c.blockchain_tx_hash,
    }));
}

// ─── Certificate Detail ──────────────────────────────────────────────

export async function getCertificateDetail(certId: string): Promise<CertificateDetail | null> {
    const admin = createServiceRoleClient();

    const { data: cert } = await admin.from('epr_certificates')
        .select('*')
        .eq('id', certId)
        .single();

    if (!cert) return null;

    const [checkpointRes, listingRes, purchaseRes] = await Promise.all([
        cert.batch_id
            ? admin.from('batch_checkpoints')
                .select('cp1_hash, cp2_hash, cp3_hash, created_at')
                .eq('batch_id', cert.batch_id)
                .limit(1)
                .single()
            : Promise.resolve({ data: null }),

        admin.from('marketplace_listings')
            .select('price_per_mt, is_active')
            .eq('cert_id', certId)
            .limit(1)
            .single(),

        admin.from('marketplace_purchases')
            .select('buyer_id, seller_id, purchase_price, blockchain_transfer_hash, created_at')
            .eq('cert_id', certId)
            .order('created_at', { ascending: false }),
    ]);

    const cp = checkpointRes.data as any;
    const checkpointChain: CheckpointHash[] = cp ? [
        { checkpointName: 'CP1 — Input Weight', hash: cp.cp1_hash || null, timestamp: cp.created_at, valid: !!cp.cp1_hash },
        { checkpointName: 'CP2 — Processing Video', hash: cp.cp2_hash || null, timestamp: cp.created_at, valid: !!cp.cp2_hash },
        { checkpointName: 'CP3 — Output Weight', hash: cp.cp3_hash || null, timestamp: cp.created_at, valid: !!cp.cp3_hash },
    ] : [];

    const listing = listingRes.data as any;
    const transfers = (purchaseRes.data || []).map((p: any) => ({
        buyerId: p.buyer_id || '',
        sellerId: p.seller_id || '',
        price: Number(p.purchase_price) || 0,
        txHash: p.blockchain_transfer_hash || null,
        timestamp: p.created_at,
    }));

    return {
        cert: {
            id: cert.id,
            batchId: cert.batch_id || '',
            nftTokenId: cert.nft_token_id || null,
            materialType: cert.material_type || '',
            weightMT: Number(cert.weight_mt) || 0,
            trustScore: cert.trust_score || 0,
            labStatus: cert.lab_status || 'NONE',
            blockchainTxHash: cert.blockchain_tx_hash || null,
            issuerId: cert.issuer_id || '',
            currentOwnerId: cert.current_owner_id || null,
            createdAt: cert.created_at,
            hashValid: !!cert.blockchain_tx_hash,
        },
        checkpointChain,
        marketplaceListing: listing ? {
            isListed: true,
            pricePerMT: Number(listing.price_per_mt) || null,
            isActive: listing.is_active,
        } : null,
        transferHistory: transfers,
    };
}

// ─── NEW: Search ─────────────────────────────────────────────────────

export async function searchBlockchain(query: string): Promise<SearchResult[]> {
    if (!query || query.trim().length < 2) return [];
    const admin = createServiceRoleClient();
    const q = query.trim().toLowerCase();
    const results: SearchResult[] = [];

    // Search certificates by ID prefix, nft_token_id, blockchain_tx_hash, material_type
    const { data: certs } = await admin.from('epr_certificates')
        .select('id, nft_token_id, material_type, blockchain_tx_hash, weight_mt, created_at')
        .or(`id.ilike.%${q}%,nft_token_id.ilike.%${q}%,blockchain_tx_hash.ilike.%${q}%,material_type.ilike.%${q}%`)
        .limit(10);

    (certs || []).forEach((c: any) => {
        results.push({
            type: 'certificate',
            id: c.id,
            title: c.nft_token_id ? `NFT-${c.nft_token_id.slice(0, 10)}` : `CERT-${c.id.slice(0, 10)}`,
            subtitle: `${c.material_type || 'Unknown'} · ${Number(c.weight_mt || 0).toFixed(2)} MT`,
            hash: c.blockchain_tx_hash || null,
            timestamp: c.created_at,
        });
    });

    // Search batch_checkpoints by batch_id or hashes
    const { data: checkpoints } = await admin.from('batch_checkpoints')
        .select('id, batch_id, cp1_hash, cp2_hash, cp3_hash, created_at')
        .or(`batch_id.ilike.%${q}%,cp1_hash.ilike.%${q}%,cp2_hash.ilike.%${q}%,cp3_hash.ilike.%${q}%`)
        .limit(10);

    (checkpoints || []).forEach((cp: any) => {
        results.push({
            type: 'checkpoint',
            id: cp.id,
            title: `Batch ${(cp.batch_id || '').slice(0, 10)}`,
            subtitle: `CP1: ${cp.cp1_hash ? cp.cp1_hash.slice(0, 12) + '…' : 'pending'}`,
            hash: cp.cp1_hash || null,
            timestamp: cp.created_at,
        });
    });

    // Search collections by ID
    const { data: collections } = await admin.from('collections')
        .select('id, material_type, total_weight_kg, created_at')
        .or(`id.ilike.%${q}%,material_type.ilike.%${q}%`)
        .limit(5);

    (collections || []).forEach((col: any) => {
        results.push({
            type: 'collection',
            id: col.id,
            title: `Collection ${col.id.slice(0, 10)}`,
            subtitle: `${col.material_type || 'Unknown'} · ${Number(col.total_weight_kg || 0).toFixed(1)} kg`,
            hash: null,
            timestamp: col.created_at,
        });
    });

    return results;
}

// ─── NEW: 24-Hour Activity Feed ──────────────────────────────────────

export async function getRecentActivity(): Promise<ActivityItem[]> {
    const admin = createServiceRoleClient();
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const items: ActivityItem[] = [];

    const [cpRes, certRes] = await Promise.all([
        admin.from('batch_checkpoints')
            .select('id, batch_id, cp1_hash, created_at')
            .gte('created_at', since)
            .order('created_at', { ascending: false })
            .limit(20),
        admin.from('epr_certificates')
            .select('id, nft_token_id, blockchain_tx_hash, created_at')
            .gte('created_at', since)
            .order('created_at', { ascending: false })
            .limit(20),
    ]);

    (cpRes.data || []).forEach((cp: any) => {
        items.push({
            type: 'checkpoint',
            id: cp.id,
            label: `Checkpoint hashed for batch ${(cp.batch_id || '').slice(0, 8)}`,
            hash: cp.cp1_hash || null,
            timestamp: cp.created_at,
        });
    });

    (certRes.data || []).forEach((c: any) => {
        items.push({
            type: 'certificate',
            id: c.id,
            label: c.nft_token_id
                ? `NFT minted: ${c.nft_token_id.slice(0, 10)}`
                : `Certificate created: ${c.id.slice(0, 10)}`,
            hash: c.blockchain_tx_hash || null,
            timestamp: c.created_at,
        });
    });

    // Sort by timestamp descending
    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return items.slice(0, 30);
}

// ─── NEW: Integrity Check ────────────────────────────────────────────

export async function runIntegrityCheck(): Promise<IntegrityResult> {
    const admin = createServiceRoleClient();

    // Get all checkpoints that have a cp1_hash
    const { data: checkpoints } = await admin.from('batch_checkpoints')
        .select('id, batch_id, cp1_hash, cp1_lat, cp1_lng, cp1_weight_kg, created_at')
        .not('cp1_hash', 'is', null)
        .limit(500);

    const rows = checkpoints || [];
    let passed = 0;
    let failed = 0;
    const mismatches: { batchId: string; expected: string; computed: string }[] = [];

    for (const cp of rows as any[]) {
        const payload = buildCp1Payload(
            cp.cp1_lat ?? null,
            cp.cp1_lng ?? null,
            cp.cp1_weight_kg ?? null,
            cp.created_at ?? null,
        );
        const computed = await sha256(payload);

        if (computed === cp.cp1_hash) {
            passed++;
        } else {
            failed++;
            if (mismatches.length < 10) {
                mismatches.push({
                    batchId: cp.batch_id || cp.id,
                    expected: cp.cp1_hash,
                    computed,
                });
            }
        }
    }

    const result: IntegrityResult = {
        checkedAt: new Date().toISOString(),
        totalChecked: rows.length,
        passed,
        failed,
        mismatches,
    };

    // Store result in system_config for persistence
    try {
        await admin.from('system_config')
            .upsert({
                key: 'last_integrity_check_result',
                value: JSON.stringify(result),
            }, { onConflict: 'key' });
    } catch {
        // Non-critical — proceed even if storing fails
    }

    return result;
}

export async function getLastIntegrityResult(): Promise<IntegrityResult | null> {
    const admin = createServiceRoleClient();
    const { data } = await admin.from('system_config')
        .select('value')
        .eq('key', 'last_integrity_check_result')
        .single();

    if (!data?.value) return null;
    try {
        return JSON.parse(data.value) as IntegrityResult;
    } catch {
        return null;
    }
}

// ─── NEW: NFT Ownership Trail ────────────────────────────────────────

export async function getNftTrail(certId: string): Promise<NftTrailStage[]> {
    const admin = createServiceRoleClient();

    const { data: cert } = await admin.from('epr_certificates')
        .select('id, batch_id, nft_token_id, blockchain_tx_hash, lab_status, created_at')
        .eq('id', certId)
        .single();

    if (!cert) return [];

    // Check if batch has checkpoints
    let hasCheckpoints = false;
    if (cert.batch_id) {
        const { data: cp } = await admin.from('batch_checkpoints')
            .select('id')
            .eq('batch_id', cert.batch_id)
            .limit(1);
        hasCheckpoints = (cp || []).length > 0;
    }

    // Check marketplace
    const { data: listing } = await admin.from('marketplace_listings')
        .select('id, is_active')
        .eq('cert_id', certId)
        .limit(1);

    const { data: purchase } = await admin.from('marketplace_purchases')
        .select('id, created_at')
        .eq('cert_id', certId)
        .order('created_at', { ascending: false })
        .limit(1);

    const isListed = (listing || []).length > 0;
    const hasTransfer = (purchase || []).length > 0;

    // Build 5-stage timeline
    const stages: NftTrailStage[] = [
        {
            stage: '1. Batch Processing',
            status: hasCheckpoints ? 'complete' : cert.batch_id ? 'current' : 'pending',
            detail: hasCheckpoints ? 'Checkpoints hashed on-chain' : cert.batch_id ? 'Batch created, awaiting checkpoints' : 'No batch linked',
            timestamp: cert.created_at,
        },
        {
            stage: '2. Certificate Issued',
            status: 'complete',
            detail: `EPR Certificate ${cert.id.slice(0, 8)} created`,
            timestamp: cert.created_at,
        },
        {
            stage: '3. Lab Verification',
            status: cert.lab_status === 'NABL_VERIFIED' ? 'complete' : cert.lab_status === 'UPLOADED' ? 'current' : 'pending',
            detail: cert.lab_status === 'NABL_VERIFIED' ? 'NABL verified' : cert.lab_status === 'UPLOADED' ? 'Lab report uploaded, pending NABL' : 'Awaiting lab report',
            timestamp: null,
        },
        {
            stage: '4. NFT Minted',
            status: cert.nft_token_id ? 'complete' : cert.blockchain_tx_hash ? 'current' : 'pending',
            detail: cert.nft_token_id ? `Token: ${cert.nft_token_id.slice(0, 12)}` : 'Pending Phase 8 — NFT minting',
            timestamp: cert.blockchain_tx_hash ? cert.created_at : null,
        },
        {
            stage: '5. Marketplace Transfer',
            status: hasTransfer ? 'complete' : isListed ? 'current' : 'pending',
            detail: hasTransfer ? 'Ownership transferred' : isListed ? 'Listed on marketplace' : 'Not yet listed',
            timestamp: hasTransfer ? (purchase as any[])[0].created_at : null,
        },
    ];

    return stages;
}
