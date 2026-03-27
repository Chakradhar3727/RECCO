import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { computeMedianWeight, computeWeightVariancePct } from '@/lib/utils/weight-stats';
import { checkInventoryGuards, insertVelocityAnomalyFlag } from '@/lib/guards/inventory-guards';

/**
 * Collection Submission API Route
 * Writes a new collection record to the `collections` table.
 * Inserts fraud flags for WEIGHT_VARIANCE if variance exceeds configured thresholds.
 * Enforces inventory continuity guards (Module 3.8).
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      materialType, photos, medianWeightKg, weightVariancePct,
      gpsLat, gpsLng, locationName,
      aiDetectedMaterial, aiMaterialConfidence, sessionId,
    } = body;

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

    // ── Module 3.8: Inventory Continuity Guards ────────────────────────
    const guardResult = await checkInventoryGuards(profile.id, medianWeightKg);
    if (!guardResult.allowed) {
      return NextResponse.json(
        { error: guardResult.reason || 'Submission blocked by inventory guard' },
        { status: 429 }
      );
    }

    // Determine if AI agrees with manual material selection
    const aiMaterialMatch = aiDetectedMaterial && materialType
      ? materialType.includes(aiDetectedMaterial)
      : null;

    // Insert collection with all integrity fields
    const { data: collection, error: insertError } = await supabase
      .from('collections')
      .insert({
        aggregator_id: profile.id,
        material_type: materialType,
        ocr_weight_1: photos?.[0]?.extractedWeight ?? null,
        ocr_weight_2: photos?.[1]?.extractedWeight ?? null,
        ocr_weight_3: null, // Photo 3 is now material ID, not weight
        ai_detected_material: aiDetectedMaterial ?? null,
        ai_material_confidence: aiMaterialConfidence ?? null,
        ai_material_match: aiMaterialMatch,
        median_weight: medianWeightKg,
        gps_lat: gpsLat,
        gps_lng: gpsLng,
        gps_locality: locationName ?? null,
        photo_1_hash: photos?.[0]?.sha256 ?? null,
        photo_2_hash: photos?.[1]?.sha256 ?? null,
        photo_3_hash: photos?.[2]?.sha256 ?? null,
        photo_1_phash: photos?.[0]?.phash ?? null,
        photo_2_phash: photos?.[1]?.phash ?? null,
        photo_3_phash: photos?.[2]?.phash ?? null,
        collection_session_id: sessionId ?? null,
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

    // ── Extension A: Insert MATERIAL_TYPE_MISMATCH fraud flag if AI disagrees ─
    if (aiMaterialMatch === false && (aiMaterialConfidence ?? 0) >= 70) {
      await supabase.from('fraud_flags').insert({
        entity_id: user.id,
        flag_type: 'MATERIAL_TYPE_MISMATCH',
        severity: 'MEDIUM',
        evidence_data: {
          collection_id: collection.id,
          manual_selection: materialType,
          ai_detected: aiDetectedMaterial,
          ai_confidence: aiMaterialConfidence,
        },
      });
    }

    // ── Module 3.8: Insert velocity anomaly flag if triggered ─────────
    if (guardResult.velocityAnomaly) {
      await insertVelocityAnomalyFlag(user.id, collection.id, 0);
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
