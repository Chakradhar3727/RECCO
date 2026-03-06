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
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-[#1A2F4B]">System Configuration</h1>
                    <p className="text-xs text-gray-400 mt-0.5">
                        Platform-wide settings. All changes are audit-logged.
                    </p>
                </div>
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                    <span>⚠️</span>
                    <span className="text-[10px] text-amber-700 font-medium">Changes take effect immediately</span>
                </div>
            </div>

            {/* Config Summary */}
            <div className="grid grid-cols-3 gap-2">
                <div className="bg-white rounded-lg border border-[#E5E5E5] p-3">
                    <p className="text-[10px] text-gray-400 uppercase">Total Settings</p>
                    <p className="text-lg font-bold font-mono text-[#1A2F4B]">{configs.length}</p>
                </div>
                <div className="bg-white rounded-lg border border-[#E5E5E5] p-3">
                    <p className="text-[10px] text-gray-400 uppercase">Categories</p>
                    <p className="text-lg font-bold font-mono text-[#0E5A6E]">
                        {new Set(configs.map(c => c.key.split('_')[0])).size}
                    </p>
                </div>
                <div className="bg-white rounded-lg border border-[#E5E5E5] p-3">
                    <p className="text-[10px] text-gray-400 uppercase">Access Level</p>
                    <p className="text-lg font-bold text-[#DC2626]">ADMIN ONLY</p>
                </div>
            </div>

            {/* Config Table */}
            <ConfigTable configs={configs} saveAction={updateConfigValue} />
        </div>
    );
}
