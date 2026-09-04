import { useState } from "react";
import { Link } from "react-router-dom";

// No DESIGN.md route or backend for saved commutes — this is a static
// showcase of Stitch's "pinned_commutes" screen, not wired to real data.
type Commute = {
  routeNo: string;
  corridor: string;
  from: string;
  to: string;
  departure: string;
  etaText: string;
  status: "On Time" | "Delayed" | "Scheduled";
  vehicle: string;
  note: string;
  tag: string;
};

const COMMUTES: Commute[] = [
  {
    routeNo: "100",
    corridor: "Galle Road Corridor",
    from: "Moratuwa",
    to: "Pettah / Fort",
    departure: "07:45 AM",
    etaText: "in 8 min",
    status: "On Time",
    vehicle: "WP ND-4521 · Bay 3",
    note: "Low crowd (SLTB Express)",
    tag: "Frequency 6m",
  },
  {
    routeNo: "138",
    corridor: "High Level Road",
    from: "Maharagama",
    to: "Colombo Fort",
    departure: "08:10 AM",
    etaText: "Traffic at Nugegoda",
    status: "Delayed",
    vehicle: "WP NA-9812 · Next ~18m behind",
    note: "Heavy crowding (standing only)",
    tag: "Every 4-6m",
  },
  {
    routeNo: "383/2",
    corridor: "Southern Coastal Link",
    from: "Colombo Fort",
    to: "Ambalangoda",
    departure: "08:30 AM",
    etaText: "in 45 min",
    status: "On Time",
    vehicle: "WP ND-7217 · Semi-Luxury AC",
    note: "AC Express",
    tag: "Platform Bay 06",
  },
];

export function Commutes() {
  const [reminders, setReminders] = useState(true);

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-10 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight">Pinned Commutes</h1>
          <p className="text-[12px] text-text/60 dark:text-text-dark/60">Your saved daily routes</p>
        </div>
        <button className="flex items-center gap-1.5 bg-primary text-white px-3 h-10 rounded-xl text-[13px] font-semibold">
          <span className="material-symbols-outlined text-[18px]">add</span>
          Pin Route
        </button>
      </div>

      {/* Featured / next departure */}
      <div className="rounded-xl bg-primary text-white p-4 shadow-md relative overflow-hidden">
        <div className="absolute right-[-14px] -bottom-6 opacity-10 pointer-events-none">
          <span className="material-symbols-outlined text-[120px]">directions_bus</span>
        </div>
        <div className="flex items-center justify-between mb-3 relative z-10">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-white text-primary font-bold text-[15px]">100</span>
            <span className="text-[12px] bg-white/20 px-2 py-0.5 rounded-full">{COMMUTES[0].vehicle.split(" · ")[0]}</span>
          </div>
          <span className="bg-white/20 text-[12px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-live" />
            On Time
          </span>
        </div>
        <div className="relative z-10">
          <div className="text-[11px] text-white/80 font-medium">Next up</div>
          <div className="text-[18px] font-bold leading-tight mt-0.5">
            {COMMUTES[0].from} → {COMMUTES[0].to}
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-[28px] font-bold tracking-tight">{COMMUTES[0].departure}</span>
            <span className="text-[14px] font-semibold text-white/90">{COMMUTES[0].etaText}</span>
          </div>
          <div className="mt-3 bg-white/20 h-2 rounded-full overflow-hidden">
            <div className="bg-white h-full w-[78%] rounded-full" />
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-[12px] text-white/85">Seats available (low crowd)</span>
            <span className="flex items-center gap-1.5 bg-white text-primary px-4 h-10 rounded-xl text-[14px] font-semibold">
              <span className="material-symbols-outlined text-[18px]">near_me</span>
              Quick Track
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="font-bold text-[15px] flex items-center gap-1.5">
          <span className="material-symbols-outlined text-primary text-[18px]">push_pin</span>
          All Saved Daily Routes
        </h2>
        <span className="text-[12px] text-text/60 dark:text-text-dark/60">{COMMUTES.length} active</span>
      </div>

      <div className="flex flex-col gap-3">
        {COMMUTES.map((c) => (
          <article key={c.routeNo} className="rounded-xl bg-surface dark:bg-surface-dark shadow-sm p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary font-bold text-[14px]">{c.routeNo}</span>
                <div>
                  <div className="text-[11px] text-text/60 dark:text-text-dark/60">{c.corridor}</div>
                  <div className="font-semibold text-[15px]">
                    {c.from} → {c.to}
                  </div>
                </div>
              </div>
              <span
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold shrink-0 flex items-center gap-1 ${
                  c.status === "Delayed" ? "bg-delayed/15 text-delayed" : "bg-live/15 text-live"
                }`}
              >
                {c.status === "Delayed" && <span className="material-symbols-outlined text-[13px]">warning</span>}
                {c.status}
              </span>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-[20px] font-bold tracking-tight">{c.departure}</span>
                  <span className={`text-[12px] font-semibold ${c.status === "Delayed" ? "text-delayed" : "text-live"}`}>{c.etaText}</span>
                </div>
                <div className="text-[12px] text-text/60 dark:text-text-dark/60">Vehicle: {c.vehicle}</div>
              </div>
              <Link
                to="/map"
                className="flex items-center gap-1.5 px-3 h-10 rounded-xl bg-page dark:bg-page-dark text-primary text-[13px] font-semibold"
              >
                <span className="material-symbols-outlined text-[16px]">radar</span>
                Live Map
              </Link>
            </div>
            <div className="mt-3 pt-2.5 flex items-center justify-between text-text/60 dark:text-text-dark/60 text-[12px]">
              <span>{c.note}</span>
              <span className="font-mono">{c.tag}</span>
            </div>
          </article>
        ))}
      </div>

      <section className="rounded-xl bg-page dark:bg-page-dark p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-[20px]">notifications_active</span>
          </div>
          <div>
            <div className="font-semibold text-[14px]">Commute Reminders</div>
            <div className="text-[12px] text-text/60 dark:text-text-dark/60">Alert me 15 mins before departure</div>
          </div>
        </div>
        <button
          onClick={() => setReminders((r) => !r)}
          role="switch"
          aria-checked={reminders}
          className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${reminders ? "bg-primary" : "bg-border dark:bg-border-dark"}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${reminders ? "translate-x-5" : ""}`} />
        </button>
      </section>
    </div>
  );
}
