type FilterChipsProps = {
  options: string[];
  active: string;
  onChange: (v: string) => void;
};

export function FilterChips({ options, active, onChange }: FilterChipsProps) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`shrink-0 px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-colors ${
            active === opt
              ? "bg-text text-page dark:bg-text-dark dark:text-page-dark"
              : "bg-surface dark:bg-surface-dark text-text dark:text-text-dark border border-border dark:border-border-dark"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
