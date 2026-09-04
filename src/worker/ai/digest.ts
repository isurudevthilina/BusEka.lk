// src/worker/ai/digest.ts
// AI-3: Seeded network digest for the home page status card

const DIGEST_CACHE_KEY = 'ai_digest';
const DIGEST_TTL_MS = 4 * 60 * 1000; // 4 minutes

export async function getDigest(ai: Ai, cache: KVNamespace, liveCount: number): Promise<string> {
  const cached = await cache.get<{ text: string; ts: number }>(DIGEST_CACHE_KEY, 'json');
  if (cached && Date.now() - cached.ts < DIGEST_TTL_MS) return cached.text;

  const hour = new Date().toLocaleTimeString('en-LK', {
    timeZone: 'Asia/Colombo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const prompt = `You are BusEka, a Sri Lanka transit app. Write 1–2 sentences summarising current bus network conditions.
Data: ${liveCount} buses reporting live right now at ${hour} Colombo time.
Keep it short, factual, and helpful to commuters. No markdown, no bullet points.`;

  let text = `${liveCount} buses are reporting live positions right now across the Sri Lanka network. Conditions are updating in real time.`;

  try {
    const result = await ai.run('@cf/zai-org/glm-4.7-flash' as any, {
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 80,
    }) as any;
    if (result?.response) text = result.response.trim();
  } catch { /* keep fallback */ }

  await cache.put(DIGEST_CACHE_KEY, JSON.stringify({ text, ts: Date.now() }), { expirationTtl: 300 });
  return text;
}
