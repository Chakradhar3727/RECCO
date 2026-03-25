/**
 * RECCO — SHA-256 Image Hashing (Client-Side)
 *
 * Uses the Web Crypto API (crypto.subtle) to generate SHA-256 hashes
 * of photo data-URLs. Used to prevent exact-duplicate uploads within
 * the same collection session.
 */

/**
 * Compute SHA-256 hex digest of a base64 data-URL string.
 */
export async function sha256FromDataUrl(dataUrl: string): Promise<string> {
  // Strip the data-URL prefix (e.g. "data:image/jpeg;base64,")
  const base64 = dataUrl.split(',')[1];
  if (!base64) throw new Error('Invalid data-URL: missing base64 payload');

  const binaryStr = atob(base64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }

  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Check if a photo hash already exists in the provided set.
 * Returns `true` if the photo is a duplicate.
 */
export function isDuplicatePhoto(
  newHash: string,
  existingHashes: (string | undefined)[]
): boolean {
  return existingHashes.some(h => h !== undefined && h === newHash);
}
