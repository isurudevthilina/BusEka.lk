import { Link } from "react-router-dom";
import { useLive } from "../lib/sse";
import { relTime } from "../lib/format";

type FleetSnapshot = { vehicles: Vehicle[]; total: number; live: number; ts: number; stale: boolean };
type Digest = { text: string; updatedAt: number };

export function Home() {
  const { data: fleet } = useLive<FleetSnapshot>("/api/fleet/snapshot", 6000);
  const { data: digest } = useLive<Digest>("/api/ai/digest", 60000);

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="px-4 pt-10 pb-8 max-w-2xl mx-auto w-full text-center flex flex-col items-center gap-4">
        <img src="/icon.png" alt="BusEka" className="h-14 w-14 rounded-2xl shadow-sm" />
        <h1 className="text-[32px] leading-tight font-bold tracking-tight">Every bus in Sri Lanka. One map.</h1>
        <p className="text-[15px] text-text/70 dark:text-text-dark/70 max-w-md">
          Plus a way to track the school van, using nothing but the driver's phone.
        </p>

        <div className="mt-2 flex items-center gap-2 border border-border dark:border-border-dark rounded-xl px-4 py-2.5 bg-surface dark:bg-surface-dark">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-live opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-live" />
          </span>
          <span className="text-[15px]">
            <span className="font-bold text-live">{fleet?.live ?? "—"}</span> buses live right now
          </span>
        </div>

        <div className="mt-2 flex flex-col sm:flex-row gap-3 w-full max-w-sm">
          <Link to="/map" className="flex-1 py-3 rounded-xl bg-primary text-white font-semibold text-[15px] text-center active:scale-[0.98] transition-transform">
            Open the map
          </Link>
          <Link to="/join" className="flex-1 py-3 rounded-xl bg-surface dark:bg-surface-dark border border-border dark:border-border-dark font-semibold text-[15px] text-center active:scale-[0.98] transition-transform">
            Track my group
          </Link>
        </div>
      </section>

      {/* The problem */}
      <section className="px-4 py-8 max-w-2xl mx-auto w-full flex flex-col gap-4">
        <h2 className="text-[20px] font-semibold">The problem</h2>
        <div className="flex flex-col gap-3 text-[15px] leading-relaxed text-text/80 dark:text-text-dark/80 max-w-[65ch]">
          <p>
            A commuter in Sri Lanka waiting for a bus has no way to know if one is coming. Three separate operators
            already track buses live — SPRPTA tracks 1,192 buses in the Southern Province, Lanka Metro tracks the
            Colombo MetroBus corridors, and private depots track their own fleets on Wialon — but each sits in its
            own app, and none of them talk to each other. Meanwhile the vehicles families care about most — the
            school van, the office shuttle, the factory bus — have no tracking at all, so a parent's only option is
            to phone the driver.
          </p>
          <p>
            <strong className="text-text dark:text-text-dark">Who this affects:</strong> daily commuters on 356+
            Southern Province routes; Colombo MetroBus riders on CM01/CM02; parents of the children in Sri Lanka's
            private school-van fleet; and the small bus and van owners who have no way to offer tracking without
            buying hardware.
          </p>
          <p>
            <strong className="text-text dark:text-text-dark">What BusEka does:</strong> one map for every operator,
            plus a way for any owner to put their own vehicle on it in 60 seconds using nothing but the driver's
            phone.
          </p>
        </div>
      </section>

      {/* Three cards */}
      <section className="px-4 py-4 max-w-2xl mx-auto w-full">
        <h2 className="text-[20px] font-semibold mb-4">What BusEka does</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <FeatureCard icon="explore" title="One live map" body="Every operator in one place." />
          <FeatureCard icon="groups" title="Private groups" body="A 6-character code, no accounts." />
          <FeatureCard icon="smartphone" title="No hardware" body="The driver's phone is the tracker." />
        </div>
      </section>

      {/* AI digest */}
      <section className="px-4 py-6 max-w-2xl mx-auto w-full">
        <div className="rounded-2xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark p-5">
          <h3 className="text-[14px] font-semibold uppercase tracking-wide text-text/60 dark:text-text-dark/60 mb-2">
            Network status right now
          </h3>
          <p className="text-[15px] leading-relaxed">{digest?.text ?? "Loading network status…"}</p>
          {digest && (
            <p className="mt-2 text-[11px] text-text/45 dark:text-text-dark/45">
              Updated {relTime(Date.now() - digest.updatedAt)} · written by AI from live data
            </p>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 py-8 max-w-2xl mx-auto w-full flex flex-col items-center gap-2 text-[13px] text-text/50 dark:text-text-dark/50">
        <div className="flex items-center gap-4">
          <Link to="/about" className="hover:text-text dark:hover:text-text-dark">
            About
          </Link>
          <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-text dark:hover:text-text-dark">
            GitHub
          </a>
        </div>
        <p>Live data from SPRPTA (spgps.lk)</p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark p-4 flex flex-col gap-2">
      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
        <span className="material-symbols-outlined text-[22px]">{icon}</span>
      </div>
      <div className="font-semibold text-[15px]">{title}</div>
      <div className="text-[13px] text-text/60 dark:text-text-dark/60">{body}</div>
    </div>
  );
}
