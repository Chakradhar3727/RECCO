export function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRadian = (angle: number) => (Math.PI / 180) * angle;

  const R = 6371e3; // Earth radius in metres
  const radLat1 = toRadian(lat1);
  const radLat2 = toRadian(lat2);
  const deltaLat = toRadian(lat2 - lat1);
  const deltaLon = toRadian(lon2 - lon1);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(radLat1) * Math.cos(radLat2) *
    Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // inside meters
}
