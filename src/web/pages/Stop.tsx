import { Link } from "react-router-dom";

// Stub (PLAN.md §0.1) — deferred, not deleted.
export function StopBoard() {
  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-6">
      <div className="max-w-[420px] w-full text-center flex flex-col items-center gap-3 bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-2xl p-8">
        <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center">
          <span className="material-symbols-outlined text-[32px]">departure_board</span>
        </div>
        <h1 className="text-[20px] font-semibold">Stop board is coming</h1>
        <p className="text-[13px] text-text/60 dark:text-text-dark/60">
          Departure boards for individual stops are next on our list.
        </p>
        <Link
          to="/map"
          className="mt-2 w-full py-2.5 rounded-xl bg-primary text-white font-semibold text-[15px] active:scale-[0.98] transition-transform"
        >
          Open the map
        </Link>
      </div>
    </div>
  );
}
