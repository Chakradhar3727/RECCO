import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { formatWeightKg, formatIndianNumber } from '@/lib/utils/format-indian';
import {
  User, Mail, Phone, Shield, Star, Package, Scale, Hash,
  AlertTriangle, CheckCircle2, XCircle, Building2,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────
interface AggregatorProfile {
  id: string;
  aggregator_id_code: string;
  full_name: string | null;
  email: string | null;
  total_collections: number;
  total_weight_kg: number;
  current_rating: number;
  bank_details: Record<string, string> | null;
  registration_step: number;
}

// ── Data Fetching ────────────────────────────────────────────────────
async function getProfileData(userId: string) {
  const supabase = createClient();

  const [profileRes, userProfileRes, fraudFlagsRes] = await Promise.all([
    supabase
      .from('aggregator_profiles')
      .select('id, aggregator_id_code, full_name, email, total_collections, total_weight_kg, current_rating, bank_details, registration_step')
      .eq('id', userId)
      .single(),
    supabase
      .from('user_profiles')
      .select('fraud_score, phone_number, is_approved, created_at')
      .eq('id', userId)
      .single(),
    supabase
      .from('fraud_flags')
      .select('id, flag_type, severity, created_at, is_resolved')
      .eq('entity_id', userId)
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  return {
    profile: profileRes.data as AggregatorProfile | null,
    userProfile: userProfileRes.data,
    fraudFlags: fraudFlagsRes.data ?? [],
  };
}

// ── Fraud Score Badge ────────────────────────────────────────────────
function FraudScoreBadge({ score }: { score: number }) {
  if (score <= 20) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-100 rounded-full">
        <CheckCircle2 size={14} className="text-emerald-700" />
        <span className="text-xs font-bold text-emerald-800">Trust Score: {score}</span>
      </div>
    );
  }
  if (score <= 50) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 rounded-full">
        <AlertTriangle size={14} className="text-amber-700" />
        <span className="text-xs font-bold text-amber-800">Trust Score: {score}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-red-100 rounded-full">
      <XCircle size={14} className="text-red-700" />
      <span className="text-xs font-bold text-red-800">Trust Score: {score}</span>
    </div>
  );
}

// ── Star Rating ──────────────────────────────────────────────────────
function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const hasHalf = rating - full >= 0.5;
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={16}
          className={
            i < full
              ? 'text-amber-400 fill-amber-400'
              : i === full && hasHalf
              ? 'text-amber-400 fill-amber-200'
              : 'text-gray-300'
          }
        />
      ))}
      <span className="ml-1.5 text-sm font-bold text-gray-700">{Number(rating).toFixed(1)}</span>
    </div>
  );
}

