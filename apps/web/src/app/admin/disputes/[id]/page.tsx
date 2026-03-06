import React from 'react';
import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { assembleEvidenceCard } from '../actions';
import DisputeDetailClient from './components';

/**
 * Dispute Evidence Card — Server Component
 *
 * Module 2.7: Full evidence card with 3-column layout + admin decision panel.
 * Fetches from weight_disputes, collections, batch_transport_events, and batch_checkpoints.
 */

interface PageProps {
    params: { id: string };
}

export default async function DisputeDetailPage({ params }: PageProps) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/admin/login');

    const evidence = await assembleEvidenceCard(params.id);

    if (!evidence) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <p className="text-lg font-bold text-[#1A2F4B]">Dispute not found</p>
                <Link href="/admin/disputes" className="text-sm text-[#1B6B35] hover:underline">
                    ← Back to Disputes
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Back navigation */}
            <Link
                href="/admin/disputes"
                className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-[#1A2F4B] transition-colors"
            >
                ← Back to Disputes
            </Link>

            <DisputeDetailClient evidence={evidence} adminUserId={user.id} />
        </div>
    );
}
