import { useEffect } from "react";
import { Lottie } from "lottie-react";

// The given splash-icon.png / splash-animation.json assets, shown briefly on
// first load — a branded moment while the app shell mounts, not a loading gate.
export function Splash({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 1400);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-primary">
      <img src="/splash-icon.png" alt="" className="absolute w-24 h-24 rounded-2xl opacity-40" aria-hidden />
      <Lottie src="/splash-animation.json" autoplay loop className="relative w-56 max-w-[70vw]" />
      <span className="relative text-white text-[20px] font-semibold tracking-tight">BusEka</span>
    </div>
  );
}
