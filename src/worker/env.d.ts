/// <reference types="@cloudflare/workers-types" />

interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
  AI: Ai;
  ADMIN_KEY: string;
  WIALON_HOST?: string;
  WIALON_TOKEN_KOLLUPITIYA?: string;
  WIALON_TOKEN_JAELA?: string;
  WIALON_TOKEN_NEGOMBO?: string;
}

type Vehicle = {
  id: string;           // "sprpta:868982050024918" | "group:7"
  source: 'sprpta' | 'group' | 'wialon';
  label: string;        // "ND-7217"
  routeNo?: string;     // "383/2"
  lat: number;
  lng: number;
  speedKmh: number;
  ts: number;           // ms epoch
  stale: boolean;       // ts older than 120 s
};

type ApiError = {
  error: {
    code: string;
    message: string;
    field?: string;
  };
};

type FleetSnapshot = {
  vehicles: Vehicle[];
  live: number;
  total: number;
  ts: number;
  stale: boolean;
};
