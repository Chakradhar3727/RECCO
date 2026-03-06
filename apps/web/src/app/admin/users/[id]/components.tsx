'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { approveEntity, rejectEntity, type EntityDetail, type EntityType } from '../actions';
import { formatISTTimestamp, getRelativeTime } from '@/lib/utils/ist-time';

// ─── Approval Checklists ─────────────────────────────────────────────
const CHECKLISTS: Record<string, string[]> = {
    RECYCLER: [
        'CPCB Registration Number matches OCR-extracted value',
        'Facility name consistent across all uploaded documents',
        'SPCB Consent to Operate is not expired',
        'GPS coordinates are plausible for registered state/district',
        'No duplicate facility already registered',
    ],
    PIBO: [
        'GST Certificate OCR extracts company name matching registration name',
        'PIBO type-specific document present and valid',
        'OCR confidence score ≥ 60% for all uploaded documents',
        'Company name does not match any suspended/rejected PIBO entity',
    ],
    PRO: [
        'CPCB PRO Registration Certificate extracts matching registration number',
        'MCA21 company registration name matches PRO organisation name',
        'PRO registration is not expired',
        'State code matches PRO User ID state code',
    ],
};

function SLATimer({ secondsRemaining }: { secondsRemaining: number | null }) {
    const [seconds, setSeconds] = useState(secondsRemaining ?? 0);

    useEffect(() => {
        if (secondsRemaining === null) return;
        setSeconds(secondsRemaining);
        const interval = setInterval(() => setSeconds((s) => s - 1), 1000);
        return () => clearInterval(interval);
    }, [secondsRemaining]);

    if (secondsRemaining === null) return null;

    const breached = seconds <= 0;
    const hours = Math.abs(Math.floor(seconds / 3600));
    const mins = Math.abs(Math.floor((seconds % 3600) / 60));

    let color = 'text-[#B45309]'; // amber
    let bg = 'bg-amber-50 border-amber-200';
    if (seconds <= 6 * 3600) {
        color = 'text-[#B91C1C]';
        bg = 'bg-red-50 border-red-200';
    }
    if (breached) {
        color = 'text-[#B91C1C]';
        bg = 'bg-red-50 border-red-300 animate-pulse';
    }

    return (
        <div className={`px-4 py-3 rounded-lg border ${bg}`}>
            <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1">48-Hour SLA</p>
            <p className={`text-lg font-bold ${color}`}>
                {breached
                    ? `⚠️ BREACHED — ${hours}h ${mins}m overdue`
                    : `${hours}h ${mins}m remaining`
                }
            </p>
        </div>
    );
}

