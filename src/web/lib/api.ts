export type ApiErrorBody = { error: { code: string; message: string; field?: string } };

// One error type, thrown everywhere — pages read .message straight into the UI.
export class ApiError extends Error {
  code: string;
  field?: string;
  constructor(code: string, message: string, field?: string) {
    super(message);
    this.code = code;
    this.field = field;
  }
}

async function handle<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const err = (body as ApiErrorBody | null)?.error;
    throw new ApiError(err?.code ?? "UNKNOWN", err?.message ?? "Something went wrong. Try again.", err?.field);
  }
  return body as T;
}

export function get<T>(url: string): Promise<T> {
  return fetch(url, { credentials: "include" }).then((r) => handle<T>(r));
}

export function post<T>(url: string, data?: unknown): Promise<T> {
  return fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: data !== undefined ? JSON.stringify(data) : undefined,
  }).then((r) => handle<T>(r));
}
