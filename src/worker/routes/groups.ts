/// <reference path="../../shared/vehicle.d.ts" />
import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import {
  addVehicleSchema,
  apiError,
  createGroupSchema,
  joinGroupSchema,
  rotateCodeSchema,
} from "../lib/validate";
import { newCode, newDriveToken } from "../lib/codes";
import { hashPin, newSalt } from "../lib/pin";

export const groups = new Hono<{ Bindings: Env }>();

type GroupRow = {
  id: number;
  code: string;
  name: string;
  kind: string;
  pin_hash: string;
  pin_salt: string;
};

async function findGroup(env: Env, code: string): Promise<GroupRow | null> {
  return env.DB.prepare("SELECT * FROM groups WHERE code = ?")
    .bind(code.toUpperCase())
    .first<GroupRow>();
}

async function checkPin(group: GroupRow, pin: string): Promise<boolean> {
  return (await hashPin(pin, group.pin_salt)) === group.pin_hash;
}

// POST /api/groups — create a group. Retries the code on a UNIQUE collision.
groups.post("/", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = createGroupSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return c.json(apiError("BAD_INPUT", issue.message, String(issue.path[0] ?? "")), 400);
  }
  const { name, kind, pin } = parsed.data;
  const salt = newSalt();
  const hash = await hashPin(pin, salt);

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newCode();
    try {
      await c.env.DB.prepare(
        "INSERT INTO groups (code, name, kind, pin_hash, pin_salt, created_at) VALUES (?,?,?,?,?,?)",
      )
        .bind(code, name, kind, hash, salt, Date.now())
        .run();
      return c.json({ code });
    } catch (err) {
      if (String(err).includes("UNIQUE")) continue;
      throw err;
    }
  }
  return c.json(apiError("SERVER_BUSY", "Couldn't create a group right now. Try again."), 500);
});

// GET /api/groups/:code — public metadata only, never the pin hash.
groups.get("/:code", async (c) => {
  const group = await findGroup(c.env, c.req.param("code"));
  if (!group) {
    return c.json(apiError("BAD_CODE", "No group with that code. Check with whoever shared it.", "code"), 404);
  }
  const vehicleCount = await c.env.DB.prepare(
    "SELECT COUNT(*) AS n FROM group_vehicles WHERE group_id = ? AND active = 1",
  )
    .bind(group.id)
    .first<{ n: number }>();
  return c.json({ code: group.code, name: group.name, kind: group.kind, vehicles: vehicleCount?.n ?? 0 });
});

// POST /api/groups/:code/join — rate limit BEFORE anything else touches the group.
groups.post("/:code/join", async (c) => {
  const ip = c.req.header("cf-connecting-ip") ?? "unknown";
  const now = Date.now();

  await c.env.DB.prepare("DELETE FROM join_attempts WHERE ts < ?").bind(now - 60_000).run();
  const attempts = await c.env.DB.prepare(
    "SELECT COUNT(*) AS n FROM join_attempts WHERE ip = ? AND ts > ?",
  )
    .bind(ip, now - 60_000)
    .first<{ n: number }>();
  if ((attempts?.n ?? 0) >= 5) {
    return c.json(apiError("RATE_LIMITED", "Too many tries. Wait a minute and try again."), 429);
  }
  await c.env.DB.prepare("INSERT INTO join_attempts (ip, ts) VALUES (?, ?)").bind(ip, now).run();

  const body = await c.req.json().catch(() => null);
  const parsed = joinGroupSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const message =
      issue.path[0] === "code" && typeof body?.code === "string"
        ? issue.message.replace("{n}", String(body.code.trim().length))
        : issue.message;
    return c.json(apiError("BAD_INPUT", message, String(issue.path[0] ?? "")), 400);
  }

  const group = await findGroup(c.env, parsed.data.code);
  if (!group) {
    return c.json(apiError("BAD_CODE", "No group with that code. Check with whoever shared it.", "code"), 404);
  }

  let deviceId = getCookie(c, "bk_member");
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    setCookie(c, "bk_member", deviceId, {
      httpOnly: true,
      sameSite: "Lax",
      secure: true,
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  await c.env.DB.prepare(
    "INSERT INTO group_members (group_id, device_id, display_name, joined_at) VALUES (?,?,?,?)",
  )
    .bind(group.id, deviceId, parsed.data.name, Date.now())
    .run();

  return c.json({ code: group.code, name: group.name });
});

// POST /api/groups/:code/vehicles — owner action, PIN required every time
// (no session token — a wrong PIN just fails, nothing to steal).
groups.post("/:code/vehicles", async (c) => {
  const group = await findGroup(c.env, c.req.param("code"));
  if (!group) {
    return c.json(apiError("BAD_CODE", "No group with that code. Check with whoever shared it.", "code"), 404);
  }
  const body = await c.req.json().catch(() => null);
  const parsed = addVehicleSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return c.json(apiError("BAD_INPUT", issue.message, String(issue.path[0] ?? "")), 400);
  }
  if (!(await checkPin(group, parsed.data.pin))) {
    return c.json(apiError("BAD_PIN", "That PIN is incorrect.", "pin"), 403);
  }

  const driveToken = newDriveToken();
  await c.env.DB.prepare(
    "INSERT INTO group_vehicles (group_id, plate, label, route_no, drive_token, active) VALUES (?,?,?,?,?,1)",
  )
    .bind(group.id, parsed.data.plate, parsed.data.label, parsed.data.routeNo ?? null, driveToken)
    .run();

  const url = new URL(c.req.url);
  const driveUrl = `${url.protocol}//${url.host}/drive/${driveToken}`;
  return c.json({ driveToken, driveUrl });
});

