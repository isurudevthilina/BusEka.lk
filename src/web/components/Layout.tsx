import { Outlet, useLocation } from "react-router-dom";
import { NavBar } from "./NavBar";

// The driver screen gets no nav bar — the driver is doing one thing (DESIGN.md §4 F3).
export function Layout() {
  const location = useLocation();
  const isDrive = /^\/drive\//.test(location.pathname);

  return (
    <div className="min-h-screen bg-page dark:bg-page-dark text-text dark:text-text-dark">
      {!isDrive && <NavBar />}
      <main className={isDrive ? undefined : "md:pt-16 pb-16 md:pb-0"}>
        <Outlet />
      </main>
    </div>
  );
}
