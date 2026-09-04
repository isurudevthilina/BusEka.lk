import { z } from "zod";
import type { Stop } from "./places";

export type Lang = "en" | "si" | "ta";
export type Intent = { fromId: number | null; toId: number | null; lang: Lang };

const intentSchema = z.object({
  fromId: z.number().nullable(),
  toId: z.number().nullable(),
  lang: z.enum(["en", "si", "ta"]).nullable().optional(),
});

function withTimeout<T>(p: Promise<T>, ms = 6000): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

// AI-1: natural language -> {fromId, toId, lang}, chosen only from the seeded
// stop ids. The model never sees or computes a distance or an ETA.
export async function parseIntent(env: Env, question: string, stops: Stop[]): Promise<Intent> {
  try {
    const stopList = stops.map((s) => `${s.id}: ${s.name_en}${s.name_si ? " / " + s.name_si : ""}`).join("\n");
    const prompt = `Here is a list of Sri Lankan bus stops with ids:\n${stopList}\n\nThe user wrote: "${question}"\n\nReturn ONLY a JSON object: {"fromId": number|null, "toId": number|null, "lang": "en"|"si"|"ta"}. Choose fromId and toId only from the ids listed above — never invent an id. If either place is unclear, use null for it. Set "lang" to the language the user wrote in.`;

    const result = (await withTimeout(
      env.AI.run("@cf/zai-org/glm-4.7-flash", {
        messages: [{ role: "user", content: prompt }],
        temperature: 0,
        response_format: { type: "json_object" },
      }),
    )) as { response?: unknown };

    const raw = result?.response ?? result;
    const json = typeof raw === "string" ? JSON.parse(raw) : raw;
    const parsed = intentSchema.safeParse(json);
    if (parsed.success && parsed.data.fromId != null && parsed.data.toId != null) {
      const validIds = new Set(stops.map((s) => s.id));
      if (validIds.has(parsed.data.fromId) && validIds.has(parsed.data.toId)) {
        return { fromId: parsed.data.fromId, toId: parsed.data.toId, lang: parsed.data.lang ?? "en" };
      }
    }
  } catch {
    // Model timed out, errored, or returned malformed JSON — a handled case, not a 500.
  }
  return fallbackIntent(question, stops);
}

// Mandatory fallback (DESIGN.md §6.1): plain string splitting and matching.
// Handles Singlish ("kollupitiya idn negombo") and Sinhala script.
function fallbackIntent(question: string, stops: Stop[]): Intent {
  const lang: Lang = /[඀-෿]/.test(question) ? "si" : /[஀-௿]/.test(question) ? "ta" : "en";

  const matchStop = (text: string) => {
    const lower = text.toLowerCase();
    return stops.find((s) => lower.includes(s.name_en.toLowerCase()) || (s.name_si && text.includes(s.name_si)));
  };

  const parts = question
    .split(/\b(?:to|from|idn|සිට|ඉඳන්)\b/iu)
    .map((s) => s.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    const from = matchStop(parts[0]);
    const to = matchStop(parts[parts.length - 1]);
    if (from && to && from.id !== to.id) return { fromId: from.id, toId: to.id, lang };
  }

  // Last resort: any two distinct stops mentioned anywhere, in reading order.
  const mentioned = stops.filter(
    (s) => question.toLowerCase().includes(s.name_en.toLowerCase()) || (s.name_si && question.includes(s.name_si)),
  );
  if (mentioned.length >= 2) return { fromId: mentioned[0].id, toId: mentioned[1].id, lang };

  return { fromId: null, toId: null, lang };
}
