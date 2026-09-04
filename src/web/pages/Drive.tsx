import { useEffect, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { get, post } from "../lib/api";
import { Map } from "../components/Map";

type DriveInfo = { plate: string; label: string; routeNo?: string; groupName?: string; watching?: number };
type Phase = "idle" | "broadcasting" | "blocked";

// Hardcoded 8-point polyline down the Galle Road corridor
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
  const navigate = useNavigate();
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
    const isSure = window.confirm("Are you sure you want to end this trip? Real-time location sharing with parents will stop immediately.");
    if (!isSure) return;

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
    <div className="flex flex-col relative w-full pt-16 min-h-screen pb-10" style={{ background: "#fbf8ff", color: "#191b25" }}>
      {/* Header */}
      <header className="fixed top-0 inset-x-0 z-50 pt-safe shadow-sm" style={{ background: "rgba(251,248,255,0.85)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)" }}>
        <div className="h-16 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button aria-label="Go back" onClick={() => navigate(-1)} className="w-11 h-11 -ml-2 flex items-center justify-center rounded-full hover:bg-[#e1e1ef]/40 transition-colors">
              <span className="material-symbols-outlined text-[24px]">arrow_back</span>
            </button>
            <img alt="Brand logo" className="h-7 w-auto object-contain" src="/icon.png" />
            <h1 className="font-semibold text-[16px] truncate">Active Ride Tracking</h1>
          </div>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white" style={{ background: "#003ec7" }}>
            <span className="material-symbols-outlined text-[18px]">person</span>
          </div>
        </div>
      </header>

      {/* State Switcher Tabs (Only visible in dev/demo usually, but we keep them to match design) */}
      <div className="px-4 pt-3 pb-2">
        <div className="p-1 rounded-xl flex items-center gap-1 shadow-sm" style={{ background: "#e7e7f5" }}>
          <button 
            onClick={() => setPhase("idle")}
            className={`flex-1 py-2 text-center rounded-lg text-[14px] font-semibold transition-all duration-200 shadow-sm ${phase === "idle" ? "bg-[#ffffff] text-[#191b25]" : "text-[#434656]"}`}
          >
            1. Idle
          </button>
          <button 
            onClick={startSimulate}
            className={`flex-1 py-2 text-center rounded-lg text-[14px] font-semibold transition-all duration-200 shadow-sm ${phase === "broadcasting" ? "bg-[#ffffff] text-[#006e2a]" : "text-[#434656]"}`}
          >
            2. Live
          </button>
          <button 
            onClick={() => setPhase("blocked")}
            className={`flex-1 py-2 text-center rounded-lg text-[14px] font-semibold transition-all duration-200 shadow-sm ${phase === "blocked" ? "bg-[#ffffff] text-[#F59E0B]" : "text-[#434656]"}`}
          >
            3. Blocked
          </button>
        </div>
      </div>

      {/* Vehicle Identity Card */}
      <div className="px-4 py-3">
        <div className="rounded-xl p-4 shadow-sm flex items-center justify-between" style={{ background: "#ffffff" }}>
          <div className="flex flex-col min-w-0 pr-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]" style={{ color: "#003ec7" }}>directions_bus</span>
              <h2 className="font-semibold text-[20px] truncate tracking-tight">{info?.label ?? "Loading…"}</h2>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="font-mono text-[18px] px-2.5 py-0.5 rounded tracking-wider uppercase font-semibold" style={{ background: "#ededfb" }}>
                {info?.plate ?? "—"}
              </span>
              <span className="text-[12px]" style={{ color: "#434656" }}>{info?.groupName ?? "Colombo 07"}</span>
            </div>
          </div>
          
          {/* Status Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={phase === "broadcasting" ? { background: "#5cfd80", color: "#00732c" } : phase === "blocked" ? { background: "#FEF3C7", color: "#191b25" } : { background: "#ededfb", color: "#434656" }}>
            <span className={`w-2.5 h-2.5 rounded-full ${phase === "broadcasting" ? "animate-pulse" : ""}`} style={{ background: phase === "broadcasting" ? "#006e2a" : phase === "blocked" ? "#F59E0B" : "#94A3B8" }}></span>
            <span className="text-[12px] uppercase font-semibold tracking-wider">
              {phase === "broadcasting" ? "LIVE TRANSMIT" : phase === "blocked" ? "GPS BLOCKED" : "OFFLINE"}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Areas */}
      <div className="px-4 flex flex-col gap-4">
        
        {/* ================= STATE 1: IDLE ================= */}
        {phase === "idle" && (
          <div className="flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="rounded-xl p-4 flex items-center justify-between" style={{ background: "#f3f2ff" }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "#e1e1ef" }}>
                  <span className="material-symbols-outlined text-[22px]">route</span>
                </div>
                <div>
                  <div className="text-[14px] font-semibold">Morning School Drop-off</div>
                  <div className="text-[13px]" style={{ color: "#434656" }}>Nugegoda → Cinnamon Gardens</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[16px] font-semibold">14.2 km</div>
                <div className="text-[12px]" style={{ color: "#434656" }}>Approx 35m</div>
              </div>
            </div>

            <button onClick={startReal} className="w-full min-h-[132px] rounded-xl flex flex-col items-center justify-center shadow-md px-6 select-none active:scale-[0.99] transition-transform text-white" style={{ background: "#006e2a" }}>
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[44px]">play_circle</span>
                <span className="text-[32px] font-bold tracking-tight uppercase">START TRIP</span>
              </div>
              <span className="text-[14px] mt-1 uppercase tracking-widest font-semibold opacity-90">Begin GPS Transmission</span>
            </button>

            <button onClick={startSimulate} className="w-full min-h-[44px] py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors font-medium text-[14px]" style={{ background: "#e7e7f5" }}>
              <span className="material-symbols-outlined text-[20px]" style={{ color: "#003ec7" }}>navigation</span>
              <span>Simulate route (demo)</span>
            </button>

            <div className="rounded-xl p-4 shadow-sm flex items-start gap-3" style={{ background: "#ffffff" }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "#ededfb", color: "#003ec7" }}>
                <span className="material-symbols-outlined text-[20px]">shield</span>
              </div>
              <div className="flex flex-col">
                <div className="text-[16px] font-semibold">Guaranteed Parent-Only Privacy</div>
                <p className="text-[13px] mt-0.5" style={{ color: "#434656" }}>
                  Your real-time GPS location is encrypted and broadcast only to parents holding this van’s verified token code. All tracking completely halts when you press “End trip”.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl shadow-sm flex items-center gap-3" style={{ background: "#ffffff" }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "#E8F8EE", color: "#006e2a" }}>
                  <span className="material-symbols-outlined text-[20px]">battery_charging_full</span>
                </div>
                <div>
                  <div className="text-[12px]" style={{ color: "#434656" }}>Phone Battery</div>
                  <div className="text-[14px] font-semibold">92% • Plugged</div>
                </div>
              </div>
              <div className="p-3 rounded-xl shadow-sm flex items-center gap-3" style={{ background: "#ffffff" }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "#E8F8EE", color: "#006e2a" }}>
                  <span className="material-symbols-outlined text-[20px]">network_cell</span>
                </div>
                <div>
                  <div className="text-[12px]" style={{ color: "#434656" }}>Dialog 4G Signal</div>
                  <div className="text-[14px] font-semibold">Strong (Good)</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= STATE 2: BROADCASTING ================= */}
        {phase === "broadcasting" && (
          <div className="flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="rounded-xl p-4 shadow-sm flex items-center justify-between" style={{ background: "#ffffff" }}>
              <div className="flex items-center gap-3">
                <div className="relative flex items-center justify-center">
                  <span className="relative flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "#006e2a" }}></span>
                    <span className="relative inline-flex rounded-full h-4 w-4" style={{ background: "#006e2a" }}></span>
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[16px] font-semibold">LIVE BROADCASTING</span>
                    <span className="text-[12px] font-semibold px-2 rounded py-0.5" style={{ background: "#5cfd80", color: "#00732c" }}>ACTIVE</span>
                  </div>
                  <div className="text-[13px]" style={{ color: "#434656" }}>Sending 1s GPS coordinates to cloud</div>
                </div>
              </div>
              <div className="font-mono text-[18px] font-bold" style={{ color: "#006e2a" }}>00:{mins}:{secs}</div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl p-3 shadow-sm flex flex-col items-center text-center" style={{ background: "#ffffff" }}>
                <span className="material-symbols-outlined text-[22px] mb-1" style={{ color: "#006e2a" }}>gps_fixed</span>
                <span className="text-[16px] font-bold">{accuracy ? `±${Math.round(accuracy)} m` : "—"}</span>
                <span className="text-[12px]" style={{ color: "#434656" }}>GPS Accuracy</span>
              </div>
              <div className="rounded-xl p-3 shadow-sm flex flex-col items-center text-center" style={{ background: "#ffffff" }}>
                <span className="material-symbols-outlined text-[22px] mb-1" style={{ color: "#003ec7" }}>cell_tower</span>
                <span className="text-[16px] font-bold">{pings} pings</span>
                <span className="text-[12px]" style={{ color: "#434656" }}>Sent live</span>
              </div>
              <div className="rounded-xl p-3 shadow-sm flex flex-col items-center text-center" style={{ background: "#ffffff" }}>
                <span className="material-symbols-outlined text-[22px] mb-1" style={{ color: "#952200" }}>visibility</span>
                <span className="text-[16px] font-bold">{info?.watching ?? 0} parents</span>
                <span className="text-[12px]" style={{ color: "#434656" }}>Watching now</span>
              </div>
            </div>

            {position && (
              <div className="relative w-full h-44 rounded-xl overflow-hidden shadow-sm pointer-events-none" style={{ background: "#0F172A" }}>
                <Map
                  vehicles={[{
                    id: "self",
                    source: "group",
                    label: info?.label ?? "",
                    lat: position.lat,
                    lng: position.lng,
                    speedKmh: position.speed,
                    ts: Date.now(),
                    stale: false,
                  }]}
                  center={[position.lat, position.lng]}
                  zoom={15}
                  className="w-full h-full opacity-85"
                />
                
                {/* Simulated Radar Overlay / Glassmorphism Scrim matching design */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A]/90 via-[#0F172A]/20 to-transparent flex flex-col justify-between p-3 pointer-events-none z-10">
                  <div className="flex items-center justify-between">
                    <span className="backdrop-blur-sm text-[#fbf8ff] text-[12px] px-2.5 py-1 rounded-full flex items-center gap-1.5" style={{ background: "rgba(15, 23, 42, 0.8)" }}>
                      <span className="w-2 h-2 rounded-full" style={{ background: "#006e2a" }}></span>
                      Live tracking active
                    </span>
                    <span className="backdrop-blur-sm text-[#fbf8ff] text-[12px] px-2 py-1 rounded-full font-bold" style={{ background: "rgba(15, 23, 42, 0.8)" }}>
                      {Math.round(position.speed)} km/h
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[#fbf8ff]">
                    <div className="flex items-center gap-1.5 text-[14px]">
                      <span className="material-symbols-outlined text-[18px]" style={{ color: "#006e2a" }}>near_me</span>
                      <span>Next stop: Unknown</span>
                    </div>
                    <div className="text-[12px]" style={{ color: "#94A3B8" }}>Updated just now</div>
                  </div>
                </div>

                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                  <div className="relative flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full animate-ping absolute" style={{ background: "rgba(0, 62, 199, 0.2)" }}></div>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shadow-lg text-white" style={{ background: "#003ec7" }}>
                      <span className="material-symbols-outlined text-[18px]">directions_bus</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-xl p-3.5 shadow-sm" style={{ background: "#ffffff" }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] uppercase font-semibold" style={{ color: "#434656" }}>Active Parent Listeners</span>
                <span className="text-[12px] font-medium" style={{ color: "#006e2a" }}>{info?.watching ?? 0} Connected</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold border border-white" style={{ background: "#dde1ff", color: "#001452" }}>P1</div>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold border border-white" style={{ background: "#e7e7f5", color: "#191b25" }}>P2</div>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold border border-white" style={{ background: "#69ff87", color: "#002108" }}>P3</div>
                </div>
                <span className="text-[13px] truncate" style={{ color: "#434656" }}>Parents are viewing live distance.</span>
              </div>
            </div>

            <button onClick={stop} className="w-full min-h-[120px] rounded-xl flex flex-col items-center justify-center shadow-md px-6 select-none active:scale-[0.99] transition-transform text-white" style={{ background: "#ba1a1a" }}>
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[40px]">stop_circle</span>
                <span className="text-[32px] font-bold tracking-tight uppercase">END TRIP</span>
              </div>
              <span className="text-[14px] mt-1 uppercase tracking-widest font-semibold opacity-90">Stop Sharing GPS Location</span>
            </button>
          </div>
        )}

        {/* ================= STATE 3: BLOCKED ================= */}
        {phase === "blocked" && (
          <div className="flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="rounded-xl p-5 shadow-sm" style={{ background: "#FEF3C7" }}>
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: "#F59E0B", color: "#0F172A" }}>
                  <span className="material-symbols-outlined text-[26px]">location_disabled</span>
                </div>
                <div className="flex flex-col">
                  <h3 className="text-[20px] font-bold" style={{ color: "#0F172A" }}>Location is blocked for this site</h3>
                  <p className="text-[15px] mt-1 font-medium" style={{ color: "#0F172A" }}>
                    BusEka cannot broadcast your van position to parents without device GPS permission enabled in Chrome.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl p-4 shadow-sm flex flex-col gap-4" style={{ background: "#ffffff" }}>
              <div className="text-[16px] font-semibold">Follow these 2 quick steps:</div>
              <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "#f3f2ff" }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[16px] shrink-0 text-white" style={{ background: "#003ec7" }}>1</div>
                <div className="flex-1">
                  <div className="text-[14px] font-semibold flex items-center gap-1.5">
                    <span>Tap the Padlock icon</span>
                    <span className="material-symbols-outlined text-[18px]" style={{ color: "#434656" }}>lock</span>
                  </div>
                  <div className="text-[13px]" style={{ color: "#434656" }}>Located next to <span className="font-mono font-semibold text-[12px]">buseka.lk</span> in your browser bar.</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "#f3f2ff" }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[16px] shrink-0 text-white" style={{ background: "#003ec7" }}>2</div>
                <div className="flex-1">
                  <div className="text-[14px] font-semibold flex items-center gap-1.5">
                    <span>Toggle Location to “Allow”</span>
                    <span className="material-symbols-outlined text-[18px]" style={{ color: "#006e2a" }}>check_circle</span>
                  </div>
                  <div className="text-[13px]" style={{ color: "#434656" }}>Switch permissions from “Blocked” to “Allowed” or “Clear reset”.</div>
                </div>
              </div>
            </div>

            <button onClick={startReal} className="w-full min-h-[44px] py-4 rounded-xl flex items-center justify-center gap-2 shadow-sm uppercase tracking-wider text-[16px] font-semibold text-white active:scale-[0.99] transition-transform" style={{ background: "#003ec7" }}>
              <span className="material-symbols-outlined text-[24px]">refresh</span>
              <span>Try Again • Request GPS</span>
            </button>

            <div className="rounded-xl p-4 shadow-sm flex items-center justify-between" style={{ background: "#ffffff" }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "#ededfb", color: "#434656" }}>
                  <span className="material-symbols-outlined text-[20px]">headset_mic</span>
                </div>
                <div>
                  <div className="text-[14px] font-semibold">Need Driver Dispatch Help?</div>
                  <div className="text-[13px]" style={{ color: "#434656" }}>Colombo Transit Dispatch (24/7)</div>
                </div>
              </div>
              <a href="tel:0112345678" className="px-3.5 py-2 rounded-lg font-semibold flex items-center gap-1" style={{ background: "#ededfb", color: "#003ec7" }}>
                <span className="material-symbols-outlined text-[18px]">call</span>
                <span>Call</span>
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
