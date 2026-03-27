import * as crypto from 'crypto';

interface ValidateQRResult {
  valid: boolean;
  reason?: 'INVALID_SIGNATURE' | 'QR_EXPIRED' | 'MISSING_PARAMS';
}

export function validateQRToken(
  batchId: string,
  event: string,
  expires: string,
  sig: string
): ValidateQRResult {
  if (!batchId || !event || !expires || !sig) {
    return { valid: false, reason: 'MISSING_PARAMS' };
  }

  const hmacSecret = process.env.HMAC_SECRET;
  if (!hmacSecret) {
    throw new Error('HMAC_SECRET is not configured');
  }

  // 1. Verify HMAC Signature
  const hmac = crypto.createHmac('sha256', hmacSecret);
  hmac.update(`${batchId}${event}${expires}`);
  const expectedSig = hmac.digest('hex');

  // Prevent timing attacks with crypto.timingSafeEqual
  let isValidSig = false;
  try {
    const expectedBuffer = Buffer.from(expectedSig);
    const providedBuffer = Buffer.from(sig);
    if (expectedBuffer.length === providedBuffer.length) {
      isValidSig = crypto.timingSafeEqual(expectedBuffer, providedBuffer);
    }
  } catch (err) {
    isValidSig = false;
  }

  if (!isValidSig) {
    return { valid: false, reason: 'INVALID_SIGNATURE' };
  }

  // 2. Verify Expiry
  const expiresMs = parseInt(expires, 10);
  if (isNaN(expiresMs) || Date.now() > expiresMs) {
    return { valid: false, reason: 'QR_EXPIRED' };
  }

  return { valid: true };
}
