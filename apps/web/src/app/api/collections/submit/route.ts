import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { computeMedianWeight, computeWeightVariancePct } from '@/lib/utils/weight-stats';

/**
 * Collection Submission API Route
 * Writes a new collection record to the `collections` table.
 * Inserts fraud flags for WEIGHT_VARIANCE if variance exceeds configured thresholds.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { materialType, photos, medianWeightKg, weightVariancePct, gpsLat, gpsLng, locationName } = body;

    // Validate required fields
    if (!materialType || !medianWeightKg || gpsLat == null || gpsLng == null) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get aggregator profile
    const { data: profile } = await supabase
      .from('aggregator_profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Aggregator profile not found' }, { status: 404 });
    }

    // Insert collection — materialType may contain comma-separated values for multi-material collections
    const { data: collection, error: insertError } = await supabase
      .from('collections')
      .insert({
        aggregator_id: profile.id,
        material_type: materialType,
        ocr_weight_1: photos?.[0]?.extractedWeight ?? null,
        ocr_weight_2: photos?.[1]?.extractedWeight ?? null,
        ocr_weight_3: photos?.[2]?.extractedWeight ?? null,
        median_weight: medianWeightKg,
        gps_lat: gpsLat,
        gps_lng: gpsLng,
        status: 'AVAILABLE_FOR_BATCHING',
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Collection insert error:', insertError);
      return NextResponse.json({ error: 'Failed to save collection' }, { status: 500 });
    }

    // Insert WEIGHT_VARIANCE fraud flag if variance > 15%
    if (weightVariancePct > 15) {
      const severity = weightVariancePct > 30 ? 'HIGH' : 'MEDIUM';
      await supabase.from('fraud_flags').insert({
        entity_id: user.id,
        flag_type: 'WEIGHT_VARIANCE',
        severity,
        evidence_data: {
          collection_id: collection.id,
          variance_pct: weightVariancePct,
          weights: photos?.map((p: { extractedWeight: number }) => p.extractedWeight),
          median: medianWeightKg,
        },
      });
    }

    // Update aggregator stats
    await supabase
      .from('aggregator_profiles')
      .update({
        total_collections: profile.id ? undefined : 0, // Will use RPC in production
      })
      .eq('id', profile.id);

    return NextResponse.json({ id: collection.id, status: 'success' });
  } catch (err) {
    console.error('Submit collection error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
