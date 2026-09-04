import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { apiError, reportTrainSchema } from "../lib/validate";

// DESIGN.md §5.3 / §0.1: Sri Lanka Railways has no public live-GPS feed, and
// neither does RDMNS or rdmns.lk. This board is honestly what it is —
// passenger "I'm at this station" reports, not tracking.
export const trains = new Hono<{ Bindings: Env }>();

type BoardRow = {
  id: number;
  train_no: string;
  name: string;
  origin: string;
  destination: string;
  stop_name_en: string | null;
  stop_name_si: string | null;
  reported_at: number | null;
  confidence: number | null;
};

trains.get("/", async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT t.id, t.train_no, t.name, t.origin, t.destination,
            s.name_en AS stop_name_en, s.name_si AS stop_name_si,
            r.reported_at, r.confidence
     FROM trains t
     LEFT JOIN train_reports r ON r.id = (
       SELECT id FROM train_reports WHERE train_id = t.id ORDER BY reported_at DESC LIMIT 1
     )
     LEFT JOIN stops s ON s.id = r.stop_id
     ORDER BY t.train_no`,
  ).all<BoardRow>();

  const now = Date.now();
  const board = (results ?? []).map((row: BoardRow) => ({
    id: row.id,
    trainNo: row.train_no,
    name: row.name,
    origin: row.origin,
    destination: row.destination,
    lastReport:
      row.reported_at != null
        ? {
            stopNameEn: row.stop_name_en,
            stopNameSi: row.stop_name_si,
            minutesAgo: Math.max(0, Math.round((now - row.reported_at) / 60_000)),
            confidence: row.confidence,
          }
        : null,
  }));

  return c.json({
    trains: board,
    note: "Sri Lanka Railways doesn't publish live train positions, so we're building this from passenger reports instead of GPS tracking.",
  });
});

// POST /api/trains/:id/report — a passenger says "I'm on this train, at this station".
trains.post("/:id/report", async (c) => {
  const trainId = Number(c.req.param("id"));
  const body = await c.req.json().catch(() => null);
  const parsed = reportTrainSchema.safeParse({ ...body, trainId });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    if (issue.path[0] === "stopId") {
      return c.json(apiError("BAD_INPUT", "Pick a station first.", "stopId"), 400);
    }
    return c.json(apiError("BAD_INPUT", issue.message), 400);
  }

  const deviceId = getCookie(c, "bk_member") ?? c.req.header("cf-connecting-ip") ?? "anon";
  const recent = await c.env.DB.prepare(
    "SELECT id FROM train_reports WHERE train_id = ? AND device_id = ? AND reported_at > ?",
  )
    .bind(trainId, deviceId, Date.now() - 120_000)
    .first();
  if (recent) {
    return c.json(apiError("DUPLICATE", "You already reported this train 2 minutes ago."), 429);
  }

  await c.env.DB.prepare(
    "INSERT INTO train_reports (train_id, stop_id, device_id, reported_at, confidence) VALUES (?,?,?,?,1)",
  )
    .bind(trainId, parsed.data.stopId, deviceId, Date.now())
    .run();

  return c.json({ ok: true });
});
