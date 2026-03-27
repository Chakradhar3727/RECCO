import { createClient } from '@supabase/supabase-js';
import { validateQRToken } from '../qr/validate';
import { sendN16PickupNotification } from './notifications';
import { generateAlreadyScannedTemplate } from './templates/already-scanned';
import { generateSuccessPickupTemplate } from './templates/success-pickup';
import { validateGPS } from './gps';
import { flagGPSMismatch } from './fraud-flags';

// Use a server-role client to allow creating events safely
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // ensure this is in .env.local
);

export async function processPickupScan(formData: FormData, ipHash: string) {
  const batchId = formData.get('batch_id') as string;
  const event = formData.get('event') as string;
  const expires = formData.get('expires') as string;
  const sig = formData.get('sig') as string;
  
  if (!batchId || !event || !expires || !sig) {
    throw new Error('Missing required fields');
  }

  // 1. Initial Validation
  const { valid } = validateQRToken(batchId, event, expires, sig);
  if (!valid) {
    throw new Error('INVALID_QR');
  }

  // 2. Fetch Batch State
  const { data: batch, error: batchError } = await supabaseAdmin
    .from('batches')
    .select(`
      *,
      aggregator_profiles:aggregator_id (
        id, company_name, user_id, godown_lat, godown_lng
      )
    `)
    .eq('id', batchId)
    .single();

  if (batchError || !batch) {
    throw new Error('BATCH_NOT_FOUND');
  }

  const batchLabel = batch.batch_number || batch.batch_qr_payload || `BATCH-${batch.id.substring(0,6).toUpperCase()}`;

  // 3. Idempotency Check
  const { data: existingEvent } = await supabaseAdmin
    .from('batch_transport_events')
    .select('id')
    .eq('batch_id', batchId)
    .eq('event_type', 'PICKUP_CONFIRMED')
    .maybeSingle();

  if (existingEvent) {
    // Already scanned, no error, just return the static HTML template
    return {
      html: generateAlreadyScannedTemplate({ batchLabel }),
      status: 200
    };
  }

  // 4. State Machine Enforcement
  const lockedStates = ['PENDING_PICKUP', 'AWAITING_ACK', 'ISSUED', 'CERT_ISSUED'];
  if (lockedStates.includes(batch.status)) {
    throw new Error('INVALID_STATE');
  }

  // 5. Gather input data
  const carrierName = formData.get('carrierName') as string;
  const vehicleNumber = formData.get('vehicleNumber') as string;
  const scanLatRaw = formData.get('scanLat') as string;
  const scanLngRaw = formData.get('scanLng') as string;
  const deviceFingerprint = formData.get('deviceFingerprint') as string;

  const scanLat = scanLatRaw ? parseFloat(scanLatRaw) : null;
  const scanLng = scanLngRaw ? parseFloat(scanLngRaw) : null;

  const timestampIso = new Date().toISOString();

  // Module 4.3 GPS Check
  const expectedLat = batch.aggregator_profiles?.godown_lat || null;
  const expectedLng = batch.aggregator_profiles?.godown_lng || null;

  const { isValid: gpsValid, distanceMeters: gpsDistanceM, limitExceeded } = await validateGPS(
    supabaseAdmin,
    scanLat,
    scanLng,
    expectedLat,
    expectedLng,
    'PICKUP'
  );

  // 6. DB Transaction
  // We'll insert into batch_transport_events
  const { data: eventData, error: eventError } = await supabaseAdmin
    .from('batch_transport_events')
    .insert({
      batch_id: batchId,
      event_type: 'PICKUP_CONFIRMED',
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

  // 6.5 Emit Fraud Flag if GPS limit is exceeded
  if (limitExceeded && gpsDistanceM !== null) {
    await flagGPSMismatch(
      supabaseAdmin,
      batchId,
      eventData.id,
      batch.aggregator_id,
      gpsDistanceM,
      'PICKUP'
    );
  }

  // 7. Update Batch Record
  await supabaseAdmin
    .from('batches')
    .update({
      status: 'IN_TRANSIT',
      picked_up_at: timestampIso,
      carrier_name: carrierName,
      vehicle_no: vehicleNumber,
      pickup_gps_lat: scanLat,
      pickup_gps_lng: scanLng
    })
    .eq('id', batchId);

  // 8. Update Collection Links (collections -> IN_TRANSIT)
  const { data: links } = await supabaseAdmin
    .from('batch_collection_links')
    .select('collection_id')
    .eq('batch_id', batchId);

  if (links && links.length > 0) {
    const collectionIds = links.map(l => l.collection_id);
    await supabaseAdmin
      .from('collections')
      .update({ status: 'IN_TRANSIT' })
      .in('id', collectionIds);
  }

  // 9. N-16 Notification
  const aggregatorUserId = batch.aggregator_profiles?.user_id || batch.aggregator_id;
  await sendN16PickupNotification(supabaseAdmin, aggregatorUserId, batchLabel);

  // 10. Invoke record-transport-hash Edge Function
  // We use fetch to call the edge function in a fire-and-forget manner
  fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/record-transport-hash`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
    },
    body: JSON.stringify({
      event_type: 'PICKUP_CONFIRMED',
      batch_id: batchId,
      batch_transport_event_id: eventData.id,
      scan_lat: scanLat,
      scan_lng: scanLng,
      timestamp_iso: timestampIso,
      aggregator_id: batch.aggregator_id,
      recycler_id: batch.recycler_id
    })
  }).catch(console.error); // Do not block response on this

  // Return success HTML template
  return {
    html: generateSuccessPickupTemplate({ batchLabel }),
    status: 200
  };
}
