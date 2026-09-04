import { Hono } from "hono";
import { fleet } from "./routes/fleet";
import { groups } from "./routes/groups";
import { drive } from "./routes/drive";
import { trains } from "./routes/trains";
import { ai } from "./routes/ai";
import { stops } from "./routes/stops";

const app = new Hono<{ Bindings: Env }>();

app.get("/api/health", (c) =>
  c.json({
    ok: true,
    upstreams: { sprpta: "polled", lmt: "not configured", wialon: "not configured" },
    ts: Date.now(),
  }),
);

app.route("/api/fleet", fleet);
app.route("/api/groups", groups);
app.route("/api/drive", drive);
app.route("/api/trains", trains);
app.route("/api/ai", ai);
app.route("/api/stops", stops);

app.notFound((c) => c.json({ error: { code: "NOT_FOUND", message: "That endpoint doesn't exist." } }, 404));

// Every failing endpoint returns the same shape (CLAUDE.md §1 rule 3) — never a bare 500.
app.onError((err, c) => {
  console.error(err);
  return c.json(
    { error: { code: "SERVER_ERROR", message: "Something went wrong on our end. Try again in a moment." } },
    500,
  );
});

export default app;
