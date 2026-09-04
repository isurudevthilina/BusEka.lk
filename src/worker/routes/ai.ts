// src/worker/routes/ai.ts
// POST /api/ai/plan  – AI journey planning (AI-1 intent + fleet match)
// GET  /api/ai/digest – AI-3 network status digest

import { Hono } from 'hono';
import { parseIntent } from '../ai/intent.js';
import { getDigest } from '../ai/digest.js';
import { SEEDED_STOPS } from '../ai/places.js';
import { haversineKm, nearestStop, Stop } from '../lib/geo.js';
import { apiErr } from '../lib/validate.js';

const ai = new Hono<{ Bindings: Env }>();

// ── POST /api/ai/plan ─────────────────────────────────────────────────────
ai.post('/api/ai/plan', async (c) => {
  let body: unknown;
  try { body = await c.req.json(); } catch {
    return c.json(apiErr('BAD_JSON', 'Invalid JSON.'), 400);
  }

  const query = (body as any)?.query;
  if (!query || typeof query !== 'string' || query.trim().length < 2) {
    const { error, status } = apiErr('EMPTY_QUERY', "Tell me where you're starting from — try 'Galle to Matara'.", 'query');
    return c.json({ error }, status);
  }

  // Parse intent
  const intent = await parseIntent(c.env.AI, query.trim());
  if (intent.fromName === 'unknown' || intent.toName === 'unknown') {
    const { error, status } = apiErr('NO_ANSWER', "I couldn't work that one out. Try naming two places, like 'Fort to Kadawatha'.");
    return c.json({ error }, status);
  }

  // Load fleet snapshot from KV
  const snap = await c.env.CACHE.get<FleetSnapshot>('fleet', 'json');
  const vehicles = snap?.vehicles ?? [];

  // Load stops from DB for nearest-stop matching
  const stopsRows = await c.env.DB.prepare(`SELECT id, name_en, name_si, lat, lng FROM stops`).all<Stop>();
  const stops = stopsRows.results ?? [];

  // Find stop coordinates for from/to
  const fromStop = stops.find((s) => s.name_en.toLowerCase().includes(intent.fromName.toLowerCase()))
    ?? stops[0];
  const toStop = stops.find((s) => s.name_en.toLowerCase().includes(intent.toName.toLowerCase()))
    ?? stops[stops.length - 1];

  // Find nearest live bus to origin
  const liveNear = vehicles
    .filter((v) => !v.stale)
    .map((v) => ({ ...v, distKm: haversineKm(v.lat, v.lng, fromStop.lat, fromStop.lng) }))
    .sort((a, b) => a.distKm - b.distKm)
    .slice(0, 1)[0];

  const totalKm = haversineKm(fromStop.lat, fromStop.lng, toStop.lat, toStop.lng);
  const etaMins = liveNear ? Math.round((liveNear.distKm / 30) * 60) : null;

  // Generate AI answer
  const prompt = `You are BusEka, a Sri Lanka bus assistant. Answer in ${intent.lang === 'si' ? 'Sinhala' : 'English'}.
Journey: ${intent.fromName} → ${intent.toName}
Distance: ${totalKm.toFixed(1)} km
${liveNear ? `Nearest live bus: ${liveNear.label} (route ${liveNear.routeNo ?? 'unknown'}), ${liveNear.distKm.toFixed(1)} km away, arriving in ~${etaMins} mins` : 'No live buses detected near origin right now.'}
Write 2 short sentences recommending this journey. State the bus route and ETA clearly. No markdown.`;

  let answer = `Take a bus from ${intent.fromName} towards ${intent.toName}. The journey is about ${totalKm.toFixed(0)} km.`;
  try {
    const result = await c.env.AI.run('@cf/zai-org/glm-4.7-flash' as any, {
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 120,
    }) as any;
    if (result?.response) answer = result.response.trim();
  } catch { /* keep fallback */ }

  return c.json({
    answer,
    evidence: liveNear ? {
      plate: liveNear.label,
      route: liveNear.routeNo ?? 'Unknown',
      distKm: liveNear.distKm.toFixed(1),
      etaMins,
      totalKm: totalKm.toFixed(1),
    } : null,
    from: intent.fromName,
    to: intent.toName,
    lang: intent.lang,
  });
});

// ── GET /api/ai/digest ────────────────────────────────────────────────────
ai.get('/api/ai/digest', async (c) => {
  const snap = await c.env.CACHE.get<FleetSnapshot>('fleet', 'json');
  const liveCount = snap?.live ?? 0;
  const text = await getDigest(c.env.AI, c.env.CACHE, liveCount);
  return c.json({ text, updatedAt: Date.now() });
});

export { ai as aiRoutes };
