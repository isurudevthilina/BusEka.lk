/// <reference path="../../shared/vehicle.d.ts" />
const UPSTREAM_URL = "https://api.spgps.lk/api/public/bus-live-locations-for-map";

// Upstream's own shape is undocumented and every field below has been seen
// null in practice — walk it defensively the whole way down.
type SprptaBus = {
  imei?: string | number;
  lat?: number | null;
  lon?: number | null;
  isOnline?: boolean;
  routePermitBus?: {
    busNumber?: string;
    routePermit?: { route?: { routeNumber?: string } };
  };
};

export function normaliseSprpta(raw: unknown): Vehicle[] {
  if (!Array.isArray(raw)) return [];
  const now = Date.now();
  const vehicles: Vehicle[] = [];
  for (const busUnknown of raw as SprptaBus[]) {
    const bus = busUnknown;
    if (bus.isOnline === false) continue;
    if (typeof bus.lat !== "number" || typeof bus.lon !== "number") continue;
    if (!bus.imei) continue;
    vehicles.push({
      id: `sprpta:${bus.imei}`,
      source: "sprpta",
      label: bus.routePermitBus?.busNumber ?? "Unknown",
      routeNo: bus.routePermitBus?.routePermit?.route?.routeNumber,
      lat: bus.lat,
      lng: bus.lon, // upstream calls it "lon", our Vehicle type calls it "lng"
      speedKmh: 0,
      ts: now,
      stale: false,
    });
  }
  return vehicles;
}

export async function fetchSprpta(): Promise<Vehicle[]> {
  const res = await fetch(UPSTREAM_URL, { 
    headers: { 
      accept: "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    } 
  });
  if (!res.ok) throw new Error(`sprpta upstream ${res.status}`);
  const data = await res.json();
  return normaliseSprpta(data);
}
