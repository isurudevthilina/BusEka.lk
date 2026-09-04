import { useState } from "react";
import { useParams, Link } from "react-router-dom";

// Not part of DESIGN.md's Vehicle contract — driver bios, ratings and badges
// aren't data BusEka's backend collects. This page is a static showcase
// (Stitch's "driver_profile" screen), keyed off the group's driver name only.
const DRIVER = {
  name: "Uncle Nihal",
  fullName: "K. D. Nihal Perera",
  role: "Senior Transit Captain · Lyceum Van 12 & Colombo–Galle Corridor",
  rating: 4.96,
  reviews: 428,
  yearsExp: 14,
  vehicle: { model: "Toyota HiAce High-Roof", label: "Lyceum School Van 12", plate: "WP CAB-1234" },
  badges: [
    { icon: "badge", title: "NTC Certified Pro", detail: "Heavy passenger license endorsed" },
    { icon: "health_and_safety", title: "Zero Incident Log", detail: "14 yrs continuous clean record" },
    { icon: "family_restroom", title: "Parent Verified", detail: "Police cleared & school vetted" },
    { icon: "medical_services", title: "First Aid & CPR", detail: "St. John Ambulance 2024" },
  ],
  testimonial: {
    quote: "Uncle Nihal always waits patiently at the school gate and sends route alerts right on time. Very safe driver in Colombo rain!",
    author: "Dilshan P.",
    role: "Verified Parent · Grade 4 Lyceum",
  },
};

