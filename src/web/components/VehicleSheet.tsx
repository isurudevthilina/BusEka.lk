import { relTime } from "../lib/format";

// The bottom sheet on /map — not a modal. Only shows what's honestly
// computable from a live position ping (no fabricated "next stop" text
// without a real route/stop mapping for this vehicle).
export function VehicleSheet({ vehicle, onClose }: { vehicle: Vehicle; onClose: () => void }) {
  return (
    <div className="relative z-30 -mt-3 w-full bg-surface dark:bg-surface-dark rounded-t-3xl shadow-[0_-8px_24px_rgba(0,0,0,0.12)] px-5 pt-3 pb-6 flex flex-col">
      <button
        className="w-10 h-1 bg-border dark:bg-border-dark rounded-full mx-auto mb-3"
        onClick={onClose}
        aria-label="Close vehicle detail"
      />
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {vehicle.routeNo && (
              <span className="px-2.5 py-0.5 rounded-md bg-primary text-white text-[13px] font-bold tracking-wide">
                {vehicle.routeNo}
              </span>
            )}
            <span className="font-mono text-[16px] font-bold tracking-wider">{vehicle.label}</span>
            <span
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                vehicle.stale ? "bg-stale/15 text-stale" : "bg-live/15 text-live"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${vehicle.stale ? "bg-stale" : "bg-live animate-pulse"}`} />
              {vehicle.stale ? "STALE" : "LIVE"}
            </span>
          </div>
          <div className="mt-1 text-[13px] text-text/60 dark:text-text-dark/60">
            Updated {relTime(Date.now() - vehicle.ts)} · source {vehicle.source}
          </div>
        </div>
        <div className="bg-page dark:bg-page-dark px-3 py-2 rounded-xl flex flex-col items-center justify-center shrink-0">
          <span className="font-mono text-[20px] font-bold text-primary leading-tight">{Math.round(vehicle.speedKmh)}</span>
          <span className="text-[10px] uppercase font-bold text-text/50 dark:text-text-dark/50">km/h</span>
        </div>
      </div>
      <div className="mt-4 h-12 rounded-xl bg-live/15 text-live font-semibold text-[15px] flex items-center justify-center gap-2">
        <span className="material-symbols-outlined text-[20px]">navigation</span>
        Tracking this bus
      </div>
    </div>
  );
}
