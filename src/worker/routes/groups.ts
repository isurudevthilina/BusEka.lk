// src/worker/routes/groups.ts
// Group management: create / join / vehicles / live polling

import { Hono } from 'hono';
import { z } from 'zod';
import { CreateGroupSchema, AddVehicleSchema, CodeSchema, PinSchema, apiErr } from '../lib/validate.js';
import { generateCode, generateToken } from '../lib/codes.js';
import { hashPin, generateSalt, verifyPin } from '../lib/pin.js';
import { etaMinutes } from '../lib/eta.js';

const groups = new Hono<{ Bindings: Env }>();

// ── POST /api/groups ─────────────────────────────────────────────────────────
groups.post('/api/groups', async (c) => {
  let body: unknown;
  try { body = await c.req.json(); } catch { return c.json(apiErr('BAD_JSON', 'Invalid JSON.'), 400); }

  const parsed = CreateGroupSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const { error, status } = apiErr('VALIDATION', issue.message, issue.path[0] as string);
    return c.json({ error }, status);
  }
  const { name, kind, pin } = parsed.data;

  const code = generateCode();
  const salt = generateSalt();
  const pin_hash = await hashPin(pin, salt);

  await c.env.DB.prepare(
    `INSERT INTO groups (code, name, kind, pin_hash, pin_salt, created_at) VALUES (?,?,?,?,?,?)`
  ).bind(code, name, kind, pin_hash, salt, Date.now()).run();

  const row = await c.env.DB.prepare(`SELECT id FROM groups WHERE code=?`).bind(code).first<{ id: number }>();
  return c.json({ code, name, id: row?.id }, 201);
});

// ── POST /api/groups/:code/join ──────────────────────────────────────────────
groups.post('/api/groups/:code/join', async (c) => {
  const ip = c.req.header('CF-Connecting-IP') ?? '0.0.0.0';
  const oneMinAgo = Date.now() - 60_000;

  // Rate limit: 5 attempts per minute
  const attempts = await c.env.DB
    .prepare(`SELECT COUNT(*) as n FROM join_attempts WHERE ip=? AND ts>?`)
    .bind(ip, oneMinAgo).first<{ n: number }>();
  if ((attempts?.n ?? 0) >= 5) {
    const { error, status } = apiErr('RATE_LIMITED', 'Too many tries. Wait a minute and try again.');
    return c.json({ error }, status);
  }
  await c.env.DB.prepare(`INSERT INTO join_attempts(ip,ts) VALUES(?,?)`).bind(ip, Date.now()).run();

  const { code } = c.req.param();
  const parsedCode = CodeSchema.safeParse(code.toUpperCase());
  if (!parsedCode.success) {
    const { error, status } = apiErr('BAD_CODE', parsedCode.error.issues[0].message, 'code');
    return c.json({ error }, status);
  }

  const group = await c.env.DB
    .prepare(`SELECT id, name, kind FROM groups WHERE code=?`)
    .bind(parsedCode.data).first<{ id: number; name: string; kind: string }>();

  if (!group) {
    const { error, status } = apiErr('NO_GROUP', 'No group with that code. Check with whoever shared it.', 'code');
    return c.json({ error }, status);
  }

  return c.json({ groupId: group.id, name: group.name, kind: group.kind, code: parsedCode.data });
});

