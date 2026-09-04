import { Hono } from "hono";
import { apiError, drivePingSchema } from "../lib/validate";

export const drive = new Hono<{ Bindings: Env }>();

type VehicleRow = { id: number; plate: string; label: string; route_no: string | null; group_id: number };

async function findVehicle(env: Env, token: string): Promise<VehicleRow | null> {
  return env.DB.prepare("SELECT id, plate, label, route_no, group_id FROM group_vehicles WHERE drive_token = ?")
    .bind(token)
    .first<VehicleRow>();
}

// GET /api/drive/:token — lets Drive.tsx render the vehicle's own identity
// on load, without exposing anything about the rest of the group.
drive.get("/:token", async (c) => {
  const vehicle = await findVehicle(c.env, c.req.param("token"));
  if (!vehicle) {
    return c.json(apiError("BAD_TOKEN", "This driver link isn't valid. Ask the group owner for a new one."), 404);
  }
  const group = await c.env.DB.prepare("SELECT name FROM groups WHERE id = ?")
    .bind(vehicle.group_id)
    .first<{ name: string }>();
  const members = await c.env.DB.prepare("SELECT COUNT(*) AS n FROM group_members WHERE group_id = ?")
    .bind(vehicle.group_id)
    .first<{ n: number }>();
  return c.json({
    plate: vehicle.plate,
    label: vehicle.label,
    routeNo: vehicle.route_no,
    groupName: group?.name,
    watching: members?.n ?? 0,
  });
});

drive.post("/:token/start", async (c) => {
  const vehicle = await findVehicle(c.env, c.req.param("token"));
  if (!vehicle) {
    return c.json(apiError("BAD_TOKEN", "This driver link isn't valid. Ask the group owner for a new one."), 404);
  }
  const result = await c.env.DB.prepare(
    "INSERT INTO drive_sessions (vehicle_id, started_at, ping_count) VALUES (?,?,0)",
  )
    .bind(vehicle.id, Date.now())
    .run();
  return c.json({ sessionId: result.meta.last_row_id });
});

// Upsert, never append — one row per vehicle (DESIGN.md §8.1, D1 free-tier
// row-write caps enforced since 1 Sep 2026).
drive.post("/:token/ping", async (c) => {
  const vehicle = await findVehicle(c.env, c.req.param("token"));
  if (!vehicle) {
    return c.json(apiError("BAD_TOKEN", "This driver link isn't valid. Ask the group owner for a new one."), 404);
  }
  const body = await c.req.json().catch(() => null);
  const parsed = drivePingSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(apiError("BAD_INPUT", "That position update looked malformed."), 400);
  }
  const { lat, lng, speed, accuracy } = parsed.data;

  await c.env.DB.prepare(
    `INSERT INTO positions (vehicle_id, lat, lng, speed_kmh, accuracy_m, ts)
     VALUES (?,?,?,?,?,?)
     ON CONFLICT(vehicle_id) DO UPDATE SET
       lat=excluded.lat, lng=excluded.lng, speed_kmh=excluded.speed_kmh,
       accuracy_m=excluded.accuracy_m, ts=excluded.ts`,
  )
    .bind(vehicle.id, lat, lng, speed, accuracy ?? null, Date.now())
    .run();

  await c.env.DB.prepare(
    `UPDATE drive_sessions SET ping_count = ping_count + 1
     WHERE id = (
       SELECT id FROM drive_sessions
       WHERE vehicle_id = ? AND ended_at IS NULL
       ORDER BY started_at DESC LIMIT 1
     )`,
  )
    .bind(vehicle.id)
    .run();

  return c.json({ ok: true });
});

drive.post("/:token/stop", async (c) => {
  const vehicle = await findVehicle(c.env, c.req.param("token"));
  if (!vehicle) {
    return c.json(apiError("BAD_TOKEN", "This driver link isn't valid. Ask the group owner for a new one."), 404);
  }
  await c.env.DB.prepare(
    `UPDATE drive_sessions SET ended_at = ?
     WHERE vehicle_id = ? AND ended_at IS NULL`,
  )
    .bind(Date.now(), vehicle.id)
    .run();
  return c.json({ ok: true });
});