// POST /api/groups/:code/rotate — new code, old code dies immediately.
groups.post("/:code/rotate", async (c) => {
  const group = await findGroup(c.env, c.req.param("code"));
  if (!group) {
    return c.json(apiError("BAD_CODE", "No group with that code. Check with whoever shared it.", "code"), 404);
  }
  const body = await c.req.json().catch(() => null);
  const parsed = rotateCodeSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(apiError("BAD_INPUT", "PIN must be 4 digits.", "pin"), 400);
  }
  if (!(await checkPin(group, parsed.data.pin))) {
    return c.json(apiError("BAD_PIN", "That PIN is incorrect.", "pin"), 403);
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newCode();
    try {
      await c.env.DB.prepare("UPDATE groups SET code = ? WHERE id = ?").bind(code, group.id).run();
      return c.json({ code });
    } catch (err) {
      if (String(err).includes("UNIQUE")) continue;
      throw err;
    }
  }
  return c.json(apiError("SERVER_BUSY", "Couldn't rotate the code right now. Try again."), 500);
});

// GET /api/groups/:code/live — the 2-hour stand-in for DESIGN.md's
// GET /api/groups/:code/stream. Same shape either way, so the Durable Object
// upgrade later only changes how the client learns of updates, not the data.
groups.get("/:code/live", async (c) => {
  const group = await findGroup(c.env, c.req.param("code"));
  if (!group) {
    return c.json(apiError("BAD_CODE", "No group with that code. Check with whoever shared it.", "code"), 404);
  }

  const { results } = await c.env.DB.prepare(
    `SELECT gv.id, gv.plate, gv.label, gv.route_no, p.lat, p.lng, p.speed_kmh, p.ts
     FROM group_vehicles gv
     LEFT JOIN positions p ON p.vehicle_id = gv.id
     WHERE gv.group_id = ? AND gv.active = 1`,
  )
    .bind(group.id)
    .all<{
      id: number;
      plate: string;
      label: string;
      route_no: string | null;
      lat: number | null;
      lng: number | null;
      speed_kmh: number | null;
      ts: number | null;
    }>();

  const now = Date.now();
  const vehicles: Vehicle[] = (results ?? [])
    .filter((r) => r.lat != null && r.lng != null && r.ts != null)
    .map((r) => ({
      id: `group:${r.id}`,
      source: "group",
      label: r.label,
      routeNo: r.route_no ?? undefined,
      lat: r.lat as number,
      lng: r.lng as number,
      speedKmh: r.speed_kmh ?? 0,
      ts: r.ts as number,
      stale: now - (r.ts as number) > 120_000,
    }));

  // Approximate "N watching" — everyone who has ever joined, not concurrent
  // viewers. A poll-based free-tier app has no cheaper accurate signal.
  const members = await c.env.DB.prepare("SELECT COUNT(*) AS n FROM group_members WHERE group_id = ?")
    .bind(group.id)
    .first<{ n: number }>();

  return c.json({ name: group.name, kind: group.kind, vehicles, watching: members?.n ?? 0 });
});
