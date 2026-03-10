'use client';

import React, { useState, useTransition } from 'react';
import { resolveFraudFlag, getFraudFlags, getFraudScoreHistory, type FraudFlag, type Severity, type FraudScorePoint } from './actions';
import { getRelativeTime } from '@/lib/utils/ist-time';

// ─── Flag type badge config (Stitch bordered pills) ─────────────────
const FLAG_BADGES: Record<string, { bg: string; text: string }> = {
    WEIGHT_VARIANCE: { bg: 'rgba(180,83,9,0.08)', text: 'var(--recco-amber-700)' },
    GPS_MISMATCH: { bg: 'rgba(185,28,28,0.08)', text: 'var(--recco-red-700)' },
    TRANSIT_TIME: { bg: 'rgba(234,88,12,0.08)', text: '#EA580C' },
    PROCESSING_SPEED: { bg: 'rgba(185,28,28,0.08)', text: 'var(--recco-red-700)' },
    WEIGHT_LOSS: { bg: 'rgba(180,83,9,0.08)', text: 'var(--recco-amber-700)' },
    DUPLICATE_CERT: { bg: 'rgba(109,40,217,0.08)', text: 'var(--recco-purple-600)' },
    PRO_DOUBLE_ALLOC: { bg: 'rgba(109,40,217,0.08)', text: 'var(--recco-purple-600)' },
    OCR_MISMATCH: { bg: 'rgba(107,114,128,0.08)', text: '#6B7280' },
};

const SEVERITY_BORDERS: Record<string, string> = {
    CRITICAL: 'var(--recco-red-700)',
    MEDIUM: 'var(--recco-amber-700)',
    LOW: 'var(--recco-green-700)',
};

