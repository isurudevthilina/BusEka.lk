// src/web/components/EmptyState.tsx

interface EmptyStateProps {
  icon: string;
  heading: string;
  body: string;
  action?: { label: string; onClick: () => void };
}

export default function EmptyState({ icon, heading, body, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-12 gap-4">
      <div className="w-16 h-16 rounded-full bg-[#ededfb] flex items-center justify-center text-[#434656]">
        <span className="material-symbols-outlined text-[32px]">{icon}</span>
      </div>
      <div>
        <h2 className="text-[18px] font-semibold text-[#191b25] mb-1">{heading}</h2>
        <p className="text-[14px] text-[#434656] leading-relaxed max-w-[280px] mx-auto">{body}</p>
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-2 px-5 py-2.5 rounded-xl bg-[#003ec7] text-white text-[14px] font-semibold
            active:opacity-90 transition-opacity min-h-[44px]"
          id="empty-state-action-btn">
          {action.label}
        </button>
      )}
    </div>
  );
}