// ── GET /api/groups/:code/vehicles ──────────────────────────────────────────
groups.get('/api/groups/:code/vehicles', async (c) => {
  const { code } = c.req.param();
  const group = await c.env.DB
    .prepare(`SELECT id FROM groups WHERE code=?`)
    .bind(code.toUpperCase()).first<{ id: number }>();
  if (!group) return c.json({ error: { code: 'NO_GROUP', message: 'Not found.' } }, 404);

  const rows = await c.env.DB
    .prepare(`SELECT gv.id, gv.plate, gv.label, gv.route_no,
               p.lat, p.lng, p.speed_kmh, p.ts
              FROM group_vehicles gv
              LEFT JOIN positions p ON p.vehicle_id=gv.id
              WHERE gv.group_id=? AND gv.active=1`)
    .bind(group.id).all<{
      id: number; plate: string; label: string; route_no: string | null;
      lat: number | null; lng: number | null; speed_kmh: number | null; ts: number | null;
    }>();

  const now = Date.now();
  const vehicles = (rows.results ?? []).map((r) => ({
    id: `group:${r.id}`,
    source: 'group' as const,
    label: r.plate,
    routeNo: r.route_no ?? undefined,
    lat: r.lat ?? 0,
    lng: r.lng ?? 0,
    speedKmh: r.speed_kmh ?? 0,
    ts: r.ts ?? 0,
    stale: !r.ts || now - r.ts > 120_000,
    displayLabel: r.label,
  }));

  return c.json({ vehicles });
});

// ── GET /api/groups/:code/live ───────────────────────────────────────────────
groups.get('/api/groups/:code/live', async (c) => {
  // Same as vehicles but also includes ETA to a stop if lat/lng provided
  const { code } = c.req.param();
  const stopLat = parseFloat(c.req.query('lat') ?? '0');
  const stopLng = parseFloat(c.req.query('lng') ?? '0');

  const group = await c.env.DB
    .prepare(`SELECT id, name FROM groups WHERE code=?`)
    .bind(code.toUpperCase()).first<{ id: number; name: string }>();
  if (!group) return c.json({ error: { code: 'NO_GROUP', message: 'Not found.' } }, 404);

  const rows = await c.env.DB
    .prepare(`SELECT gv.id, gv.plate, gv.label, gv.route_no,
               p.lat, p.lng, p.speed_kmh, p.ts
              FROM group_vehicles gv
              LEFT JOIN positions p ON p.vehicle_id=gv.id
              WHERE gv.group_id=? AND gv.active=1`)
    .bind(group.id).all<{
      id: number; plate: string; label: string; route_no: string | null;
      lat: number | null; lng: number | null; speed_kmh: number | null; ts: number | null;
    }>();

  const now = Date.now();
  const vehicles = (rows.results ?? []).map((r) => {
    const stale = !r.ts || now - r.ts > 120_000;
    const etaMins = (r.lat && r.lng && stopLat && stopLng && !stale)
      ? etaMinutes(r.lat, r.lng, r.speed_kmh ?? 0, stopLat, stopLng)
      : null;
    return {
      id: `group:${r.id}`,
      source: 'group' as const,
      label: r.plate,
      displayLabel: r.label,
      routeNo: r.route_no ?? undefined,
      lat: r.lat ?? 0,
      lng: r.lng ?? 0,
      speedKmh: r.speed_kmh ?? 0,
      ts: r.ts ?? 0,
      stale,
      etaMins,
    };
  });

  return c.json({ name: group.name, vehicles, ts: now });
});

// ── POST /api/groups/:code/vehicles ─────────────────────────────────────────
groups.post('/api/groups/:code/vehicles', async (c) => {
  const { code } = c.req.param();
  let body: unknown;
  try { body = await c.req.json(); } catch { return c.json(apiErr('BAD_JSON', 'Invalid JSON.'), 400); }

  const parsed = AddVehicleSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const { error, status } = apiErr('VALIDATION', issue.message, issue.path[0] as string);
    return c.json({ error }, status);
  }

  const group = await c.env.DB
    .prepare(`SELECT id FROM groups WHERE code=?`)
    .bind(code.toUpperCase()).first<{ id: number }>();
  if (!group) return c.json({ error: { code: 'NO_GROUP', message: 'Not found.' } }, 404);

  const token = generateToken();
  const { plate, label, routeNo } = parsed.data;

  await c.env.DB.prepare(
    `INSERT INTO group_vehicles (group_id, plate, label, route_no, drive_token) VALUES (?,?,?,?,?)`
  ).bind(group.id, plate, label, routeNo ?? null, token).run();

  return c.json({ token, driveUrl: `/drive/${token}` }, 201);
});

export { groups };
