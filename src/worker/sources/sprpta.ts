// src/worker/sources/sprpta.ts
// Fetches live bus positions from the SPRPTA/spgps.lk public API
// and normalises them to the shared Vehicle type.

const SPRPTA_URL =
  'https://api.spgps.lk/api/public/bus-live-locations-for-map';

const STALE_MS = 120_000; // 2 minutes

interface SprptaBus {
  imei?: string;
  lat?: number;
  lon?: number;
  isOnline?: boolean;
  routePermitBus?: {
    busNumber?: string;
    routePermit?: {
      route?: {
        routeNumber?: string;
      };
    };
  };
}

export async function fetchSprpta(): Promise<Vehicle[]> {
  const res = await fetch(SPRPTA_URL, {
    headers: { 'Accept': 'application/json' },
    cf: { cacheTtl: 10 },
  });
  if (!res.ok) throw new Error(`SPRPTA ${res.status}`);
  const data: SprptaBus[] = await res.json();
  const now = Date.now();

  return data
    .filter((b) => b.isOnline !== false && b.lat && b.lon && b.imei)
    .map((b): Vehicle => ({
      id: `sprpta:${b.imei}`,
      source: 'sprpta',
      label: b.routePermitBus?.busNumber ?? 'Unknown',
      routeNo: b.routePermitBus?.routePermit?.route?.routeNumber,
      lat: b.lat!,
      lng: b.lon!,
      speedKmh: 0,
      ts: now,
      stale: false,
    }));
}
