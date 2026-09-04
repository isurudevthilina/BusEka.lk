import { haversineKm } from "./geo";

// DESIGN.md §4 F4, verbatim. The LLM never computes a number — this is the
// only place an ETA is calculated, in plain TypeScript.
export function etaMinutes(
  busLat: number,
  busLng: number,
  busSpeedKmh: number,
  stopLat: number,
  stopLng: number,
): number {
  const km = haversineKm(busLat, busLng, stopLat, stopLng);
  // A bus at 0 km/h is at a stop or in traffic — it is not stopped forever.
  // 25 km/h is the observed urban average and matches what LMT-GO's own app assumes.
  const effectiveKmh = busSpeedKmh > 2 ? busSpeedKmh : 25;
  return (km / effectiveKmh) * 60;
}

export function formatEta(min: number): string {
  if (min <= 1) return "Arriving";
  if (min <= 10) return `${Math.round(min)} min`;
  return new Date(Date.now() + min * 60_000).toLocaleTimeString("en-LK", {
    hour: "numeric",
    minute: "2-digit",
  });
}
