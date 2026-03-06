'use client';

import React, { useState, useTransition } from 'react';
import { resolveFraudFlag, getFraudFlags, getFraudScoreHistory, type FraudFlag, type Severity, type FraudScorePoint } from './actions';
import { getRelativeTime } from '@/lib/utils/ist-time';

// ─── Flag type badge config ──────────────────────────────────────────
const FLAG_BADGES: Record<string, { bg: string; text: string }> = {
    WEIGHT_VARIANCE: { bg: 'bg-amber-100', text: 'text-[#B45309]' },
    GPS_MISMATCH: { bg: 'bg-red-100', text: 'text-[#B91C1C]' },
    TRANSIT_TIME: { bg: 'bg-orange-100', text: 'text-[#C2410C]' },
    PROCESSING_SPEED: { bg: 'bg-red-100', text: 'text-[#B91C1C]' },
    WEIGHT_LOSS: { bg: 'bg-amber-100', text: 'text-[#92400E]' },
    DUPLICATE_CERT: { bg: 'bg-purple-100', text: 'text-[#7C3AED]' },
    PRO_DOUBLE_ALLOC: { bg: 'bg-purple-100', text: 'text-[#7C3AED]' },
    OCR_MISMATCH: { bg: 'bg-gray-100', text: 'text-gray-600' },
};

const SEVERITY_COLORS: Record<string, string> = {
    CRITICAL: 'border-l-[#B91C1C]',
    MEDIUM: 'border-l-[#B45309]',
    LOW: 'border-l-[#1B6B35]',
};

