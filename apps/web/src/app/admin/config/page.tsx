import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getSystemConfig, updateConfigValue } from './actions';
import { ConfigTable } from './components';

/**
 * System Config Page — Phase 2 Module 2.12
 *
 * Admin-only configuration management with inline editing.
 * All changes are audit-logged.
 */

export default async function ConfigPage() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/admin/login');

    const configs = await getSystemConfig();

    return (
        <div className="stitch-page p-8 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="stitch-page-header">
                <div>
                    <h1 className="stitch-page-title tracking-tight">System Configuration</h1>
                    <p className="stitch-page-subtitle">
                        Platform-wide settings and thresholds. All changes are audit-logged.
                    </p>
                </div>
                <div>
                    <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 shadow-sm">
                        <span className="text-lg">⚠️</span>
                        <span className="text-[10px] uppercase tracking-widest text-amber-700 font-bold">Live Updates</span>
                    </div>
                </div>
            </div>

            {/* Config Summary */}
            <div className="stitch-grid-3 mb-8">
                <div className="stitch-metric-card" style={{ borderBottom: '3px solid var(--recco-navy-900)' }}>
                    <p className="text-xs font-bold text-gray-400 tracking-wider uppercase mb-1">Total Variables</p>
                    <p className="text-3xl font-bold font-mono stitch-text-navy">{configs.length}</p>
                </div>
                <div className="stitch-metric-card" style={{ borderBottom: '3px solid var(--recco-teal-700)' }}>
                    <p className="text-xs font-bold text-gray-400 tracking-wider uppercase mb-1">Categories</p>
                    <p className="text-3xl font-bold font-mono" style={{ color: 'var(--recco-teal-700)' }}>
                        {new Set(configs.map(c => c.key.split('_')[0])).size}
                    </p>
                </div>
                <div className="stitch-metric-card" style={{ borderBottom: '3px solid var(--recco-red-700)' }}>
                    <p className="text-xs font-bold text-gray-400 tracking-wider uppercase mb-1">Access Level</p>
                    <p className="text-xl font-bold tracking-widest mt-2" style={{ color: 'var(--recco-red-700)' }}>ADMIN ONLY</p>
                </div>
            </div>

            {/* Config Table */}
            <ConfigTable configs={configs} saveAction={updateConfigValue} />
        </div>
    );
}
