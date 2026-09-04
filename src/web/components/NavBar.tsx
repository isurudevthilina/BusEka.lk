import { Link, NavLink } from "react-router-dom";

// Persistent navigation — bottom tabs below 768px, top bar above (DESIGN.md §7).
const items = [
  { to: "/map", label: "Map", icon: "explore" },
  { to: "/plan", label: "Plan", icon: "route" },
  { to: "/trains", label: "Trains", icon: "train" },
  { to: "/join", label: "Group", icon: "groups" },
  { to: "/about", label: "More", icon: "menu" },
];

export function NavBar() {
  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-50 pb-safe bg-surface/90 dark:bg-surface-dark/90 backdrop-blur-xl border-t border-border dark:border-border-dark"
        aria-label="Primary"
      >
        <div className="flex justify-around items-center h-16">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center min-w-14 h-11 gap-0.5 transition-colors ${
                  isActive ? "text-primary font-semibold" : "text-text/55 dark:text-text-dark/55"
                }`
              }
            >
              <span className="material-symbols-outlined text-[24px]">{item.icon}</span>
              <span className="text-[12px]">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      <header
        className="hidden md:flex fixed top-0 inset-x-0 z-50 h-16 items-center justify-between px-6 bg-surface/90 dark:bg-surface-dark/90 backdrop-blur-xl border-b border-border dark:border-border-dark"
        aria-label="Primary"
      >
        <Link to="/" className="flex items-center gap-2 font-semibold text-[18px] tracking-tight">
          <img src="/icon.png" className="h-8 w-8 rounded-lg" alt="" />
          BusEka
        </Link>
        <nav className="flex items-center gap-7">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-1.5 text-[15px] transition-colors ${
                  isActive ? "text-primary font-semibold" : "text-text/70 dark:text-text-dark/70 hover:text-text dark:hover:text-text-dark"
                }`
              }
            >
              <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>
    </>
  );
}
