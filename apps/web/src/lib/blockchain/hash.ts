/**
 * Blockchain Hash Utilities — Phase 2 Module 2.8
 *
 * SHA-256 hashing for checkpoint data integrity verification.
 * Recomputes hashes from raw DB values (lat, lng, weight, timestamp)
 * and compares against stored cp1_hash to detect tampering.
 */

/**
 * Compute a SHA-256 hex digest of the given string.
 * Works in both Node.js (via crypto) and Edge runtimes (via SubtleCrypto).
 */
export async function sha256(input: string): Promise<string> {
    // Use Node.js crypto if available (server actions)
    if (typeof globalThis.process !== 'undefined') {
        const { createHash } = await import('crypto');
        return createHash('sha256').update(input).digest('hex');
    }

    // Fallback: Web Crypto API (Edge Functions)
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Build the canonical string for a CP1 (Input Weight) checkpoint.
 * Format: "lat|lng|weight_kg|iso_timestamp"
 */
export function buildCp1Payload(
    lat: number | null,
    lng: number | null,
    weightKg: number | null,
    timestamp: string | null,
): string {
    return `${lat ?? 0}|${lng ?? 0}|${weightKg ?? 0}|${timestamp ?? ''}`;
}

/**
 * Verify a CP1 hash against its source data.
 * Returns true if the hash matches the recomputed hash.
 */
export async function verifyCp1Hash(
    storedHash: string,
    lat: number | null,
    lng: number | null,
    weightKg: number | null,
    timestamp: string | null,
): Promise<boolean> {
    const payload = buildCp1Payload(lat, lng, weightKg, timestamp);
    const computed = await sha256(payload);
    return computed === storedHash;
}
