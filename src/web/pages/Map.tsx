import { useMemo, useState } from "react";
import { useLive } from "../lib/sse";
import { relTime } from "../lib/format";
import { Map } from "../components/Map";
import { VehicleSheet } from "../components/VehicleSheet";
import { FilterChips } from "../components/FilterChips";
import { EmptyState } from "../components/EmptyState";

type FleetSnapshot = { vehicles: Vehicle[]; total: number; live: number; ts: number; stale: boolean };

export function MapPage() {
  const { data, loading, refresh } = useLive<FleetSnapshot>("/api/fleet/snapshot", 6000);
  const [search, setSearch] = useState("");
  const [movingOnly, setMovingOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const vehicles = data?.vehicles ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return vehicles.filter((v) => {
      if (movingOnly && v.speedKmh <= 2) return false;
      if (!q) return true;
      return v.label.toLowerCase().includes(q) || (v.routeNo ?? "").toLowerCase().includes(q);
    });
  }, [vehicles, search, movingOnly]);

  const selected = filtered.find((v) => v.id === selectedId) ?? null;

  return (
    <div className="fixed inset-0 top-0 bottom-16 md:top-16 md:bottom-0 bg-page dark:bg-page-dark">
      <div className="relative w-full h-full overflow-hidden">
        <Map vehicles={filtered} onSelect={(v) => setSelectedId(v.id)} selectedId={selectedId ?? undefined} className={`h-full w-full ${data?.stale ? "opacity-60" : ""}`} />

        {/* Offline banner */}
        {data?.stale && (
          <div className="absolute top-3 inset-x-3 z-30 max-w-lg mx-auto">
            <div className="flex items-center justify-between gap-2 bg-delayed/15 text-text dark:text-text-dark backdrop-blur-xl px-3.5 py-2.5 rounded-xl shadow-md">
              <div className="flex items-center gap-2 min-w-0">
                <span className="material-symbols-outlined text-delayed text-[20px] shrink-0">cloud_off</span>
                <span className="text-[13px] font-medium truncate">
                  Can't reach the bus network — showing last known positions from {relTime(Date.now() - data.ts)}.
                </span>
              </div>
              <button
                className="bg-surface dark:bg-surface-dark text-primary text-[13px] font-bold px-2.5 py-1 rounded-full shrink-0"
                onClick={refresh}
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Top bar: status strip, search, filters */}
        <div className="absolute top-3 inset-x-3 z-20 flex flex-col gap-2 max-w-lg mx-auto pointer-events-none">
          <div className="flex items-center justify-between bg-surface/95 dark:bg-surface-dark/95 backdrop-blur-xl px-3 py-2 rounded-xl shadow-md pointer-events-auto">
            <div className="flex items-center gap-2">
              <img src="/icon.png" alt="" className="h-6 w-6 rounded-md" />
              <span className="font-bold text-[14px] tracking-tight">BusEka</span>
            </div>
            <div className="flex items-baseline gap-1.5 bg-live/10 px-2.5 py-1 rounded-full">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-live opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-live" />
              </span>
              <span className="text-[12px] font-bold text-live">
                {data?.total ?? 0} buses · {data?.live ?? 0} live
              </span>
              {data && <span className="text-[10px] text-text/50 dark:text-text-dark/50">· updated {relTime(Date.now() - data.ts)}</span>}
            </div>
          </div>

          <div className="relative flex items-center w-full bg-surface dark:bg-surface-dark rounded-xl shadow-lg pointer-events-auto">
            <span className="material-symbols-outlined text-[22px] pl-3.5 pr-2 text-primary">search</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search route number — try 383/2"
              className="w-full py-3 pr-9 bg-transparent text-[15px] placeholder:text-text/40 dark:placeholder:text-text-dark/40 outline-none"
            />
            {search && (
              <button className="absolute right-3 text-text/50 dark:text-text-dark/50" onClick={() => setSearch("")}>
                <span className="material-symbols-outlined text-[18px]">cancel</span>
              </button>
            )}
          </div>

          <div className="pointer-events-auto">
            <FilterChips options={["All", "Moving only"]} active={movingOnly ? "Moving only" : "All"} onChange={(v) => setMovingOnly(v === "Moving only")} />
          </div>
        </div>

        {/* Empty state */}
        {!loading && !data?.stale && filtered.length === 0 && (
          <div className="absolute inset-0 z-30 bg-page/90 dark:bg-page-dark/90 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="bg-surface dark:bg-surface-dark rounded-2xl shadow-xl">
              <EmptyState
                title="No buses reporting right now"
                message={search || movingOnly ? "Try clearing your search or filters." : "The live feed has nothing to show at the moment."}
                action={{ label: "Retry", onClick: refresh }}
              />
            </div>
          </div>
        )}

        {/* Vehicle detail bottom sheet */}
        {selected && (
          <div className="absolute bottom-0 inset-x-0 z-30">
            <VehicleSheet vehicle={selected} onClose={() => setSelectedId(null)} />
          </div>
        )}
      </div>
    </div>
  );
}