export default function EntityDetailClient({
    entity,
    adminUserId,
}: {
    entity: EntityDetail;
    adminUserId: string;
}) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [tab, setTab] = useState<'data' | 'docs' | 'history'>('data');
    const [checks, setChecks] = useState<boolean[]>(
        new Array(CHECKLISTS[entity.entityType || '']?.length || 0).fill(false)
    );
    const [rejectReason, setRejectReason] = useState('');
    const [showReject, setShowReject] = useState(false);
    const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const checklist = CHECKLISTS[entity.entityType || ''] || [];
    const allChecked = checklist.length > 0 && checks.every(Boolean);
    const canApprove = entity.approvalStatus === 'PENDING_ADMIN_REVIEW' && allChecked;
    const canReject = entity.approvalStatus === 'PENDING_ADMIN_REVIEW' && rejectReason.length >= 10;
    const isPendingReview = entity.approvalStatus === 'PENDING_ADMIN_REVIEW';

    const handleApprove = () => {
        if (!entity.entityType) return;
        startTransition(async () => {
            const res = await approveEntity(entity.userId, entity.entityType as EntityType, adminUserId);
            if (res.success) {
                setResult({ type: 'success', message: 'Entity approved successfully!' });
                setTimeout(() => router.push('/admin/users?portal=pending'), 1500);
            } else {
                setResult({ type: 'error', message: res.error || 'Approval failed' });
            }
        });
    };

    const handleReject = () => {
        if (!entity.entityType) return;
        startTransition(async () => {
            const res = await rejectEntity(entity.userId, entity.entityType as EntityType, adminUserId, rejectReason);
            if (res.success) {
                setResult({ type: 'success', message: 'Entity rejected.' });
                setTimeout(() => router.push('/admin/users?portal=pending'), 1500);
            } else {
                setResult({ type: 'error', message: res.error || 'Rejection failed' });
            }
        });
    };

    // ─── Render entity data fields ─────────────────────────────────────
    const renderEntityData = () => {
        const exclude = ['id', 'user_id', 'owner_id', 'bank_details_encrypted', 'pin_hash'];
        const entries = Object.entries(entity.entityData).filter(([k]) => !exclude.includes(k));

        return (
            <div className="grid grid-cols-2 gap-3">
                {entries.map(([key, value]) => (
                    <div key={key} className="py-2 border-b border-gray-100">
                        <p className="text-[11px] text-gray-400 capitalize">{key.replace(/_/g, ' ')}</p>
                        <p className="text-sm font-medium text-[#1A2F4B] mt-0.5">
                            {value === null ? <span className="text-gray-300 italic">—</span> : String(value)}
                        </p>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Left Column — 65% */}
            <div className="lg:col-span-3 space-y-5">
                {/* Entity header */}
                <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-[#1A2F4B] flex items-center justify-center text-white font-bold text-sm">
                            {(entity.fullName || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-[#1A2F4B]">{entity.fullName}</h2>
                            <p className="text-xs text-gray-400">{entity.email}</p>
                        </div>
                        <span className={`ml-auto text-[10px] px-3 py-1 rounded-full font-bold uppercase ${entity.portalRole === 'RECYCLER' ? 'bg-teal-100 text-[#0E5A6E]' :
                            entity.portalRole === 'PIBO' ? 'bg-amber-100 text-[#B45309]' :
                                entity.portalRole === 'PRO' ? 'bg-purple-100 text-[#7C3AED]' :
                                    'bg-green-100 text-[#1B6B35]'
                            }`}>
                            {entity.portalRole}
                        </span>
                    </div>
                    <div className="flex gap-4 text-xs text-gray-400">
                        <span>Registered: {formatISTTimestamp(entity.createdAt)}</span>
                        <span>Fraud Score: <span className={entity.fraudScore >= 80 ? 'text-[#B91C1C] font-bold' : ''}>{entity.fraudScore}</span></span>
                        <span>Status: <span className={entity.approvalStatus === 'APPROVED' ? 'text-[#1B6B35]' : entity.approvalStatus === 'REJECTED' ? 'text-[#B91C1C]' : 'text-[#B45309]'}>{entity.approvalStatus || 'N/A'}</span></span>
                    </div>
                </div>

                {/* Tabs */}
                <div className="bg-white border border-[#E5E5E5] rounded-lg">
                    <div className="flex border-b border-[#E5E5E5]">
                        {(['data', 'docs', 'history'] as const).map((t) => (
                            <button
                                key={t}
                                onClick={() => setTab(t)}
                                className={`px-5 py-3 text-sm font-medium transition-colors ${tab === t ? 'border-b-2 border-[#1B6B35] text-[#1B6B35]' : 'text-gray-400 hover:text-[#1A2F4B]'
                                    }`}
                            >
                                {t === 'data' ? 'Registration Data' : t === 'docs' ? 'OCR Documents' : 'Activity History'}
                            </button>
                        ))}
                    </div>

                    <div className="p-5">
                        {tab === 'data' && renderEntityData()}

                        {tab === 'docs' && (
                            <div className="space-y-3">
                                {entity.documents.length === 0 ? (
                                    <p className="text-sm text-gray-400 italic">No OCR documents uploaded</p>
                                ) : (
                                    entity.documents.map((doc: any) => (
                                        <div key={doc.id} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-medium text-[#1A2F4B] capitalize">{(doc.doc_type || 'Document').replace(/_/g, ' ')}</span>
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${doc.is_verified ? 'bg-green-100 text-[#1B6B35]' : 'bg-gray-100 text-gray-500'
                                                    }`}>
                                                    {doc.is_verified ? 'Verified' : 'Unverified'}
                                                </span>
                                            </div>
                                            {doc.ocr_raw_data && (
                                                <div className="mt-2 grid grid-cols-2 gap-2">
                                                    {Object.entries(doc.ocr_raw_data as Record<string, any>).map(([k, v]) => (
                                                        <div key={k}>
                                                            <p className="text-[10px] text-gray-400 capitalize">{k.replace(/_/g, ' ')}</p>
                                                            <p className="text-xs text-[#1A2F4B]">{String(v)}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {doc.expiry_date && (
                                                <p className="text-[10px] text-gray-400 mt-2">Expires: {doc.expiry_date}</p>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {tab === 'history' && (
                            <div className="space-y-2">
                                {entity.auditHistory.length === 0 ? (
                                    <p className="text-sm text-gray-400 italic">No audit history</p>
                                ) : (
                                    entity.auditHistory.map((log: any) => (
                                        <div key={log.id} className="flex items-center gap-3 py-2 border-b border-gray-50">
                                            <div className="w-2 h-2 rounded-full bg-[#1A2F4B] flex-shrink-0" />
                                            <div className="flex-1">
                                                <p className="text-sm text-[#1A2F4B]">{log.action}</p>
                                                <p className="text-[10px] text-gray-400">{getRelativeTime(log.created_at)}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Right Column — 35% */}
            <div className="lg:col-span-2 space-y-4">
                {/* SLA Timer */}
                {isPendingReview && <SLATimer secondsRemaining={entity.slaSecondsRemaining} />}

                {/* Result notification */}
                {result && (
                    <div className={`px-4 py-3 rounded-lg text-sm font-medium ${result.type === 'success' ? 'bg-green-50 text-[#1B6B35] border border-green-200' : 'bg-red-50 text-[#B91C1C] border border-red-200'
                        }`}>
                        {result.message}
                    </div>
                )}

                {/* Approval Checklist */}
                {isPendingReview && checklist.length > 0 && (
                    <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                        <h3 className="text-sm font-bold text-[#1A2F4B] mb-3">Approval Checklist</h3>
                        <div className="space-y-2.5">
                            {checklist.map((item, i) => (
                                <label key={i} className="flex items-start gap-2.5 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={checks[i]}
                                        onChange={() => {
                                            const next = [...checks];
                                            next[i] = !next[i];
                                            setChecks(next);
                                        }}
                                        className="mt-0.5 w-4 h-4 rounded border-gray-300 text-[#1B6B35] focus:ring-[#1B6B35] cursor-pointer"
                                    />
                                    <span className={`text-xs transition-colors ${checks[i] ? 'text-[#1B6B35]' : 'text-gray-500 group-hover:text-[#1A2F4B]'}`}>
                                        {item}
                                    </span>
                                </label>
                            ))}
                        </div>

                        {/* Progress bar */}
                        <div className="mt-3 bg-gray-100 rounded-full h-1.5">
                            <div
                                className="bg-[#1B6B35] h-1.5 rounded-full transition-all duration-300"
                                style={{ width: `${(checks.filter(Boolean).length / checklist.length) * 100}%` }}
                            />
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1">
                            {checks.filter(Boolean).length}/{checklist.length} verified
                        </p>
                    </div>
                )}

                {/* Actions */}
                {isPendingReview && (
                    <div className="bg-white border border-[#E5E5E5] rounded-lg p-5 space-y-3">
                        <button
                            onClick={handleApprove}
                            disabled={!canApprove || isPending}
                            className="w-full py-2.5 bg-[#1B6B35] text-white text-sm font-bold rounded-lg hover:bg-[#155A2B] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                            {isPending ? 'Processing...' : '✓ Approve Entity'}
                        </button>

                        {!showReject ? (
                            <button
                                onClick={() => setShowReject(true)}
                                className="w-full py-2.5 border border-[#B91C1C] text-[#B91C1C] text-sm font-medium rounded-lg hover:bg-red-50 transition-colors"
                            >
                                ✕ Reject Entity
                            </button>
                        ) : (
                            <div className="space-y-2">
                                <textarea
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    placeholder="Enter rejection reason (minimum 10 characters)..."
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:border-[#B91C1C]"
                                    rows={3}
                                />
                                <p className="text-[10px] text-gray-400">{rejectReason.length}/10 minimum characters</p>
                                <button
                                    onClick={handleReject}
                                    disabled={!canReject || isPending}
                                    className="w-full py-2.5 bg-[#B91C1C] text-white text-sm font-bold rounded-lg hover:bg-[#991B1B] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                >
                                    {isPending ? 'Processing...' : 'Confirm Rejection'}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Already-resolved status */}
                {entity.approvalStatus === 'APPROVED' && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                        <p className="text-sm font-bold text-[#1B6B35]">✓ Approved</p>
                        <p className="text-[10px] text-gray-500 mt-1">This entity has been approved.</p>
                    </div>
                )}
                {entity.approvalStatus === 'REJECTED' && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                        <p className="text-sm font-bold text-[#B91C1C]">✕ Rejected</p>
                        <p className="text-[10px] text-gray-500 mt-1">This entity registration was rejected.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
