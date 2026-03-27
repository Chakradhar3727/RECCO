import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { formatINR } from '@/lib/utils/format-indian';
import { formatRelativeTime } from '@/lib/utils/date-ist';
import { Clock, ArrowDownCircle, ArrowUpCircle, AlertTriangle, Wallet, TrendingUp, Filter } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────
interface PaymentRecord {
  id: string;
  transaction_id: string | null;
  amount: number;
  currency: string;
  status: 'HELD' | 'RELEASED' | 'REFUNDED' | 'DISPUTED';
  created_at: string;
  released_at: string | null;
}

interface PaymentStats {
  totalEarned: number;
  pendingAmount: number;
  releasedAmount: number;
  disputedAmount: number;
  totalTransactions: number;
}

// ── Data Fetching ────────────────────────────────────────────────────
async function getPaymentsData(aggregatorProfileId: string) {
  const supabase = createClient();

  const { data: payments, error } = await supabase
    .from('payment_escrows')
    .select('id, transaction_id, amount, currency, status, created_at, released_at')
    .eq('aggregator_id', aggregatorProfileId)
    .order('created_at', { ascending: false });

  if (error || !payments) {
    return { payments: [] as PaymentRecord[], stats: { totalEarned: 0, pendingAmount: 0, releasedAmount: 0, disputedAmount: 0, totalTransactions: 0 } };
  }

  const stats: PaymentStats = {
    totalEarned: payments.reduce((sum, p) => sum + Number(p.amount), 0),
    pendingAmount: payments.filter(p => p.status === 'HELD').reduce((sum, p) => sum + Number(p.amount), 0),
    releasedAmount: payments.filter(p => p.status === 'RELEASED').reduce((sum, p) => sum + Number(p.amount), 0),
    disputedAmount: payments.filter(p => p.status === 'DISPUTED').reduce((sum, p) => sum + Number(p.amount), 0),
    totalTransactions: payments.length,
  };

  return { payments: payments as PaymentRecord[], stats };
}

// ── Status Badge ─────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    HELD: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Pending' },
    RELEASED: { bg: 'bg-emerald-100', text: 'text-emerald-800', label: 'Released' },
    REFUNDED: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Refunded' },
    DISPUTED: { bg: 'bg-red-100', text: 'text-red-800', label: 'Disputed' },
  };
  const c = config[status] || config.HELD;
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}

