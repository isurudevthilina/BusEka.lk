// AI-2, reduced: 12 seeded stops fit directly in a prompt, so there is no
// Vectorize index here — just a plain D1 read (DESIGN.md §6.3 / PLAN.md §0.1).
export type Stop = { id: number; name_en: string; name_si: string | null; lat: number; lng: number };

export async function getStops(env: Env): Promise<Stop[]> {
  const { results } = await env.DB.prepare("SELECT id, name_en, name_si, lat, lng FROM stops").all<Stop>();
  return results ?? [];
}
