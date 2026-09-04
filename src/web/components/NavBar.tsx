// src/web/components/NavBar.tsx
// Bottom nav <768px, top bar ≥768px — exact DESIGN.md spec

import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/map',    icon: 'explore',      label: 'Map'    },
  { to: '/plan',   icon: 'route',        label: 'Plan'   },
  { to: '/trains', icon: 'train',        label: 'Trains' },
  { to: '/join',   icon: 'groups',       label: 'Group'  },
  { to: '/about',  icon: 'menu',         label: 'More'   },
];

export default function NavBar() {
  return (
    <>
      {/* ── Top bar ≥768px ── */}
      <header className="hidden md:flex fixed top-0 inset-x-0 z-50
        bg-white/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.06)]
        items-center justify-between px-6 h-14">
        <NavLink to="/" className="flex items-center gap-2 no-underline">
          <img src="/assets/favicon.png" alt="BusEka" className="h-7 w-auto" />
          <span className="font-semibold text-[#003ec7] text-[18px] leading-none">BusEka</span>
          <span className="text-[12px] text-[#434656] leading-none mt-0.5">Sri Lanka</span>
        </NavLink>
        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map(({ to, icon, label }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-2 rounded-lg text-[14px] font-medium transition-colors
                ${isActive ? 'text-[#003ec7] bg-[#003ec7]/8' : 'text-[#434656] hover:text-[#191b25]'}`}>
              <span className="material-symbols-outlined text-[18px]">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>
      </header>

      {/* ── Bottom nav <768px ── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 pb-safe
        bg-white/90 backdrop-blur-xl shadow-[0_-1px_12px_rgba(0,0,0,0.06)]">
        <div className="flex justify-around items-center h-16 px-1">
          {NAV_ITEMS.map(({ to, icon, label }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center min-w-[56px] min-h-[44px] transition-colors
                ${isActive ? 'text-[#003ec7]' : 'text-[#434656]'}`}>
              <span className="material-symbols-outlined text-[24px]">{icon}</span>
              <span className="text-[11px] font-medium mt-0.5">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  );
}
