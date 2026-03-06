'use server';

import { createServiceRoleClient } from '@/lib/supabase/server';
import type { ConfigEntry } from './components';

/**
 * System Config Server Actions — Phase 2 Module 2.12
 */

export async function getSystemConfig(): Promise<ConfigEntry[]> {
    const admin = createServiceRoleClient();
    const { data } = await admin.from('system_config')
        .select('key, value, description, last_updated_at, updated_by')
        .order('key');

    return (data || []).map((c: any) => ({
        key: c.key,
        value: c.value,
        description: c.description || null,
        lastUpdatedAt: c.last_updated_at,
        updatedBy: c.updated_by || null,
    }));
}

export async function updateConfigValue(
    key: string,
    value: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const admin = createServiceRoleClient();

        const { error } = await admin.from('system_config')
            .update({
                value,
                last_updated_at: new Date().toISOString(),
            })
            .eq('key', key);

        if (error) return { success: false, error: error.message };

        // Audit log
        await admin.from('admin_audit_log').insert({
            action: 'UPDATE_CONFIG',
            entity_type: 'system_config',
            previous_data: { key },
            new_data: { key, value },
        });

        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message || 'Unknown error' };
    }
}
