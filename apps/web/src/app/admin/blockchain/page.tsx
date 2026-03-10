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
import { formatISTTimestamp, getRelativeTime } from '@/lib/utils/ist-time';

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
    const color = score >= 80 ? 'var(--recco-green-700)' : score >= 50 ? 'var(--recco-amber-700)' : 'var(--recco-red-700)';
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
        NABL_VERIFIED: { bg: 'var(--recco-green-100)', color: 'var(--recco-green-700)', label: 'NABL ✓' },
        UPLOADED: { bg: '#FFFBEB', color: 'var(--recco-amber-700)', label: 'Uploaded' },
        SELF_DECLARED: { bg: '#F5F5F5', color: '#666', label: 'Self-Declared' },
        NONE: { bg: '#FEF2F2', color: 'var(--recco-red-700)', label: 'None' },
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
        <span className="text-[10px] px-2 py-0.5 rounded stitch-bg-green stitch-text-green font-mono" title={hash}>
            0x{hash.slice(0, 8)}…{hash.slice(-4)}
        </span>
    );
}
function CertRow({ cert }: { cert: CertificateListItem }) {
    return (
        <Link href={`/admin/blockchain/${cert.id}`} className="block group">
            <div className="flex flex-col md:flex-row md:items-center gap-4 py-4 px-6 border-b border-gray-100 transition-colors hover:bg-gray-50 bg-white">
                <div className="w-full md:w-[130px] flex-shrink-0">
                    <p className="text-sm font-mono font-bold stitch-text-navy group-hover:text-[#1B6B35] transition-colors">
                        {cert.nftTokenId ? `NFT-${cert.nftTokenId.slice(0, 8)}` : `CERT-${cert.id.slice(0, 8)}`}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{cert.materialType}</p>
                </div>
                <div className="w-full md:w-[100px]">
                    <p className="text-sm font-mono font-bold stitch-text-navy">
                        {cert.weightMT.toLocaleString('en-IN', { maximumFractionDigits: 2 })} MT
                    </p>
                </div>
                <div className="w-full md:w-[120px]">
                    <TrustScoreBar score={cert.trustScore} />
                </div>
                <div className="w-full md:w-[120px]">
                    <LabBadge status={cert.labStatus} />
                </div>
                <div className="flex-1 min-w-0">
                    <HashBadge hash={cert.blockchainTxHash} />
                </div>
                <div className="w-full md:w-[140px] md:text-right shrink-0">
                    <p className="text-xs font-medium text-gray-400">
                        {formatISTTimestamp(cert.createdAt).split(',')[0]}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                        {formatISTTimestamp(cert.createdAt).split(',')[1]}
                    </p>
                </div>
                <div className="hidden md:block text-gray-300 text-sm font-bold group-hover:text-[#1B6B35] transition-colors transform group-hover:translate-x-1">→</div>
            </div>
        </Link>
    );
}

