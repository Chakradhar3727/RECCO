'use server';

import { createClient } from '@/lib/supabase/server';
import { generateQRToken } from '@/lib/qr/generate';

/**
 * Generates an HMAC-signed QR token for the specified batch and saves it.
 * This should be called when the Recycler acknowledges the batch.
 */
export async function signBatchQR(batchId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    // Check if the batch exists
    const { data: batch, error: batchError } = await supabase
      .from('batches')
      .select('id')
      .eq('id', batchId)
      .single();

    if (batchError || !batch) {
      return { success: false, error: 'Batch not found' };
    }

    // Set expiry to 30 days from now (per requirements)
    const expiresMs = Date.now() + 30 * 24 * 60 * 60 * 1000;
    
    // Generate HMAC URL
    const qrUrl = generateQRToken({ batchId, expiresMs });

    // Store in batches.qr_pickup_token
    const { error: updateError } = await supabase
      .from('batches')
      .update({
        qr_pickup_token: qrUrl,
        qr_pickup_expires_at: new Date(expiresMs).toISOString()
      })
      .eq('id', batchId);

    if (updateError) {
      console.error('Failed to update batch with QR token:', updateError);
      return { success: false, error: 'Database update failed' };
    }

    return { success: true, url: qrUrl };
  } catch (error) {
    console.error('signBatchQR error:', error);
    return { success: false, error: 'Internal server error' };
  }
}
