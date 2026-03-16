import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { formatWeightKg, formatIndianNumber } from '@/lib/utils/format-indian';
import { formatRelativeTime } from '@/lib/utils/date-ist';
import { Layers, Package, Plus, Clock, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import BatchTabs from './_components/BatchTabs';

// ── Types ────────────────────────────────────────────────────────
interface BatchData {
  id: string;
  batch_qr_payload: string | null;
  status: string;
  aggregator_id: string;
  recycler_id: string | null;
  pickup_window_start: string | null;
  pickup_window_end: string | null;
  chase_count: number | null;
  created_at: string;
}

// ── Data Fetching ────────────────────────────────────────────────
async function getBatchData(aggregatorId: string) {
  const supabase = createClient();

  const [activeBatchesRes, completedBatchesRes, availableCollectionsRes] = await Promise.all([
    // Active batches
    supabase
      .from('batches')
      .select('*')
      .eq('aggregator_id', aggregatorId)
      .not('status', 'in', '("COMPLETE","ISSUED")')
      .order('created_at', { ascending: false }),

    // Completed batches
    supabase
      .from('batches')
      .select('*')
      .eq('aggregator_id', aggregatorId)
      .in('status', ['COMPLETE', 'ISSUED'])
      .order('created_at', { ascending: false })
      .limit(20),

    // Available collections (for creating new batches)
    supabase
      .from('collections')
      .select('id, material_type, median_weight, created_at')
      .eq('aggregator_id', aggregatorId)
      .eq('status', 'AVAILABLE_FOR_BATCHING')
      .order('created_at', { ascending: false }),
  ]);

  return {
    activeBatches: activeBatchesRes.data ?? [],
    completedBatches: completedBatchesRes.data ?? [],
    availableCollections: availableCollectionsRes.data ?? [],
  };
}

export default async function BatchManagerPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/aggregator/login');

  const { data: profile } = await supabase
    .from('aggregator_profiles')
    .select('id')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-sm border border-gray-100">
          <Layers size={32} className="text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">No Profile Found</h2>
          <p className="text-gray-500 text-sm">Your aggregator profile is being set up.</p>
        </div>
      </div>
    );
  }

  const { activeBatches, completedBatches, availableCollections } = await getBatchData(profile.id);

  return (
    <div className="min-h-screen bg-gray-50 pb-24 md:pb-8">
      {/* Header */}
      <div className="bg-emerald-900 text-white px-4 md:px-8 pt-6 pb-5 md:pb-8 rounded-b-3xl md:rounded-b-none">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-3xl font-black">Batch Manager</h1>
          </div>
          {availableCollections.length > 0 && (
            <Link
              href="/aggregator/batches/create"
              className="bg-white text-emerald-800 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-emerald-50 transition-colors shadow-sm"
            >
              <Plus size={18} />
               <span className="hidden md:inline">Create Batch</span>
               <span className="md:hidden">Create</span>
            </Link>
          )}
        </div>
        {/* Available Collections Count */}
        <div className="mt-4 md:mt-6 bg-emerald-700/40 rounded-xl px-4 py-3 flex items-center justify-between max-w-sm">
          <span className="text-emerald-100 text-xs md:text-sm font-medium">Available for batching</span>
          <span className="text-white text-sm md:text-base font-bold">
            {availableCollections.length} collections
          </span>
        </div>
      </div>

      <div className="px-0 md:px-8 relative z-10">
        {/* Batch Tabs (Client Component for interactive tab switching) */}
        <BatchTabs
          activeBatches={activeBatches}
          completedBatches={completedBatches}
        />
      </div>

      {/* Bottom Navigation (Mobile Only) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 flex items-center justify-around z-50">
        <Link href="/aggregator/dashboard" className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-gray-600">
          <Package size={20} />
          <span className="text-[10px] font-medium">Home</span>
        </Link>
        <Link href="/aggregator/collections" className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-gray-600">
          <Package size={20} />
          <span className="text-[10px] font-medium">Collections</span>
        </Link>
        <Link
          href="/aggregator/collections/new"
          className="flex items-center justify-center w-12 h-12 bg-emerald-700 rounded-full text-white -mt-4 shadow-lg shadow-emerald-700/30"
        >
          <Plus size={24} />
        </Link>
        <Link href="/aggregator/batches" className="flex flex-col items-center gap-0.5 text-emerald-700">
          <Layers size={20} />
          <span className="text-[10px] font-bold">Batches</span>
        </Link>
        <Link href="/aggregator/payments" className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-gray-600">
          <Clock size={20} />
          <span className="text-[10px] font-medium">Payments</span>
        </Link>
      </nav>
    </div>
  );
}
