import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/**
 * Aggregator Layout — Mobile-first (375px primary viewport).
 * No sidebar. Bottom navigation is rendered by individual pages.
 * Auth guard ensures only authenticated users can access.
 */
export default async function AggregatorLayout({ children }: { children: React.ReactNode }) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/aggregator/login');

    return (
        <div className="min-h-screen bg-gray-50 max-w-[430px] mx-auto relative">
            {children}
        </div>
    );
}
