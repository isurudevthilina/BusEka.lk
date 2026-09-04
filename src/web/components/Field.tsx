// src/web/components/Field.tsx
// Label + input + inline error + aria

interface FieldProps {
  id: string;
  label: string;
  helper?: string;
  error?: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  maxLength?: number;
  autoComplete?: string;
  inputMode?: 'text' | 'numeric' | 'tel' | 'email';
}

export default function Field({
  id, label, helper, error, type = 'text', placeholder,
  value, onChange, maxLength, autoComplete, inputMode,
}: FieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-[13px] font-medium text-[#434656]">{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        autoComplete={autoComplete}
        inputMode={inputMode}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : helper ? `${id}-hint` : undefined}
        className={`w-full min-h-[44px] px-3 rounded-xl bg-[#ededfb] text-[#191b25] text-[15px]
          focus:outline-none focus:ring-2 focus:ring-[#003ec7] transition
          ${error ? 'ring-2 ring-[#ba1a1a]' : ''}`}
      />
      {helper && !error && (
        <span id={`${id}-hint`} className="text-[12px] text-[#434656]">{helper}</span>
      )}
      {error && (
        <span id={`${id}-error`} role="alert" className="flex items-center gap-1 text-[12px] text-[#ba1a1a]">
          <span className="material-symbols-outlined text-[14px]">warning</span>
          {error}
        </span>
      )}
    </div>
  );
}
