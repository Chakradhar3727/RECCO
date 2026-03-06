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

    return (
        <div className="space-y-4">
            {Object.entries(groups).map(([category, items]) => (
                <div key={category} className="bg-white rounded-lg border border-[#E5E5E5] overflow-hidden">
                    <div className="px-4 py-2 bg-[#F5F5F5] border-b border-[#E5E5E5]">
                        <h3 className="text-xs font-bold text-[#1A2F4B]">{category}</h3>
                    </div>
                    {items.map((config) => (
                        <div
                            key={config.key}
                            className="flex items-center gap-3 px-4 py-3 border-b border-[#E5E5E5] last:border-b-0 hover:bg-gray-50 transition-colors"
                        >
                            {/* Key + Description */}
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-mono font-bold text-[#1A2F4B]">{config.key}</p>
                                {config.description && (
                                    <p className="text-[10px] text-gray-400 mt-0.5 truncate">{config.description}</p>
                                )}
                            </div>

                            {/* Value / Edit */}
                            <div className="w-[200px]">
                                {editing === config.key ? (
                                    <div className="flex items-center gap-1">
                                        <input
                                            type="text"
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            className="flex-1 text-xs font-mono border border-[#1B6B35] rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#1B6B35]"
                                            autoFocus
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleSave(config.key);
                                                if (e.key === 'Escape') cancelEdit();
                                            }}
                                        />
                                        <button
                                            onClick={() => handleSave(config.key)}
                                            disabled={isPending}
                                            className="text-[10px] px-2 py-1 rounded bg-[#1B6B35] text-white font-bold hover:bg-[#155a2b] disabled:opacity-50"
                                        >
                                            {isPending ? '...' : '✓'}
                                        </button>
                                        <button
                                            onClick={cancelEdit}
                                            className="text-[10px] px-2 py-1 rounded bg-gray-200 text-gray-600 font-bold hover:bg-gray-300"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-mono text-[#1A2F4B] font-bold">{config.value}</span>
                                        <button
                                            onClick={() => startEdit(config.key, config.value)}
                                            className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
                                        >
                                            Edit
                                        </button>
                                    </div>
                                )}
                                {feedback?.key === config.key && (
                                    <p className={`text-[10px] mt-0.5 ${feedback.type === 'success' ? 'text-[#1B6B35]' : 'text-red-500'}`}>
                                        {feedback.msg}
                                    </p>
                                )}
                            </div>

                            {/* Last Updated */}
                            <div className="w-[130px] text-right">
                                <p className="text-[10px] text-gray-400">
                                    {formatISTTimestamp(config.lastUpdatedAt)}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}
