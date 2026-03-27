import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ArrowLeft, Layers } from 'lucide-react';
import Link from 'next/link';
import BatchDetailQRSection from '../_components/BatchDetailQRSection';
import { formatRelativeTime } from '@/lib/utils/date-ist';

export default async function BatchDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/aggregator/login');

  // Fetch Batch Details
  const { data: batch, error } = await supabase
    .from('batches')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !batch) {
    notFound();
  }

  // To display the stepper or basic detail, for now we show a basic UI since this page wasn't fully built in Phase 3.
  // The vital part is to include the BatchDetailQRSection properly below the details.
  const batchLabel = batch.batch_number ?? batch.batch_qr_payload ?? `BATCH-${batch.id.substring(0, 6).toUpperCase()}`;

  return (
    <div className="min-h-screen bg-gray-50 pb-24 md:pb-8">
      {/* Header */}
      <div className="bg-emerald-900 text-white px-4 md:px-8 py-6">
        <div className="flex items-center gap-4">
          <Link href="/aggregator/batches" className="p-2 hover:bg-emerald-800 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </Link>
          <div>
            <h1 className="text-xl md:text-2xl font-black">{batchLabel}</h1>
            <p className="text-emerald-100/80 text-sm mt-1">
              Created {formatRelativeTime(batch.created_at)}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 mt-6 max-w-3xl mx-auto space-y-6">
        {/* Basic info card */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Status</h2>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-lg font-bold text-gray-900">{batch.batch_status || batch.status}</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Weight</p>
              <p className="font-bold text-emerald-700">{batch.total_weight ? `${batch.total_weight} kg` : 'Unknown'}</p>
            </div>
          </div>
        </div>

        {/* Transport QR Section - Module 4.1 */}
        <BatchDetailQRSection 
          batchId={batch.id}
          batchStatus={batch.batch_status || batch.status}
          qrTokenUrl={batch.qr_pickup_token}
          qrExpiresAt={batch.qr_pickup_expires_at}
          pickedUpAt={batch.picked_up_at}
          carrierName={batch.carrier_name}
          pickupGpsLat={batch.pickup_gps_lat}
          pickupGpsLng={batch.pickup_gps_lng}
        />
      </div>
    </div>
  );
}
