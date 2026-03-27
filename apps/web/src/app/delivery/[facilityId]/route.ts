import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { processDeliveryScan } from '@/lib/transport/delivery';
import { generateDeliveryTemplate } from '@/lib/transport/templates/delivery';
import { generateMultiBatchDeliveryTemplate } from '@/lib/transport/templates/multi-batch';
import { generateErrorTemplate } from '@/lib/transport/templates/error';

export async function GET(
  req: NextRequest,
  { params }: { params: { facilityId: string } }
) {
  const facilityId = params.facilityId;

  if (!facilityId) {
    return new NextResponse('INVALID_PARAMS', { status: 400 });
  }

  // Fetch initial batch info to generate the view
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. Resolve facilityId to recycler_id
  const { data: qrs } = await supabase
    .from('facility_qr_codes')
    .select('recycler_id')
    .eq('facility_id', facilityId);

  if (!qrs || qrs.length === 0) {
    return new NextResponse('INVALID_QR: Unregistered Facility', { status: 404 });
  }
  const recyclerId = qrs[0].recycler_id;

  // 2. Find IN_TRANSIT batches for this recycler THAT have a PICKUP_CONFIRMED event
  // Wait, we need to manually join or just query batches where status=IN_TRANSIT
  const { data: batches } = await supabase
    .from('batches')
    .select(`
      id,
      batch_number,
      batch_qr_payload,
      total_weight,
      aggregator_profiles:aggregator_id(company_name),
      recycler_profiles:recycler_id(company_name)
    `)
    .eq('recycler_id', recyclerId)
    .eq('status', 'IN_TRANSIT');

  if (!batches || batches.length === 0) {
    // If no batches, perhaps show a graceful placeholder
    return new NextResponse(`
      <html>
        <head><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="font-family:sans-serif; text-align:center; padding-top: 50px;">
          <h2>No Active Deliveries</h2>
          <p>There are no batches currently in transit to this facility.</p>
        </body>
      </html>
    `, { status: 200, headers: { 'Content-Type': 'text/html' } });
  }

  // 3. For the found batches, ensure they have a PICKUP_CONFIRMED event
  // Let's get the distinct batch IDs
  const batchIds = batches.map(b => b.id);
  const { data: pickupEvents } = await supabase
    .from('batch_transport_events')
    .select('batch_id')
    .in('batch_id', batchIds)
    .eq('event_type', 'PICKUP_CONFIRMED');

  const pickedUpBatchIds = new Set(pickupEvents?.map(e => e.batch_id) || []);
  const validBatches = batches.filter(b => pickedUpBatchIds.has(b.id));

  if (validBatches.length === 0) {
    return new NextResponse(`
      <html>
        <head><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="font-family:sans-serif; text-align:center; padding-top: 50px;">
          <h2>Action Blocked</h2>
          <p>Batches en route lack a valid Pickup Confirmation record.</p>
        </body>
      </html>
    `, { status: 403, headers: { 'Content-Type': 'text/html' } });
  }

  const recyclerProfile = validBatches[0].recycler_profiles as any;
  const facilityName = Array.isArray(recyclerProfile) ? recyclerProfile[0]?.company_name : (recyclerProfile?.company_name || 'Recycling Facility');

  if (validBatches.length === 1) {
    const validBatch = validBatches[0];
    const batchLabel = validBatch.batch_number || validBatch.batch_qr_payload || `BATCH-${validBatch.id.substring(0, 6).toUpperCase()}`;
    const aggregatorProfile = validBatch.aggregator_profiles as any;
    const sourceAggregatorName = Array.isArray(aggregatorProfile) ? aggregatorProfile[0]?.company_name : aggregatorProfile?.company_name;

    const totalWeight = validBatch.total_weight || 0;

    // Render static HTML Delivery form
    const html = generateDeliveryTemplate({
      facilityId,
      facilityName,
      batchId: validBatch.id,
      batchLabel,
      sourceAggregatorName: sourceAggregatorName || 'Aggregator',
      totalWeight
    });

    return new NextResponse(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html' }
    });
  } else {
    // Multi-batch
    const batchesData = validBatches.map(b => {
      const aggregatorProfile = b.aggregator_profiles as any;
      const sourceAggregatorName = Array.isArray(aggregatorProfile) ? aggregatorProfile[0]?.company_name : aggregatorProfile?.company_name;
      
      return {
        id: b.id,
        label: b.batch_number || b.batch_qr_payload || `BATCH-${b.id.substring(0, 6).toUpperCase()}`,
        sourceAggregatorName: sourceAggregatorName || 'Aggregator',
        weight: b.total_weight || 0,
        timeSincePickupText: 'N/A', // We can calculate this using picked_up_at
        materialType: 'MIXED' // Mocking for now as we don't fetch it here
      };
    });

    const html = generateMultiBatchDeliveryTemplate({
      facilityId,
      facilityName,
      batches: batchesData
    });

    return new NextResponse(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html' }
    });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { facilityId: string } }
) {
  try {
    const facilityId = params.facilityId;
    const formData = await req.formData();
    
    // Hash IP address with HMAC secret for anonymization (DPDP Act 2023)
    const rawIp = req.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
    const hmacSecret = process.env.HMAC_SECRET || 'fallback-secret';
    const ipHash = crypto.createHmac('sha256', hmacSecret).update(rawIp).digest('hex').substring(0, 16);

    const isMultiBatch = formData.get('isMultiBatch') === 'true';

    if (isMultiBatch) {
      const selectedBatchIds = formData.getAll('selected_batches');
      let successCount = 0;
      for (const batchId of selectedBatchIds) {
        try {
          // create a mock FormData for each to reuse logic
          const singleFormData = new FormData();
          singleFormData.append('batchId', batchId as string);
          singleFormData.append('scanLat', formData.get('scanLat') as string);
          singleFormData.append('scanLng', formData.get('scanLng') as string);
          singleFormData.append('deviceFingerprint', formData.get('deviceFingerprint') as string);
          
          await processDeliveryScan(singleFormData, facilityId, ipHash);
          successCount++;
        } catch (e) {
          console.error(`Failed to record delivery for ${batchId}`, e);
        }
      }

      const html = `<!DOCTYPE html>
<html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>body{font-family:sans-serif;text-align:center;padding:40px;}</style></head>
<body><h2>${successCount} Batches Delivered</h2><p>Your transport records have been saved.</p></body></html>`;
      return new NextResponse(html, { status: 200, headers: { 'Content-Type': 'text/html' } });

    } else {
      const result = await processDeliveryScan(formData, facilityId, ipHash);
      
      return new NextResponse(result.html, {
        status: result.status,
        headers: { 'Content-Type': 'text/html' }
      });
    }
    
  } catch (error: any) {
    console.error('Transport scan error:', error);
    let errorType: any = 'INVALID_QR';
    const msg = error.message || '';
    if (msg.includes('SEQUENCE')) errorType = 'WRONG_SEQUENCE';
    if (msg.includes('INVALID_QR')) errorType = 'INVALID_QR';
    
    return new NextResponse(generateErrorTemplate(errorType), { status: 400, headers: { 'Content-Type': 'text/html' } });
  }
}
