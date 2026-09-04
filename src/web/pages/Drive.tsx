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
  const [position, setPosition] = useState<{ lat: number; lng: number; speed: number } | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const simIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!token) return;
    get<DriveInfo>(`/api/drive/${token}`).then(setInfo).catch(() => {});
  }, [token]);

  useEffect(
    () => () => {
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    },
    [],
  );

  async function sendPing(lat: number, lng: number, speed: number, acc?: number) {
    if (!token) return;
    await post(`/api/drive/${token}/ping`, { lat, lng, speed, accuracy: acc }).catch(() => {});
    setPings((p) => p + 1);
    setPosition({ lat, lng, speed });
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
        setPhase("broadcasting");
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
    await post(`/api/drive/${token}/stop`).catch(() => {});
    setPhase("idle");
    setSimulating(false);
    setPings(0);
    setPosition(null);
  }

  return (
    <div className="min-h-screen flex flex-col bg-page dark:bg-page-dark text-text dark:text-text-dark">
      <header className="h-16 px-4 flex items-center gap-3 border-b border-border dark:border-border-dark">
        <img src="/icon.png" className="h-7 w-7 rounded-md" alt="" />
        <div>
          <div className="font-semibold text-[15px]">{info?.label ?? "Loading…"}</div>
          <div className="text-[12px] font-mono text-text/60 dark:text-text-dark/60">{info?.plate}</div>
        </div>
      </header>

      <div className="flex-1 px-4 py-5 flex flex-col gap-4 max-w-lg mx-auto w-full">
        {phase === "idle" && (
          <>
            <button
              onClick={startReal}
              className="w-full min-h-[132px] rounded-2xl bg-live text-white flex flex-col items-center justify-center gap-1 shadow-md active:scale-[0.99] transition-transform"
            >
              <span className="material-symbols-outlined text-[44px]">play_circle</span>
              <span className="text-[22px] font-bold uppercase tracking-tight">Start trip</span>
            </button>
            <button
              onClick={startSimulate}
              className="w-full py-3.5 rounded-xl bg-surface dark:bg-surface-dark border border-border dark:border-border-dark text-[14px] font-semibold flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[20px] text-primary">navigation</span>
              Simulate route (demo)
            </button>
            <p className="text-[13px] text-text/60 dark:text-text-dark/60 text-center">
              Your location is shared only with people who have this van's group code. Sharing stops when you tap End
              trip.
            </p>
          </>
        )}

        {phase === "broadcasting" && (
          <>
            <div className="rounded-xl bg-surface dark:bg-surface-dark border border-border dark:border-border-dark p-4 flex items-center gap-3">
              <span className="relative flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-live opacity-75" />
                <span className="relative inline-flex rounded-full h-4 w-4 bg-live" />
              </span>
              <div>
                <div className="font-semibold text-[15px]">LIVE{simulating ? " (demo)" : ""}</div>
                <div className="text-[12px] text-text/60 dark:text-text-dark/60">Broadcasting your position</div>
              </div>
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
    <div className="rounded-xl bg-surface dark:bg-surface-dark border border-border dark:border-border-dark p-3 flex flex-col items-center text-center gap-1">
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
