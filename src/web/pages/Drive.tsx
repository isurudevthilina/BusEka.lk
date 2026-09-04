import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { get, post } from "../lib/api";
import { Map } from "../components/Map";

type DriveInfo = { plate: string; label: string; routeNo?: string; groupName?: string; watching?: number };
type Phase = "idle" | "broadcasting" | "blocked";

// Hardcoded 8-point polyline down the Galle Road corridor — the demo's
// insurance against venue Wi-Fi or a permission prompt killing the live demo.
const SIM_ROUTE: [number, number][] = [
  [6.9344, 79.85],
  [6.927, 79.851],
  [6.92, 79.852],
  [6.911, 79.849],
  [6.902, 79.852],
  [6.894, 79.856],
  [6.88, 79.86],
  [6.851, 79.865],
];

export function Drive() {
  const { token } = useParams<{ token: string }>();
  const [info, setInfo] = useState<DriveInfo | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [simulating, setSimulating] = useState(false);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [pings, setPings] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [position, setPosition] = useState<{ lat: number; lng: number; speed: number } | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const simIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!token) return;
    get<DriveInfo>(`/api/drive/${token}`).then(setInfo).catch(() => {});
  }, [token]);

  useEffect(
    () => () => {
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    },
    [],
  );

  async function sendPing(lat: number, lng: number, speed: number, acc?: number) {
    if (!token) return;
    await post(`/api/drive/${token}/ping`, { lat, lng, speed, accuracy: acc }).catch(() => {});
    setPings((p) => p + 1);
    setPosition({ lat, lng, speed });
  }

  function startTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    setSeconds(0);
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
  }

  async function startReal() {
    if (!navigator.geolocation) {
      setPhase("blocked");
      return;
    }
    await post(`/api/drive/${token}/start`).catch(() => {});
    navigator.wakeLock?.request("screen").catch(() => {});
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setPhase((prev) => {
          if (prev !== "broadcasting") startTimer();
          return "broadcasting";
        });
        setSimulating(false);
        setAccuracy(pos.coords.accuracy);
        sendPing(pos.coords.latitude, pos.coords.longitude, (pos.coords.speed ?? 0) * 3.6, pos.coords.accuracy);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setPhase("blocked");
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );
  }

  async function startSimulate() {
    await post(`/api/drive/${token}/start`).catch(() => {});
    setPhase("broadcasting");
    setSimulating(true);
    startTimer();
    let i = 0;
    simIntervalRef.current = setInterval(() => {
      const [lat, lng] = SIM_ROUTE[i % SIM_ROUTE.length];
      sendPing(lat, lng, 28, 8);
      i++;
    }, 3000);
  }

  async function stop() {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    await post(`/api/drive/${token}/stop`).catch(() => {});
    setPhase("idle");
    setSimulating(false);
    setPings(0);
    setPosition(null);
  }

  const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");

  return (
    <div className="min-h-screen flex flex-col bg-page dark:bg-page-dark text-text dark:text-text-dark">
      <header className="h-16 px-4 flex items-center gap-3 border-b border-border dark:border-border-dark shrink-0">
        <img src="/icon.png" className="h-7 w-7 rounded-md" alt="" />
        <div>
          <div className="font-semibold text-[15px]">Active Ride Tracking</div>
          <div className="text-[12px] text-text/60 dark:text-text-dark/60">
            {info?.label ?? "Loading…"} {info?.plate && <span className="font-mono">· {info.plate}</span>}
          </div>
        </div>
      </header>

      <div className="flex-1 px-4 py-5 flex flex-col gap-4 max-w-lg mx-auto w-full">
        {/* Vehicle identity card */}
        <div className="rounded-xl bg-surface dark:bg-surface-dark shadow-sm p-4 flex items-center justify-between">
          <div className="flex flex-col min-w-0 pr-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">directions_bus</span>
              <h2 className="font-bold text-[18px] truncate tracking-tight">{info?.label ?? "Vehicle"}</h2>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="font-mono text-[13px] bg-page dark:bg-page-dark px-2 py-0.5 rounded tracking-wider uppercase">
                {info?.plate ?? "—"}
              </span>
              {info?.groupName && <span className="text-[12px] text-text/60 dark:text-text-dark/60">{info.groupName}</span>}
            </div>
          </div>
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] uppercase font-bold tracking-wider shrink-0 ${
              phase === "broadcasting"
                ? "bg-live/15 text-live"
                : phase === "blocked"
                  ? "bg-delayed/15 text-delayed"
                  : "bg-stale/15 text-stale"
            }`}
          >
            <span className={`w-2.5 h-2.5 rounded-full ${phase === "broadcasting" ? "bg-live animate-pulse" : phase === "blocked" ? "bg-delayed" : "bg-stale"}`} />
            {phase === "broadcasting" ? "Live transmit" : phase === "blocked" ? "GPS blocked" : "Offline"}
          </div>
        </div>

        {phase === "idle" && (
          <>
            <button
              onClick={startReal}
              className="w-full min-h-[132px] rounded-2xl bg-live text-white flex flex-col items-center justify-center gap-1 shadow-md active:scale-[0.99] transition-transform"
            >
              <span className="material-symbols-outlined text-[44px]">play_circle</span>
              <span className="text-[22px] font-bold uppercase tracking-tight">Start trip</span>
              <span className="text-[12px] font-semibold uppercase tracking-widest text-white/85">Begin GPS transmission</span>
            </button>
            <button
              onClick={startSimulate}
              className="w-full py-3.5 rounded-xl bg-surface dark:bg-surface-dark border border-border dark:border-border-dark text-[14px] font-semibold flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[20px] text-primary">navigation</span>
              Simulate route (demo)
            </button>
            <div className="rounded-xl bg-surface dark:bg-surface-dark shadow-sm p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-page dark:bg-page-dark flex items-center justify-center shrink-0 text-primary">
                <span className="material-symbols-outlined text-[20px]">shield</span>
              </div>
              <div>
                <div className="font-semibold text-[15px]">Your location is shared only with people who have this van's group code</div>
                <p className="text-[13px] text-text/60 dark:text-text-dark/60 mt-0.5">
                  Sharing is encrypted end to end and stops completely the moment you press "End trip."
                </p>
              </div>
            </div>
          </>
        )}

        {phase === "broadcasting" && (
          <>
            <div className="rounded-xl bg-surface dark:bg-surface-dark shadow-sm p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="relative flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-live opacity-75" />
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-live" />
                </span>
                <div>
                  <div className="font-semibold text-[15px]">LIVE broadcasting{simulating ? " (demo)" : ""}</div>
                  <div className="text-[12px] text-text/60 dark:text-text-dark/60">Sending GPS coordinates to the cloud</div>
                </div>
              </div>
              <span className="font-mono text-[15px] text-live font-bold">
                {mins}:{secs}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Stat icon="gps_fixed" value={accuracy ? `±${Math.round(accuracy)}m` : "—"} label="Accuracy" />
              <Stat icon="cell_tower" value={`${pings}`} label="Pings sent" />
              <Stat icon="visibility" value={`${info?.watching ?? 0}`} label="Watching" />
            </div>

            {position && (
              <div className="h-40 rounded-xl overflow-hidden">
                <Map
                  vehicles={[
                    {
                      id: "self",
                      source: "group",
                      label: info?.label ?? "",
                      lat: position.lat,
                      lng: position.lng,
                      speedKmh: position.speed,
                      ts: Date.now(),
                      stale: false,
                    },
                  ]}
                  center={[position.lat, position.lng]}
                  zoom={14}
                />
              </div>
            )}

            <button
              onClick={stop}
              className="w-full min-h-[120px] rounded-2xl bg-red-600 text-white flex flex-col items-center justify-center gap-1 shadow-md active:scale-[0.99] transition-transform"
            >
              <span className="material-symbols-outlined text-[40px]">stop_circle</span>
              <span className="text-[20px] font-bold uppercase tracking-tight">End trip</span>
              <span className="text-[12px] font-semibold uppercase tracking-widest text-white/85">Stop sharing GPS location</span>
            </button>
          </>
        )}

        {phase === "blocked" && (
          <>
            <div className="rounded-xl bg-delayed/15 p-5 flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-delayed text-[26px]">location_disabled</span>
                <h2 className="font-bold text-[16px]">Location is blocked for this site</h2>
              </div>
              <p className="text-[14px] text-text/80 dark:text-text-dark/80">
                BusEka can't broadcast your position without device GPS permission.
              </p>
            </div>
            <ol className="flex flex-col gap-3">
              <Step n={1} title="Tap the padlock icon" detail="Located next to the address in your browser bar." />
              <Step n={2} title="Toggle Location to Allow" detail="Switch permission from Blocked to Allowed." />
            </ol>
            <button
              onClick={startReal}
              className="w-full py-3.5 rounded-xl bg-primary text-white font-semibold flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[20px]">refresh</span>
              Try again
            </button>
            <button
              onClick={startSimulate}
              className="w-full py-3.5 rounded-xl bg-surface dark:bg-surface-dark border border-border dark:border-border-dark text-[14px] font-semibold"
            >
              Simulate route (demo)
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <div className="rounded-xl bg-surface dark:bg-surface-dark shadow-sm p-3 flex flex-col items-center text-center gap-1">
      <span className="material-symbols-outlined text-live text-[22px]">{icon}</span>
      <span className="font-bold text-[16px]">{value}</span>
      <span className="text-[11px] text-text/60 dark:text-text-dark/60">{label}</span>
    </div>
  );
}

function Step({ n, title, detail }: { n: number; title: string; detail: string }) {
  return (
    <li className="flex items-center gap-3 p-3 rounded-lg bg-surface dark:bg-surface-dark border border-border dark:border-border-dark list-none">
      <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-[14px] shrink-0">
        {n}
      </div>
      <div>
        <div className="font-semibold text-[14px]">{title}</div>
        <div className="text-[12px] text-text/60 dark:text-text-dark/60">{detail}</div>
      </div>
    </li>
  );
}
