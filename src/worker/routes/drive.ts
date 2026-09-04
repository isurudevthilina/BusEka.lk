// src/worker/routes/drive.ts
// Driver position broadcasting:
// POST /api/drive/:token/start  → activates
// POST /api/drive/:token/ping   → upserts position
// POST /api/drive/:token/stop   → marks inactive

import { Hono } from 'hono';
import { PingSchema, apiErr } from '../lib/validate.js';

const drive = new Hono<{ Bindings: Env }>();

// Verify token and get vehicle
async function getVehicle(db: D1Database, token: string) {
  return db
    .prepare(`SELECT id, label, plate, route_no FROM group_vehicles WHERE drive_token=? AND active=1`)
    .bind(token).first<{ id: number; label: string; plate: string; route_no: string | null }>();
}

// ── POST /api/drive/:token/start ─────────────────────────────────────────────
drive.post('/api/drive/:token/start', async (c) => {
  const { token } = c.req.param();
  const v = await getVehicle(c.env.DB, token);
  if (!v) {
    const { error, status } = apiErr('BAD_TOKEN', 'Invalid or expired driver token.', undefined, 404);
    return c.json({ error }, status);
  }
  return c.json({ ok: true, vehicleId: v.id, label: v.label, plate: v.plate });
});

// ── POST /api/drive/:token/ping ──────────────────────────────────────────────
drive.post('/api/drive/:token/ping', async (c) => {
  const { token } = c.req.param();
  const v = await getVehicle(c.env.DB, token);
  if (!v) {
    const { error, status } = apiErr('BAD_TOKEN', 'Invalid or expired driver token.', undefined, 404);
    return c.json({ error }, status);
  }

  let body: unknown;
  try { body = await c.req.json(); } catch { return c.json(apiErr('BAD_JSON', 'Invalid JSON.'), 400); }

  const parsed = PingSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const { error, status } = apiErr('VALIDATION', issue.message, issue.path[0] as string);
    return c.json({ error }, status);
  }

  const { lat, lng, speedKmh, accuracyM } = parsed.data;

  // UPSERT — one row per vehicle, avoids D1 row limit
  await c.env.DB.prepare(`
    INSERT INTO positions (vehicle_id, lat, lng, speed_kmh, accuracy_m, ts)
    VALUES (?,?,?,?,?,?)
    ON CONFLICT(vehicle_id) DO UPDATE SET
      lat=excluded.lat, lng=excluded.lng,
      speed_kmh=excluded.speed_kmh, accuracy_m=excluded.accuracy_m,
      ts=excluded.ts
  `).bind(v.id, lat, lng, speedKmh ?? 0, accuracyM ?? null, Date.now()).run();

  return c.json({ ok: true, ts: Date.now() });
});

// ── POST /api/drive/:token/stop ──────────────────────────────────────────────
drive.post('/api/drive/:token/stop', async (c) => {
  const { token } = c.req.param();
  const v = await getVehicle(c.env.DB, token);
  if (!v) {
    const { error, status } = apiErr('BAD_TOKEN', 'Invalid or expired driver token.', undefined, 404);
    return c.json({ error }, status);
  }
  // Clear position — vehicle is no longer broadcasting
  await c.env.DB.prepare(`DELETE FROM positions WHERE vehicle_id=?`).bind(v.id).run();
  return c.json({ ok: true });
});

export { drive };
