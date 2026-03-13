import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getTodayIST, formatRelativeTime } from '@/lib/utils/date-ist';
import { formatIndianNumber, formatWeightKg, formatINR } from '@/lib/utils/format-indian';
import { Package, Layers, Clock, AlertTriangle, Plus, ArrowRight } from 'lucide-react';
import Link from 'next/link';

// ── Types ────────────────────────────────────────────────────────────
interface DashboardStats {
  todayCollections: number;
  todayWeightKg: number;
  activeBatches: number;
  pendingPaymentINR: number;
  fraudScore: number;
}

interface ActivityItem {
  id: string;
  type: 'collection' | 'batch' | 'payment';
  description: string;
  timestamp: string;
  materialType?: string;
  weightKg?: number;
}

// ── Data Fetching (Server Component — 5 parallel queries) ────────────
async function getDashboardData(userId: string) {
  const supabase = createClient();
  const { startOfDay, endOfDay } = getTodayIST();

  // First get aggregator profile
  const { data: profile } = await supabase
    .from('aggregator_profiles')
    .select('id')
    .eq('user_id', userId)
    .single();

  const aggregatorId = profile?.id;

  if (!aggregatorId) {
    return { stats: null, activities: [] as ActivityItem[], aggregatorId: null };
  }

  // Run 5 queries in parallel for speed
  const [
    todayCollectionsResult,
    activeBatchesResult,
    pendingPaymentsResult,
    fraudScoreResult,
    recentActivityResult,
  ] = await Promise.all([
    // 1. Today's collections count + total weight
    supabase
      .from('collections')
      .select('id, median_weight')
      .eq('aggregator_id', aggregatorId)
      .gte('created_at', startOfDay.toISOString())
      .lt('created_at', endOfDay.toISOString()),

    // 2. Active batches (not COMPLETE or ISSUED)
    supabase
      .from('batches')
      .select('id')
      .eq('aggregator_id', aggregatorId)
      .not('status', 'in', '("COMPLETE","ISSUED")'),

    // 3. Pending payments
    supabase
      .from('payment_escrows')
      .select('amount')
      .eq('aggregator_id', aggregatorId)
      .eq('status', 'HELD'),

    // 4. Fraud score from user_profiles
    supabase
      .from('user_profiles')
      .select('fraud_score')
      .eq('id', userId)
      .single(),

    // 5. Recent activity feed (last 10 collections)
    supabase
      .from('collections')
      .select('id, material_type, median_weight, status, created_at')
      .eq('aggregator_id', aggregatorId)
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  const todayCollections = todayCollectionsResult.data ?? [];
  const todayWeight = todayCollections.reduce(
    (sum, c) => sum + (Number(c.median_weight) || 0), 0
  );

  const pendingTotal = (pendingPaymentsResult.data ?? []).reduce(
    (sum, p) => sum + (Number(p.amount) || 0), 0
  );

  const stats: DashboardStats = {
    todayCollections: todayCollections.length,
    todayWeightKg: todayWeight,
    activeBatches: (activeBatchesResult.data ?? []).length,
    pendingPaymentINR: pendingTotal,
    fraudScore: fraudScoreResult.data?.fraud_score ?? 0,
  };

  const activities: ActivityItem[] = (recentActivityResult.data ?? []).map((c) => ({
    id: c.id,
    type: 'collection' as const,
    description: `${c.material_type ?? 'Mixed'} collection — ${c.status?.replace(/_/g, ' ').toLowerCase()}`,
    timestamp: c.created_at,
    materialType: c.material_type ?? undefined,
    weightKg: Number(c.median_weight) || undefined,
  }));

  return { stats, activities, aggregatorId };
}

// ── Page Component ───────────────────────────────────────────────────
export default async function AggregatorDashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/aggregator/login');

  const { stats, activities, aggregatorId } = await getDashboardData(user.id);

  // Show onboarding if no aggregator profile found
  if (!stats || !aggregatorId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-sm border border-gray-100">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package size={32} className="text-emerald-700" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Welcome to RECCO</h2>
          <p className="text-gray-500 mb-6 text-sm">Your aggregator profile is being set up. Please contact admin if this persists.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Header ────────────────────────────────────── */}
      <div className="bg-emerald-800 text-white px-4 pt-6 pb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-emerald-200 text-xs font-medium uppercase tracking-wider">Aggregator Portal</p>
            <h1 className="text-xl font-bold mt-1">Dashboard</h1>
          </div>
          <Link
            href="/aggregator/collections/new"
            className="bg-white text-emerald-800 px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-emerald-50 transition-colors"
          >
            <Plus size={16} />
            New Collection
          </Link>
        </div>

        {/* ── Fraud Alert Banner ───────────────────────── */}
        {stats.fraudScore > 30 && (
          <div className="bg-red-500/20 border border-red-400/30 rounded-xl px-4 py-3 flex items-start gap-3 mt-2">
            <AlertTriangle size={18} className="text-red-300 mt-0.5 shrink-0" />
            <div>
              <p className="text-red-100 text-sm font-semibold">High Fraud Score Detected</p>
              <p className="text-red-200/80 text-xs mt-0.5">
                Your fraud score is {stats.fraudScore}. Contact admin for resolution.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Stat Cards (offset into header) ──────────── */}
      <div className="px-4 -mt-4">
        <div className="grid grid-cols-2 gap-3">
          {/* Today's Collections */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                <Package size={16} className="text-emerald-700" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 font-mono">
              {formatIndianNumber(stats.todayCollections)}
            </p>
            <p className="text-xs text-gray-500 mt-1">Today&apos;s Collections</p>
            {stats.todayWeightKg > 0 && (
              <p className="text-xs text-emerald-600 font-medium mt-0.5">
                {formatWeightKg(stats.todayWeightKg)}
              </p>
            )}
          </div>

          {/* Active Batches */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Layers size={16} className="text-blue-700" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 font-mono">
              {formatIndianNumber(stats.activeBatches)}
            </p>
            <p className="text-xs text-gray-500 mt-1">Active Batches</p>
          </div>

          {/* Payment Pending */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                <Clock size={16} className="text-amber-700" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 font-mono">
              {formatINR(stats.pendingPaymentINR)}
            </p>
            <p className="text-xs text-gray-500 mt-1">Payment Pending</p>
          </div>

          {/* Fraud Score */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                stats.fraudScore > 30
                  ? 'bg-red-100'
                  : stats.fraudScore > 10
                    ? 'bg-amber-100'
                    : 'bg-emerald-100'
              }`}>
                <AlertTriangle size={16} className={
                  stats.fraudScore > 30
                    ? 'text-red-700'
                    : stats.fraudScore > 10
                      ? 'text-amber-700'
                      : 'text-emerald-700'
                } />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 font-mono">
              {stats.fraudScore}
            </p>
            <p className="text-xs text-gray-500 mt-1">Fraud Score</p>
            <p className={`text-xs font-medium mt-0.5 ${
              stats.fraudScore > 30
                ? 'text-red-600'
                : stats.fraudScore > 10
                  ? 'text-amber-600'
                  : 'text-emerald-600'
            }`}>
              {stats.fraudScore > 30 ? 'High Risk' : stats.fraudScore > 10 ? 'Medium' : 'Clean'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Recent Activity Feed ──────────────────────── */}
      <div className="px-4 mt-6 pb-24">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-gray-900">Recent Activity</h2>
          <Link
            href="/aggregator/collections"
            className="text-emerald-700 text-xs font-medium flex items-center gap-1 hover:underline"
          >
            View All <ArrowRight size={12} />
          </Link>
        </div>

        {activities.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center border border-gray-100">
            <Package size={32} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No collections yet today</p>
            <Link
              href="/aggregator/collections/new"
              className="text-emerald-700 text-sm font-medium mt-2 inline-block hover:underline"
            >
              Start your first collection →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {activities.map((activity) => (
              <Link
                key={activity.id}
                href={`/aggregator/collections/${activity.id}`}
                className="block bg-white rounded-xl p-4 border border-gray-100 hover:border-emerald-200 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {activity.materialType ?? 'Mixed Plastic'}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {activity.description}
                    </p>
                  </div>
                  <div className="text-right ml-3 shrink-0">
                    {activity.weightKg && (
                      <p className="text-sm font-bold text-emerald-700 font-mono">
                        {formatWeightKg(activity.weightKg)}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatRelativeTime(activity.timestamp)}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ── Bottom Navigation ─────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 flex items-center justify-around z-50">
        <Link href="/aggregator/dashboard" className="flex flex-col items-center gap-0.5 text-emerald-700">
          <Package size={20} />
          <span className="text-[10px] font-medium">Home</span>
        </Link>
        <Link href="/aggregator/collections" className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-gray-600">
          <Package size={20} />
          <span className="text-[10px]">Collections</span>
        </Link>
        <Link
          href="/aggregator/collections/new"
          className="flex items-center justify-center w-12 h-12 bg-emerald-700 rounded-full text-white -mt-4 shadow-lg"
        >
          <Plus size={24} />
        </Link>
        <Link href="/aggregator/batches" className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-gray-600">
          <Layers size={20} />
          <span className="text-[10px]">Batches</span>
        </Link>
        <Link href="/aggregator/payments" className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-gray-600">
          <Clock size={20} />
          <span className="text-[10px]">Payments</span>
        </Link>
      </nav>
    </div>
  );
}
