import { useState } from "react";
import { post, ApiError } from "../lib/api";

type Leg = {
  fromStop: { id: number; nameEn: string; nameSi: string | null };
  toStop: { id: number; nameEn: string; nameSi: string | null };
  vehicle: { label: string; routeNo?: string };
  distanceToStopKm: number;
  etaMin: number;
  etaText: string;
  journeyKm: number;
};

type PlanResponse = { lang: string; narration: string; legs: Leg[]; found: boolean };

const EXAMPLES = ["Galle to Matara", "Kollupitiya to Negombo", "කොළඹ සිට ගාල්ල"];

// Rs. 6/km is SLTB's published standard AC fare band — a flat estimate
// computed here in TypeScript from the real journeyKm, never invented by the
// model (CLAUDE.md §1 rule 6).
function estimateFare(journeyKm: number): number {
  return Math.round((journeyKm * 6) / 10) * 10;
}

export function Plan() {
  const [origin, setOrigin] = useState("");
  const [question, setQuestion] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PlanResponse | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  async function ask(from: string, to: string) {
    const combined = to ? `${from} to ${to}` : from;
    const trimmed = combined.trim();
    if (!trimmed || !to.trim()) {
      setInputError("Tell me where you're starting from — try 'Galle to Matara'.");
      return;
    }
    setInputError(null);
    setServerError(null);
    setResult(null);
    setLoading(true);
    try {
      const data = await post<PlanResponse>("/api/ai/plan", { question: trimmed });
      setResult(data);
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function setPreset(from: string, to: string) {
    setOrigin(from);
    setQuestion(to);
    ask(from, to);
  }

  const leg = result?.found ? result.legs[0] : undefined;

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-10 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight">Where to?</h1>
          <p className="text-[12px] text-text/60 dark:text-text-dark/60">කොහෙද යන්නේ? • எங்கு செல்ல வேண்டும்?</p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-live/15 text-live shrink-0">
          <span className="w-2 h-2 rounded-full bg-live animate-pulse" />
          <span className="text-[12px] font-semibold">Live GPS Active</span>
        </div>
      </div>

      {/* Origin / destination card */}
      <div className="rounded-xl bg-surface dark:bg-surface-dark shadow-sm p-4">
        <div className="flex items-stretch gap-3">
          <div className="flex flex-col items-center justify-between py-2 w-4 select-none shrink-0">
            <div className="w-2.5 h-2.5 bg-text dark:bg-text-dark rounded-sm" />
            <div className="w-0.5 grow my-1 bg-border dark:bg-border-dark" />
            <div className="w-3 h-3 rounded-full bg-primary" />
          </div>
          <div className="flex flex-col gap-2 grow min-w-0">
            <div className="flex items-center justify-between bg-page dark:bg-page-dark rounded-lg px-3 py-2">
              <div className="flex flex-col grow min-w-0">
                <span className="text-[11px] text-text/50 dark:text-text-dark/50 leading-none">Starting from</span>
                <input
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  placeholder="Your location"
                  className="bg-transparent text-[16px] font-semibold outline-none w-full truncate"
                />
              </div>
            </div>
            <div className="flex items-center justify-between bg-page dark:bg-page-dark rounded-lg px-3 py-2">
              <div className="flex flex-col grow min-w-0">
                <span className="text-[11px] text-text/50 dark:text-text-dark/50 leading-none">Destination</span>
                <input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Where are you headed?"
                  aria-invalid={!!inputError}
                  aria-describedby={inputError ? "question-error" : undefined}
                  className="bg-transparent text-[16px] font-semibold outline-none w-full truncate"
                />
              </div>
            </div>
          </div>
          <div className="flex items-center shrink-0">
            <button
              onClick={() => {
                setOrigin(question);
                setQuestion(origin);
              }}
              className="w-10 h-10 rounded-full bg-page dark:bg-page-dark flex items-center justify-center"
              type="button"
              aria-label="Swap origin and destination"
            >
              <span className="material-symbols-outlined text-[20px]">swap_vert</span>
            </button>
          </div>
        </div>
        {inputError && (
          <p id="question-error" className="mt-2 flex items-center gap-1 text-[13px] text-delayed">
            <span className="material-symbols-outlined text-[16px]">error</span>
            {inputError}
          </p>
        )}
      </div>

      <div>
        <span className="text-[12px] font-medium text-text/60 dark:text-text-dark/60">Frequent Commutes</span>
        <div className="mt-2 flex gap-2 overflow-x-auto no-scrollbar py-0.5">
          {EXAMPLES.map((ex) => {
            const [from, to] = ex.includes(" to ") ? ex.split(" to ") : ex.split(" සිට ");
            return (
              <button
                key={ex}
                onClick={() => setPreset(from, to ?? "")}
                className="shrink-0 px-3.5 py-2 rounded-full bg-page dark:bg-page-dark text-[13px] font-medium"
              >
                {ex}
              </button>
            );
          })}
        </div>
      </div>

      <button
        onClick={() => ask(origin, question)}
        disabled={loading}
        className="w-full py-3 rounded-xl bg-primary text-white font-semibold text-[15px] disabled:opacity-60 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
      >
        <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
        {loading ? "Asking…" : "Ask BusEka AI"}
      </button>

      {loading && (
        <div className="rounded-2xl bg-surface dark:bg-surface-dark p-5 flex flex-col gap-3 animate-pulse">
          <div className="h-4 w-3/4 rounded bg-border dark:bg-border-dark" />
          <div className="h-4 w-full rounded bg-border dark:bg-border-dark" />
          <div className="h-4 w-2/3 rounded bg-border dark:bg-border-dark" />
        </div>
      )}

      {serverError && !loading && (
        <div className="rounded-2xl bg-stale/10 p-5 text-[15px] text-text/80 dark:text-text-dark/80">{serverError}</div>
      )}

      {result && !loading && (
        <div className="rounded-2xl bg-surface dark:bg-surface-dark p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-[20px]">stars</span>
              <span className="font-bold text-[16px]">BusEka's pick</span>
            </div>
            {leg && (
              <div className="bg-live/15 px-2.5 py-1 rounded-full flex items-center gap-1">
                <span className="material-symbols-outlined text-live text-[16px]">bolt</span>
                <span className="text-[11px] text-live font-bold">{leg.etaText.toUpperCase()}</span>
              </div>
            )}
          </div>

          <p className="text-[15px] leading-relaxed">{result.narration}</p>

          {leg && (
            <>
              <div className="bg-page dark:bg-page-dark rounded-xl p-3 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-surface dark:bg-surface-dark flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[20px]">directions_bus</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {leg.vehicle.routeNo && <span className="font-bold text-[15px]">Route {leg.vehicle.routeNo}</span>}
                        <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-surface dark:bg-surface-dark">{leg.vehicle.label}</span>
                      </div>
                      <span className="text-[12px] text-text/60 dark:text-text-dark/60 truncate block">
                        {leg.fromStop.nameEn} → {leg.toStop.nameEn}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0 pl-2">
                    <span className="block text-[18px] text-primary font-bold leading-tight">Rs. {estimateFare(leg.journeyKm)}</span>
                    <span className="text-[11px] text-text/50 dark:text-text-dark/50">Est. standard fare</span>
                  </div>
                </div>
                <div className="flex items-center justify-between bg-surface dark:bg-surface-dark rounded-lg px-2.5 py-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-live text-[16px]">near_me</span>
                    <span className="text-[13px] font-semibold">
                      {leg.distanceToStopKm} km away at {leg.fromStop.nameEn}
                    </span>
                  </div>
                  <span className="text-[12px] text-text/60 dark:text-text-dark/60">about {leg.journeyKm} km total</span>
                </div>
              </div>

              <div className="pt-1 flex items-start gap-2 text-text/60 dark:text-text-dark/60">
                <span className="material-symbols-outlined text-live text-[18px] shrink-0 mt-0.5">verified_user</span>
                <span className="text-[12px] leading-snug">
                  <strong className="text-text dark:text-text-dark">Live GPS verified</strong> — ETAs are calculated from
                  live vehicle positions, not estimated by the AI.
                </span>
              </div>
            </>
          )}

          {!result.found && (
            <p className="text-[13px] text-text/60 dark:text-text-dark/60">
              I couldn't find a live bus near that stop right now — try a different starting point.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
