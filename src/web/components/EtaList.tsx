import { relTime } from "../lib/format";

export type EtaItem = {
  id: string;
  label: string;
  routeNo?: string;
  stale: boolean;
  lastSeenMs: number;
  etaText?: string;
  toLabel?: string;
};

// Used by /g/:code and /plan — one row per vehicle, status pill + relative time.
export function EtaList({ items }: { items: EtaItem[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li
          key={item.id}
          className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${item.stale ? "bg-stale" : "bg-live"}`} />
            <div className="min-w-0">
              <div className="font-semibold text-[15px] truncate">
                {item.label}
                {item.routeNo ? ` · ${item.routeNo}` : ""}
              </div>
              <div className="text-[13px] text-text/60 dark:text-text-dark/60">
                {item.stale ? "Last seen " : "Updated "}
                {relTime(item.lastSeenMs)}
              </div>
            </div>
          </div>
          {item.etaText && (
            <div className="text-right shrink-0">
              <div className="text-[13px] font-semibold text-live">{item.etaText}</div>
              {item.toLabel && <div className="text-[11px] text-text/50 dark:text-text-dark/50">{item.toLabel}</div>}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
