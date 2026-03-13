import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { formatWeightKg, formatIndianNumber } from '@/lib/utils/format-indian';
import { formatRelativeTime } from '@/lib/utils/date-ist';
import { Package, Layers, Plus, Clock, Search } from 'lucide-react';
import Link from 'next/link';
import CollectionFilters from './_components/CollectionFilters';

// ── Data Fetching ────────────────────────────────────────────────
async function getCollectionData(aggregatorId: string) {
  const supabase = createClient();

  const [collectionsRes, statsRes] = await Promise.all([
    supabase
      .from('collections')
      .select('id, material_type, median_weight, status, gps_lat, gps_lng, created_at')
      .eq('aggregator_id', aggregatorId)
      .order('created_at', { ascending: false })
      .limit(50),

    supabase
      .from('collections')
      .select('id, median_weight')
      .eq('aggregator_id', aggregatorId),
  ]);

  const collections = collectionsRes.data ?? [];
  const allCollections = statsRes.data ?? [];
  const totalWeight = allCollections.reduce((sum, c) => sum + (Number(c.median_weight) || 0), 0);

  return { collections, totalCount: allCollections.length, totalWeight };
}

export default async function CollectionsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/aggregator/login');

  const { data: profile } = await supabase
    .from('aggregator_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-sm border border-gray-100">
          <Package size={32} className="text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">No Profile Found</h2>
        </div>
      </div>
    );
  }

  const { collections, totalCount, totalWeight } = await getCollectionData(profile.id);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-emerald-800 text-white px-4 pt-6 pb-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-emerald-200 text-xs font-medium uppercase tracking-wider">Aggregator Portal</p>
            <h1 className="text-xl font-bold mt-1">Collection History</h1>
          </div>
          <Link
            href="/aggregator/collections/new"
            className="bg-white text-emerald-800 px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2"
          >
            <Plus size={16} /> New
          </Link>
        </div>
        {/* Summary Bar */}
        <div className="mt-3 bg-emerald-700/40 rounded-xl px-3 py-2 flex items-center justify-between">
          <span className="text-emerald-100 text-xs">Total</span>
          <span className="text-white text-sm font-bold">
            {formatIndianNumber(totalCount)} collections · {formatWeightKg(totalWeight)}
          </span>
        </div>
      </div>

      {/* Filters + List (Client Component for interactivity) */}
      <CollectionFilters collections={collections} />

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 flex items-center justify-around z-50">
        <Link href="/aggregator/dashboard" className="flex flex-col items-center gap-0.5 text-gray-400">
          <Package size={20} />
          <span className="text-[10px]">Home</span>
        </Link>
        <Link href="/aggregator/collections" className="flex flex-col items-center gap-0.5 text-emerald-700">
          <Package size={20} />
          <span className="text-[10px] font-medium">Collections</span>
        </Link>
        <Link
          href="/aggregator/collections/new"
          className="flex items-center justify-center w-12 h-12 bg-emerald-700 rounded-full text-white -mt-4 shadow-lg"
        >
          <Plus size={24} />
        </Link>
        <Link href="/aggregator/batches" className="flex flex-col items-center gap-0.5 text-gray-400">
          <Layers size={20} />
          <span className="text-[10px]">Batches</span>
        </Link>
        <Link href="/aggregator/payments" className="flex flex-col items-center gap-0.5 text-gray-400">
          <Clock size={20} />
          <span className="text-[10px]">Payments</span>
        </Link>
      </nav>
    </div>
  );
}
