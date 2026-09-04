// src/worker/routes/fleet.ts
// GET /api/fleet/snapshot → { vehicles, live, total, ts, stale }
// KV-cached at 12s. On upstream failure returns last stale cache.

import { Hono } from 'hono';
import { fetchSprpta } from '../sources/sprpta.js';

const fleet = new Hono<{ Bindings: Env }>();

const CACHE_KEY = 'fleet';
const CACHE_TTL_MS = 12_000;

fleet.get('/api/fleet/snapshot', async (c) => {
  // 1. Try KV cache first
  const cached = await c.env.CACHE.get<FleetSnapshot>(CACHE_KEY, 'json');
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return c.json(cached);
  }

  // 2. Fetch fresh data
  let vehicles: Vehicle[];
  let stale = false;

  try {
    vehicles = await fetchSprpta();
  } catch (_e) {
    // Degrade to stale cache
    if (cached) {
      return c.json({ ...cached, stale: true });
    }
    // No cache at all — return empty with stale flag
    return c.json({
      vehicles: [],
      live: 0,
      total: 0,
      ts: Date.now(),
      stale: true,
    });
  }

  const payload: FleetSnapshot = {
    vehicles,
    live: vehicles.filter((v) => !v.stale).length,
    total: vehicles.length,
    ts: Date.now(),
    stale: false,
  };

  // 3. Store in KV (60s server TTL, client re-fetches at 12s)
  await c.env.CACHE.put(CACHE_KEY, JSON.stringify(payload), {
    expirationTtl: 60,
  });

  return c.json(payload);
});

export { fleet };
