// src/web/lib/api.ts
// Typed fetch wrapper — single place for API errors

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public field?: string,
    public status?: number,
  ) {
    super(message);
  }
}

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...((init?.headers) ?? {}) },
    ...init,
  });
  const data = await res.json() as any;
  if (!res.ok) {
    const e = data?.error;
    throw new ApiError(e?.code ?? 'UNKNOWN', e?.message ?? 'Something went wrong.', e?.field, res.status);
  }
  return data as T;
}

export const api = {
  get: <T>(url: string) => apiFetch<T>(url),
  post: <T>(url: string, body: unknown) =>
    apiFetch<T>(url, { method: 'POST', body: JSON.stringify(body) }),
};

// Convenience: relative time
export function relTime(tsMs: number): string {
  const secs = Math.floor((Date.now() - tsMs) / 1000);
  if (secs < 5) return 'just now';
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}
