import { SupabaseClient } from '@supabase/supabase-js';

export async function sendN16PickupNotification(
  supabaseAdmin: SupabaseClient,
  targetUserId: string,
  batchLabel: string
) {
  // Fetch N16 template
  const { data: template } = await supabaseAdmin
    .from('notification_templates')
    .select('id, body_template')
    .eq('trigger_code', 'N16_BATCH_PICKUP_CONFIRMED')
    .single();

  if (!template) {
    console.error('N16_BATCH_PICKUP_CONFIRMED template not found');
    return;
  }

  // Construct message
  const message = template.body_template.replace('{{batch_label}}', batchLabel);

  // Insert notification
  const { error } = await supabaseAdmin
    .from('notifications')
    .insert({
      notification_type: 'ROUTINE',
      trigger_code: 'N16_BATCH_PICKUP_CONFIRMED',
      target_portal: 'AGGREGATOR',
      user_id: targetUserId,
      message: message,
      title: 'Batch Picked Up'
    });

  if (error) {
    console.error('Failed to insert N16 pickup notification:', error);
  }
}

export async function sendDeliveryNotifications(
  supabaseAdmin: SupabaseClient,
  recyclerUserId: string,
  aggregatorUserId: string,
  batchLabel: string
) {
  // 1. N17 to Recycler
  const { data: template17 } = await supabaseAdmin
    .from('notification_templates')
    .select('id, body_template')
    .eq('trigger_code', 'N17_BATCH_DELIVERY_CONFIRMED')
    .single();

  if (template17) {
    const message17 = template17.body_template.replace('{{batch_label}}', batchLabel);
    await supabaseAdmin.from('notifications').insert({
      notification_type: 'ROUTINE',
      trigger_code: 'N17_BATCH_DELIVERY_CONFIRMED',
      target_portal: 'RECYCLER',
      user_id: recyclerUserId,
      message: message17,
      title: 'Batch Delivered'
    });
  }

  // 2. N18 to Aggregator
  const { data: template18 } = await supabaseAdmin
    .from('notification_templates')
    .select('id, body_template')
    .eq('trigger_code', 'N18_BATCH_DELIVERED_AGG')
    .single();

  if (template18) {
    const message18 = template18.body_template.replace('{{batch_label}}', batchLabel);
    await supabaseAdmin.from('notifications').insert({
      notification_type: 'ROUTINE',
      trigger_code: 'N18_BATCH_DELIVERED_AGG',
      target_portal: 'AGGREGATOR',
      user_id: aggregatorUserId,
      message: message18,
      title: 'Batch Delivery Confirmed'
    });
  }
}
