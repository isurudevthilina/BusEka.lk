/// <reference path="../../shared/vehicle.d.ts" />
import { useMemo, useState } from "react";
import { useLive } from "../lib/sse";
import { relTime } from "../lib/format";
import { Map } from "../components/Map";
import { VehicleSheet } from "../components/VehicleSheet";
import { FilterChips } from "../components/FilterChips";
import { EmptyState } from "../components/EmptyState";

type FleetSnapshot = { vehicles: Vehicle[]; total: number; live: number; ts: number; stale: boolean };

// Source-based chips
const FILTERS = ["All", "SPRPTA", "Group", "Moving only"] as const;

export function MapPage() {
  const { data, loading, refresh } = useLive<FleetSnapshot>("/api/fleet/snapshot", 6000);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const vehicles = data?.vehicles ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return vehicles.filter((v) => {
      if (filter === "Moving only" && v.speedKmh <= 2) return false;
      if (filter === "SPRPTA" && v.source !== "sprpta") return false;
      if (filter === "Group" && v.source !== "group") return false;
      if (!q) return true;
      return v.label.toLowerCase().includes(q) || (v.routeNo ?? "").toLowerCase().includes(q);
    });
  }, [vehicles, search, filter]);

  const selected = filtered.find((v) => v.id === selectedId) ?? null;

  return (
    <div className="fixed inset-0 top-0 bottom-16 md:top-16 md:bottom-0" style={{ background: "#fbf8ff" }}>
      <div className="relative w-full h-full overflow-hidden">
        <Map
          vehicles={filtered}
          onSelect={(v) => setSelectedId(v.id)}
          selectedId={selectedId ?? undefined}
          className="h-full w-full"
        />

        {/* ── Stitch-design offline / stale banner ── */}
        {data?.stale && (
          <div
            className="absolute top-16 inset-x-0 z-[1000] px-4 py-2 shadow-sm"
            style={{ background: "#FEF3C7", color: "#191b25" }}
          >
            <div className="max-w-md mx-auto flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="material-symbols-outlined shrink-0 text-[20px]" style={{ color: "#F59E0B" }}>
                  cloud_off
                </span>
                <div className="flex flex-col min-w-0">
                  <span className="text-[12px] font-semibold truncate">
                    Can't reach live network — last known positions
                  </span>
                  <span className="text-[11px] truncate" style={{ color: "#434656" }}>
                    Showing verified positions from {relTime(Date.now() - (data?.ts ?? Date.now()))}
                  </span>
                </div>
              </div>
              <button
                onClick={refresh}
                className="shrink-0 px-2.5 py-1 rounded-full text-[12px] font-bold shadow-sm"
                style={{ background: "#ffffff", color: "#003ec7" }}
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* ── Top floating bar: status beacon + search + filters ── */}
        <div
          className="absolute top-3 inset-x-3 z-[1000] flex flex-col gap-2 max-w-lg mx-auto"
          style={{ pointerEvents: "none" }}
        >
          {/* Status beacon bar */}
          <div
            className="flex items-center justify-between px-3 py-2 rounded-xl shadow-md"
            style={{
              background: "rgba(255,255,255,0.95)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              pointerEvents: "auto",
            }}
          >
            <div className="flex items-center gap-2">
              {/* Sri Lanka flag micro badge */}
              <div className="w-5 h-3.5 rounded-sm overflow-hidden flex shadow-sm shrink-0" title="Sri Lanka">
                <div className="w-1.5 h-full" style={{ background: "#ffbe29" }} />
                <div className="w-1 h-full" style={{ background: "#00531e" }} />
                <div className="flex-1 h-full flex items-center justify-center" style={{ background: "#891e00" }}>
                  <div className="w-1 h-1 rounded-full" style={{ background: "#ffbe29" }} />
                </div>
              </div>
              <span className="font-bold text-[14px] tracking-tight" style={{ color: "#191b25" }}>
                BusEka Pulse
              </span>
            </div>

            {/* Live counter */}
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{ background: "#E8F8EE" }}
            >
              <span className="relative flex h-2 w-2">
                <span
                  className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                  style={{ background: "#00C853" }}
                />
                <span
                  className="relative inline-flex rounded-full h-2 w-2"
                  style={{ background: "#00C853" }}
                />
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-[12px] font-bold" style={{ color: "#006e2a" }}>
                  {data?.live ?? 0} live
                </span>
                <span className="text-[10px]" style={{ color: "#737688" }}>
                  · {data?.total ?? 0} total
                  {data && <> · {relTime(Date.now() - data.ts)}</>}
                </span>
              </div>
            </div>
          </div>

          {/* Search */}
          <div
            className="relative flex items-center w-full rounded-xl shadow-lg"
            style={{
              background: "#ffffff",
              pointerEvents: "auto",
            }}
          >
            <span className="material-symbols-outlined text-[22px] pl-3.5 pr-2" style={{ color: "#003ec7" }}>
              search
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search route number — try 383/2, 100, EX-1…"
              className="w-full py-3 pr-9 bg-transparent text-[15px] outline-none"
              style={{ color: "#191b25" }}
            />
            {search && (
              <button
                className="absolute right-3"
                onClick={() => setSearch("")}
                style={{ color: "#737688" }}
              >
                <span className="material-symbols-outlined text-[18px]">cancel</span>
              </button>
            )}
          </div>

          {/* Filter chips */}
          <div style={{ pointerEvents: "auto" }}>
            <FilterChips
              options={[...FILTERS]}
              active={filter}
              onChange={(v) => setFilter(v as (typeof FILTERS)[number])}
            />
          </div>
        </div>

        {/* Empty state */}
        {!loading && !data?.stale && filtered.length === 0 && (
          <div
            className="absolute inset-0 z-[1000] flex items-center justify-center p-6"
            style={{ background: "rgba(251,248,255,0.9)", backdropFilter: "blur(4px)" }}
          >
            <div className="rounded-2xl shadow-xl" style={{ background: "#ffffff" }}>
              <EmptyState
                title="No buses reporting right now"
                message={
                  search || filter !== "All"
                    ? "Try clearing your search or filters."
                    : "The live feed has nothing to show at the moment."
                }
                action={{ label: "Retry", onClick: refresh }}
              />
            </div>
          </div>
        )}

        {/* Vehicle detail bottom sheet */}
        {selected && (
          <div className="absolute bottom-0 inset-x-0 z-[1000]">
            <VehicleSheet vehicle={selected} onClose={() => setSelectedId(null)} />
          </div>
        )}
      </div>
    </div>
  );
}
