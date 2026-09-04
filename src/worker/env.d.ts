// The only integration contract (DESIGN.md §4). Every route produces or
// consumes Vehicle[] — never a parallel shape.
interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
  AI: Ai;
  ADMIN_KEY: string;
  WIALON_HOST?: string;
  WIALON_TOKEN_KOLLUPITIYA?: string;
}

// The Vehicle type itself lives in src/shared/vehicle.d.ts so the web project
// can see it too, without pulling @cloudflare/workers-types into the browser build.
