import { useEffect, useState } from "react";
import { useLive } from "../lib/sse";
import { get, post, ApiError } from "../lib/api";

type TrainRow = {
  id: number;
  trainNo: string;
  name: string;
  origin: string;
  destination: string;
  lastReport: { stopNameEn: string; stopNameSi: string | null; minutesAgo: number; confidence: number } | null;
};
type TrainsResponse = { trains: TrainRow[]; note: string };
type Stop = { id: number; nameEn: string; nameSi: string | null };

export function Trains() {
  const { data, loading, refresh } = useLive<TrainsResponse>("/api/trains", 15000);
  const [stops, setStops] = useState<Stop[]>([]);
  const [reporting, setReporting] = useState<number | null>(null);
  const [stopChoice, setStopChoice] = useState<Record<number, string>>({});
  const [feedback, setFeedback] = useState<Record<number, string>>({});

  useEffect(() => {
    get<{ stops: Stop[] }>("/api/stops").then((r) => setStops(r.stops)).catch(() => {});
  }, []);

  async function report(trainId: number) {
    const stopId = stopChoice[trainId];
    if (!stopId) {
      setFeedback((f) => ({ ...f, [trainId]: "Pick a station first." }));
      return;
    }
    setReporting(trainId);
    try {
      await post(`/api/trains/${trainId}/report`, { stopId: Number(stopId) });
      setFeedback((f) => ({ ...f, [trainId]: "Thanks — reported." }));
      refresh();
    } catch (e) {
      setFeedback((f) => ({ ...f, [trainId]: e instanceof ApiError ? e.message : "Couldn't send that report." }));
    } finally {
      setReporting(null);
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-10 flex flex-col gap-5">
      <div>
        <h1 className="text-[24px] font-semibold">Trains</h1>
        <p className="mt-1 text-[13px] text-text/60 dark:text-text-dark/60">
          {data?.note ?? "Sri Lanka Railways doesn't publish live train positions, so this board runs on passenger reports."}
        </p>
      </div>

      {loading && !data && <p className="text-[13px] text-text/50 dark:text-text-dark/50">Loading…</p>}

      <ul className="flex flex-col gap-3">
        {data?.trains.map((train) => (
          <li key={train.id} className="rounded-2xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark p-4 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-semibold text-[15px]">
                  {train.name} <span className="text-text/50 dark:text-text-dark/50 font-mono text-[13px]">#{train.trainNo}</span>
                </div>
                <div className="text-[13px] text-text/60 dark:text-text-dark/60">
                  {train.origin} → {train.destination}
                </div>
              </div>
              {train.lastReport ? (
                <span className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full bg-live/15 text-live text-[11px] font-bold">
                  <span className="material-symbols-outlined text-[14px]">pin_drop</span>
                  {train.lastReport.stopNameEn} · {train.lastReport.minutesAgo}m ago
                </span>
              ) : (
                <span className="shrink-0 px-2 py-0.5 rounded-full bg-stale/15 text-stale text-[11px] font-bold">No reports yet</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <select
                value={stopChoice[train.id] ?? ""}
                onChange={(e) => setStopChoice((s) => ({ ...s, [train.id]: e.target.value }))}
                className="flex-1 min-h-10 rounded-lg border border-border dark:border-border-dark bg-page dark:bg-page-dark px-2.5 text-[13px] outline-none"
              >
                <option value="">I'm at…</option>
                {stops.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nameEn}
                  </option>
                ))}
              </select>
              <button
                onClick={() => report(train.id)}
                disabled={reporting === train.id}
                className="shrink-0 px-3.5 h-10 rounded-lg bg-text text-page dark:bg-text-dark dark:text-page-dark text-[13px] font-semibold disabled:opacity-60"
              >
                Report
              </button>
            </div>
            {feedback[train.id] && <p className="text-[12px] text-text/60 dark:text-text-dark/60">{feedback[train.id]}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