// ─── Flag Card Component ─────────────────────────────────────────────
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

        return (
            <div className="grid grid-cols-2 gap-2 mt-3">
                {Object.entries(e).map(([key, value]) => (
                    <div key={key}>
                        <p className="text-[10px] text-gray-400 capitalize">{key.replace(/_/g, ' ')}</p>
                        <p className="text-xs font-medium text-[#1A2F4B]">
                            {value === null ? <span className="text-gray-300 italic">—</span> : String(value)}
                        </p>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className={`bg-white border border-[#E5E5E5] rounded-lg border-l-4 ${SEVERITY_COLORS[flag.severity] || ''} shadow-sm hover:shadow-md transition-shadow`}>
            {/* Card Header */}
            <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${badge.bg} ${badge.text}`}>
                        {flag.flagType.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[10px] text-gray-400">{getRelativeTime(flag.createdAt)}</span>
                </div>

                {flag.entityEmail && (
                    <p className="text-xs text-gray-500 mb-1">Entity: <span className="font-medium text-[#1A2F4B]">{flag.entityEmail}</span></p>
                )}

                {/* Key evidence preview */}
                <div className="flex gap-3 mt-2 flex-wrap">
                    {flag.evidenceData.variance_pct != null && (
                        <span className="text-xs bg-amber-50 text-[#B45309] px-2 py-0.5 rounded font-medium">
                            Variance: {flag.evidenceData.variance_pct}%
                        </span>
                    )}
                    {flag.evidenceData.actual_distance_m != null && (
                        <span className="text-xs bg-red-50 text-[#B91C1C] px-2 py-0.5 rounded font-medium">
                            Distance: {flag.evidenceData.actual_distance_m}m
                        </span>
                    )}
                    {flag.evidenceData.confidence_score != null && (
                        <span className="text-xs bg-gray-50 text-gray-600 px-2 py-0.5 rounded font-medium">
                            OCR: {Math.round(flag.evidenceData.confidence_score * 100)}%
                        </span>
                    )}
                    {flag.evidenceData.actual_transit_hours != null && (
                        <span className="text-xs bg-orange-50 text-[#C2410C] px-2 py-0.5 rounded font-medium">
                            Transit: {flag.evidenceData.actual_transit_hours}h
                        </span>
                    )}
                </div>
            </div>

            {/* Actions */}
            <div className="px-4 pb-3 flex gap-2">
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="text-[11px] text-[#1B6B35] font-medium hover:underline"
                >
                    {expanded ? 'Hide Evidence ↑' : 'View Full Evidence ↓'}
                </button>
                <button
                    onClick={() => setShowResolve(!showResolve)}
                    className="text-[11px] text-[#B45309] font-medium hover:underline ml-auto"
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
                        className="w-full px-3 py-2 border border-gray-200 rounded text-sm resize-none focus:outline-none focus:border-[#1B6B35]"
                        rows={2}
                    />
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] text-gray-400">{note.length}/10 minimum</p>
                        <button
                            onClick={handleResolve}
                            disabled={note.length < 10 || isPending}
                            className="px-4 py-1.5 bg-[#1B6B35] text-white text-xs font-bold rounded hover:bg-[#155A2B] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                            {isPending ? 'Resolving...' : 'Confirm Resolve'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Fraud Score History Chart (simplified SVG) ──────────────────────
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
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
            {/* Above-threshold area */}
            <rect x={padding} y={padding} width={chartW} height={thresholdY - padding} fill="#FEF2F2" fillOpacity="0.5" />
            {/* Below-threshold area */}
            <rect x={padding} y={thresholdY} width={chartW} height={padding + chartH - thresholdY} fill="#F0FDF4" fillOpacity="0.5" />
            {/* Threshold line */}
            <line x1={padding} y1={thresholdY} x2={padding + chartW} y2={thresholdY} stroke="#B91C1C" strokeWidth="1" strokeDasharray="4 2" />
            <text x={padding + chartW + 4} y={thresholdY + 3} fill="#B91C1C" fontSize="8" fontWeight="bold">{threshold}</text>
            {/* Score line */}
            <path d={pathData} fill="none" stroke="#1A2F4B" strokeWidth="2" strokeLinejoin="round" />
            {/* Score dots */}
            {points.map((p, i) => (
                <circle key={i} cx={xScale(i)} cy={yScale(p.score)} r="3" fill={p.score >= threshold ? '#B91C1C' : '#1B6B35'} />
            ))}
            {/* Y-axis labels */}
            {[0, 25, 50, 75, 100].map((v) => (
                <text key={v} x={padding - 8} y={yScale(v) + 3} fill="#9CA3AF" fontSize="8" textAnchor="end">{v}</text>
            ))}
        </svg>
    );
}

// ─── Main Fraud Dashboard Client ─────────────────────────────────────
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

    const handleTabChange = async (sev: Severity) => {
        setActiveSeverity(sev);
        setLoadingFlags(true);
        const newFlags = await getFraudFlags(sev);
        setFlags(newFlags);
        setLoadingFlags(false);
    };

    const handleResolved = async () => {
        // Refresh current tab
        const newFlags = await getFraudFlags(activeSeverity);
        setFlags(newFlags);
        // Update counts
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

    const TABS: Array<{ key: Severity; label: string; count: number; color: string; activeBg: string }> = [
        { key: 'CRITICAL', label: 'Critical', count: counts.critical, color: 'text-[#B91C1C]', activeBg: 'bg-red-50 border-[#B91C1C]' },
        { key: 'MEDIUM', label: 'Medium', count: counts.medium, color: 'text-[#B45309]', activeBg: 'bg-amber-50 border-[#B45309]' },
        { key: 'LOW', label: 'Low', count: counts.low, color: 'text-[#1B6B35]', activeBg: 'bg-green-50 border-[#1B6B35]' },
    ];

    return (
        <div className="space-y-5">
            {/* Section 1: Severity Tabs */}
            <div className="flex gap-3">
                {TABS.map((tab) => {
                    const isActive = activeSeverity === tab.key;
                    return (
                        <button
                            key={tab.key}
                            onClick={() => handleTabChange(tab.key)}
                            className={`
                flex items-center gap-2 px-5 py-3 rounded-lg border-2 text-sm font-bold transition-all
                ${isActive ? tab.activeBg : 'bg-white border-[#E5E5E5] hover:border-gray-300'}
              `}
                        >
                            <span className={tab.color}>{tab.label}</span>
                            <span className={`text-[10px] ml-1 px-2 py-0.5 rounded-full font-bold ${isActive
                                    ? tab.key === 'CRITICAL' ? 'bg-[#B91C1C] text-white' : tab.key === 'MEDIUM' ? 'bg-[#B45309] text-white' : 'bg-[#1B6B35] text-white'
                                    : 'bg-gray-200 text-gray-600'
                                }`}>
                                {tab.count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Section 2: Flag Cards */}
            {loadingFlags ? (
                <div className="text-center py-8 text-gray-400 text-sm">Loading flags...</div>
            ) : flags.length === 0 ? (
                <div className={`p-6 rounded-lg border text-center ${activeSeverity === 'CRITICAL' ? 'bg-green-50 border-green-200' :
                        activeSeverity === 'MEDIUM' ? 'bg-green-50 border-green-200' :
                            'bg-green-50 border-green-200'
                    }`}>
                    <p className="text-sm font-medium text-[#1B6B35]">
                        ✓ No {activeSeverity.toLowerCase()} fraud flags at this time.
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Platform is operating within fraud detection thresholds.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {flags.map((flag) => (
                        <FraudFlagCard
                            key={flag.id}
                            flag={flag}
                            adminUserId={adminUserId}
                            onResolved={handleResolved}
                        />
                    ))}
                </div>
            )}

            {/* Section 3: Fraud Score History */}
            <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                <h3 className="text-sm font-bold text-[#1A2F4B] mb-3">Fraud Score History</h3>
                <select
                    value={selectedEntity}
                    onChange={(e) => handleEntitySelect(e.target.value)}
                    className="w-full max-w-sm px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#1B6B35] mb-4"
                >
                    <option value="">Select entity to view score history...</option>
                    {entities.map((e) => (
                        <option key={e.id} value={e.id}>
                            {e.email} (Score: {e.score})
                        </option>
                    ))}
                </select>

                {loadingHistory ? (
                    <div className="text-center py-6 text-sm text-gray-400">Loading chart...</div>
                ) : !selectedEntity ? (
                    <div className="bg-gray-50 rounded-lg p-6 text-center">
                        <p className="text-sm text-gray-400">Select an entity above to view its fraud score trend over time.</p>
                        <p className="text-[10px] text-gray-300 mt-1">The chart shows how fraud flags accumulate into a composite score.</p>
                    </div>
                ) : (
                    <ScoreChart points={scoreHistory} threshold={threshold} />
                )}
            </div>

            {/* Manual Configuration Reminder */}
            {/* 
        ⚠️ MANUAL STEP REQUIRED: Activate calculate-fraud-score Edge Function
        1. Supabase Dashboard → Database → Webhooks
        2. Create new webhook
        3. Table: fraud_flags, Event: INSERT
        4. Target: Edge Function URL (https://aqvdhbyrqgnglfvhcurb.supabase.co/functions/v1/calculate-fraud-score)
        5. HTTP Method: POST
        6. Include: Authorization header with service-role key
        Complete before Phase 3.
      */}
        </div>
    );
}
