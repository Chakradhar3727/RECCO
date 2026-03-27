import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { formatWeightKg } from '@/lib/utils/format-indian';
import { formatRelativeTime } from '@/lib/utils/date-ist';
import { ArrowLeft, MapPin, Scale, CheckCircle2, AlertTriangle, Fingerprint, FileText } from 'lucide-react';
import Link from 'next/link';

export default async function CollectionDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return notFound();
  }

  const { data: collection } = await supabase
    .from('collections')
    .select(`
      *,
      fraud_flags (
        id, flag_type, severity, created_at, evidence_data
      )
    `)
    .eq('id', params.id)
    .single();

  if (!collection) {
    return notFound();
  }

  const isMatched = collection.ai_material_match === true;
  const isMismatch = collection.ai_material_match === false;

  return (
    <div className="min-h-screen bg-gray-50 pb-24 md:pb-8">
      {/* Header */}
      <div className="bg-emerald-800 text-white px-4 md:px-8 pt-6 pb-5 rounded-b-3xl md:rounded-b-none">
        <div className="flex items-center justify-between mb-4">
          <Link href="/aggregator/dashboard" className="hover:bg-emerald-700 p-1.5 rounded-lg transition-colors inline-block">
            <ArrowLeft size={20} />
          </Link>
          <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
            collection.status === 'AVAILABLE_FOR_BATCHING' ? 'bg-emerald-400/20 text-emerald-100 border border-emerald-400/30' :
            'bg-gray-400/20 text-gray-200 border border-gray-400/30'
          }`}>
            {collection.status?.replace(/_/g, ' ')}
          </span>
        </div>
        <h1 className="text-xl md:text-2xl font-bold mb-1">Collection Details</h1>
        <p className="text-emerald-200 text-xs md:text-sm font-mono opacity-80">{collection.id}</p>
      </div>

      <div className="max-w-3xl mx-auto px-4 md:px-8 mt-6 w-full space-y-4">
        
        {/* Weight Card */}
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Scale size={20} />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Recorded Weight</p>
              <p className="text-xl font-black text-gray-900">{formatWeightKg(collection.median_weight)}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 font-medium tracking-wide">OCR Weights</p>
            <p className="text-xs font-mono text-gray-700 mt-1">
              [ {collection.ocr_weight_1 || '-'}, {collection.ocr_weight_2 || '-'} ]
            </p>
          </div>
        </div>

        {/* Material Card */}
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <LayersIcon className="text-gray-400" size={18} />
            <h2 className="font-semibold text-gray-900">Material Composition</h2>
          </div>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 bg-gray-50 rounded-lg p-3 border border-gray-100">
              <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1 font-bold">Manual Entry</p>
              <p className="font-medium text-gray-900">{collection.material_type?.replace(/_/g, ' ') || 'Not specified'}</p>
            </div>
            <div className={`flex-1 rounded-lg p-3 border ${
              isMatched ? 'bg-emerald-50 border-emerald-100' :
              isMismatch ? 'bg-orange-50 border-orange-100' :
              'bg-gray-50 border-gray-100'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <p className={`text-[10px] uppercase tracking-wider font-bold ${
                  isMatched ? 'text-emerald-700' :
                  isMismatch ? 'text-orange-700' :
                  'text-gray-500'
                }`}>AI Detection</p>
                {collection.ai_material_confidence && (
                  <span className={`text-[10px] font-bold ${
                    collection.ai_material_confidence > 80 ? 'text-emerald-600' : 'text-orange-600'
                  }`}>{Math.round(collection.ai_material_confidence)}% conf</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {isMatched && <CheckCircle2 size={14} className="text-emerald-600" />}
                {isMismatch && <AlertTriangle size={14} className="text-orange-500" />}
                <p className={`font-medium ${
                  isMatched ? 'text-emerald-900' :
                  isMismatch ? 'text-orange-900' :
                  'text-gray-900'
                }`}>{collection.ai_detected_material?.replace(/_/g, ' ') || 'Pending Analysis'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Origin & Traceability */}
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <MapPin size={18} className="text-gray-400" />
            Origin & Traceability
          </h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center shrink-0 border border-gray-100">
                <FileText size={14} className="text-gray-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Captured On</p>
                <p className="text-sm text-gray-500">{new Date(collection.created_at).toLocaleString('en-IN')}</p>
                <p className="text-xs text-gray-400 mt-0.5">{formatRelativeTime(collection.created_at)}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100">
                <MapPin size={14} className="text-blue-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">GPS Location</p>
                <p className="text-sm text-gray-500">{collection.gps_locality || 'Location recorded anonymously'}</p>
                <p className="text-xs font-mono text-gray-400 mt-0.5">{collection.gps_lat}, {collection.gps_lng}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Photo Evidence & Hashes */}
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Fingerprint size={18} className="text-gray-400" />
            Integrity Hashes
          </h2>
          <div className="space-y-3">
            {[1, 2, 3].map((num) => {
              const hash = collection[`photo_${num}_hash` as keyof typeof collection];
              if (!hash) return null;
              return (
                <div key={num} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <p className="text-xs font-medium text-slate-500 mb-1">Photo {num} SHA-256</p>
                  <p className="text-[10px] font-mono text-slate-700 break-all">{hash}</p>
                </div>
              );
            })}
            {!collection.photo_1_hash && (
              <p className="text-sm text-gray-500 italic">No blockchain hashes recorded for this collection.</p>
            )}
          </div>
        </div>

        {/* Fraud Flags */}
        {collection.fraud_flags && collection.fraud_flags.length > 0 && (
          <div className="bg-red-50 rounded-xl p-5 border border-red-100">
            <h2 className="font-bold text-red-800 mb-3 flex items-center gap-2">
              <AlertTriangle size={18} />
              Anomaly Flags Detected
            </h2>
            <div className="space-y-2">
              {collection.fraud_flags.map((flag: any) => (
                <div key={flag.id} className="bg-white rounded-lg p-3 border border-red-100 shadow-sm">
                  <p className="text-sm font-bold text-red-700 flex items-center justify-between">
                    {flag.flag_type?.replace(/_/g, ' ')}
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-800">{flag.severity}</span>
                  </p>
                  <p className="text-xs text-red-600 mt-1">
                    Logged {formatRelativeTime(flag.created_at)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function LayersIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2L2 7l10 5 10-5-10-5Z" />
      <path d="m2 17 10 5 10-5" />
      <path d="m2 12 10 5 10-5" />
    </svg>
  );
}
