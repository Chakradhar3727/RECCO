/**
 * RECCO — Perceptual Hash (pHash) Near-Duplicate Detection (Client-Side)
 *
 * Implements a simplified perceptual hash algorithm using the Canvas API.
 * Computes a 64-bit hash by:
 *   1. Resizing the image to 8x8 greyscale
 *   2. Computing average pixel value
 *   3. Generating a binary hash (1 if pixel > avg, 0 otherwise)
 *
 * Hamming distance between hashes determines visual similarity.
 * A distance ≤ 10 indicates near-duplicate photos.
 */

const HASH_SIZE = 8; // 8x8 = 64-bit hash

/**
 * Compute a perceptual hash from a base64 data-URL.
 * Returns a 64-character binary string (e.g. "0110101...").
 */
export async function computePhash(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = HASH_SIZE;
      canvas.height = HASH_SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas 2D context unavailable'));
        return;
      }

      // Draw image scaled to 8x8
      ctx.drawImage(img, 0, 0, HASH_SIZE, HASH_SIZE);

      // Get pixel data (RGBA)
      const imageData = ctx.getImageData(0, 0, HASH_SIZE, HASH_SIZE);
      const pixels = imageData.data;

      // Convert to greyscale values
      const greys: number[] = [];
      for (let i = 0; i < pixels.length; i += 4) {
        const grey = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
        greys.push(grey);
      }

      // Compute average
      const avg = greys.reduce((sum, g) => sum + g, 0) / greys.length;

      // Generate binary hash
      const hash = greys.map(g => (g >= avg ? '1' : '0')).join('');
      resolve(hash);
    };
    img.onerror = () => reject(new Error('Failed to load image for pHash'));
    img.src = dataUrl;
  });
}

/**
 * Compute Hamming distance between two binary hash strings.
 * Returns the number of differing bits.
 */
export function hammingDistance(hash1: string, hash2: string): number {
  if (hash1.length !== hash2.length) {
    throw new Error('Hash lengths must match');
  }
  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    if (hash1[i] !== hash2[i]) distance++;
  }
  return distance;
}

/**
 * Check if a new photo is a near-duplicate of any existing photos.
 * Returns `true` if any existing hash has a Hamming distance ≤ threshold.
 *
 * @param threshold - Default 10 (out of 64 bits). Lower = stricter.
 */
export function isNearDuplicate(
  newHash: string,
  existingHashes: (string | undefined)[],
  threshold = 10
): boolean {
  return existingHashes.some(h => {
    if (!h) return false;
    try {
      return hammingDistance(newHash, h) <= threshold;
    } catch {
      return false;
    }
  });
}
