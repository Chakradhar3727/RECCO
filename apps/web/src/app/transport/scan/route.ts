import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateQRToken } from '@/lib/qr/validate';
import crypto from 'crypto';
import { processPickupScan } from '@/lib/transport/pickup';
import { generatePickupTemplate } from '@/lib/transport/templates/pickup';
import { generateErrorTemplate } from '@/lib/transport/templates/error';

// We must serve standard HTML directly for GET and POST processing
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const batchId = searchParams.get('batch_id');
  const event = searchParams.get('event');
  const expires = searchParams.get('expires');
  const sig = searchParams.get('sig');

  // Verify parameters exist
  if (!batchId || !event || !expires || !sig) {
    return new NextResponse(generateErrorTemplate('INVALID_QR'), { status: 400, headers: { 'Content-Type': 'text/html' } });
  }

  // Verify token
  const isValid = await validateQRToken(batchId, event, expires, sig);
  
  if (!isValid.valid) {
    const errorType = isValid.reason === 'QR_EXPIRED' ? 'QR_EXPIRED' : 'INVALID_QR';
    return new NextResponse(generateErrorTemplate(errorType as any), { status: 400, headers: { 'Content-Type': 'text/html' } });
  }

  // Fetch initial batch info to generate the view
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: batch } = await supabase
    .from('batches')
    .select(`
      id,
      batch_number,
      batch_qr_payload,
      total_weight,
      aggregator_profiles:aggregator_id(company_name),
      batch_collection_links(count)
    `)
    .eq('id', batchId)
    .single();

  if (!batch) {
    return new NextResponse(generateErrorTemplate('INVALID_QR'), { status: 404, headers: { 'Content-Type': 'text/html' } });
  }

  const batchLabel = batch.batch_number || batch.batch_qr_payload || `BATCH-${batch.id.substring(0, 6).toUpperCase()}`;
  
  const aggregatorProfiles = batch.aggregator_profiles as any;
  const aggregatorName = Array.isArray(aggregatorProfiles) 
    ? (aggregatorProfiles[0]?.company_name || 'Aggregator')
    : (aggregatorProfiles?.company_name || 'Aggregator');
    
  const totalWeight = batch.total_weight || 0;
  const collectionCount = batch.batch_collection_links?.[0]?.count || 0;

  // Render static HTML Pickup form
  // We pass the full URL as token for the form to POST back if needed, 
  // or we pass the individual signature components.
  const html = generatePickupTemplate({
    batchId,
    batchLabel,
    aggregatorName,
    totalWeight,
    collectionCount,
    event,
    expires,
    sig
  });

  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html' }
  });
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    
    // Hash IP address with HMAC secret for anonymization (DPDP Act 2023)
    const rawIp = req.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
    const hmacSecret = process.env.HMAC_SECRET || 'fallback-secret';
    const ipHash = crypto.createHmac('sha256', hmacSecret).update(rawIp).digest('hex').substring(0, 16);

    const result = await processPickupScan(formData, ipHash);
    
    return new NextResponse(result.html, {
      status: result.status,
      headers: { 'Content-Type': 'text/html' }
    });
    
  } catch (error: any) {
    console.error('Transport scan error:', error);
    
    let errorType: 'INVALID_QR' | 'QR_EXPIRED' | 'WRONG_SEQUENCE' | 'DELIVERY_WITHOUT_PICKUP' | 'ALREADY_SCANNED' = 'INVALID_QR';
    const msg = error.message || '';
    if (msg.includes('EXPIRED')) errorType = 'QR_EXPIRED';
    if (msg.includes('SEQUENCE')) errorType = 'WRONG_SEQUENCE';
    
    return new NextResponse(generateErrorTemplate(errorType), { 
      status: 400, 
      headers: { 'Content-Type': 'text/html' } 
    });
  }
}
