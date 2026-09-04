// src/worker/ai/intent.ts
// AI-1: Natural language → { fromId, toId, lang }

import { SEEDED_STOPS } from './places.js';

interface IntentResult {
  fromName: string;
  toName: string;
  lang: 'en' | 'si' | 'ta';
}

export async function parseIntent(ai: Ai, query: string): Promise<IntentResult> {
  const prompt = `You are a Sri Lanka bus route assistant. Given a commuter query, extract the origin and destination stop names.

${SEEDED_STOPS}

Query: "${query}"

Reply with ONLY valid JSON: {"fromName":"<stop>","toName":"<stop>","lang":"en"|"si"|"ta"}
Use the exact English stop names from the list above. Detect language from the query (en/si/ta).
If you cannot determine origin or destination, use "unknown".`;

  const result = await ai.run('@cf/zai-org/glm-4.7-flash' as any, {
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 128,
  }) as any;

  const text = result?.response ?? '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return { fromName: 'unknown', toName: 'unknown', lang: 'en' };

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      fromName: String(parsed.fromName ?? 'unknown'),
      toName: String(parsed.toName ?? 'unknown'),
      lang: ['en', 'si', 'ta'].includes(parsed.lang) ? parsed.lang : 'en',
    };
  } catch {
    return { fromName: 'unknown', toName: 'unknown', lang: 'en' };
  }
}
