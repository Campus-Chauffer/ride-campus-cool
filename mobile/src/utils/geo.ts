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
