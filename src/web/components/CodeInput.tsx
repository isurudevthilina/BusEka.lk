import { useRef, type KeyboardEvent } from "react";

type CodeInputProps = {
  value: string;
  onChange: (v: string) => void;
  error?: string;
};

// Six separate square boxes, monospace, uppercase, auto-advancing (DESIGN.md §7.1).
export function CodeInput({ value, onChange, error }: CodeInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const chars = value.padEnd(6, " ").slice(0, 6).split("");

  function setChar(i: number, ch: string) {
    const next = chars.slice();
    next[i] = ch || " ";
    const joined = next.join("").replace(/ +$/, "");
    onChange(joined.toUpperCase());
    if (ch && i < 5) refs.current[i + 1]?.focus();
  }

  function handleKeyDown(i: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !chars[i].trim() && i > 0) {
      refs.current[i - 1]?.focus();
    }
  }

  return (
    <div>
      <div className="flex gap-2 justify-center" role="group" aria-label="6-character join code" aria-invalid={!!error}>
        {chars.map((ch, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            value={ch.trim()}
            onChange={(e) => setChar(i, e.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(-1).toUpperCase())}
            onKeyDown={(e) => handleKeyDown(i, e)}
            maxLength={1}
            inputMode="text"
            autoCapitalize="characters"
            aria-label={`Code character ${i + 1}`}
            className={`w-11 h-14 text-center rounded-xl border text-[20px] font-mono font-semibold uppercase bg-surface dark:bg-surface-dark text-text dark:text-text-dark outline-none transition-colors ${
              error ? "border-delayed" : "border-border dark:border-border-dark focus:border-primary"
            }`}
          />
        ))}
      </div>
      {error && (
        <p className="mt-2 flex items-center justify-center gap-1 text-[13px] text-delayed">
          <span className="material-symbols-outlined text-[16px]">error</span>
          {error}
        </p>
      )}
    </div>
  );
}
