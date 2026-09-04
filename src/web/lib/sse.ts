import { useCallback, useEffect, useRef, useState } from "react";
import { get } from "./api";

// Polling today; the name and signature stay the same when this becomes a
// real SSE subscription off the DESIGN.md §2 Durable Objects — a one-file
// change, not a rewrite of every page that calls it.
export function useLive<T>(url: string, ms = 6000) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const urlRef = useRef(url);
  urlRef.current = url;

  const tick = useCallback(async () => {
    try {
      const result = await get<T>(urlRef.current);
      setData(result);
      setError(null);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const result = await get<T>(urlRef.current);
        if (!cancelled) {
          setData(result);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e as Error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    const id = setInterval(run, ms);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [url, ms]);

  return { data, error, loading, refresh: tick };
}
