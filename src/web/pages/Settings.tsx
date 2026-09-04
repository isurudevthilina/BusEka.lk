import { useState } from "react";
import { Link } from "react-router-dom";

// No DESIGN.md route or backend for accounts/payments — this is a static
// showcase of Stitch's "settings_travel_preferences" screen. Toggles are
// local component state only; nothing here is persisted or transmitted.
type ToggleRow = { icon: string; title: string; detail: string };

const ALERTS: ToggleRow[] = [
  { icon: "traffic", title: "High-Traffic Route Alerts", detail: "Push alerts when a saved route exceeds a 10 min delay." },
  { icon: "timer", title: "Upcoming Bus Arrival Chime", detail: "5-minute proximity warning chime for pinned bus stops." },
  { icon: "airport_shuttle", title: "Van Group Departure Pings", detail: "Instant alerts when a tracked group starts its trip." },
];

const ACCESSIBILITY: ToggleRow[] = [
  { icon: "accessible_forward", title: "Accessibility Preference Mode", detail: "Filter low-floor, wheelchair ramps, and priority seating." },
  { icon: "headphones", title: "Voice Stop Announcements", detail: "Sinhala & English bilingual turn-by-turn stop audio." },
];

function ToggleSection({ rows, initial }: { rows: ToggleRow[]; initial: boolean[] }) {
  const [state, setState] = useState(initial);
  return (
    <div className="rounded-xl bg-surface dark:bg-surface-dark shadow-sm p-4 flex flex-col gap-4">
      {rows.map((row, i) => (
        <div key={row.title}>
          {i > 0 && <div className="h-px bg-page dark:bg-page-dark w-full mb-4" />}
          <div className="flex items-start justify-between gap-3">
            <div className="flex gap-3 flex-1 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-page dark:bg-page-dark flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px]">{row.icon}</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-[14px]">{row.title}</span>
                <p className="text-[12px] text-text/60 dark:text-text-dark/60 leading-tight mt-0.5">{row.detail}</p>
              </div>
            </div>
            <button
              onClick={() => setState((s) => s.map((v, idx) => (idx === i ? !v : v)))}
              role="switch"
              aria-checked={state[i]}
              className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${state[i] ? "bg-primary" : "bg-border dark:bg-border-dark"}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${state[i] ? "translate-x-5" : ""}`} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export function Settings() {
  const [lang, setLang] = useState<"en" | "si" | "ta">("en");

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-10 flex flex-col gap-5">
      <h1 className="text-[22px] font-bold tracking-tight">More</h1>

      {/* Profile card — demo identity, not a real account */}
      <section className="rounded-xl bg-surface dark:bg-surface-dark shadow-sm p-4 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-page dark:bg-page-dark flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[28px] text-text/40 dark:text-text-dark/40">person</span>
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <h2 className="font-bold text-[16px] truncate">Demo Commuter</h2>
            <p className="text-[12px] text-text/60 dark:text-text-dark/60 truncate">Daily commuter · Colombo–Galle corridor</p>
          </div>
        </div>
        <div className="flex items-center justify-between bg-page dark:bg-page-dark p-1.5 rounded-xl">
          {([
            ["en", "English"],
            ["si", "සිංහල"],
            ["ta", "தமிழ்"],
          ] as const).map(([code, label]) => (
            <button
              key={code}
              onClick={() => setLang(code)}
              className={`flex-1 py-1.5 text-center rounded-lg text-[13px] font-semibold transition-colors ${
                lang === code ? "bg-surface dark:bg-surface-dark shadow-sm text-primary" : "text-text/60 dark:text-text-dark/60"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2.5">
        <div className="flex items-center gap-1.5 px-1">
          <span className="material-symbols-outlined text-primary text-[20px]">notifications_active</span>
          <h3 className="font-bold text-[15px]">Travel & Smart Alerts</h3>
        </div>
        <ToggleSection rows={ALERTS} initial={[true, true, true]} />
      </section>

      <section className="flex flex-col gap-2.5">
        <div className="flex items-center gap-1.5 px-1">
          <span className="material-symbols-outlined text-primary text-[20px]">accessible</span>
          <h3 className="font-bold text-[15px]">Transit Accessibility</h3>
        </div>
        <ToggleSection rows={ACCESSIBILITY} initial={[true, false]} />
      </section>

      <Link to="/commutes" className="rounded-xl bg-surface dark:bg-surface-dark shadow-sm p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-[20px]">star</span>
          <div>
            <div className="font-semibold text-[14px]">Pinned Commutes</div>
            <div className="text-[12px] text-text/60 dark:text-text-dark/60">Your saved daily routes</div>
          </div>
        </div>
        <span className="material-symbols-outlined text-text/40 dark:text-text-dark/40 text-[20px]">chevron_right</span>
      </Link>

      <section className="flex flex-col gap-2.5">
        <div className="flex items-center gap-1.5 px-1">
          <span className="material-symbols-outlined text-primary text-[20px]">cloud_sync</span>
          <h3 className="font-bold text-[15px]">Data & Storage</h3>
        </div>
        <ToggleSection
          rows={[{ icon: "offline_bolt", title: "Offline Schedule Caching", detail: "Saves Colombo & Western Province timetables locally for low-connectivity zones." }]}
          initial={[true]}
        />
      </section>

      <Link to="/about" className="text-center text-[13px] text-primary py-2">
        About BusEka
      </Link>
    </div>
  );
}
