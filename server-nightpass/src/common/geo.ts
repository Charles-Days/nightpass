/**
 * Great-circle distance between two lat/lng pairs, in meters.
 *
 * Uses the Haversine formula on a spherical Earth model (radius 6 371 km).
 * Accurate to ~0.5 % for distances of interest here (street to neighborhood),
 * which is plenty for geofencing venues with ~100 m radius. No PostGIS needed.
 */
export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