export function DriverProfile() {
  const { id } = useParams<{ id: string }>();
  const [toast, setToast] = useState<string | null>(null);

  function notImplemented(what: string) {
    setToast(`${what} isn't wired up in this demo yet.`);
    setTimeout(() => setToast(null), 2200);
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-10 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Link to={id ? `/g/${id}` : "/map"} className="w-11 h-11 rounded-xl bg-surface dark:bg-surface-dark shadow-sm flex items-center justify-center">
          <span className="material-symbols-outlined text-[22px]">arrow_back</span>
        </Link>
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-[16px]">Driver Profile</span>
            <span className="material-symbols-outlined text-primary text-[18px]">verified</span>
          </div>
        </div>
        <button
          onClick={() => notImplemented("Sharing")}
          className="w-11 h-11 rounded-xl bg-surface dark:bg-surface-dark shadow-sm flex items-center justify-center"
        >
          <span className="material-symbols-outlined text-[20px]">share</span>
        </button>
      </div>

      <div className="rounded-xl bg-surface dark:bg-surface-dark shadow-sm p-5 flex flex-col items-center text-center">
        <div className="relative mb-3.5">
          <div className="w-[104px] h-[104px] rounded-full p-1 bg-gradient-to-tr from-live to-live/60 shadow-md flex items-center justify-center">
            <div className="w-full h-full rounded-full bg-page dark:bg-page-dark flex items-center justify-center">
              <span className="material-symbols-outlined text-[48px] text-text/30 dark:text-text-dark/30">person</span>
            </div>
          </div>
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-live/15 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-live animate-pulse" />
            <span className="text-[11px] text-live font-bold uppercase tracking-tight">Live GPS</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          <h1 className="text-[20px] font-bold">{DRIVER.name}</h1>
          <span className="material-symbols-outlined text-primary text-[20px]">verified</span>
        </div>
        <span className="text-[13px] text-text/60 dark:text-text-dark/60">{DRIVER.fullName}</span>
        <p className="text-[13px] text-text/60 dark:text-text-dark/60 mt-1.5 max-w-[280px]">{DRIVER.role}</p>

        <div className="mt-3.5 bg-page dark:bg-page-dark px-3.5 py-1.5 rounded-full flex items-center gap-2 flex-wrap justify-center">
          <div className="flex items-center gap-1 text-delayed">
            <span className="material-symbols-outlined text-[18px]">star</span>
            <span className="text-[13px] font-bold">{DRIVER.rating}</span>
          </div>
          <span className="w-1 h-1 rounded-full bg-border dark:bg-border-dark" />
          <span className="text-[13px] text-text/60 dark:text-text-dark/60">{DRIVER.reviews} reviews</span>
          <span className="w-1 h-1 rounded-full bg-border dark:bg-border-dark" />
          <span className="text-[13px] text-primary font-semibold">{DRIVER.yearsExp} yrs exp</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <button
          onClick={() => notImplemented("Calling the driver")}
          className="min-h-11 rounded-xl bg-primary text-white text-[14px] font-semibold flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-transform"
        >
          <span className="material-symbols-outlined text-[20px]">call</span>
          Call Driver
        </button>
        <button
          onClick={() => notImplemented("Van Chat")}
          className="min-h-11 rounded-xl bg-text dark:bg-text-dark text-page dark:text-page-dark text-[14px] font-semibold flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] transition-transform"
        >
          <span className="material-symbols-outlined text-[20px] text-live">forum</span>
          Van Chat
        </button>
      </div>

      <div className="rounded-xl bg-surface dark:bg-surface-dark shadow-sm p-4 flex flex-col gap-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-page dark:bg-page-dark flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[20px]">airport_shuttle</span>
            </div>
            <div>
              <h2 className="font-bold text-[15px] leading-tight">{DRIVER.vehicle.model}</h2>
              <span className="text-[12px] text-text/60 dark:text-text-dark/60">{DRIVER.vehicle.label}</span>
            </div>
          </div>
          <div className="bg-delayed/15 px-2.5 py-1 rounded-md">
            <span className="font-mono text-[13px] font-bold tracking-wider">{DRIVER.vehicle.plate}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between px-1">
          <h2 className="font-bold text-[15px]">Safety Badges & Certifications</h2>
          <span className="material-symbols-outlined text-live text-[22px]">verified_user</span>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {DRIVER.badges.map((b) => (
            <div key={b.title} className="bg-surface dark:bg-surface-dark p-3 rounded-xl shadow-sm flex flex-col gap-2">
              <div className="w-8 h-8 rounded-lg bg-page dark:bg-page-dark flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[18px]">{b.icon}</span>
              </div>
              <div>
                <h3 className="font-bold text-[13px] leading-tight">{b.title}</h3>
                <p className="text-[11px] text-text/60 dark:text-text-dark/60 leading-snug mt-0.5">{b.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl bg-surface dark:bg-surface-dark shadow-sm p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">rate_review</span>
            <span className="font-bold text-[15px]">Commendations</span>
          </div>
          <div className="bg-live/15 px-2.5 py-1 rounded-full flex items-center gap-1">
            <span className="material-symbols-outlined text-live text-[14px]">schedule</span>
            <span className="text-[11px] text-live font-bold">99.2% On-Time</span>
          </div>
        </div>
        <div className="bg-page dark:bg-page-dark rounded-xl p-3.5">
          <p className="text-[14px] italic leading-relaxed">"{DRIVER.testimonial.quote}"</p>
          <div className="flex items-center gap-2 mt-2.5 pt-2">
            <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center font-bold text-[11px] text-primary">
              {DRIVER.testimonial.author.split(" ").map((p) => p[0]).join("")}
            </div>
            <div className="flex flex-col">
              <span className="text-[12px] font-bold">{DRIVER.testimonial.author}</span>
              <span className="text-[10px] text-text/60 dark:text-text-dark/60">{DRIVER.testimonial.role}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-surface dark:bg-surface-dark shadow-sm p-4 flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-text/60 dark:text-text-dark/60">
            <span className="material-symbols-outlined text-[18px]">security</span>
            <span className="text-[13px] font-semibold">Commuter Protection Guarantee</span>
          </div>
          <button onClick={() => notImplemented("Reporting a concern")} className="text-[13px] text-primary font-medium">
            Report concern
          </button>
        </div>
        <a href="tel:1955" className="w-full bg-page dark:bg-page-dark min-h-11 rounded-xl px-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">phone_in_talk</span>
            <span className="text-[14px] font-semibold">National Bus Complaint Line</span>
          </div>
          <span className="font-mono text-[13px] text-primary font-bold">Dial 1955</span>
        </a>
      </div>

      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-xl bg-text dark:bg-text-dark text-page dark:text-page-dark text-[13px] font-medium shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