// ── Page Component ───────────────────────────────────────────────────
export default async function AggregatorProfilePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/aggregator/login');

  const { profile, userProfile, fraudFlags } = await getProfileData(user.id);

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-sm border border-gray-100">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User size={32} className="text-emerald-700" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Profile Setup</h2>
          <p className="text-gray-500 mb-6 text-sm">Your aggregator profile is being set up. Please check back shortly.</p>
        </div>
      </div>
    );
  }

  const bankName = profile.bank_details?.bank_name ?? null;
  const accountLast4 = profile.bank_details?.account_number
    ? '••••' + String(profile.bank_details.account_number).slice(-4)
    : null;
  const memberSince = userProfile?.created_at
    ? new Date(userProfile.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
    : '—';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="bg-emerald-900 text-white px-4 md:px-8 pt-6 pb-16 md:pb-20 rounded-b-3xl md:rounded-b-none">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl md:text-3xl font-black">My Profile</h1>
            <p className="text-emerald-300 text-xs md:text-sm mt-0.5">Aggregator Portal</p>
          </div>
          <div className="w-10 h-10 md:w-12 md:h-12 bg-white/10 rounded-xl flex items-center justify-center">
            <User size={22} className="text-white" />
          </div>
        </div>
      </div>

      {/* ── Profile Card (overlapping header) ──────────── */}
      <div className="px-4 md:px-8 -mt-10 md:-mt-12 pb-24 md:pb-8">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-lg p-5 md:p-8 mb-6">
          {/* Avatar + Name Row */}
          <div className="flex items-center gap-4 mb-5">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-emerald-100 rounded-2xl flex items-center justify-center flex-shrink-0">
              <span className="text-2xl md:text-3xl font-black text-emerald-700">
                {(profile.full_name || user.email || 'A').charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <h2 className="text-lg md:text-2xl font-black text-gray-900 truncate">
                {profile.full_name || 'Aggregator'}
              </h2>
              <p className="text-xs md:text-sm text-gray-500 font-mono truncate">{profile.aggregator_id_code}</p>
              <div className="mt-1.5">
                <StarRating rating={Number(profile.current_rating)} />
              </div>
            </div>
          </div>

          {/* Fraud + Approval badges */}
          <div className="flex flex-wrap gap-2 mb-5">
            <FraudScoreBadge score={userProfile?.fraud_score ?? 0} />
            {userProfile?.is_approved ? (
              <span className="px-3 py-1.5 bg-emerald-100 rounded-full text-xs font-bold text-emerald-800 flex items-center gap-1">
                <CheckCircle2 size={12} /> Approved
              </span>
            ) : (
              <span className="px-3 py-1.5 bg-amber-100 rounded-full text-xs font-bold text-amber-800 flex items-center gap-1">
                <AlertTriangle size={12} /> Pending Approval
              </span>
            )}
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <InfoRow icon={<Mail size={16} />} label="Email" value={profile.email || user.email || '—'} />
            <InfoRow icon={<Phone size={16} />} label="Phone" value={userProfile?.phone_number || '—'} />
            <InfoRow icon={<Hash size={16} />} label="Aggregator ID" value={profile.aggregator_id_code} />
            <InfoRow icon={<Shield size={16} />} label="Member Since" value={memberSince} />
          </div>
        </div>

        {/* ── Stats Cards ──────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-6">
          <StatCard
            icon={<Package size={20} className="text-emerald-700" />}
            value={formatIndianNumber(profile.total_collections)}
            label="Collections"
            bgColor="bg-emerald-50"
          />
          <StatCard
            icon={<Scale size={20} className="text-blue-700" />}
            value={formatWeightKg(Number(profile.total_weight_kg))}
            label="Total Weight"
            bgColor="bg-blue-50"
          />
          <StatCard
            icon={<Star size={20} className="text-amber-600" />}
            value={Number(profile.current_rating).toFixed(1)}
            label="Rating"
            bgColor="bg-amber-50"
          />
        </div>

        {/* ── Bank Details ──────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 md:p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Building2 size={18} className="text-gray-700" />
            <h3 className="text-base font-bold text-gray-900">Bank Details</h3>
          </div>
          {bankName || accountLast4 ? (
            <div className="space-y-2">
              {bankName && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Bank</span>
                  <span className="text-sm font-bold text-gray-900">{bankName}</span>
                </div>
              )}
              {accountLast4 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Account</span>
                  <span className="text-sm font-bold text-gray-900 font-mono">{accountLast4}</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No bank details added yet.</p>
          )}
        </div>

        {/* ── Recent Fraud Flags ────────────────────────── */}
        {fraudFlags.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 md:p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={18} className="text-amber-600" />
              <h3 className="text-base font-bold text-gray-900">Recent Flags</h3>
              <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                {fraudFlags.length}
              </span>
            </div>
            <div className="space-y-2">
              {fraudFlags.map((flag: any) => (
                <div key={flag.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      flag.severity === 'HIGH' ? 'bg-red-500' :
                      flag.severity === 'MEDIUM' ? 'bg-amber-500' : 'bg-blue-500'
                    }`} />
                    <span className="text-xs font-mono text-gray-700">{flag.flag_type}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      flag.is_resolved
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {flag.is_resolved ? 'Resolved' : 'Open'}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(flag.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom Navigation (Mobile) ─────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 flex items-center justify-around z-50">
        <a href="/aggregator/dashboard" className="flex flex-col items-center gap-0.5 text-gray-400">
          <Package size={20} />
          <span className="text-[10px] font-medium">Home</span>
        </a>
        <a href="/aggregator/collections" className="flex flex-col items-center gap-0.5 text-gray-400">
          <Scale size={20} />
          <span className="text-[10px] font-medium">Collections</span>
        </a>
        <a href="/aggregator/batches" className="flex flex-col items-center gap-0.5 text-gray-400">
          <Package size={20} />
          <span className="text-[10px] font-medium">Batches</span>
        </a>
        <a href="/aggregator/profile" className="flex flex-col items-center gap-0.5 text-emerald-700">
          <User size={20} />
          <span className="text-[10px] font-bold">Profile</span>
        </a>
      </nav>
    </div>
  );
}

// ── Helper Components ────────────────────────────────────────────────
function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
      <div className="text-gray-400">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-gray-400 font-medium">{label}</p>
        <p className="text-sm font-bold text-gray-900 truncate">{value}</p>
      </div>
    </div>
  );
}

function StatCard({ icon, value, label, bgColor }: { icon: React.ReactNode; value: string; label: string; bgColor: string }) {
  return (
    <div className={`${bgColor} rounded-xl p-4 border border-gray-100`}>
      <div className="mb-2">{icon}</div>
      <p className="text-xl md:text-2xl font-black text-gray-900 font-mono tracking-tight">{value}</p>
      <p className="text-xs text-gray-500 mt-1 font-medium">{label}</p>
    </div>
  );
}
