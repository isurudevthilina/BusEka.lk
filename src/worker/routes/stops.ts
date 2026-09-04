import { Hono } from "hono";
import { getStops } from "../ai/places";

// Small helper endpoint (not in DESIGN.md §8.2's list, additive) — the
// frontend needs the seeded stop list for the train-report station picker.
export const stops = new Hono<{ Bindings: Env }>();

stops.get("/", async (c) => {
  const list = await getStops(c.env);
  return c.json({ stops: list.map((s) => ({ id: s.id, nameEn: s.name_en, nameSi: s.name_si })) });
});
