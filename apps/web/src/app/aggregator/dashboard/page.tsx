import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
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
async function getDashboardData(userId: string, userEmail: string) {
  const supabase = createClient();
  const adminClient = createServiceRoleClient();
  const { startOfDay, endOfDay } = getTodayIST();

  // First get aggregator profile (PK is `id` = auth user UUID)
  let { data: profile } = await supabase
    .from('aggregator_profiles')
    .select('id')
    .eq('id', userId)
    .single();

  // ── Self-healing: auto-create profile if missing ───────────────
  if (!profile) {
    const emailPrefix = userEmail.split("@")[0].substring(0, 5).toUpperCase();
    const randomSuffix = String(Math.floor(100000 + Math.random() * 900000));
    const genUserId = `AGG-${emailPrefix}-${randomSuffix}`;
    const nameFallback = userEmail.split("@")[0];

    // 1. user_profiles (FK parent for aggregator_profiles)
    await adminClient.from("user_profiles").upsert({
      id: userId,
      email: userEmail,
      full_name: nameFallback,
      portal_role: "AGGREGATOR",
    }, { onConflict: "id" });

    // 2. aggregators
    await adminClient.from("aggregators").upsert({
      id: userId,
      user_id: genUserId,
      email: userEmail,
      name: nameFallback,
      status: "active",
    }, { onConflict: "id" });

    // 3. aggregator_profiles
    await adminClient.from("aggregator_profiles").upsert({
      id: userId,
      aggregator_id_code: genUserId,
    }, { onConflict: "id" });

    // Re-fetch
    const { data: refetched } = await supabase
      .from('aggregator_profiles')
      .select('id')
      .eq('id', userId)
      .single();
    profile = refetched;
  }

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

  const { stats, activities, aggregatorId } = await getDashboardData(user.id, user.email || '');

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
      <div className="bg-emerald-900 text-white px-4 md:px-8 pt-6 pb-8 md:pb-12 rounded-b-3xl md:rounded-b-none">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl md:text-3xl font-black">Dashboard</h1>
          </div>
          <Link
            href="/aggregator/collections/new"
            className="bg-white text-emerald-800 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-emerald-50 transition-colors shadow-sm"
          >
            <Plus size={18} />
            <span className="hidden md:inline">New Collection</span>
            <span className="md:hidden">New</span>
          </Link>
        </div>

        {/* ── Fraud Alert Banner ───────────────────────── */}
        {stats.fraudScore > 30 && (
          <div className="bg-red-500/20 border border-red-400/30 rounded-xl px-4 py-4 flex items-start gap-3 mt-4">
            <AlertTriangle size={20} className="text-red-300 mt-0.5 shrink-0" />
            <div>
              <p className="text-red-100 text-sm md:text-base font-bold">High Fraud Score Detected</p>
              <p className="text-red-200/90 text-xs md:text-sm mt-1">
                Your fraud score is {stats.fraudScore}. Please contact the platform admin immediately for resolution.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Main Dashboard Content ─────────────────────── */}
      <div className="px-4 md:px-8 -mt-4 md:-mt-6 pb-24 md:pb-8">
        {/* Stat Cards Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
          {/* Today's Collections */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:border-emerald-200 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <Package size={18} className="text-emerald-700" />
              </div>
            </div>
            <p className="text-2xl md:text-3xl font-black text-gray-900 font-mono tracking-tight">
              {formatIndianNumber(stats.todayCollections)}
            </p>
            <p className="text-xs md:text-sm text-gray-500 mt-1 font-medium">Today&apos;s Collections</p>
            {stats.todayWeightKg > 0 && (
              <p className="text-xs md:text-sm text-emerald-600 font-bold mt-0.5 font-mono">
                {formatWeightKg(stats.todayWeightKg)}
              </p>
            )}
          </div>

          {/* Active Batches */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:border-blue-200 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Layers size={18} className="text-blue-700" />
              </div>
            </div>
            <p className="text-2xl md:text-3xl font-black text-gray-900 font-mono tracking-tight">
              {formatIndianNumber(stats.activeBatches)}
            </p>
            <p className="text-xs md:text-sm text-gray-500 mt-1 font-medium">Active Batches</p>
          </div>

          {/* Payment Pending */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:border-amber-200 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Clock size={18} className="text-amber-700" />
              </div>
            </div>
            <p className="text-2xl md:text-3xl font-black text-gray-900 font-mono tracking-tight">
              {formatINR(stats.pendingPaymentINR)}
            </p>
            <p className="text-xs md:text-sm text-gray-500 mt-1 font-medium">Pending Output</p>
          </div>

          {/* Fraud Score */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center ${stats.fraudScore > 30
                  ? 'bg-red-100'
                  : stats.fraudScore > 10
                    ? 'bg-amber-100'
                    : 'bg-emerald-100'
                }`}>
                <AlertTriangle size={18} className={
                  stats.fraudScore > 30
                    ? 'text-red-700'
                    : stats.fraudScore > 10
                      ? 'text-amber-700'
                      : 'text-emerald-700'
                } />
              </div>
            </div>
            <p className="text-2xl md:text-3xl font-black text-gray-900 font-mono tracking-tight">
              {stats.fraudScore}
            </p>
            <p className="text-xs md:text-sm text-gray-500 mt-1 font-medium">Fraud Score</p>
            <p className={`text-xs md:text-sm font-bold mt-0.5 ${stats.fraudScore > 30
                ? 'text-red-600'
                : stats.fraudScore > 10
                  ? 'text-amber-600'
                  : 'text-emerald-600'
              }`}>
              {stats.fraudScore > 30 ? 'High Risk' : stats.fraudScore > 10 ? 'Medium' : 'Clean'}
            </p>
          </div>
        </div>

        {/* 2-Column Grid on Desktop */}
        <div className="md:grid md:grid-cols-3 md:gap-6">
          {/* Recent Activity (Takes 2 columns on desktop) */}
          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Recent Activity</h2>
              <Link
                href="/aggregator/collections"
                className="text-emerald-700 text-sm font-bold flex items-center gap-1 hover:underline bg-emerald-50 px-3 py-1 rounded-full"
              >
                View All <ArrowRight size={14} />
              </Link>
            </div>

            {activities.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center border border-gray-200 shadow-sm">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package size={24} className="text-gray-400" />
                </div>
                <p className="text-gray-900 font-medium">No collections today</p>
                <p className="text-gray-500 text-sm mt-1 mb-4">Start tracking your plastic waste collections.</p>
                <Link
                  href="/aggregator/collections/new"
                  className="bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold inline-block hover:bg-emerald-800 transition-colors"
                >
                  Start First Collection
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {activities.map((activity) => (
                  <Link
                    key={activity.id}
                    href={`/aggregator/collections/${activity.id}`}
                    className="block bg-white rounded-xl p-4 md:p-5 border border-gray-100 shadow-sm hover:border-emerald-300 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0 pr-4">
                        <p className="text-sm md:text-base font-bold text-gray-900 truncate group-hover:text-emerald-800 transition-colors">
                          {activity.materialType ?? 'Mixed Plastic'}
                        </p>
                        <p className="text-xs md:text-sm text-gray-500 mt-1 truncate">
                          {activity.description}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        {activity.weightKg && (
                          <p className="text-sm md:text-base font-black text-emerald-700 font-mono bg-emerald-50 px-2 py-1 rounded-md inline-block">
                            {formatWeightKg(activity.weightKg)}
                          </p>
                        )}
                        <p className="text-[10px] md:text-xs text-gray-400 mt-1.5 font-medium uppercase tracking-wider">
                          {formatRelativeTime(activity.timestamp)}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions / Info (Takes 1 column on desktop, hidden on mobile for simplicity or shown below) */}
          <div className="hidden md:block">
             <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-4">Quick Actions</h3>
                <div className="space-y-2">
                   <Link href="/aggregator/batches/create" className="w-full flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors font-medium text-sm text-gray-700">
                      <span>Create Batch</span>
                      <ArrowRight size={16} className="text-gray-400" />
                   </Link>
                   <Link href="/aggregator/collections/new" className="w-full flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors font-medium text-sm text-gray-700">
                      <span>Log Collection</span>
                      <ArrowRight size={16} className="text-gray-400" />
                   </Link>
                   <button className="w-full flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors font-medium text-sm text-gray-700 text-left">
                      <span>Generate Report</span>
                      <ArrowRight size={16} className="text-gray-400" />
                   </button>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Navigation (Mobile Only) ─────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 flex items-center justify-around z-50">
        <Link href="/aggregator/dashboard" className="flex flex-col items-center gap-0.5 text-emerald-700">
          <Package size={20} />
          <span className="text-[10px] font-bold">Home</span>
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
        <Link href="/aggregator/batches" className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-gray-600">
          <Layers size={20} />
          <span className="text-[10px] font-medium">Batches</span>
        </Link>
        <Link href="/aggregator/payments" className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-gray-600">
          <Clock size={20} />
          <span className="text-[10px] font-medium">Payments</span>
        </Link>
      </nav>
    </div>
  );
}