function ActivityFeedSection({ items }: { items: ActivityItem[] }) {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                <h3 className="text-sm font-bold stitch-text-navy uppercase tracking-wider">24-Hour Activity Feed</h3>
            </div>
            <div className="p-4 flex-1 overflow-y-auto max-h-[320px]">
                {items.length === 0 ? (
                    <div className="py-8 text-center flex flex-col items-center justify-center h-full">
                        <span className="text-3xl mb-3 opacity-50">💤</span>
                        <p className="text-sm font-bold text-gray-400">No on-chain activity</p>
                        <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
                            Checkpoint hashes and certificate minting events will appear here.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {items.map((item, i) => (
                            <div key={`${item.type}-${item.id}-${i}`} className="flex items-start gap-3 py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                                <span className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-sm"
                                    style={{
                                        backgroundColor: item.type === 'checkpoint' ? '#EFF6FF' : 'var(--recco-green-100)',
                                        color: item.type === 'checkpoint' ? '#2563EB' : 'var(--recco-green-700)',
                                    }}
                                >
                                    {item.type === 'checkpoint' ? '🔗' : '📜'}
                                </span>
                                <div className="flex-1 min-w-0 pt-0.5">
                                    <p className="text-sm font-medium stitch-text-navy">{item.label}</p>
                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                        {item.hash && (
                                            <span className="text-[10px] font-mono font-bold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded border border-gray-200 flex-shrink-0 truncate max-w-[120px]">
                                                0x{item.hash.slice(0, 8)}…{item.hash.slice(-4)}
                                            </span>
                                        )}
                                        <span className="text-xs text-gray-400 font-medium whitespace-nowrap">
                                            {getRelativeTime(item.timestamp)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function NftTrailSection({ stages, certId }: { stages: NftTrailStage[]; certId: string }) {
    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mt-6 md:mt-0">
            <h3 className="text-sm font-bold uppercase tracking-wider stitch-text-navy mb-6">
                NFT Ownership Trail
                <span className="ml-2 font-mono text-xs text-gray-500 font-normal normal-case break-all block mt-1 sm:inline sm:mt-0">{certId}</span>
            </h3>
            <div className="relative pl-6 sm:pl-8">
                {/* Vertical line */}
                <div className="absolute left-[11px] sm:left-[19px] top-3 bottom-4 w-0.5 bg-gray-200" />

                {stages.map((stage, i) => {
                    const dotColor = stage.status === 'complete' ? 'var(--recco-green-700)'
                        : stage.status === 'current' ? 'var(--recco-amber-500)'
                            : '#D1D5DB';
                    const textColor = stage.status === 'complete' ? 'var(--recco-navy-900)'
                        : stage.status === 'current' ? 'var(--recco-navy-900)'
                            : '#9CA3AF';

                    return (
                        <div key={i} className="relative mb-8 last:mb-0">
                            {/* Dot */}
                            <div
                                className="absolute -left-6 sm:-left-8 top-1 w-4 h-4 rounded-full border-[3px] border-white shadow-sm z-10"
                                style={{ backgroundColor: dotColor, boxShadow: '0 0 0 1px #E5E5E5 inset, 0 1px 2px rgba(0,0,0,0.1)' }}
                            />
                            {stage.status === 'current' && (
                                <div className="absolute -left-6 sm:-left-8 top-1 w-4 h-4 rounded-full animate-ping opacity-40 z-0" style={{ backgroundColor: dotColor }} />
                            )}

                            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 hover:border-gray-200 hover:bg-white transition-colors shadow-sm">
                                <p className="text-sm font-bold flex items-center justify-between" style={{ color: textColor }}>
                                    <span>{stage.stage}</span>
                                    {stage.status === 'complete' && <span className="stitch-text-green bg-green-50 w-5 h-5 rounded-full flex items-center justify-center text-xs">✓</span>}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">{stage.detail}</p>
                                {stage.timestamp && (
                                    <p className="text-xs font-mono font-medium text-gray-400 mt-2 bg-white px-2 py-1 inline-block rounded border border-gray-100">
                                        {formatISTTimestamp(stage.timestamp)}
                                    </p>
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
        { label: 'Total Certificates', value: stats.totalCerts, color: 'var(--recco-navy-900)' },
        { label: 'On-Chain', value: stats.onChainCount, color: 'var(--recco-green-700)' },
        { label: 'Avg Trust Score', value: stats.avgTrustScore, color: 'var(--recco-teal-700)' },
        { label: 'NABL Verified', value: stats.nablVerified, color: 'var(--recco-green-700)' },
        { label: 'Pending', value: stats.pendingVerification, color: 'var(--recco-amber-700)' },
        { label: 'Total Weight (MT)', value: stats.totalWeightMT, color: 'var(--recco-navy-900)' },
    ];

    const tabs = [
        { key: 'ALL', label: 'All' },
        { key: 'ON_CHAIN', label: 'On-Chain' },
        { key: 'PENDING', label: 'Pending' },
        { key: 'NABL_VERIFIED', label: 'NABL Verified' },
    ];

    return (
        <div className="stitch-page p-8 max-w-[1600px] mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold stitch-text-navy tracking-tight">Blockchain Verification</h1>
                <p className="text-sm text-gray-500">
                    On-chain search, integrity verification, NFT ownership trail, and certificate registry
                </p>
            </div>

            {/* Search Bar */}
            <BlockchainSearch />

            {/* Search Results */}
            {searchQuery && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
                    <SearchResults results={searchResults} />
                    {nftTrailStages.length > 0 && (
                        <NftTrailSection stages={nftTrailStages} certId={nftTrailCertId} />
                    )}
                </div>
            )}

            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 or gap-6">
                {statCards.map((s) => (
                    <div key={s.label} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-center text-center">
                        <p className="text-xs font-bold text-gray-400 tracking-wider uppercase mb-1">{s.label}</p>
                        <p className="text-3xl font-bold font-mono" style={{ color: s.color }}>
                            {typeof s.value === 'number' && s.label.includes('Weight')
                                ? s.value.toLocaleString('en-IN')
                                : s.value}
                        </p>
                    </div>
                ))}
            </div>

            {/* Activity Feed + Integrity Check */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3 h-full">
                    <ActivityFeedSection items={activity} />
                </div>
                <div className="lg:col-span-2 h-full">
                    <IntegrityCheckPanel lastResult={lastIntegrity} />
                </div>
            </div>

            {/* Registry List Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-8">
                {/* Header & Filter Tabs */}
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h2 className="text-lg font-bold stitch-text-navy">Certificate Registry</h2>
                    <div className="flex flex-wrap gap-2">
                        {tabs.map((tab) => (
                            <Link
                                key={tab.key}
                                href={`/admin/blockchain${tab.key === 'ALL' ? '' : `?filter=${tab.key.toLowerCase()}`}`}
                                className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors ${filter === tab.key
                                    ? 'bg-[#1B6B35] text-white shadow-sm'
                                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                                    }`}
                            >
                                {tab.label}
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Certificate Table */}
                <div className="overflow-x-auto">
                    <div className="min-w-[900px] w-full">
                        <div className="flex items-center gap-4 py-3 px-6 bg-[var(--recco-navy-900)] text-white">
                            <span className="w-[130px] text-xs font-bold uppercase tracking-wider">Certificate</span>
                            <span className="w-[100px] text-xs font-bold uppercase tracking-wider">Weight</span>
                            <span className="w-[120px] text-xs font-bold uppercase tracking-wider">Trust Score</span>
                            <span className="w-[120px] text-xs font-bold uppercase tracking-wider">Lab Status</span>
                            <span className="flex-1 text-xs font-bold uppercase tracking-wider">Blockchain Hash</span>
                            <span className="w-[140px] text-xs font-bold uppercase tracking-wider text-right">Created</span>
                            <span className="w-4" />
                        </div>

                        <div className="divide-y divide-gray-100 bg-white">
                            {certs.length === 0 ? (
                                <div className="py-16 text-center flex flex-col items-center justify-center">
                                    <span className="text-4xl mb-4 opacity-50">📑</span>
                                    <p className="text-lg font-bold stitch-text-navy">No certificates found</p>
                                    <p className="text-sm text-gray-500 mt-2 max-w-sm">
                                        Certificates will appear when recyclers complete batch processing and checkpoints are hashed.
                                    </p>
                                </div>
                            ) : (
                                certs.map((c) => <CertRow key={c.id} cert={c} />)
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
