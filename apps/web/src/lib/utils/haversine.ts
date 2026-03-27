/**
 * Haversine Distance Calculation (FIX 5)
 * Computes the distance in metres between two GPS coordinates on Earth.
 * Used for GPS_MISMATCH fraud detection in Collection Form Step 3.
 */

const EARTH_RADIUS_M = 6_371_000; // Mean Earth radius in metres

/**
 * Calculate the distance between two lat/lng pairs in metres.
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_M * c;
}
