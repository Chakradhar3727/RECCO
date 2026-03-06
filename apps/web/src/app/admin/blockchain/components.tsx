'use client';

import React, { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { runIntegrityCheck, searchBlockchain } from './actions';
import type { IntegrityResult, SearchResult } from './actions';

// ─── Search Bar ──────────────────────────────────────────────────────

export function BlockchainSearch() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [query, setQuery] = useState(searchParams.get('q') || '');

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const trimmed = query.trim();
        if (trimmed) {
            router.push(`/admin/blockchain?q=${encodeURIComponent(trimmed)}`);
        } else {
            router.push('/admin/blockchain');
        }
    }

    return (
        <form onSubmit={handleSubmit} className="relative">
            <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search certificates, checkpoints, hashes, material types…"
                className="w-full bg-white border border-[#E5E5E5] rounded-lg px-4 py-2.5 pl-10 text-sm text-[#1A2F4B] placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#0E5A6E]/20 focus:border-[#0E5A6E] transition-all"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {query && (
                <button
                    type="button"
                    onClick={() => { setQuery(''); router.push('/admin/blockchain'); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 text-xs"
                >
                    ✕
                </button>
            )}
        </form>
    );
}

// ─── Search Results ──────────────────────────────────────────────────

export function SearchResults({ results }: { results: SearchResult[] }) {
    if (results.length === 0) {
        return (
            <div className="bg-white rounded-lg border border-[#E5E5E5] p-6 text-center">
                <p className="text-sm text-gray-400">No results found</p>
                <p className="text-xs text-gray-300 mt-1">Try searching by certificate ID, hash, batch ID, or material type.</p>
            </div>
        );
    }

    const typeConfig: Record<string, { icon: string; bg: string; color: string }> = {
        certificate: { icon: '📜', bg: '#F0FAF4', color: '#1B6B35' },
        checkpoint: { icon: '🔗', bg: '#EFF6FF', color: '#2563EB' },
        collection: { icon: '♻️', bg: '#FFFBEB', color: '#B45309' },
    };

    return (
        <div className="bg-white rounded-lg border border-[#E5E5E5] overflow-hidden">
            <div className="py-2 px-4 bg-[#F5F5F5] border-b border-[#E5E5E5]">
                <span className="text-[10px] text-gray-400 uppercase font-bold">{results.length} Result{results.length !== 1 ? 's' : ''}</span>
            </div>
            {results.map((r) => {
                const tc = typeConfig[r.type] || typeConfig.certificate;
                return (
                    <div key={`${r.type}-${r.id}`} className="flex items-center gap-3 py-2.5 px-4 border-b border-[#E5E5E5] hover:bg-gray-50 transition-colors">
                        <span className="flex items-center justify-center w-7 h-7 rounded-full text-xs" style={{ backgroundColor: tc.bg }}>
                            {tc.icon}
                        </span>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-[#1A2F4B] truncate">{r.title}</p>
                            <p className="text-[10px] text-gray-400">{r.subtitle}</p>
                        </div>
                        {r.hash && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-[#F0FAF4] text-[#1B6B35] font-mono" title={r.hash}>
                                0x{r.hash.slice(0, 8)}…
                            </span>
                        )}
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: tc.bg, color: tc.color }}>
                            {r.type.toUpperCase()}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

// ─── Integrity Check Panel ───────────────────────────────────────────

export function IntegrityCheckPanel({ lastResult }: { lastResult: IntegrityResult | null }) {
    const [result, setResult] = useState<IntegrityResult | null>(lastResult);
    const [isPending, startTransition] = useTransition();

    function handleRun() {
        startTransition(async () => {
            const res = await runIntegrityCheck();
            setResult(res);
        });
    }

    const statusColor = !result
        ? { bg: '#F5F5F5', text: '#666', label: 'Never Run' }
        : result.failed === 0
            ? { bg: '#F0FAF4', text: '#1B6B35', label: 'All Passed ✓' }
            : { bg: '#FEF2F2', text: '#DC2626', label: `${result.failed} Mismatch${result.failed > 1 ? 'es' : ''}` };

    return (
        <div className="bg-white rounded-lg border border-[#E5E5E5] p-4">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-[#1A2F4B]">DB Integrity Check</h3>
                <button
                    onClick={handleRun}
                    disabled={isPending}
                    className="text-[10px] font-bold px-3 py-1 rounded-md transition-colors disabled:opacity-50"
                    style={{
                        backgroundColor: isPending ? '#F5F5F5' : '#1A2F4B',
                        color: isPending ? '#666' : '#FFF',
                    }}
                >
                    {isPending ? 'Checking…' : '▶ Run Check'}
                </button>
            </div>

            {/* Status Badge */}
            <div className="rounded-lg p-3 mb-3" style={{ backgroundColor: statusColor.bg }}>
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColor.text }} />
                    <span className="text-xs font-bold" style={{ color: statusColor.text }}>
                        {statusColor.label}
                    </span>
                </div>
                {result && (
                    <div className="mt-2 space-y-1">
                        <div className="flex justify-between">
                            <span className="text-[10px] text-gray-500">Checkpoints Verified</span>
                            <span className="text-[10px] font-mono font-bold text-[#1A2F4B]">{result.totalChecked}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-[10px] text-gray-500">Passed</span>
                            <span className="text-[10px] font-mono font-bold text-[#1B6B35]">{result.passed}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-[10px] text-gray-500">Failed</span>
                            <span className="text-[10px] font-mono font-bold text-[#DC2626]">{result.failed}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-[10px] text-gray-500">Last Checked</span>
                            <span className="text-[10px] text-gray-400">
                                {new Date(result.checkedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Mismatch Details */}
            {result && result.mismatches.length > 0 && (
                <div className="border border-red-100 rounded-lg overflow-hidden">
                    <div className="bg-red-50 px-3 py-1.5">
                        <span className="text-[10px] font-bold text-[#DC2626] uppercase">Mismatches</span>
                    </div>
                    {result.mismatches.map((m, i) => (
                        <div key={i} className="px-3 py-2 border-t border-red-100 text-[9px] font-mono">
                            <p className="text-gray-500">Batch: {m.batchId.slice(0, 16)}…</p>
                            <p className="text-red-600">Expected: {m.expected.slice(0, 20)}…</p>
                            <p className="text-green-600">Computed: {m.computed.slice(0, 20)}…</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Empty state */}
            {!result && (
                <p className="text-[10px] text-gray-300 text-center py-2">
                    Verifies CP1 checkpoint hashes against stored DB values to detect tampering.
                </p>
            )}
        </div>
    );
}
