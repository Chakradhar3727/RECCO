'use client';

import React, { useState, useTransition } from 'react';
import { formatISTTimestamp } from '@/lib/utils/ist-time';

/**
 * System Config Client Components — Phase 2 Module 2.12
 *
 * Editable config table with inline editing, validation, and save confirmation.
 */

export interface ConfigEntry {
    key: string;
    value: string;
    description: string | null;
    lastUpdatedAt: string;
    updatedBy: string | null;
}

export function ConfigTable({
    configs,
    saveAction,
}: {
    configs: ConfigEntry[];
    saveAction: (key: string, value: string) => Promise<{ success: boolean; error?: string }>;
}) {
    const [editing, setEditing] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const [isPending, startTransition] = useTransition();
    const [feedback, setFeedback] = useState<{ key: string; type: 'success' | 'error'; msg: string } | null>(null);

    const startEdit = (key: string, currentValue: string) => {
        setEditing(key);
        setEditValue(currentValue);
        setFeedback(null);
    };

    const cancelEdit = () => {
        setEditing(null);
        setEditValue('');
    };

    const handleSave = (key: string) => {
        if (editValue.trim() === '') return;
        startTransition(async () => {
            const result = await saveAction(key, editValue.trim());
            if (result.success) {
                setFeedback({ key, type: 'success', msg: 'Saved!' });
                setEditing(null);
                setTimeout(() => setFeedback(null), 3000);
            } else {
                setFeedback({ key, type: 'error', msg: result.error || 'Failed to save' });
            }
        });
    };

    // Group configs by category
    const groups: Record<string, ConfigEntry[]> = {};
    configs.forEach((c) => {
        const prefix = c.key.split('_')[0] || 'General';
        const category = {
            epr: 'EPR & Compliance',
            platform: 'Platform Fees',
            weight: 'Weight Thresholds',
            gps: 'GPS Thresholds',
        }[prefix] || 'Other';
        (groups[category] = groups[category] || []).push(c);
    });

    // Humanize technical keys for better UX
    const humanizeKey = (key: string) => {
        return key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
            .replace('Epr', 'EPR')
            .replace('Pct', '%')
            .replace('Gps', 'GPS')
            .replace('Tolerance M', 'Tolerance (meters)');
    };

    return (
        <div className="space-y-8">
            {Object.entries(groups).map(([category, items]) => (
                <section key={category} className="mb-8">
                    <h2 className="stitch-section-title">{category}</h2>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden divide-y divide-gray-100">
                        {items.map((config) => (
                            <div
                                key={config.key}
                                className="p-6 hover:bg-slate-50/50 transition-colors flex flex-col lg:flex-row lg:items-center gap-6"
                            >
                                {/* Left: Humanized Title & Description */}
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-sm font-bold text-[#0F172A]">{humanizeKey(config.key)}</h3>
                                        <code className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">{config.key}</code>
                                    </div>
                                    <p className="text-sm text-gray-500 max-w-2xl">{config.description || 'No description provided.'}</p>
                                    <p className="text-[11px] text-slate-400 mt-2 font-medium">Last updated: {formatISTTimestamp(config.lastUpdatedAt)}</p>
                                </div>

                                {/* Right: Editable Value */}
                                <div className="w-full lg:w-[320px] shrink-0">
                                    {editing === config.key ? (
                                        <div className="flex flex-col gap-2">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    className="stitch-input w-full"
                                                    autoFocus
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleSave(config.key);
                                                        if (e.key === 'Escape') cancelEdit();
                                                    }}
                                                />
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleSave(config.key)}
                                                    disabled={isPending || editValue.trim() === ''}
                                                    className="flex-1 stitch-btn stitch-btn-primary !py-1.5"
                                                >
                                                    {isPending ? 'Saving...' : 'Save Changes'}
                                                </button>
                                                <button
                                                    onClick={cancelEdit}
                                                    className="flex-1 stitch-btn stitch-btn-outline !py-1.5"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg gap-4">
                                            <span className="text-lg font-mono font-bold break-all" style={{ color: 'var(--recco-navy-900)' }}>
                                                {config.value}
                                            </span>
                                            <button
                                                onClick={() => startEdit(config.key, config.value)}
                                                className="text-xs font-bold px-3 py-1.5 rounded bg-white border border-gray-200 text-slate-600 hover:bg-gray-50 hover:text-[#1B6B35] transition-all shadow-sm shrink-0"
                                            >
                                                Edit
                                            </button>
                                        </div>
                                    )}
                                    {feedback?.key === config.key && (
                                        <div className={`mt-2 p-2 rounded text-xs font-bold flex items-center gap-1.5 ${feedback.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                                            <span>{feedback.type === 'success' ? '✓' : '⚠'}</span>
                                            {feedback.msg}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            ))}
        </div>
    );
}
