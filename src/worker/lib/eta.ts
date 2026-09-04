// src/worker/lib/eta.ts

import { haversineKm } from './geo.js';

/**
 * Estimate ETA in minutes from a vehicle to a destination point.
 * Uses current speed; falls back to a 30 km/h urban assumption.
 */
export function etaMinutes(
  vLat: number, vLng: number, speedKmh: number,
  dLat: number, dLng: number
): number {
  const distKm = haversineKm(vLat, vLng, dLat, dLng);
  const speed = speedKmh > 5 ? speedKmh : 30; // urban fallback
  return Math.round((distKm / speed) * 60);
}
