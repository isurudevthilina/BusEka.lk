// src/web/components/CodeInput.tsx
// 6-box monospace code entry with auto-advance

import { useRef, KeyboardEvent, ClipboardEvent } from 'react';

interface CodeInputProps {
  value: string;           // always 6 chars (padded with '')
  onChange: (v: string) => void;
  error?: string;
}

export default function CodeInput({ value, onChange, error }: CodeInputProps) {
  const boxes = useRef<(HTMLInputElement | null)[]>([]);
  const chars = value.toUpperCase().split('').concat(Array(6).fill('')).slice(0, 6);

  function update(idx: number, ch: string) {
    const next = [...chars];
    next[idx] = ch.toUpperCase().replace(/[^A-Z0-9]/, '').slice(-1);
    onChange(next.join(''));
    if (ch && idx < 5) boxes.current[idx + 1]?.focus();
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>, idx: number) {
    if (e.key === 'Backspace' && !chars[idx] && idx > 0) {
      const next = [...chars];
      next[idx - 1] = '';
      onChange(next.join(''));
      boxes.current[idx - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && idx > 0) boxes.current[idx - 1]?.focus();
    if (e.key === 'ArrowRight' && idx < 5) boxes.current[idx + 1]?.focus();
  }

  function onPaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const text = e.clipboardData.getData('text').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    onChange(text.padEnd(6, ' ').slice(0, 6).trimEnd());
    boxes.current[Math.min(text.length, 5)]?.focus();
  }

  return (
    <div>
      <div className="flex gap-2 justify-center" role="group" aria-label="6-character group code">
        {chars.map((ch, i) => (
          <input
            key={i}
            ref={(el) => { boxes.current[i] = el; }}
            id={`code-box-${i}`}
            type="text"
            inputMode="text"
            maxLength={1}
            value={ch}
            onChange={(e) => update(i, e.target.value)}
            onKeyDown={(e) => onKey(e, i)}
            onPaste={onPaste}
            onFocus={(e) => e.target.select()}
            aria-label={`Code digit ${i + 1}`}
            className={`w-12 h-14 text-center text-[20px] font-mono font-bold rounded-xl
              bg-[#ededfb] text-[#191b25] uppercase
              focus:outline-none focus:ring-2 focus:ring-[#003ec7] transition
              ${error ? 'ring-2 ring-[#ba1a1a]' : ''}`}
          />
        ))}
      </div>
      {error && (
        <p role="alert" className="mt-2 flex items-center justify-center gap-1 text-[12px] text-[#ba1a1a]">
          <span className="material-symbols-outlined text-[14px]">warning</span>
          {error}
        </p>
      )}
    </div>
  );
}
