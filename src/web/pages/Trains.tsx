import { useEffect, useMemo, useState } from "react";
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
  const [search, setSearch] = useState("");

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

  const q = search.trim().toLowerCase();
  const trains = useMemo(
    () => (data?.trains ?? []).filter((t) => !q || t.name.toLowerCase().includes(q) || t.trainNo.includes(q) || t.destination.toLowerCase().includes(q)),
    [data, q],
  );

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-10 flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-live/15 text-live">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-live opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-live" />
            </span>
            <span className="text-[12px] font-semibold tracking-wide uppercase">Passenger reports</span>
          </div>
        </div>
        <p className="text-[13px] text-text/60 dark:text-text-dark/60">
          {data?.note ?? "Sri Lanka Railways doesn't publish live train positions, so this board runs on passenger reports."}
        </p>
      </div>

      <div className="flex items-center w-full h-11 bg-surface dark:bg-surface-dark rounded-xl shadow-sm px-3 gap-2">
        <span className="material-symbols-outlined text-text/40 dark:text-text-dark/40 text-[20px]">search</span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search train, number, or destination"
          className="w-full bg-transparent text-[14px] outline-none"
        />
      </div>

      {loading && !data && <p className="text-[13px] text-text/50 dark:text-text-dark/50">Loading…</p>}

      {!loading && trains.length === 0 && (
        <p className="text-[13px] text-text/50 dark:text-text-dark/50">No trains match that search.</p>
      )}

      <ul className="flex flex-col gap-3">
        {trains.map((train) => (
          <li key={train.id} className="rounded-xl bg-surface dark:bg-surface-dark shadow-sm p-4 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="font-bold text-[15px] truncate">{train.name}</h3>
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-page dark:bg-page-dark font-mono">#{train.trainNo}</span>
                </div>
                <p className="text-[13px] text-text/60 dark:text-text-dark/60 truncate">
                  {train.origin} → {train.destination}
                </p>
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
                className="flex-1 min-h-10 rounded-lg bg-page dark:bg-page-dark px-2.5 text-[13px] outline-none"
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
                className="shrink-0 px-4 h-10 rounded-lg bg-primary text-white text-[13px] font-semibold disabled:opacity-60 flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">sensors</span>
                Report
              </button>
            </div>
            {feedback[train.id] && <p className="text-[12px] text-text/60 dark:text-text-dark/60">{feedback[train.id]}</p>}
          </li>
        ))}
      </ul>

      <div className="rounded-xl bg-page dark:bg-page-dark p-4 flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-primary shrink-0 mt-0.5">
            <span className="material-symbols-outlined text-[20px]">cell_tower</span>
          </div>
          <div>
            <h4 className="font-semibold text-[14px]">How train tracking works on BusEka</h4>
            <p className="text-[13px] text-text/60 dark:text-text-dark/60 leading-relaxed mt-1">
              Sri Lanka Railways carriages don't carry GPS transponders, so there's no live train feed to show. This
              board instead runs on passengers reporting the station they're at — tap "Report" above when you spot a
              train.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
