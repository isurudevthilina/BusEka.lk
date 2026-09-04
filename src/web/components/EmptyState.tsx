type EmptyStateProps = {
  icon?: string;
  title: string;
  message?: string;
  action?: { label: string; onClick: () => void };
  tone?: "default" | "offline" | "error";
};

export function EmptyState({ icon = "directions_bus_filled", title, message, action, tone = "default" }: EmptyStateProps) {
  const badge =
    tone === "offline"
      ? "bg-delayed/15 text-delayed"
      : tone === "error"
        ? "bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400"
        : "bg-stale/15 text-stale";

  return (
    <div className="flex flex-col items-center text-center gap-3 p-6 max-w-xs mx-auto">
      <div className={`w-14 h-14 rounded-full flex items-center justify-center ${badge}`}>
        <span className="material-symbols-outlined text-[32px]">{icon}</span>
      </div>
      <h3 className="text-[20px] font-semibold">{title}</h3>
      {message && <p className="text-[13px] text-text/60 dark:text-text-dark/60">{message}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-2 w-full py-2.5 rounded-xl bg-primary text-white font-semibold text-[15px] active:scale-[0.98] transition-transform"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
