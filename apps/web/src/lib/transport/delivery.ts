import { createClient } from '@supabase/supabase-js';
import { sendDeliveryNotifications } from './notifications';
import { generateAlreadyScannedTemplate } from './templates/already-scanned';
import { generateSuccessDeliveryTemplate } from './templates/success-delivery';
import { generateDeliveryWithoutPickupTemplate } from './templates/delivery-without-pickup';
import { validateGPS } from './gps';
import { flagGPSMismatch } from './fraud-flags';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function processDeliveryScan(formData: FormData, facilityId: string, ipHash: string) {
  const batchId = formData.get('batchId') as string;
  
  if (!batchId || !facilityId) {
    throw new Error('Missing required fields');
  }

  // 1. Resolve facilityId -> recycler_id
  const { data: qrs } = await supabaseAdmin
    .from('facility_qr_codes')
    .select('recycler_id')
    .eq('facility_id', facilityId);

  if (!qrs || qrs.length === 0) {
    throw new Error('INVALID_QR');
  }
  const recyclerId = qrs[0].recycler_id;

  // 2. Fetch the specific Batch
  const { data: batch, error: batchError } = await supabaseAdmin
    .from('batches')
    .select(`
      *,
      recycler_profiles:recycler_id (
        id, company_name, user_id, facility_lat, facility_lng
      ),
      aggregator_profiles:aggregator_id (
        id, company_name, user_id
      )
    `)
    .eq('id', batchId)
    .eq('recycler_id', recyclerId)
    .single();

  if (batchError || !batch) {
    throw new Error('BATCH_NOT_FOUND');
  }

  const batchLabel = batch.batch_number || batch.batch_qr_payload || `BATCH-${batch.id.substring(0,6).toUpperCase()}`;
  
  const recyclerProfiles = batch.recycler_profiles as any;
  const facilityName = Array.isArray(recyclerProfiles)
    ? (recyclerProfiles[0]?.company_name || 'Recycling Facility')
    : (recyclerProfiles?.company_name || 'Recycling Facility');

  // 3. Idempotency Check
  const { data: existingEvent } = await supabaseAdmin
    .from('batch_transport_events')
    .select('id')
    .eq('batch_id', batchId)
    .eq('event_type', 'DELIVERY_CONFIRMED')
    .maybeSingle();

  if (existingEvent) {
    return {
      html: generateAlreadyScannedTemplate({ batchLabel }),
      status: 200
    };
  }

  // 4. Pickup-Before-Delivery Gate
  const { data: pickupEvent } = await supabaseAdmin
    .from('batch_transport_events')
    .select('id')
    .eq('batch_id', batchId)
    .eq('event_type', 'PICKUP_CONFIRMED')
    .maybeSingle();

  if (!pickupEvent) {
    // Delivery without pickup attempt
    await supabaseAdmin.from('notifications').insert({
      notification_type: 'HIGH',
      trigger_code: 'ADMIN_DELIVERY_WITHOUT_PICKUP',
      target_portal: 'ADMIN',
      message: `Delivery scan attempted for batch ${batchLabel} at facility ${facilityName} without prior pickup confirmation.`,
      title: 'Action Blocked: No Pickup Record'
    });

    return {
      html: generateDeliveryWithoutPickupTemplate(),
      status: 403
    };
  }

  // 5. Gather input data
  const scanLatRaw = formData.get('scanLat') as string;
  const scanLngRaw = formData.get('scanLng') as string;
  const deviceFingerprint = formData.get('deviceFingerprint') as string;

  const scanLat = scanLatRaw ? parseFloat(scanLatRaw) : null;
  const scanLng = scanLngRaw ? parseFloat(scanLngRaw) : null;
  const timestampIso = new Date().toISOString();

  // 6. GPS Validation (Module 4.4)
  const expectedLat = Array.isArray(recyclerProfiles) ? recyclerProfiles[0]?.facility_lat : recyclerProfiles?.facility_lat;
  const expectedLng = Array.isArray(recyclerProfiles) ? recyclerProfiles[0]?.facility_lng : recyclerProfiles?.facility_lng;

  const { isValid: gpsValid, distanceMeters: gpsDistanceM, limitExceeded } = await validateGPS(
    supabaseAdmin,
    scanLat,
    scanLng,
    expectedLat || null,
    expectedLng || null,
    'DELIVERY'
  );

  // 7. Insert DELIVERY_CONFIRMED event
  const { data: eventData, error: eventError } = await supabaseAdmin
    .from('batch_transport_events')
    .insert({
      batch_id: batchId,
      event_type: 'DELIVERY_CONFIRMED',
      scan_lat: scanLat,
      scan_lng: scanLng,
      gps_valid: gpsValid,
      gps_distance_m: gpsDistanceM,
      device_fingerprint: deviceFingerprint,
      ip_hash: ipHash
    })
    .select('id')
    .single();

  if (eventError) {
    throw new Error('DATABASE_ERROR');
  }

  // 7.5 Emit Fraud Flag if GPS limit exceeded
  if (limitExceeded && gpsDistanceM !== null) {
    await flagGPSMismatch(
      supabaseAdmin,
      batchId,
      eventData.id,
      batch.recycler_id,
      gpsDistanceM,
      'DELIVERY'
    );
  }

  // 8. Update Batch Record -> 'ARRIVED' + transit_duration_hours
  const pickedUpAt = batch.picked_up_at ? new Date(batch.picked_up_at) : null;
  const deliveredAt = new Date(timestampIso);
  const transitDurationHours = pickedUpAt
    ? Math.round(((deliveredAt.getTime() - pickedUpAt.getTime()) / (1000 * 60 * 60)) * 100) / 100
    : null;

  await supabaseAdmin
    .from('batches')
    .update({
      status: 'ARRIVED',
      delivered_at: timestampIso,
      delivery_gps_lat: scanLat,
      delivery_gps_lng: scanLng,
      transit_duration_hours: transitDurationHours
    })
    .eq('id', batchId);

  // 9. Update Collection Links (collections -> ARRIVED)
  const { data: links } = await supabaseAdmin
    .from('batch_collection_links')
    .select('collection_id')
    .eq('batch_id', batchId);

  if (links && links.length > 0) {
    const collectionIds = links.map(l => l.collection_id);
    await supabaseAdmin
      .from('collections')
      .update({ status: 'DELIVERED' })
      .in('id', collectionIds);
  }

  // 10. N-17 & N-18 Notifications
  const recyclerUserId = Array.isArray(recyclerProfiles) ? recyclerProfiles[0]?.user_id : recyclerProfiles?.user_id;
  const aggregatorProfile = batch.aggregator_profiles as any;
  const aggregatorUserId = Array.isArray(aggregatorProfile) ? aggregatorProfile[0]?.user_id : (aggregatorProfile?.user_id || batch.aggregator_id);
  
  await sendDeliveryNotifications(supabaseAdmin, recyclerUserId || batch.recycler_id, aggregatorUserId, batchLabel);

  // 11. Invoke record-transport-hash Edge Function for Delivery
  fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/record-transport-hash`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
    },
    body: JSON.stringify({
      event_type: 'DELIVERY_CONFIRMED',
      batch_id: batchId,
      batch_transport_event_id: eventData.id,
      scan_lat: scanLat,
      scan_lng: scanLng,
      timestamp_iso: timestampIso,
      aggregator_id: batch.aggregator_id,
      recycler_id: batch.recycler_id
    })
  }).catch(console.error);

  return {
    html: generateSuccessDeliveryTemplate({ batchLabel, facilityName }),
    status: 200
  };
}
