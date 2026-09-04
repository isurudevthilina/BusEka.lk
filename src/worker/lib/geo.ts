// Straight-line distance. Under-estimates road distance by roughly 20-30%,
// which is an honest, stated approximation rather than a hidden one (DESIGN.md §4 F4).
export function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function nearestStop<T extends { lat: number; lng: number }>(
  lat: number,
  lng: number,
  stops: T[],
): T | null {
  let best: T | null = null;
  let bestKm = Infinity;
  for (const s of stops) {
    const km = haversineKm(lat, lng, s.lat, s.lng);
    if (km < bestKm) {
      bestKm = km;
      best = s;
    }
  }
  return best;
}
