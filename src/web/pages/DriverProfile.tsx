import { useState } from "react";
import { useParams, Link } from "react-router-dom";

// Hardcoded driver info for the static showcase based on Stitch design
const DRIVER = {
  name: "Uncle Nihal",
  fullName: "K. D. Nihal Perera",
  role: "Senior Transit Captain · Lyceum Van 12 & Colombo-Galle Corridor",
  rating: 4.96,
  reviews: 428,
  yearsExp: 14,
  vehicle: { model: "Toyota HiAce High-Roof", label: "Lyceum School Van 12", plate: "WP CAB-1234" },
  badges: [
    { icon: "badge", title: "NTC Certified Pro", detail: "Heavy passenger license endorsed", bg: "bg-[#FEF3C7]", text: "text-[#F59E0B]" },
    { icon: "health_and_safety", title: "Zero Incident Log", detail: "14 yrs continuous clean record", bg: "bg-[#E8F8EE]", text: "text-[#006e2a]" },
    { icon: "family_restroom", title: "Parent Verified", detail: "Police cleared & school vetted", bg: "bg-[#e7e7f5]", text: "text-[#003ec7]" },
    { icon: "medical_services", title: "First Aid & CPR", detail: "St. John Ambulance 2024", bg: "bg-[#dde1ff]", text: "text-[#0038b6]" },
  ],
  testimonial: {
    quote: "Uncle Nihal always waits patiently at the school gate and sends route alerts right on time. Very safe driver in Colombo rain!",
    author: "Dilshan P.",
    role: "Verified Parent · Grade 4 Lyceum",
    initials: "DP",
  },
  photo: "https://lh3.googleusercontent.com/aida-public/AB6AXuBUflhDCFtjrisP6xYoD3_7xbpsTKpUKUBGx8VG-j86E0MvN-0E6v1k-ezpSLvvBOgQlrGOb14kbMGUWWewe7awNKvj41SRsVQhD9pY-r6xYKyOs72lsXPEDobCpFlbWf_PQsSh6Q3Cc8drMd7aMJFqKXSSQlrWep_O_k95Wks--L48m4iOiRsqt3O5Mz9Vhq7bCiI3tFuyGKXWUmyCJNiPwF7BwhK3JqDq2hzbvGhw1ugk4sEs7e_zCg"
};

