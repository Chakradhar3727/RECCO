import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
    getFraudSeverityCounts,
    getFraudFlags,
    getFraudScoreEntities,
    getFraudThreshold,
    type Severity,
} from './actions';
import FraudDashboardClient from './components';

interface PageProps {
    searchParams: { severity?: string };
}

/**
 * Fraud Detection Dashboard — Server Component
 *
 * Module 2.5 Phase 2:
 *  Section 1: Severity tabs (Critical | Medium | Low) with counts
 *  Section 2: 2-column fraud flag card grid
 *  Section 3: Fraud Score History chart with dynamic threshold
 *
 * Data is fetched server-side, interactive features handled by client.
 */
export default async function FraudDashboardPage({ searchParams }: PageProps) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/admin/login');

    const severity = ((searchParams.severity || 'CRITICAL').toUpperCase()) as Severity;

    const [counts, flags, entities, threshold] = await Promise.all([
        getFraudSeverityCounts(),
        getFraudFlags(severity),
        getFraudScoreEntities(),
        getFraudThreshold(),
    ]);

    return (
        <div className="space-y-5">
            <div>
                <h1 className="text-xl font-bold text-[#1A2F4B]">Fraud Detection Dashboard</h1>
                <p className="text-xs text-gray-400 mt-0.5">Monitor and triage fraud flags across the platform</p>
            </div>

            <FraudDashboardClient
                initialCounts={counts}
                initialFlags={flags}
                initialSeverity={severity}
                entities={entities}
                threshold={threshold}
                adminUserId={user.id}
            />
        </div>
    );
}