// ─── Flag Card Component (Stitch Design) ─────────────────────────────
function FraudFlagCard({
    flag,
    adminUserId,
    onResolved,
}: {
    flag: FraudFlag;
    adminUserId: string;
    onResolved: () => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const [showResolve, setShowResolve] = useState(false);
    const [note, setNote] = useState('');
    const [isPending, startTransition] = useTransition();
    const badge = FLAG_BADGES[flag.flagType] || FLAG_BADGES.OCR_MISMATCH;

    const handleResolve = () => {
        startTransition(async () => {
            const res = await resolveFraudFlag(flag.id, adminUserId, note);
            if (res.success) onResolved();
        });
    };

    // Render evidence fields based on flag type
    const renderEvidence = () => {
        const e = flag.evidenceData;
        if (!e || Object.keys(e).length === 0) return <p className="text-xs text-gray-400 italic">Pending data</p>;

        const hasGpsData = flag.flagType === 'GPS_MISMATCH' &&
            e.expected_lat != null && e.expected_lng != null &&
            e.actual_lat != null && e.actual_lng != null;

        return (
            <div className="space-y-3 mt-3">
                {hasGpsData && (
                    <div className="rounded-lg overflow-hidden border border-gray-200">
                        <div className="px-3 py-1.5 flex items-center gap-2" style={{ background: 'rgba(185,28,28,0.08)' }}>
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--recco-red-700)' }} />
                            <span className="text-[10px] font-bold uppercase" style={{ color: 'var(--recco-red-700)' }}>GPS Mismatch Map</span>
                        </div>
                        <iframe
                            width="100%"
                            height="250"
                            frameBorder="0"
                            scrolling="no"
                            src={`https://www.openstreetmap.org/export/embed.html?bbox=${Math.min(Number(e.expected_lng), Number(e.actual_lng)) - 0.01}%2C${Math.min(Number(e.expected_lat), Number(e.actual_lat)) - 0.01}%2C${Math.max(Number(e.expected_lng), Number(e.actual_lng)) + 0.01}%2C${Math.max(Number(e.expected_lat), Number(e.actual_lat)) + 0.01}&layer=mapnik&marker=${e.expected_lat}%2C${e.expected_lng}`}
                            style={{ border: 0 }}
                            title="GPS Mismatch Map"
                        />
                        <div className="flex gap-4 px-3 py-2 bg-slate-50 border-t border-gray-100">
                            <div className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded-full border-2 border-white shadow" style={{ backgroundColor: 'var(--recco-green-700)' }} />
                                <span className="text-[10px] text-gray-600">
                                    Expected: {Number(e.expected_lat).toFixed(4)}, {Number(e.expected_lng).toFixed(4)}
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded-full border-2 border-white shadow" style={{ backgroundColor: 'var(--recco-red-700)' }} />
                                <span className="text-[10px] text-gray-600">
                                    Actual: {Number(e.actual_lat).toFixed(4)}, {Number(e.actual_lng).toFixed(4)}
                                </span>
                            </div>
                            {e.actual_distance_m != null && (
                                <span className="text-[10px] font-bold ml-auto" style={{ color: 'var(--recco-red-700)' }}>
                                    Δ {e.actual_distance_m}m apart
                                </span>
                            )}
                        </div>
                    </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                    {Object.entries(e).map(([key, value]) => (
                        <div key={key} className="bg-slate-50 rounded p-2">
                            <p className="text-[10px] text-slate-400 capitalize font-bold uppercase">{key.replace(/_/g, ' ')}</p>
                            <p className="text-xs font-medium" style={{ color: 'var(--recco-navy-900)' }}>
                                {value === null ? <span className="text-gray-300 italic">—</span> : String(value)}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div
            className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
            style={{
                border: '1px solid var(--recco-border)',
                borderLeft: `4px solid ${SEVERITY_BORDERS[flag.severity] || 'var(--recco-border)'}`,
            }}
        >
            {/* Card Header */}
            <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                    <span
                        className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                        style={{ background: badge.bg, color: badge.text }}
                    >
                        {flag.flagType.replace(/_/g, ' ')}
                    </span>
                    {flag.entityEmail && (
                        <code className="font-mono text-xs text-slate-500">{flag.entityEmail}</code>
                    )}
                    <span className="text-[10px] text-slate-400">{getRelativeTime(flag.createdAt)}</span>
                </div>

                {/* 3-column metadata grid (Stitch pattern) */}
                <div className="grid grid-cols-3 gap-2 mt-3">
                    {flag.evidenceData.variance_pct != null && (
                        <div className="text-[12px] text-slate-500">
                            <span className="block text-[10px] uppercase text-slate-400 font-bold">Variance %</span>
                            {flag.evidenceData.variance_pct}%
                        </div>
                    )}
                    {flag.evidenceData.actual_distance_m != null && (
                        <div className="text-[12px] text-slate-500">
                            <span className="block text-[10px] uppercase text-slate-400 font-bold">GPS Distance</span>
                            {flag.evidenceData.actual_distance_m}m
                        </div>
                    )}
                    {flag.evidenceData.confidence_score != null && (
                        <div className="text-[12px] text-slate-500">
                            <span className="block text-[10px] uppercase text-slate-400 font-bold">OCR Match</span>
                            {Math.round(flag.evidenceData.confidence_score * 100)}%
                        </div>
                    )}
                    {flag.evidenceData.actual_transit_hours != null && (
                        <div className="text-[12px] text-slate-500">
                            <span className="block text-[10px] uppercase text-slate-400 font-bold">Transit Hours</span>
                            {flag.evidenceData.actual_transit_hours}h
                        </div>
                    )}
                </div>
            </div>

            {/* Stitch Action Buttons */}
            <div className="px-4 pb-3 flex gap-2">
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="flex-1 py-2 text-xs font-semibold rounded transition-colors"
                    style={{
                        border: '1px solid var(--recco-teal-700)',
                        color: 'var(--recco-teal-700)',
                    }}
                >
                    {expanded ? 'Hide Evidence ↑' : 'View Full Evidence'}
                </button>
                <button
                    onClick={() => setShowResolve(!showResolve)}
                    className="flex-1 py-2 text-xs font-semibold text-white rounded transition-colors"
                    style={{ background: 'var(--recco-green-700)' }}
                >
                    Mark Resolved
                </button>
            </div>

            {/* Expanded Evidence */}
            {expanded && (
                <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                    {renderEvidence()}
                </div>
            )}

            {/* Resolve Form */}
            {showResolve && (
                <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-2">
                    <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Resolution note (min 10 chars)..."
                        className="w-full px-3 py-2 border rounded text-sm resize-none focus:outline-none"
                        style={{ borderColor: 'var(--recco-border)', outlineColor: 'var(--recco-green-700)' }}
                        rows={2}
                    />
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] text-gray-400">{note.length}/10 minimum</p>
                        <button
                            onClick={handleResolve}
                            disabled={note.length < 10 || isPending}
                            className="px-4 py-1.5 text-white text-xs font-bold rounded disabled:opacity-40 disabled:cursor-not-allowed transition-all uppercase tracking-wider"
                            style={{ backgroundColor: 'var(--recco-green-700)' }}
                        >
                            {isPending ? 'Resolving...' : 'Confirm Resolve'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Fraud Score History Chart (Stitch design with danger zones) ──────
function ScoreChart({ points, threshold }: { points: FraudScorePoint[]; threshold: number }) {
    if (points.length === 0) {
        return <p className="text-sm text-gray-400 italic text-center py-8">No fraud score data for this entity</p>;
    }

    const width = 500;
    const height = 200;
    const padding = 40;
    const chartW = width - padding * 2;
    const chartH = height - padding * 2;

    const xScale = (i: number) => padding + (i / (points.length - 1 || 1)) * chartW;
    const yScale = (v: number) => padding + chartH - (v / 100) * chartH;

    const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(p.score)}`).join(' ');
    const thresholdY = yScale(threshold);

    return (
        <div className="relative">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
                {/* Above-threshold danger zone */}
                <rect x={padding} y={padding} width={chartW} height={thresholdY - padding} fill="#FEF2F2" fillOpacity="0.6" />
                {/* Below-threshold safe zone */}
                <rect x={padding} y={thresholdY} width={chartW} height={padding + chartH - thresholdY} fill="#F0FDF4" fillOpacity="0.6" />
                {/* Threshold line */}
                <line x1={padding} y1={thresholdY} x2={padding + chartW} y2={thresholdY} stroke="#B91C1C" strokeWidth="1.5" strokeDasharray="4 2" />
                <text x={padding + chartW + 4} y={thresholdY + 3} fill="#B91C1C" fontSize="8" fontWeight="bold">Critical ({threshold})</text>
                {/* Score line */}
                <path d={pathData} fill="none" stroke="#1A2F4B" strokeWidth="2.5" strokeLinejoin="round" />
                {/* Score dots */}
                {points.map((p, i) => (
                    <circle
                        key={i}
                        cx={xScale(i)}
                        cy={yScale(p.score)}
                        r={p.score >= threshold ? 5 : 3}
                        fill={p.score >= threshold ? '#B91C1C' : '#1A2F4B'}
                        stroke={p.score >= threshold ? 'white' : 'none'}
                        strokeWidth={p.score >= threshold ? 2 : 0}
                    />
                ))}
                {/* Y-axis labels */}
                {[0, 25, 50, 75, 100].map((v) => (
                    <text key={v} x={padding - 8} y={yScale(v) + 3} fill="#9CA3AF" fontSize="8" textAnchor="end">{v}</text>
                ))}
            </svg>
        </div>
    );
}

// ─── Main Fraud Dashboard Client (Stitch Redesign) ───────────────────
export default function FraudDashboardClient({
    initialCounts,
    initialFlags,
    initialSeverity,
    entities,
    threshold,
    adminUserId,
}: {
    initialCounts: { critical: number; medium: number; low: number };
    initialFlags: FraudFlag[];
    initialSeverity: Severity;
    entities: Array<{ id: string; email: string; score: number }>;
    threshold: number;
    adminUserId: string;
}) {
    const [activeSeverity, setActiveSeverity] = useState<Severity>(initialSeverity);
    const [flags, setFlags] = useState(initialFlags);
    const [counts, setCounts] = useState(initialCounts);
    const [loadingFlags, setLoadingFlags] = useState(false);
    const [selectedEntity, setSelectedEntity] = useState<string>('');
    const [scoreHistory, setScoreHistory] = useState<FraudScorePoint[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [expandedFlagId, setExpandedFlagId] = useState<string | null>(null);

    const handleTabChange = async (sev: Severity) => {
        setActiveSeverity(sev);
        setExpandedFlagId(null);
        setLoadingFlags(true);
        const newFlags = await getFraudFlags(sev);
        setFlags(newFlags);
        setLoadingFlags(false);
    };

    const handleResolved = async () => {
        setExpandedFlagId(null);
        const newFlags = await getFraudFlags(activeSeverity);
        setFlags(newFlags);
        setCounts((prev) => ({
            ...prev,
            [activeSeverity.toLowerCase()]: Math.max(0, prev[activeSeverity.toLowerCase() as keyof typeof prev] - 1),
        }));
    };

    const handleEntitySelect = async (entityId: string) => {
        setSelectedEntity(entityId);
        if (!entityId) { setScoreHistory([]); return; }
        setLoadingHistory(true);
        const history = await getFraudScoreHistory(entityId);
        setScoreHistory(history);
        setLoadingHistory(false);
    };

    const totalFlags = counts.critical + counts.medium + counts.low;
    const avgScore = entities.length > 0 ? (entities.reduce((s, e) => s + e.score, 0) / entities.length).toFixed(1) : '0.0';
    const highRiskCount = entities.filter((e) => e.score >= threshold).length;

    const TABS: Array<{ key: Severity; label: string; count: number; bg: string; icon: string }> = [
        { key: 'CRITICAL', label: 'Critical', count: counts.critical, bg: 'var(--recco-red-700)', icon: '⚠' },
        { key: 'MEDIUM', label: 'Medium', count: counts.medium, bg: 'var(--recco-amber-700)', icon: '⚡' },
        { key: 'LOW', label: 'Low', count: counts.low, bg: 'var(--recco-green-700)', icon: '✓' },
    ];

    return (
        <div className="space-y-6">
            {/* ── Stat Strip (Stitch Top Metric Row) ─────────────────── */}
            <div className="stitch-grid-3 mb-6">
                <div className="stitch-metric-card" style={{ borderBottom: '3px solid var(--recco-red-700)' }}>
                    <div className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-2">Critical Flags</div>
                    <div className="text-3xl font-bold font-mono" style={{ color: 'var(--recco-navy-900)' }}>{counts.critical}</div>
                </div>
                <div className="stitch-metric-card" style={{ borderBottom: '3px solid var(--recco-amber-700)' }}>
                    <div className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-2">Average Score</div>
                    <div className="text-3xl font-bold font-mono" style={{ color: 'var(--recco-navy-900)' }}>{avgScore}</div>
                </div>
                <div className="stitch-metric-card" style={{ borderBottom: '3px solid var(--recco-teal-700)' }}>
                    <div className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-2">High Risk Entities</div>
                    <div className="text-3xl font-bold font-mono" style={{ color: 'var(--recco-navy-900)' }}>{highRiskCount}</div>
                </div>
            </div>

            {/* Section 1: Stitch Severity Filters + Progress Bar */}
            <section className="mb-8 stitch-card p-6 border-b-4" style={{ borderBottomColor: activeSeverity === 'CRITICAL' ? 'var(--recco-red-700)' : activeSeverity === 'MEDIUM' ? 'var(--recco-amber-700)' : 'var(--recco-green-700)' }}>
                <div className="flex flex-wrap gap-4 mb-5">
                    {TABS.map((tab) => {
                        const isActive = activeSeverity === tab.key;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => handleTabChange(tab.key)}
                                className={`px-5 py-2.5 rounded-md text-sm font-bold transition-all shadow-sm ${isActive ? 'text-white' : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-white'
                                    }`}
                                style={isActive ? { background: tab.bg, borderColor: tab.bg, boxShadow: `0 4px 12px ${tab.bg}40` } : {}}
                            >
                                <span className="mr-2">{tab.icon}</span>
                                {tab.label} ({tab.count})
                            </button>
                        );
                    })}
                </div>

                {/* Progress Bar overall distribution */}
                <div className="w-full h-2 rounded-full overflow-hidden flex gap-0.5 bg-gray-100 mb-2">
                    {totalFlags > 0 ? (
                        <>
                            <div style={{ width: `${(counts.critical / totalFlags) * 100}%`, backgroundColor: 'var(--recco-red-700)' }} title={`Critical: ${counts.critical}`} />
                            <div style={{ width: `${(counts.medium / totalFlags) * 100}%`, backgroundColor: 'var(--recco-amber-700)' }} title={`Medium: ${counts.medium}`} />
                            <div style={{ width: `${(counts.low / totalFlags) * 100}%`, backgroundColor: 'var(--recco-green-700)' }} title={`Low: ${counts.low}`} />
                        </>
                    ) : null}
                </div>
                <div className="flex justify-between text-[10px] uppercase font-bold text-gray-400 tracking-widest">
                    <span>Severity Distribution</span>
                    <span>{totalFlags} Total Active Flags</span>
                </div>
            </section>

            {/* Section 2: Fraud Flags 2-Column Grid (Stitch pattern) */}
            <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="stitch-section-title !mb-0">{activeSeverity} FLAGS ({flags.length})</h2>
                </div>

                {loadingFlags ? (
                    <div className="text-center py-16 text-slate-400 text-sm font-medium stitch-card">
                        Loading flags...
                    </div>
                ) : flags.length === 0 ? (
                    <div className="text-center py-16 text-slate-400 text-sm font-medium stitch-card border-dashed">
                        No {activeSeverity.toLowerCase()} fraud flags at this time.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {flags.map((flag) => {
                            const entity = entities.find(e => e.id === flag.entityId);
                            // We merge score here if needed, but FraudFlagCard currently doesn't take score prop directly
                            // It's mostly focused on resolving individual flags
                            return (
                                <FraudFlagCard
                                    key={flag.id}
                                    flag={flag}
                                    adminUserId={adminUserId}
                                    onResolved={handleResolved}
                                />
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Section 3: Fraud Score History (Stitch card with teal top border) */}
            <section className="bg-white rounded-lg shadow-sm overflow-hidden" style={{ borderTop: '4px solid var(--recco-teal-700)', border: '1px solid var(--recco-border)', borderTopWidth: '4px', borderTopColor: 'var(--recco-teal-700)' }}>
                <div className="px-6 py-4 flex justify-between items-center" style={{ borderBottom: '1px solid var(--recco-border)' }}>
                    <h2 className="font-bold uppercase tracking-tight" style={{ color: 'var(--recco-navy-900)' }}>Fraud Score History</h2>
                    <select
                        value={selectedEntity}
                        onChange={(e) => handleEntitySelect(e.target.value)}
                        className="w-64 text-sm border rounded-lg px-3 py-2 font-medium bg-slate-50 focus:outline-none"
                        style={{ borderColor: 'var(--recco-border)', outlineColor: 'var(--recco-green-700)' }}
                    >
                        <option value="">Filter by Entity ID...</option>
                        {entities.map((e) => (
                            <option key={e.id} value={e.id}>
                                {e.email} (Score: {e.score})
                            </option>
                        ))}
                    </select>
                </div>

                <div className="p-6">
                    {loadingHistory ? (
                        <div className="text-center py-6 text-sm text-gray-400">Loading chart...</div>
                    ) : !selectedEntity ? (
                        <div className="bg-slate-50 rounded-lg p-8 text-center" style={{ border: '1px dashed var(--recco-border)' }}>
                            <p className="text-sm font-bold text-slate-500">Select an entity above to view its fraud score trend over time.</p>
                            <p className="text-[11px] text-slate-400 mt-2">The chart shows how fraud flags accumulate into a composite score.</p>
                        </div>
                    ) : (
                        <ScoreChart points={scoreHistory} threshold={threshold} />
                    )}
                </div>

                {/* Stat Blocks (Stitch pattern) */}
                {selectedEntity && scoreHistory.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-6 pb-6">
                        <div className="p-3 rounded-lg bg-slate-50 text-center border border-slate-100">
                            <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Avg Score</span>
                            <span className="text-2xl font-bold font-mono" style={{ color: 'var(--recco-navy-900)' }}>
                                {(scoreHistory.reduce((s, p) => s + p.score, 0) / scoreHistory.length).toFixed(1)}
                            </span>
                        </div>
                        <div className="p-3 rounded-lg bg-slate-50 text-center border border-slate-100">
                            <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Peak Score</span>
                            <span className="text-2xl font-bold font-mono" style={{ color: 'var(--recco-red-700)' }}>
                                {Math.max(...scoreHistory.map(p => p.score))}
                            </span>
                        </div>
                        <div className="p-3 rounded-lg bg-slate-50 text-center border border-slate-100">
                            <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Data Points</span>
                            <span className="text-2xl font-bold font-mono" style={{ color: 'var(--recco-navy-900)' }}>
                                {scoreHistory.length}
                            </span>
                        </div>
                        <div className="p-3 rounded-lg bg-slate-50 text-center border border-slate-100">
                            <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Threshold</span>
                            <span className="text-2xl font-bold font-mono" style={{ color: 'var(--recco-red-700)' }}>
                                {threshold}
                            </span>
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
}
