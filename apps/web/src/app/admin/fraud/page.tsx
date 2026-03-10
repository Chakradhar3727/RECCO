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
 * Fraud Detection Dashboard — Server Component (Stitch Redesign)
 *
 * Module 2.5 Phase 2:
 *  Section 1: Full-width colored severity buttons with progress bar
 *  Section 2: 2-column fraud flag card grid with left accent borders
 *  Section 3: Fraud Score History chart with danger zones + stat blocks
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

    const totalFlags = counts.critical + counts.medium + counts.low;

    return (
        <div className="stitch-page">
            {/* ── Page Header (Stitch design) ─────────────────────── */}
            <div className="stitch-page-header">
                <div>
                    <h1 className="stitch-page-title tracking-tight">Fraud Detection & Risk Analytics</h1>
                    <p className="stitch-page-subtitle">{totalFlags} active flags requiring investigation</p>
                </div>
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
