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

export function Plan() {
  const [question, setQuestion] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PlanResponse | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  async function ask(q: string) {
    const trimmed = q.trim();
    if (!trimmed) {
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

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-10 flex flex-col gap-5">
      <div>
        <h1 className="text-[24px] font-semibold">Where are you going?</h1>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Kollupitiya to Negombo"
          rows={3}
          aria-invalid={!!inputError}
          aria-describedby={inputError ? "question-error" : undefined}
          className={`mt-3 w-full rounded-xl border px-3.5 py-3 text-[15px] bg-surface dark:bg-surface-dark outline-none resize-none ${
            inputError ? "border-delayed" : "border-border dark:border-border-dark focus:border-primary"
          }`}
        />
        {inputError && (
          <p id="question-error" className="mt-1.5 flex items-center gap-1 text-[13px] text-delayed">
            <span className="material-symbols-outlined text-[16px]">error</span>
            {inputError}
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            onClick={() => {
              setQuestion(ex);
              ask(ex);
            }}
            className="px-3 py-1.5 rounded-full border border-border dark:border-border-dark text-[13px] bg-surface dark:bg-surface-dark"
          >
            {ex}
          </button>
        ))}
      </div>

      <button
        onClick={() => ask(question)}
        disabled={loading}
        className="w-full py-3 rounded-xl bg-primary text-white font-semibold text-[15px] disabled:opacity-60 active:scale-[0.98] transition-transform"
      >
        {loading ? "Asking…" : "Ask"}
      </button>

      {loading && (
        <div className="rounded-2xl border border-border dark:border-border-dark p-5 flex flex-col gap-3 animate-pulse">
          <div className="h-4 w-3/4 rounded bg-border dark:bg-border-dark" />
          <div className="h-4 w-full rounded bg-border dark:bg-border-dark" />
          <div className="h-4 w-2/3 rounded bg-border dark:bg-border-dark" />
        </div>
      )}

      {serverError && !loading && (
        <div className="rounded-2xl bg-stale/10 border border-border dark:border-border-dark p-5 text-[15px] text-text/80 dark:text-text-dark/80">
          {serverError}
        </div>
      )}

      {result && !loading && (
        <div className="rounded-2xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark p-5 flex flex-col gap-3">
          <p className="text-[17px] leading-relaxed">{result.narration}</p>
          {result.found && result.legs[0] && (
            <div className="mt-1 pt-3 border-t border-border dark:border-border-dark flex flex-col gap-1.5">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-text/50 dark:text-text-dark/50">
                Evidence
              </span>
              <div className="text-[13px] text-text/70 dark:text-text-dark/70 flex flex-col gap-1">
                <span>
                  Plate <span className="font-mono font-semibold">{result.legs[0].vehicle.label}</span>
                  {result.legs[0].vehicle.routeNo ? ` · Route ${result.legs[0].vehicle.routeNo}` : ""}
                </span>
                <span>
                  {result.legs[0].distanceToStopKm} km away at {result.legs[0].fromStop.nameEn}
                </span>
                <span>about {result.legs[0].journeyKm} km total to {result.legs[0].toStop.nameEn}</span>
              </div>
              <p className="mt-1 text-[11px] text-text/45 dark:text-text-dark/45">
                ETAs are calculated from live GPS positions, not estimated by the AI.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