// ── Page Component ───────────────────────────────────────────────────
export default async function AggregatorPaymentsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/aggregator/login');

  // Get aggregator profile
  const { data: profile } = await supabase
    .from('aggregator_profiles')
    .select('id')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-sm border border-gray-100">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Wallet size={32} className="text-amber-700" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Payments</h2>
          <p className="text-gray-500 mb-6 text-sm">Your profile is being set up. Payments will appear here once active.</p>
        </div>
      </div>
    );
  }

  const { payments, stats } = await getPaymentsData(profile.id);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Header ────────────────────────────────────── */}
      <div className="bg-emerald-900 text-white px-4 md:px-8 pt-6 pb-8 md:pb-12 rounded-b-3xl md:rounded-b-none">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl md:text-3xl font-black">Payments</h1>
          </div>
          <div className="w-10 h-10 md:w-12 md:h-12 bg-white/10 rounded-xl flex items-center justify-center">
            <Wallet size={22} className="text-white" />
          </div>
        </div>
      </div>

      {/* ── Stats Cards ───────────────────────────────── */}
      <div className="px-4 md:px-8 -mt-4 md:-mt-6 pb-24 md:pb-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
          {/* Total Earned */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:border-emerald-200 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <TrendingUp size={18} className="text-emerald-700" />
              </div>
            </div>
            <p className="text-xl md:text-2xl font-black text-gray-900 font-mono tracking-tight">
              {formatINR(stats.totalEarned)}
            </p>
            <p className="text-xs md:text-sm text-gray-500 mt-1 font-medium">Total Earned</p>
          </div>

          {/* Pending */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:border-amber-200 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Clock size={18} className="text-amber-700" />
              </div>
            </div>
            <p className="text-xl md:text-2xl font-black text-gray-900 font-mono tracking-tight">
              {formatINR(stats.pendingAmount)}
            </p>
            <p className="text-xs md:text-sm text-gray-500 mt-1 font-medium">Pending</p>
          </div>

          {/* Released */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:border-green-200 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <ArrowDownCircle size={18} className="text-green-700" />
              </div>
            </div>
            <p className="text-xl md:text-2xl font-black text-gray-900 font-mono tracking-tight">
              {formatINR(stats.releasedAmount)}
            </p>
            <p className="text-xs md:text-sm text-gray-500 mt-1 font-medium">Released</p>
          </div>

          {/* Disputed */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:border-red-200 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center ${stats.disputedAmount > 0 ? 'bg-red-100' : 'bg-gray-100'}`}>
                <AlertTriangle size={18} className={stats.disputedAmount > 0 ? 'text-red-700' : 'text-gray-400'} />
              </div>
            </div>
            <p className="text-xl md:text-2xl font-black text-gray-900 font-mono tracking-tight">
              {formatINR(stats.disputedAmount)}
            </p>
            <p className="text-xs md:text-sm text-gray-500 mt-1 font-medium">Disputed</p>
          </div>
        </div>

        {/* ── Transactions Section ──────────────────────── */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Transaction History</h2>
          <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full font-medium">
            {stats.totalTransactions} total
          </span>
        </div>

        {payments.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center border border-gray-200 shadow-sm">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Wallet size={24} className="text-gray-400" />
            </div>
            <p className="text-gray-900 font-medium">No payments yet</p>
            <p className="text-gray-500 text-sm mt-1">
              Payments will appear here once your collections are processed and batched.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Transaction</th>
                    <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="text-right px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="text-center px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Released</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-4">
                        <p className="text-sm font-bold text-gray-900 font-mono">
                          {payment.transaction_id || payment.id.substring(0, 8).toUpperCase()}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm text-gray-600">
                          {new Date(payment.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <p className="text-sm font-black text-gray-900 font-mono">
                          {formatINR(Number(payment.amount))}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <StatusBadge status={payment.status} />
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm text-gray-500">
                          {payment.released_at
                            ? new Date(payment.released_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                            : '—'}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              {payments.map((payment) => (
                <div key={payment.id} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-mono text-gray-500 uppercase">
                      {payment.transaction_id || payment.id.substring(0, 8)}
                    </p>
                    <StatusBadge status={payment.status} />
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-lg font-black text-gray-900 font-mono">
                        {formatINR(Number(payment.amount))}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatRelativeTime(payment.created_at)}
                      </p>
                    </div>
                    {payment.status === 'RELEASED' && (
                      <div className="flex items-center gap-1 text-emerald-600">
                        <ArrowDownCircle size={14} />
                        <span className="text-xs font-bold">Received</span>
                      </div>
                    )}
                    {payment.status === 'HELD' && (
                      <div className="flex items-center gap-1 text-amber-600">
                        <Clock size={14} />
                        <span className="text-xs font-bold">Processing</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Bottom Navigation (Mobile Only) ─────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 flex items-center justify-around z-50">
        <a href="/aggregator/dashboard" className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-gray-600">
          <Wallet size={20} />
          <span className="text-[10px] font-medium">Home</span>
        </a>
        <a href="/aggregator/collections" className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-gray-600">
          <ArrowUpCircle size={20} />
          <span className="text-[10px] font-medium">Collections</span>
        </a>
        <a href="/aggregator/batches" className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-gray-600">
          <Filter size={20} />
          <span className="text-[10px] font-medium">Batches</span>
        </a>
        <a href="/aggregator/payments" className="flex flex-col items-center gap-0.5 text-emerald-700">
          <Wallet size={20} />
          <span className="text-[10px] font-bold">Payments</span>
        </a>
      </nav>
    </div>
  );
}
