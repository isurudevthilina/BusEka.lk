// src/worker/lib/geo.ts

export function haversineKm(
  aLat: number, aLng: number,
  bLat: number, bLng: number
): number {
  const R = 6371;
  const toRad = (d: number) => d * Math.PI / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export type Stop = {
  id: number;
  name_en: string;
  name_si?: string;
  lat: number;
  lng: number;
};

export function nearestStop(stops: Stop[], lat: number, lng: number): Stop & { distKm: number } {
  let best = stops[0];
  let bestDist = haversineKm(lat, lng, best.lat, best.lng);
  for (const s of stops.slice(1)) {
    const d = haversineKm(lat, lng, s.lat, s.lng);
    if (d < bestDist) { best = s; bestDist = d; }
  }
  return { ...best, distKm: bestDist };
}
