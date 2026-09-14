// Compass bearing (0-360, 0 = north) from one coordinate to another. Used to
// derive the driver car icon's rotation when the driver's own reported
// heading isn't available — e.g. the passenger's DB-polling fallback for
// driver location, which (unlike the socket location events) only carries
// lat/lng, not heading.
export function getBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;
  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);
  const brng = toDeg(Math.atan2(y, x));
  return (brng + 360) % 360;
}

// Great-circle distance in meters between two coordinates (haversine).
export function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

type LatLng = { latitude: number; longitude: number };

// Finds the closest point to `point` lying on any segment of `route`,
// projecting into a local flat-plane approximation (1° lat ≈ 111,320m;
// 1° lng scaled by cos(latitude)) — well within GPS accuracy at the
// city-block distances involved, and far cheaper than true spherical math.
function nearestPointOnRoute(point: LatLng, route: LatLng[]): { point: LatLng; distanceMeters: number } | null {
  if (route.length < 2) return null;
  const cosLat = Math.cos((point.latitude * Math.PI) / 180);
  const toXY = (p: LatLng) => ({ x: p.longitude * 111320 * cosLat, y: p.latitude * 111320 });
  const p = toXY(point);

  let best: LatLng | null = null;
  let bestDist = Infinity;
  for (let i = 0; i < route.length - 1; i++) {
    const a = toXY(route[i]);
    const b = toXY(route[i + 1]);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lenSq = dx * dx + dy * dy;
    let t = lenSq === 0 ? 0 : ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const projX = a.x + t * dx;
    const projY = a.y + t * dy;
    const dist = Math.hypot(p.x - projX, p.y - projY);
    if (dist < bestDist) {
      bestDist = dist;
      best = { latitude: projY / 111320, longitude: projX / (111320 * cosLat) };
    }
  }
  return best ? { point: best, distanceMeters: bestDist } : null;
}

// Snaps a raw GPS point onto the already-drawn route polyline so the car
// marker rides exactly along the street line instead of floating off it
// between pings — the same map-matching effect Yango/Uber-tier apps use,
// done here as pure client-side geometry against a polyline we already
// fetched, with no extra API calls or cost. Falls back to the raw point
// untouched when there's no route yet, or the point is genuinely far from
// it (a real detour, or a stale route mid-refetch) rather than snapping
// somewhere the driver isn't.
export function snapToRoute(point: LatLng, route: LatLng[], maxSnapDistanceMeters: number = 40): LatLng {
  const nearest = nearestPointOnRoute(point, route);
  if (!nearest || nearest.distanceMeters > maxSnapDistanceMeters) return point;
  return nearest.point;
}

const ROUTE_REFRESH_INTERVAL_MS = 8000;
const ROUTE_REFRESH_DISTANCE_M = 30;

// Whether enough time or distance has passed to justify another Directions
// API call. Location updates now arrive far more often (a continuous GPS
// stream, not a 4s poll) than a paid route recalculation should — without
// this, switching to watchPositionAsync would multiply Directions API
// costs by however much more often GPS pings arrive.
export function shouldRefreshRoute(
  lastFetchAt: number | null,
  lastOrigin: LatLng | null,
  currentOrigin: LatLng,
  now: number = Date.now()
): boolean {
  if (lastFetchAt === null || lastOrigin === null) return true;
  if (now - lastFetchAt >= ROUTE_REFRESH_INTERVAL_MS) return true;
  return haversineMeters(lastOrigin.latitude, lastOrigin.longitude, currentOrigin.latitude, currentOrigin.longitude) >= ROUTE_REFRESH_DISTANCE_M;
}
