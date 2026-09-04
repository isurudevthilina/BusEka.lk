import { getFleetSnapshot } from "../routes/fleet";

type Digest = { text: string; updatedAt: number };

const TTL_MS = 5 * 60_000;

function withTimeout<T>(p: Promise<T>, ms = 6000): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

function templatedDigest(live: number, total: number, stale: boolean): string {
  if (stale) {
    return "We're briefly showing the last known bus positions while we reconnect to the live feed — nothing to worry about.";
  }
  if (total === 0) {
    return "No buses are reporting positions right now. Check back shortly.";
  }
  const pct = Math.round((live / total) * 100);
  return `${live} of ${total} tracked buses (${pct}%) are broadcasting live positions right now across the network.`;
}

// AI-3: a short, cached paragraph for the Home page. The model only ever
// phrases numbers we've already computed — it never invents one.
export async function getDigest(env: Env): Promise<Digest> {
  const cached = await env.CACHE.get<Digest>("digest", "json");
  if (cached && Date.now() - cached.updatedAt < TTL_MS) return cached;

  const snapshot = await getFleetSnapshot(env);
  const fallback = templatedDigest(snapshot.live, snapshot.total, snapshot.stale);

  let text = fallback;
  try {
    const prompt = `Write exactly one short, friendly sentence (under 30 words) describing Sri Lanka's live bus network right now. Use ONLY these numbers — do not invent or adjust any: live buses = ${snapshot.live}, total tracked = ${snapshot.total}, data is stale = ${snapshot.stale}. No preamble, just the sentence.`;
    const result = (await withTimeout(
      env.AI.run("@cf/zai-org/glm-4.7-flash", {
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
      }),
    )) as { response?: string };
    if (result?.response?.trim()) text = result.response.trim();
  } catch {
    // Keep the templated fallback.
  }

  const digest: Digest = { text, updatedAt: Date.now() };
  await env.CACHE.put("digest", JSON.stringify(digest), { expirationTtl: 600 });
  return digest;
}
