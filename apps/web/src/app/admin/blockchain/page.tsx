import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
    getCertificateStats,
    getCertificateList,
    searchBlockchain,
    getRecentActivity,
    getLastIntegrityResult,
    getNftTrail,
    type CertificateListItem,
    type ActivityItem,
    type NftTrailStage,
    type SearchResult,
} from './actions';
import { BlockchainSearch, SearchResults, IntegrityCheckPanel } from './components';
import { formatISTTimestamp } from '@/lib/utils/ist-time';

/**
 * Blockchain Verification Page — Phase 2 Module 2.8
 *
 * Layout:
 *  1. Search Bar (top, full-width)
 *  2. If search query → Search Results + NFT Trail (if cert found)
 *  3. Stat Cards (6 metrics)
 *  4. Activity Feed (left 60%) + Integrity Check Panel (right 40%)
 *  5. Filter Tabs + Certificate Table
 */

// ─── Sub-components (server-rendered) ────────────────────────────────

function TrustScoreBar({ score }: { score: number }) {
    const color = score >= 80 ? '#1B6B35' : score >= 50 ? '#B45309' : '#DC2626';
    return (
        <div className="flex items-center gap-1.5">
            <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${Math.min(score, 100)}%`, backgroundColor: color }} />
            </div>
            <span className="text-[10px] font-bold" style={{ color }}>{score}</span>
        </div>
    );
}

function LabBadge({ status }: { status: string }) {
    const config: Record<string, { bg: string; color: string; label: string }> = {
        NABL_VERIFIED: { bg: '#F0FAF4', color: '#1B6B35', label: 'NABL ✓' },
        UPLOADED: { bg: '#FFFBEB', color: '#B45309', label: 'Uploaded' },
        SELF_DECLARED: { bg: '#F5F5F5', color: '#666', label: 'Self-Declared' },
        NONE: { bg: '#FEF2F2', color: '#DC2626', label: 'None' },
    };
    const c = config[status] || config.NONE;
    return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: c.bg, color: c.color }}>
            {c.label}
        </span>
    );
}

function HashBadge({ hash }: { hash: string | null }) {
    if (!hash) {
        return (
            <span className="text-[10px] px-2 py-0.5 rounded bg-gray-100 text-gray-400 font-mono">
                no hash
            </span>
        );
    }
    return (
        <span className="text-[10px] px-2 py-0.5 rounded bg-[#F0FAF4] text-[#1B6B35] font-mono" title={hash}>
            0x{hash.slice(0, 8)}…{hash.slice(-4)}
        </span>
    );
}

function CertRow({ cert }: { cert: CertificateListItem }) {
    return (
        <Link href={`/admin/blockchain/${cert.id}`} className="block">
            <div className="flex items-center gap-3 py-2.5 px-4 border-b border-[#E5E5E5] transition-colors hover:bg-gray-50">
                <div className="w-[130px] flex-shrink-0">
                    <p className="text-xs font-mono font-bold text-[#1A2F4B]">
                        {cert.nftTokenId ? `NFT-${cert.nftTokenId.slice(0, 8)}` : `CERT-${cert.id.slice(0, 8)}`}
                    </p>
                    <p className="text-[10px] text-gray-400">{cert.materialType}</p>
                </div>
                <div className="w-[80px]">
                    <p className="text-xs font-mono font-bold text-[#1A2F4B]">
                        {cert.weightMT.toFixed(2)} MT
                    </p>
                </div>
                <div className="w-[100px]">
                    <TrustScoreBar score={cert.trustScore} />
                </div>
                <div className="w-[90px]">
                    <LabBadge status={cert.labStatus} />
                </div>
                <div className="flex-1">
                    <HashBadge hash={cert.blockchainTxHash} />
                </div>
                <div className="w-[120px] text-right">
                    <p className="text-[10px] text-gray-400">{formatISTTimestamp(cert.createdAt)}</p>
                </div>
                <div className="text-gray-300 text-sm">→</div>
            </div>
        </Link>
    );
}

function ActivityFeedSection({ items }: { items: ActivityItem[] }) {
    return (
        <div className="bg-white rounded-lg border border-[#E5E5E5] p-4">
            <h3 className="text-xs font-bold text-[#1A2F4B] mb-3">24-Hour Activity Feed</h3>
            {items.length === 0 ? (
                <div className="py-6 text-center">
                    <p className="text-sm text-gray-400">No on-chain activity in the last 24 hours</p>
                    <p className="text-[10px] text-gray-300 mt-1">
                        Checkpoint hashes and certificate minting events will appear here.
                    </p>
                </div>
            ) : (
                <div className="space-y-1 max-h-[280px] overflow-y-auto">
                    {items.map((item, i) => (
                        <div key={`${item.type}-${item.id}-${i}`} className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-gray-50 transition-colors">
                            <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px]"
                                style={{
                                    backgroundColor: item.type === 'checkpoint' ? '#EFF6FF' : '#F0FAF4',
                                    color: item.type === 'checkpoint' ? '#2563EB' : '#1B6B35',
                                }}
                            >
                                {item.type === 'checkpoint' ? '🔗' : '📜'}
                            </span>
                            <div className="flex-1 min-w-0">
                                <p className="text-[11px] text-[#1A2F4B] truncate">{item.label}</p>
                            </div>
                            {item.hash && (
                                <span className="text-[9px] font-mono text-gray-400 flex-shrink-0">
                                    0x{item.hash.slice(0, 6)}…
                                </span>
                            )}
                            <span className="text-[9px] text-gray-300 flex-shrink-0 w-[60px] text-right">
                                {formatISTTimestamp(item.timestamp)}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function NftTrailSection({ stages, certId }: { stages: NftTrailStage[]; certId: string }) {
    return (
        <div className="bg-white rounded-lg border border-[#E5E5E5] p-4">
            <h3 className="text-xs font-bold text-[#1A2F4B] mb-3">
                NFT Ownership Trail — {certId.slice(0, 12)}…
            </h3>
            <div className="relative pl-6">
                {/* Vertical line */}
                <div className="absolute left-[9px] top-2 bottom-2 w-px bg-gray-200" />

                {stages.map((stage, i) => {
                    const dotColor = stage.status === 'complete' ? '#1B6B35'
                        : stage.status === 'current' ? '#B45309'
                            : '#D1D5DB';
                    const textColor = stage.status === 'complete' ? '#1A2F4B'
                        : stage.status === 'current' ? '#B45309'
                            : '#9CA3AF';

                    return (
                        <div key={i} className="relative mb-4 last:mb-0">
                            {/* Dot */}
                            <div
                                className="absolute -left-6 top-0.5 w-[14px] h-[14px] rounded-full border-2 border-white"
                                style={{ backgroundColor: dotColor, boxShadow: '0 0 0 2px #E5E5E5' }}
                            />
                            {stage.status === 'current' && (
                                <div className="absolute -left-6 top-0.5 w-[14px] h-[14px] rounded-full animate-ping opacity-30" style={{ backgroundColor: dotColor }} />
                            )}

                            <div>
                                <p className="text-xs font-bold" style={{ color: textColor }}>
                                    {stage.stage}
                                    {stage.status === 'complete' && <span className="ml-1 text-[#1B6B35]">✓</span>}
                                </p>
                                <p className="text-[10px] text-gray-400 mt-0.5">{stage.detail}</p>
                                {stage.timestamp && (
                                    <p className="text-[9px] text-gray-300 mt-0.5">{formatISTTimestamp(stage.timestamp)}</p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Page ────────────────────────────────────────────────────────────

export default async function BlockchainPage({
    searchParams,
}: {
    searchParams: { filter?: string; q?: string };
}) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/admin/login');

    const filter = (searchParams.filter?.toUpperCase() || 'ALL') as 'ALL' | 'ON_CHAIN' | 'PENDING' | 'NABL_VERIFIED';
    const searchQuery = searchParams.q || '';

    // Parallel data fetch
    const [stats, certs, activity, lastIntegrity, searchResults] = await Promise.all([
        getCertificateStats(),
        getCertificateList(filter),
        getRecentActivity(),
        getLastIntegrityResult(),
        searchQuery ? searchBlockchain(searchQuery) : Promise.resolve([] as SearchResult[]),
    ]);

    // If search found a single certificate, fetch its NFT trail
    let nftTrailStages: NftTrailStage[] = [];
    let nftTrailCertId = '';
    if (searchQuery && searchResults.length > 0) {
        const certResult = searchResults.find(r => r.type === 'certificate');
        if (certResult) {
            nftTrailCertId = certResult.id;
            nftTrailStages = await getNftTrail(certResult.id);
        }
    }

    const statCards = [
        { label: 'Total Certificates', value: stats.totalCerts, color: '#1A2F4B' },
        { label: 'On-Chain', value: stats.onChainCount, color: '#1B6B35' },
        { label: 'Avg Trust Score', value: stats.avgTrustScore, color: '#0E5A6E' },
        { label: 'NABL Verified', value: stats.nablVerified, color: '#1B6B35' },
        { label: 'Pending', value: stats.pendingVerification, color: '#B45309' },
        { label: 'Total Weight (MT)', value: stats.totalWeightMT, color: '#1A2F4B' },
    ];

    const tabs = [
        { key: 'ALL', label: 'All' },
        { key: 'ON_CHAIN', label: 'On-Chain' },
        { key: 'PENDING', label: 'Pending' },
        { key: 'NABL_VERIFIED', label: 'NABL Verified' },
    ];

    return (
        <div className="space-y-4">
            {/* Header */}
            <div>
                <h1 className="text-xl font-bold text-[#1A2F4B]">Blockchain Verification</h1>
                <p className="text-xs text-gray-400 mt-0.5">
                    On-chain search, integrity verification, NFT ownership trail, and certificate registry
                </p>
            </div>

            {/* Search Bar */}
            <BlockchainSearch />

            {/* Search Results */}
            {searchQuery && (
                <>
                    <SearchResults results={searchResults} />
                    {nftTrailStages.length > 0 && (
                        <NftTrailSection stages={nftTrailStages} certId={nftTrailCertId} />
                    )}
                </>
            )}

            {/* Stat Cards */}
            <div className="grid grid-cols-6 gap-2">
                {statCards.map((s) => (
                    <div key={s.label} className="bg-white rounded-lg border border-[#E5E5E5] p-3">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider">{s.label}</p>
                        <p className="text-lg font-bold font-mono mt-0.5" style={{ color: s.color }}>
                            {typeof s.value === 'number' && s.label.includes('Weight')
                                ? s.value.toLocaleString('en-IN')
                                : s.value}
                        </p>
                    </div>
                ))}
            </div>

            {/* Activity Feed + Integrity Check */}
            <div className="grid grid-cols-5 gap-3">
                <div className="col-span-3">
                    <ActivityFeedSection items={activity} />
                </div>
                <div className="col-span-2">
                    <IntegrityCheckPanel lastResult={lastIntegrity} />
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-1 bg-white rounded-lg border border-[#E5E5E5] p-1">
                {tabs.map((tab) => (
                    <Link
                        key={tab.key}
                        href={`/admin/blockchain${tab.key === 'ALL' ? '' : `?filter=${tab.key.toLowerCase()}`}`}
                        className={`text-xs px-3 py-1.5 rounded-md transition-colors ${filter === tab.key
                            ? 'bg-[#1A2F4B] text-white'
                            : 'text-gray-500 hover:bg-gray-50'
                            }`}
                    >
                        {tab.label}
                    </Link>
                ))}
            </div>

            {/* Certificate Table */}
            <div className="bg-white rounded-lg border border-[#E5E5E5] overflow-hidden">
                <div className="flex items-center gap-3 py-2 px-4 bg-[#F5F5F5] border-b border-[#E5E5E5]">
                    <span className="w-[130px] text-[10px] text-gray-400 uppercase font-bold">Certificate</span>
                    <span className="w-[80px] text-[10px] text-gray-400 uppercase font-bold">Weight</span>
                    <span className="w-[100px] text-[10px] text-gray-400 uppercase font-bold">Trust Score</span>
                    <span className="w-[90px] text-[10px] text-gray-400 uppercase font-bold">Lab Status</span>
                    <span className="flex-1 text-[10px] text-gray-400 uppercase font-bold">Blockchain Hash</span>
                    <span className="w-[120px] text-[10px] text-gray-400 uppercase font-bold text-right">Created</span>
                    <span className="w-4" />
                </div>

                {certs.length === 0 ? (
                    <div className="py-12 text-center">
                        <p className="text-sm text-gray-400">No EPR certificates found</p>
                        <p className="text-xs text-gray-300 mt-1">
                            Certificates will appear when recyclers complete batch processing and checkpoints are hashed.
                        </p>
                    </div>
                ) : (
                    certs.map((c) => <CertRow key={c.id} cert={c} />)
                )}
            </div>
        </div>
    );
}
