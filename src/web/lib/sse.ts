// src/web/lib/sse.ts
// useLive() hook — polling inside, can upgrade to SSE/WS later.
// Keeping the filename + hook signature means the DO upgrade is a one-file change.

import { useState, useEffect, useRef } from 'react';
import { api } from './api.js';

export function useLive<T>(url: string, intervalMs = 6000) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const timer = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const d = await api.get<T>(url);
        if (!cancelled) { setData(d); setError(null); setLoading(false); }
      } catch (e: any) {
        if (!cancelled) { setError(e.message); setLoading(false); }
      }
    }

    poll();
    timer.current = setInterval(poll, intervalMs);

    return () => {
      cancelled = true;
      clearInterval(timer.current);
    };
  }, [url, intervalMs]);

  return { data, error, loading };
}