export function DriverProfile() {
  const { id } = useParams<{ id: string }>();
  const [toast, setToast] = useState<string | null>(null);

  function notImplemented(what: string) {
    setToast(`${what} isn't wired up in this demo yet.`);
    setTimeout(() => setToast(null), 2200);
  }

  return (
    <div className="flex flex-col w-full pb-8">
      {/* Interactive Top Action Sub-bar */}
      <div className="w-full px-4 pt-3 pb-2 flex items-center justify-between">
        <Link to={id ? `/g/${id}` : "/map"} aria-label="Return to Map" className="h-11 w-11 rounded-xl bg-[#ededfb] flex items-center justify-center text-[#191b25] shadow-sm active:scale-95 transition-transform">
          <span className="material-symbols-outlined text-[22px]">arrow_back</span>
        </Link>
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-[16px] text-[#191b25]">Driver Profile</span>
            <span className="material-symbols-outlined text-[#003ec7] text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
          </div>
          <span className="font-medium text-[12px] text-[#434656]">රියදුරු තොරතුරු</span>
        </div>
        <button aria-label="Share Driver Profile" onClick={() => notImplemented("Sharing")} className="h-11 w-11 rounded-xl bg-[#ededfb] flex items-center justify-center text-[#191b25] shadow-sm active:scale-95 transition-transform">
          <span className="material-symbols-outlined text-[20px]">share</span>
        </button>
      </div>

      {/* Main Profile Content Column */}
      <div className="px-4 flex flex-col gap-4 mt-2 max-w-lg mx-auto w-full">
        
        {/* Driver Hero Presentation Card */}
        <div className="w-full bg-[#ffffff] rounded-xl p-5 shadow-sm flex flex-col items-center text-center relative overflow-hidden">
          {/* Ambient Top Corner Decal */}
          <div className="absolute top-0 right-0 w-28 h-28 bg-[#dde1ff]/40 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none"></div>
          
          {/* Avatar with Live Broadcast Status Ring */}
          <div className="relative mb-3.5">
            <div className="w-[104px] h-[104px] rounded-full p-1 bg-gradient-to-tr from-[#006e2a] to-[#69ff87] shadow-md flex items-center justify-center">
              <img alt="Driver Photo" className="w-full h-full object-cover rounded-full bg-[#ededfb]" src={DRIVER.photo} />
            </div>
            {/* Live Badge Tag */}
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-[#E8F8EE] px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-[#00C853] animate-pulse"></span>
              <span className="font-bold text-[#006e2a] text-[11px] tracking-tight uppercase">Live GPS</span>
            </div>
          </div>

          {/* Driver Identification */}
          <div className="flex items-center gap-1.5 mt-1">
            <h1 className="font-bold text-[20px] text-[#191b25]">{DRIVER.name}</h1>
            <span className="material-symbols-outlined text-[#003ec7] text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
          </div>
          <span className="font-medium text-[14px] text-[#434656]">{DRIVER.fullName}</span>
          <p className="text-[13px] text-[#434656] mt-1.5 max-w-[280px]">
            {DRIVER.role}
          </p>

          {/* Rating and Experience Pill */}
          <div className="mt-3.5 bg-[#f3f2ff] px-3.5 py-1.5 rounded-full flex items-center gap-2 flex-wrap justify-center shadow-sm">
            <div className="flex items-center gap-1 text-[#F59E0B]">
              <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
              <span className="font-bold text-[12px] text-[#191b25]">{DRIVER.rating}</span>
            </div>
            <span className="w-1 h-1 rounded-full bg-[#c3c5d9]"></span>
            <span className="text-[12px] text-[#434656]">{DRIVER.reviews} reviews</span>
            <span className="w-1 h-1 rounded-full bg-[#c3c5d9]"></span>
            <span className="font-semibold text-[12px] text-[#003ec7]">{DRIVER.yearsExp} yrs exp</span>
          </div>

          {/* Sinhala Verified Partner Indicator */}
          <div className="mt-2.5 flex items-center gap-1.5 text-[#006e2a]">
            <span className="material-symbols-outlined text-[15px]">check_circle</span>
            <span className="font-semibold text-[12px] tracking-wide">සම්බන්ධ වී ඇත · Verified Partner</span>
          </div>
        </div>

        {/* Immediate Action Communication Buttons */}
        <div className="flex flex-col gap-2.5">
          <div className="grid grid-cols-2 gap-2.5">
            {/* Call Button */}
            <a href="tel:+94771234567" onClick={(e) => { e.preventDefault(); notImplemented("Calling"); }} className="h-11 rounded-xl bg-[#003ec7] text-white font-semibold text-[14px] flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-transform">
              <span className="material-symbols-outlined text-[20px]">call</span>
              <span>Call Driver</span>
            </a>
            {/* Van Chat Button */}
            <button type="button" onClick={() => notImplemented("Van Chat")} className="h-11 rounded-xl bg-[#0F172A] text-[#fbf8ff] font-semibold text-[14px] flex items-center justify-center gap-1.5 relative shadow-sm active:scale-[0.98] transition-transform">
              <span className="material-symbols-outlined text-[20px] text-[#69ff87]">forum</span>
              <span>Van Chat</span>
              <span className="bg-[#F59E0B] text-[#191b25] text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-0.5">Active</span>
            </button>
          </div>
          {/* Secondary Quick Action Link */}
          <div className="w-full bg-[#f3f2ff] rounded-xl px-3.5 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#bf3003] text-[18px]">support_agent</span>
              <span className="text-[12px] text-[#191b25]">Lyceum Transport Desk Hotline</span>
            </div>
            <a href="tel:+94112829744" onClick={(e) => { e.preventDefault(); notImplemented("Hotline"); }} className="text-[12px] text-[#003ec7] font-bold active:underline">011 282 9744</a>
          </div>
        </div>

        {/* Assigned Vehicle & Live Telemetry Card */}
        <div className="w-full bg-[#ffffff] rounded-xl p-4 shadow-sm flex flex-col gap-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#e7e7f5] flex items-center justify-center text-[#003ec7]">
                <span className="material-symbols-outlined text-[20px]">airport_shuttle</span>
              </div>
              <div>
                <h2 className="font-bold text-[16px] text-[#191b25] leading-tight">{DRIVER.vehicle.model}</h2>
                <span className="text-[12px] text-[#434656]">{DRIVER.vehicle.label}</span>
              </div>
            </div>
            {/* SL Plate Badge */}
            <div className="bg-[#FEF3C7] px-2.5 py-1 rounded-md shadow-sm flex items-center gap-1">
              <span className="font-mono text-[14px] text-[#191b25] font-bold tracking-wider leading-none">{DRIVER.vehicle.plate}</span>
            </div>
          </div>

          {/* Real-Time Metrics Quad Grid */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="bg-[#f3f2ff] rounded-xl p-2.5 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-[#E8F8EE] flex items-center justify-center text-[#00C853]">
                <span className="material-symbols-outlined text-[16px]">speed</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-[16px] text-[#191b25] leading-tight">28 km/h</span>
                <span className="text-[12px] text-[#434656] truncate">to Kollupitiya</span>
              </div>
            </div>
            <div className="bg-[#f3f2ff] rounded-xl p-2.5 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-[#dde1ff] flex items-center justify-center text-[#003ec7]">
                <span className="material-symbols-outlined text-[16px]">battery_charging_full</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-[16px] text-[#191b25] leading-tight">92% Plugged</span>
                <span className="text-[12px] text-[#434656] truncate">Dialog 4G LTE</span>
              </div>
            </div>
          </div>
        </div>

        {/* Safety Badges & Certifications Section */}
        <div className="flex flex-col gap-2.5 mt-1">
          <div className="flex items-center justify-between px-1">
            <div className="flex flex-col">
              <h2 className="font-bold text-[16px] text-[#191b25]">Safety Badges & Certifications</h2>
              <span className="text-[12px] text-[#434656]">ආරක්ෂණ සහතික හා සත්‍යාපන</span>
            </div>
            <span className="material-symbols-outlined text-[#006e2a] text-[22px]">verified_user</span>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {DRIVER.badges.map(b => (
              <div key={b.title} className="bg-[#ffffff] p-3 rounded-xl shadow-sm flex flex-col gap-2">
                <div className={`w-8 h-8 rounded-lg ${b.bg} ${b.text} flex items-center justify-center`}>
                  <span className="material-symbols-outlined text-[18px]">{b.icon}</span>
                </div>
                <div>
                  <h3 className="font-bold text-[14px] text-[#191b25] leading-tight">{b.title}</h3>
                  <p className="text-[11px] text-[#434656] leading-snug mt-0.5">{b.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Commendation & Parent Reviews Preview */}
        <div className="w-full bg-[#ffffff] rounded-xl p-4 shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#003ec7] text-[20px]">rate_review</span>
              <span className="font-bold text-[16px] text-[#191b25]">Commendations</span>
            </div>
            {/* Punctuality Metric Pill */}
            <div className="bg-[#E8F8EE] px-2.5 py-1 rounded-full flex items-center gap-1">
              <span className="material-symbols-outlined text-[#006e2a] text-[14px]">schedule</span>
              <span className="font-bold text-[11px] text-[#006e2a]">99.2% On-Time</span>
            </div>
          </div>
          {/* Highlight Testimonial */}
          <div className="bg-[#f3f2ff] rounded-xl p-3.5 relative">
            <span className="material-symbols-outlined text-[#c3c5d9] text-[28px] absolute top-2 right-3 opacity-30 select-none">format_quote</span>
            <p className="italic relative z-10 leading-relaxed text-[14px] text-[#191b25]">
              "{DRIVER.testimonial.quote}"
            </p>
            <div className="flex items-center gap-2 mt-2.5 pt-2 border-t border-transparent">
              <div className="w-6 h-6 rounded-full bg-[#dde1ff] flex items-center justify-center font-bold text-[11px] text-[#003ec7]">{DRIVER.testimonial.initials}</div>
              <div className="flex flex-col">
                <span className="font-bold text-[12px] text-[#191b25]">{DRIVER.testimonial.author}</span>
                <span className="text-[10px] text-[#434656]">{DRIVER.testimonial.role}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Emergency, Dispute & Authority Bar */}
        <div className="w-full bg-[#ffffff] rounded-xl p-4 shadow-sm flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[#434656]">
              <span className="material-symbols-outlined text-[18px]">security</span>
              <span className="font-semibold text-[12px]">Commuter Protection Guarantee</span>
            </div>
            <a href="#" onClick={(e) => { e.preventDefault(); notImplemented("Reporting a concern"); }} className="text-[12px] text-[#952200] font-medium active:underline">Report concern</a>
          </div>
          <a href="tel:1955" className="w-full bg-[#ededfb] h-11 rounded-xl px-3.5 flex items-center justify-between active:bg-[#e7e7f5] transition-colors">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#952200] text-[20px]">phone_in_talk</span>
              <span className="font-semibold text-[14px] text-[#191b25]">National Bus Complaint Line</span>
            </div>
            <span className="font-mono text-[14px] text-[#952200] font-bold">Dial 1955</span>
          </a>
        </div>
      </div>
      
      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-xl bg-[#191b25] text-white text-[13px] font-medium shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
