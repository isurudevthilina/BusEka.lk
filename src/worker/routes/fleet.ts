import { Hono } from "hono";
import { fetchSprpta } from "../sources/sprpta";

type FleetPayload = { vehicles: Vehicle[]; total: number; live: number; ts: number };

const FRESH_MS = 12_000; // client polls every 6s; a 12s cache absorbs bursts
const CACHE_TTL_S = 60;

// Exported so ai/plan.ts (F4) can reuse the same cached snapshot instead of
// making its own upstream call — one fetch feeds both features.
export async function getFleetSnapshot(env: Env): Promise<FleetPayload & { stale: boolean }> {
  const cached = await env.CACHE.get<FleetPayload>("fleet", "json");

  if (cached && Date.now() - cached.ts < FRESH_MS) {
    return { ...cached, stale: false };
  }

  try {
    const vehicles = await fetchSprpta();
    const payload: FleetPayload = {
      vehicles,
      total: vehicles.length,
      live: vehicles.filter((v) => !v.stale).length,
      ts: Date.now(),
    };
    await env.CACHE.put("fleet", JSON.stringify(payload), { expirationTtl: CACHE_TTL_S });
    return { ...payload, stale: false };
  } catch {
    // Upstream is down. A degraded map beats a broken one — never a 500 here.
    if (cached) return { ...cached, stale: true };
    return { vehicles: [], total: 0, live: 0, ts: Date.now(), stale: true };
  }
}

export const fleet = new Hono<{ Bindings: Env }>();

fleet.get("/snapshot", async (c) => {
  const snapshot = await getFleetSnapshot(c.env);
  const vehicles = snapshot.vehicles.map((v) => ({ ...v, stale: snapshot.stale }));
  return c.json({ ...snapshot, vehicles });
});
