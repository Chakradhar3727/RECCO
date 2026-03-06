import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getEntityDetail } from '../actions';
import EntityDetailClient from './components';

interface PageProps {
    params: { id: string };
}

/**
 * Entity Detail Page — Server Component
 *
 * Two-column layout:
 *   Left (65%): Entity data tabs (Registration | Documents | History)
 *   Right (35%): SLA timer + Approval checklist + Actions
 */
export default async function UserDetailPage({ params }: PageProps) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/admin/login');

    const entity = await getEntityDetail(params.id);

    if (!entity) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <p className="text-lg font-bold text-[#1A2F4B]">User not found</p>
                <Link href="/admin/users" className="text-sm text-[#1B6B35] hover:underline">
                    ← Back to Users
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Back navigation */}
            <Link
                href="/admin/users"
                className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-[#1A2F4B] transition-colors"
            >
                ← Back to Users
            </Link>

            {/* Client component with all interactive features */}
            <EntityDetailClient entity={entity} adminUserId={user.id} />
        </div>
    );
}
