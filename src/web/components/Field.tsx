import type { InputHTMLAttributes, SelectHTMLAttributes, ReactNode } from "react";

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  helper?: string;
};

// Label + input + inline error, wired for aria-invalid/aria-describedby
// (DESIGN.md §7.1 — red is never the only signal, an icon rides with it).
export function Field({ label, error, helper, id, className, ...rest }: FieldProps) {
  const describedBy = error ? `${id}-error` : helper ? `${id}-helper` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-medium text-text/80 dark:text-text-dark/80">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={!!error}
        aria-describedby={describedBy}
        className={`min-h-11 rounded-xl border px-3.5 text-[15px] bg-surface dark:bg-surface-dark text-text dark:text-text-dark outline-none transition-colors ${
          error ? "border-delayed" : "border-border dark:border-border-dark focus:border-primary"
        } ${className ?? ""}`}
        {...rest}
      />
      {error ? (
        <p id={`${id}-error`} className="flex items-center gap-1 text-[13px] text-delayed">
          <span className="material-symbols-outlined text-[16px]">error</span>
          {error}
        </p>
      ) : helper ? (
        <p id={`${id}-helper`} className="text-[13px] text-text/60 dark:text-text-dark/60">
          {helper}
        </p>
      ) : null}
    </div>
  );
}

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string;
  children: ReactNode;
};

export function SelectField({ label, error, id, className, children, ...rest }: SelectFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-medium text-text/80 dark:text-text-dark/80">
        {label}
      </label>
      <select
        id={id}
        aria-invalid={!!error}
        className={`min-h-11 rounded-xl border px-3.5 text-[15px] bg-surface dark:bg-surface-dark text-text dark:text-text-dark outline-none transition-colors ${
          error ? "border-delayed" : "border-border dark:border-border-dark focus:border-primary"
        } ${className ?? ""}`}
        {...rest}
      >
        {children}
      </select>
      {error && (
        <p className="flex items-center gap-1 text-[13px] text-delayed">
          <span className="material-symbols-outlined text-[16px]">error</span>
          {error}
        </p>
      )}
    </div>
  );
}
