'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    type EvidenceCardData,
    type DecisionType,
    resolveDispute,
} from '../actions';
import { formatINR, formatISTTimestamp } from '@/lib/utils/ist-time';

// ═══════════════════════════════════════════════════════════════════════
// SLA COUNTDOWN HEADER
// ═══════════════════════════════════════════════════════════════════════

function SLAHeader({ deadline, resolved }: { deadline: string | null; resolved: boolean }) {
    const [remaining, setRemaining] = React.useState('');
    const [urgency, setUrgency] = React.useState<'normal' | 'warning' | 'critical' | 'breached'>('normal');

    React.useEffect(() => {
        if (resolved) { setRemaining('Resolved'); return; }
        if (!deadline) { setRemaining('No SLA set'); return; }

        const update = () => {
            const now = new Date();
            const sla = new Date(deadline);
            const diffMs = sla.getTime() - now.getTime();

            if (diffMs <= 0) {
                const overHrs = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60));
                setRemaining(`SLA BREACHED — ${overHrs}h overdue`);
                setUrgency('breached');
            } else {
                const hrs = Math.floor(diffMs / (1000 * 60 * 60));
                const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                setRemaining(`${hrs}h ${mins}m remaining`);
                setUrgency(hrs < 6 ? 'critical' : hrs < 12 ? 'warning' : 'normal');
            }
        };

        update();
        const interval = setInterval(update, 30000);
        return () => clearInterval(interval);
    }, [deadline, resolved]);

    const colorMap = {
        normal: { bg: 'var(--recco-green-50)', text: 'var(--recco-green-700)', border: 'var(--recco-green-700)' },
        warning: { bg: '#FFFBEB', text: 'var(--recco-amber-600)', border: 'var(--recco-amber-600)' },
        critical: { bg: '#FEF2F2', text: 'var(--recco-red-600)', border: 'var(--recco-red-600)' },
        breached: { bg: '#FEF2F2', text: 'var(--recco-red-600)', border: 'var(--recco-red-600)' },
    };

    const c = colorMap[urgency];

    return (
        <div
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${urgency === 'breached' ? 'animate-pulse' : ''}`}
            style={{ backgroundColor: c.bg, border: `1px solid ${c.border}` }}
        >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.text }} />
            <span className="text-xs font-bold" style={{ color: c.text }}>{remaining}</span>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════
// 3-COLUMN EVIDENCE CARD
// ═══════════════════════════════════════════════════════════════════════

function EvidencePhotoPlaceholder({ label }: { label: string }) {
    return (
        <div className="bg-gray-100 border border-dashed border-gray-300 rounded-lg h-28 flex flex-col items-center justify-center">
            <span className="text-gray-300 text-2xl mb-1">📷</span>
            <span className="text-[10px] text-gray-400">{label}</span>
        </div>
    );
}

function WeightDisplay({ label, weight, subtext }: { label: string; weight: number; subtext?: string }) {
    return (
        <div className="text-center">
            <p className="text-[10px] text-gray-400 uppercase">{label}</p>
            <p className="text-lg font-bold font-mono stitch-text-navy">
                {weight.toFixed(2)} <span className="text-xs text-gray-400">kg</span>
            </p>
            {subtext && <p className="text-[9px] text-gray-400">{subtext}</p>}
        </div>
    );
}

function GPSDisplay({ lat, lng, label }: { lat: number; lng: number; label: string }) {
    if (lat === 0 && lng === 0) {
        return <span className="text-[10px] text-gray-300">{label}: No GPS</span>;
    }
    return (
        <span className="text-[10px] text-gray-500">
            {label}: {lat.toFixed(4)}°N, {lng.toFixed(4)}°E
        </span>
    );
}

function EvidenceCard({ evidence }: { evidence: EvidenceCardData }) {
    const d = evidence.dispute;
    const tierConfig = {
        AUTO_ACCEPT: { bg: 'var(--recco-green-50)', border: 'var(--recco-green-700)', label: 'AUTO-ACCEPT (< 10%)' },
        STRUCTURED_REVIEW: { bg: '#FFFBEB', border: 'var(--recco-amber-600)', label: 'STRUCTURED REVIEW (10–15%)' },
        AUTO_REJECT: { bg: '#FEF2F2', border: 'var(--recco-red-600)', label: 'AUTO-REJECT (> 15%)' },
    }[d.varianceTier];

    return (
        <div className="space-y-3">
            {/* Variance Banner */}
            <div
                className="flex items-center justify-between px-4 py-2 rounded-lg"
                style={{ backgroundColor: tierConfig.bg, border: `1px solid ${tierConfig.border}` }}
            >
                <span className="text-xs font-bold" style={{ color: tierConfig.border }}>
                    {tierConfig.label}
                </span>
                <span className="text-sm font-bold font-mono" style={{ color: tierConfig.border }}>
                    Variance: {d.variancePercent.toFixed(2)}%
                </span>
            </div>

            {/* 3-Column Evidence Grid */}
            <div className="grid grid-cols-3 gap-3">
                {/* Column 1: AGG Evidence */}
                <div className="bg-white rounded-lg border border-[#E5E5E5] p-3 space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--recco-amber-600)' }} />
                        <h4 className="text-xs font-bold stitch-text-navy">Aggregator Evidence</h4>
                    </div>

                    {/* Photos */}
                    <div className="grid grid-cols-3 gap-1">
                        {evidence.aggPhotos.map((photo, i) => (
                            photo.url ? (
                                <img
                                    key={i}
                                    src={photo.url}
                                    alt={`Scale photo ${i + 1}`}
                                    className="w-full h-20 object-cover rounded border border-gray-200"
                                />
                            ) : (
                                <EvidencePhotoPlaceholder key={i} label={`Photo ${i + 1}`} />
                            )
                        ))}
                    </div>

                    {/* OCR Weights */}
                    <div className="grid grid-cols-3 gap-1 text-center">
                        {evidence.aggPhotos.map((photo, i) => (
                            <div key={i}>
                                <p className="text-[9px] text-gray-400">OCR #{i + 1}</p>
                                <p className="text-[11px] font-mono font-bold stitch-text-navy">
                                    {photo.ocrWeight > 0 ? `${photo.ocrWeight.toFixed(1)} kg` : '—'}
                                </p>
                            </div>
                        ))}
                    </div>

                    <hr className="border-gray-100" />

                    <WeightDisplay
                        label="Median (Declared)"
                        weight={evidence.aggMedianWeight}
                        subtext={evidence.aggTimestamp ? formatISTTimestamp(evidence.aggTimestamp) : undefined}
                    />

                    <GPSDisplay lat={evidence.aggGps.lat} lng={evidence.aggGps.lng} label="Collection GPS" />
                </div>

                {/* Column 2: Transport Chain */}
                <div className="bg-white rounded-lg border border-[#E5E5E5] p-3 space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--recco-teal-700)' }} />
                        <h4 className="text-xs font-bold stitch-text-navy">Transport Chain</h4>
                    </div>

                    {/* Timeline */}
                    <div className="space-y-3">
                        {/* Collection */}
                        <div className="flex gap-2">
                            <div className="flex flex-col items-center">
                                <div className="w-3 h-3 rounded-full border-2 border-white shadow" style={{ backgroundColor: 'var(--recco-amber-600)' }} />
                                <div className="w-0.5 flex-1 bg-gray-200" />
                            </div>
                            <div className="flex-1 pb-2">
                                <p className="text-[11px] font-bold stitch-text-navy">Collection</p>
                                {evidence.transport.collectionTime ? (
                                    <>
                                        <p className="text-[10px] text-gray-400">{formatISTTimestamp(evidence.transport.collectionTime)}</p>
                                        {evidence.transport.collectionGps && (
                                            <GPSDisplay {...evidence.transport.collectionGps} label="GPS" />
                                        )}
                                    </>
                                ) : (
                                    <p className="text-[10px] text-gray-300">No data</p>
                                )}
                            </div>
                        </div>

                        {/* Pickup */}
                        <div className="flex gap-2">
                            <div className="flex flex-col items-center">
                                <div className="w-3 h-3 rounded-full border-2 border-white shadow" style={{ backgroundColor: 'var(--recco-teal-700)' }} />
                                <div className="w-0.5 flex-1 bg-gray-200" />
                            </div>
                            <div className="flex-1 pb-2">
                                <p className="text-[11px] font-bold stitch-text-navy">Pickup</p>
                                {evidence.transport.pickupTime ? (
                                    <>
                                        <p className="text-[10px] text-gray-400">{formatISTTimestamp(evidence.transport.pickupTime)}</p>
                                        {evidence.transport.pickupGps && (
                                            <GPSDisplay {...evidence.transport.pickupGps} label="GPS" />
                                        )}
                                    </>
                                ) : (
                                    <p className="text-[10px] text-gray-300">No data</p>
                                )}
                            </div>
                        </div>

                        {/* Delivery */}
                        <div className="flex gap-2">
                            <div className="flex flex-col items-center">
                                <div className="w-3 h-3 rounded-full border-2 border-white shadow" style={{ backgroundColor: 'var(--recco-green-700)' }} />
                            </div>
                            <div className="flex-1">
                                <p className="text-[11px] font-bold stitch-text-navy">Delivery</p>
                                {evidence.transport.deliveryTime ? (
                                    <>
                                        <p className="text-[10px] text-gray-400">{formatISTTimestamp(evidence.transport.deliveryTime)}</p>
                                        {evidence.transport.deliveryGps && (
                                            <GPSDisplay {...evidence.transport.deliveryGps} label="GPS" />
                                        )}
                                    </>
                                ) : (
                                    <p className="text-[10px] text-gray-300">No data</p>
                                )}
                            </div>
                        </div>
                    </div>

                    <hr className="border-gray-100" />

                    {/* Transit Duration */}
                    <div className="text-center">
                        <p className="text-[10px] text-gray-400 uppercase">Transit Duration</p>
                        <p className="text-sm font-bold font-mono" style={{ color: 'var(--recco-teal-700)' }}>
                            {evidence.transport.transitDuration || '—'}
                        </p>
                    </div>

                    <div className="text-center">
                        <p className="text-[10px] text-gray-400 uppercase">Carrier</p>
                        <p className="text-[11px] stitch-text-navy">{evidence.transport.carrierName}</p>
                    </div>
                </div>

                {/* Column 3: Recycler Evidence */}
                <div className="bg-white rounded-lg border border-[#E5E5E5] p-3 space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--recco-green-700)' }} />
                        <h4 className="text-xs font-bold stitch-text-navy">Recycler Evidence (CP1)</h4>
                    </div>

                    {/* Scale Photo */}
                    {evidence.recycler.scalePhotoUrl ? (
                        <img
                            src={evidence.recycler.scalePhotoUrl}
                            alt="CP1 Scale Photo"
                            className="w-full h-32 object-cover rounded border border-gray-200"
                        />
                    ) : (
                        <EvidencePhotoPlaceholder label="CP1 Scale Photo" />
                    )}

                    <hr className="border-gray-100" />

                    <WeightDisplay
                        label="Input Weight (CP1)"
                        weight={evidence.recycler.inputWeight}
                        subtext={evidence.recycler.cpTimestamp ? formatISTTimestamp(evidence.recycler.cpTimestamp) : undefined}
                    />

                    {evidence.recycler.gps && (
                        <GPSDisplay lat={evidence.recycler.gps.lat} lng={evidence.recycler.gps.lng} label="Facility GPS" />
                    )}
                </div>
            </div>

            {/* Weight Comparison Bar */}
            <div className="bg-white rounded-lg border border-[#E5E5E5] p-3">
                <div className="flex items-center justify-around">
                    <WeightDisplay label="AGG Declared" weight={d.aggWeight} />
                    <div className="text-center">
                        <p className="text-[10px] text-gray-400 uppercase">Difference</p>
                        <p className="text-lg font-bold font-mono" style={{
                            color: d.variancePercent > 15 ? 'var(--recco-red-600)' : d.variancePercent > 10 ? 'var(--recco-amber-600)' : 'var(--recco-green-700)'
                        }}>
                            {(d.aggWeight - d.recWeight).toFixed(2)} kg
                        </p>
                    </div>
                    <WeightDisplay label="REC Measured" weight={d.recWeight} />
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════
// ADMIN DECISION PANEL
// ═══════════════════════════════════════════════════════════════════════

const DECISION_OPTIONS: { key: DecisionType; label: string; description: string; color: string }[] = [
    { key: 'ACCEPT_AGG', label: 'Accept AGG Weight', description: 'Use aggregator\'s declared weight for settlement', color: 'var(--recco-amber-600)' },
    { key: 'ACCEPT_RECYCLER', label: 'Accept Recycler Weight', description: 'Use recycler\'s measured weight for settlement', color: 'var(--recco-green-700)' },
    { key: 'SPLIT', label: 'Split Difference', description: 'Average both weights for fair settlement', color: 'var(--recco-teal-700)' },
    { key: 'ESCALATE', label: 'Escalate', description: 'Flag for senior admin review with new 24h SLA', color: 'var(--recco-red-600)' },
];

function DecisionPanel({
    disputeId,
    adminUserId,
    isResolved,
    currentDecision,
}: {
    disputeId: string;
    adminUserId: string;
    isResolved: boolean;
    currentDecision: string | null;
}) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [selectedDecision, setSelectedDecision] = useState<DecisionType | null>(null);
    const [notes, setNotes] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = () => {
        if (!selectedDecision) { setError('Select a decision.'); return; }
        if (notes.length < 20) { setError('Notes must be at least 20 characters.'); return; }
        setError('');

        startTransition(async () => {
            const result = await resolveDispute(disputeId, selectedDecision, notes, adminUserId);
            if (result.success) {
                setSuccess(true);
                router.refresh();
            } else {
                setError(result.error || 'Resolution failed.');
            }
        });
    };

    if (isResolved || success) {
        return (
            <div className="border rounded-lg p-4 text-center" style={{ backgroundColor: 'var(--recco-green-50)', borderColor: 'rgba(27,107,53,0.2)' }}>
                <p className="text-sm font-bold stitch-text-green mb-1">
                    ✓ Dispute {success ? 'Resolved' : 'Already Resolved'}
                </p>
                {currentDecision && (
                    <p className="text-xs text-gray-500">
                        Decision: {currentDecision.replace(/_/g, ' ')}
                    </p>
                )}
                <Link
                    href="/admin/disputes"
                    className="inline-block mt-3 text-xs stitch-text-green hover:underline"
                >
                    ← Back to Disputes
                </Link>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg border border-[#E5E5E5] p-4 space-y-3">
            <h3 className="text-sm font-bold stitch-text-navy">Admin Decision</h3>

            {/* Decision Options */}
            <div className="grid grid-cols-2 gap-2">
                {DECISION_OPTIONS.map((opt) => (
                    <button
                        key={opt.key}
                        onClick={() => { setSelectedDecision(opt.key); setError(''); }}
                        disabled={isPending}
                        className={`text-left p-2.5 rounded-lg border-2 transition-all ${selectedDecision === opt.key
                            ? 'shadow-sm'
                            : 'border-gray-200 hover:border-gray-300'
                            }`}
                        style={
                            selectedDecision === opt.key
                                ? { borderColor: opt.color, backgroundColor: `${opt.color}08` }
                                : {}
                        }
                    >
                        <p className="text-xs font-bold" style={{ color: selectedDecision === opt.key ? opt.color : 'var(--recco-navy-900)' }}>
                            {opt.label}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{opt.description}</p>
                    </button>
                ))}
            </div>

            {/* Notes */}
            <div>
                <label className="block text-[10px] text-gray-400 uppercase mb-1">
                    Decision Notes (min 20 chars)
                </label>
                <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Provide reasoning for this decision..."
                    rows={3}
                    disabled={isPending}
                    className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none placeholder:text-gray-300" style={{ outlineColor: 'var(--recco-green-700)' }}
                />
                <p className="text-[10px] text-gray-300 text-right">{notes.length}/20 min</p>
            </div>

            {/* Error */}
            {error && (
                <p className="text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded">{error}</p>
            )}

            {/* Submit */}
            <button
                onClick={handleSubmit}
                disabled={isPending || !selectedDecision}
                className="w-full py-2 rounded-lg text-xs font-bold text-white transition-colors disabled:opacity-50"
                style={{ backgroundColor: selectedDecision ? (DECISION_OPTIONS.find(o => o.key === selectedDecision)?.color || 'var(--recco-navy-900)') : '#999' }}
            >
                {isPending ? (
                    <span className="flex items-center justify-center gap-2">
                        <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Processing...
                    </span>
                ) : (
                    selectedDecision === 'ESCALATE' ? 'Escalate to Senior Admin' : 'Confirm Resolution'
                )}
            </button>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════════════════════════

export default function DisputeDetailClient({
    evidence,
    adminUserId,
}: {
    evidence: EvidenceCardData;
    adminUserId: string;
}) {
    const d = evidence.dispute;

    return (
        <div className="space-y-4">
            {/* Header row */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-lg font-bold stitch-text-navy">
                        Dispute: BATCH-{d.batchId.slice(0, 8)}
                    </h1>
                    <p className="text-[10px] text-gray-400">
                        Opened {formatISTTimestamp(d.createdAt)} · AGG {d.aggregatorId.slice(0, 8)} vs REC {d.recyclerId.slice(0, 8)}
                    </p>
                </div>
                <SLAHeader deadline={d.slaDeadline} resolved={!!d.resolvedAt} />
            </div>

            {/* Evidence Card (3-column) */}
            <EvidenceCard evidence={evidence} />

            {/* Decision Panel */}
            <DecisionPanel
                disputeId={d.id}
                adminUserId={adminUserId}
                isResolved={d.status === 'RESOLVED'}
                currentDecision={d.adminDecision}
            />
        </div>
    );
}
