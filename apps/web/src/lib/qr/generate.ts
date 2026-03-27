import * as crypto from 'crypto';

interface QRTokenParams {
  batchId: string;
  expiresMs: number;
}

export function generateQRToken({ batchId, expiresMs }: QRTokenParams): string {
  const hmacSecret = process.env.HMAC_SECRET;
  if (!hmacSecret) {
    throw new Error('HMAC_SECRET is not configured');
  }

  const event = 'PICKUP_CONFIRMED';
  const expires = expiresMs.toString();
  
  // Create HMAC signature: hmac(batchId + event + expires, secret)
  const hmac = crypto.createHmac('sha256', hmacSecret);
  hmac.update(`${batchId}${event}${expires}`);
  const sig = hmac.digest('hex');

  // Construct URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const url = new URL('/transport/scan', baseUrl);
  
  url.searchParams.set('batch_id', batchId);
  url.searchParams.set('event', event);
  url.searchParams.set('expires', expires);
  url.searchParams.set('sig', sig);

  return url.toString();
}
