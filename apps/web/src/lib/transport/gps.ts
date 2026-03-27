import { SupabaseClient } from '@supabase/supabase-js';
import { calculateHaversineDistance } from './haversine';

export async function validateGPS(
  supabaseAdmin: SupabaseClient,
  scanLat: number | null,
  scanLng: number | null,
  expectedLat: number | null,
  expectedLng: number | null,
  eventType: 'PICKUP' | 'DELIVERY'
): Promise<{
  isValid: boolean | null;
  distanceMeters: number | null;
  limitExceeded: boolean;
}> {
  // If scan coordinates or expected facility coordinates are missing
  if (scanLat === null || scanLng === null || expectedLat === null || expectedLng === null) {
    return {
      isValid: null,
      distanceMeters: null,
      limitExceeded: false
    };
  }

  // Calculate distance
  const distance = calculateHaversineDistance(scanLat, scanLng, expectedLat, expectedLng);
  
  // Get tolerance from system_config (default pickup: 500, delivery: 200)
  const configKey = eventType === 'PICKUP' ? 'pickup_gps_tolerance_m' : 'delivery_gps_tolerance_m';
  const defaultTolerance = eventType === 'PICKUP' ? 500 : 200;

  let tolerance = defaultTolerance;

  const { data: configRecord } = await supabaseAdmin
    .from('system_config')
    .select('value')
    .eq('key', configKey)
    .single();

  if (configRecord && configRecord.value) {
    const parsed = parseInt(configRecord.value, 10);
    if (!isNaN(parsed)) {
      tolerance = parsed;
    }
  }

  const isValid = distance <= tolerance;
  
  return {
    isValid,
    distanceMeters: distance,
    limitExceeded: !isValid
  };
}
