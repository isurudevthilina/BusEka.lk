import { Hono } from "hono";
import { apiError, aiPlanSchema } from "../lib/validate";
import { getStops } from "../ai/places";
import { parseIntent, type Lang } from "../ai/intent";
import { getDigest } from "../ai/digest";
import { getFleetSnapshot } from "./fleet";
import { haversineKm } from "../lib/geo";
import { etaMinutes, formatEta } from "../lib/eta";

export const ai = new Hono<{ Bindings: Env }>();

const NEARBY_KM = 3;

function withTimeout<T>(p: Promise<T>, ms = 6000): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

function templatedNarration(lang: Lang, opts: {
  fromName: string;
  toName: string;
  vehicleLabel: string;
  vehicleRoute?: string;
  etaText: string;
  journeyKm: number;
}): string {
  const route = opts.vehicleRoute ? ` on route ${opts.vehicleRoute}` : "";
  if (lang === "si") {
    return `${opts.fromName} අසල ${opts.vehicleLabel}${route} බස් රථය ${opts.etaText} වේලාවෙන් පැමිණේ. ${opts.toName} දක්වා දුර කිලෝමීටර් ${opts.journeyKm.toFixed(1)}ක් පමණ වේ.`;
  }
  return `Bus ${opts.vehicleLabel}${route} is near ${opts.fromName} and should reach you around ${opts.etaText}. It's about ${opts.journeyKm.toFixed(1)} km on to ${opts.toName}.`;
}

ai.post("/plan", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = aiPlanSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(apiError("BAD_INPUT", parsed.error.issues[0].message, "question"), 400);
  }

  // Stage 1 — the seeded stop list (no Vectorize, DESIGN.md §6.3).
  const stops = await getStops(c.env);

  // Stage 2 — model parses the question into stop ids. Never a coordinate, never a number.
  const intent = await parseIntent(c.env, parsed.data.question, stops);
  const fromStop = stops.find((s) => s.id === intent.fromId);
  const toStop = stops.find((s) => s.id === intent.toId);

  if (!fromStop || !toStop) {
    return c.json({
      lang: intent.lang,
      narration: "I couldn't work that one out. Try naming two places, like 'Fort to Kadawatha'.",
      legs: [],
      found: false,
    });
  }

  // Stage 3 — deterministic TypeScript. No model touches a number from here on.
  const snapshot = await getFleetSnapshot(c.env);
  const nearby = snapshot.vehicles
    .map((v) => ({ v, km: haversineKm(v.lat, v.lng, fromStop.lat, fromStop.lng) }))
    .filter((x) => x.km <= NEARBY_KM)
    .sort((a, b) => a.km - b.km);

  if (nearby.length === 0) {
    return c.json({
      lang: intent.lang,
      narration: `I couldn't find a live bus near ${fromStop.name_en} right now. Try again in a minute — positions update every few seconds.`,
      legs: [],
      found: false,
    });
  }

  const { v: bus, km: distanceToStopKm } = nearby[0];
  const etaMin = etaMinutes(bus.lat, bus.lng, bus.speedKmh, fromStop.lat, fromStop.lng);
  const etaText = formatEta(etaMin);
  const journeyKm = haversineKm(fromStop.lat, fromStop.lng, toStop.lat, toStop.lng);

  // Stage 4 — model phrases two sentences from the numbers above. It cannot alter them.
  let narration = templatedNarration(intent.lang, {
    fromName: fromStop.name_en,
    toName: toStop.name_en,
    vehicleLabel: bus.label,
    vehicleRoute: bus.routeNo,
    etaText,
    journeyKm,
  });
  try {
    const prompt = `Write exactly two friendly, natural sentences in ${intent.lang === "si" ? "Sinhala" : intent.lang === "ta" ? "Tamil" : "English"} telling a commuter about their bus. Use ONLY these facts — do not invent or adjust any number: bus label "${bus.label}"${bus.routeNo ? `, route "${bus.routeNo}"` : ""}, arriving near ${fromStop.name_en} at "${etaText}", journey on to ${toStop.name_en} is ${journeyKm.toFixed(1)} km. No preamble, just the two sentences.`;
    const result = (await withTimeout(
      c.env.AI.run("@cf/zai-org/glm-4.7-flash", {
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
      }),
    )) as { response?: string };
    if (result?.response?.trim()) narration = result.response.trim();
  } catch {
    // Keep the templated narration.
  }

  return c.json({
    lang: intent.lang,
    narration,
    found: true,
    legs: [
      {
        fromStop: { id: fromStop.id, nameEn: fromStop.name_en, nameSi: fromStop.name_si },
        toStop: { id: toStop.id, nameEn: toStop.name_en, nameSi: toStop.name_si },
        vehicle: { label: bus.label, routeNo: bus.routeNo },
        distanceToStopKm: Number(distanceToStopKm.toFixed(2)),
        etaMin: Math.round(etaMin),
        etaText,
        journeyKm: Number(journeyKm.toFixed(1)),
      },
    ],
  });
});

ai.get("/digest", async (c) => {
  const digest = await getDigest(c.env);
  return c.json(digest);
});
