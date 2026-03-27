import { SupabaseClient } from '@supabase/supabase-js';

export async function flagGPSMismatch(
  supabaseAdmin: SupabaseClient,
  batchId: string,
  eventId: string,
  aggregatorId: string,
  distanceM: number,
  eventType: 'PICKUP' | 'DELIVERY'
) {
  // Moderate severity for transport GPS mismatch
  // Event triggers the calculate-fraud-score edge function automatically
  const { error } = await supabaseAdmin.from('fraud_flags').insert({
    entity_id: batchId,
    batch_id: batchId,
    flag_type: 'GPS_MISMATCH',
    severity: 'MODERATE',
    evidence_data: { distance_m: distanceM, event_type: eventType, event_id: eventId },
    detail_json: { distance_m: distanceM, event_type: eventType, event_id: eventId },
    created_at: new Date().toISOString()
  });

  if (error) {
    console.error('Failed to create GPS_MISMATCH fraud flag:', error);
  }

  // Also notify Admin about the mismatch
  await supabaseAdmin.from('notifications').insert({
    notification_type: 'HIGH',
    trigger_code: 'ADMIN_GPS_MISMATCH_ALERT',
    target_portal: 'ADMIN',
    message: `GPS mismatch for batch ${batchId.substring(0,8)} during ${eventType} (${Math.round(distanceM)}m away).`,
    title: 'Transport GPS Mismatch'
  });
}
