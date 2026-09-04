// The only integration contract (DESIGN.md §4). Every worker route and every
// web page produces or consumes Vehicle[] — never a parallel shape. Shared
// (ambient, no imports) so both the worker and web TS projects see the same
// type without pulling Cloudflare's workers-types into the browser build.
type Vehicle = {
  id: string; // "sprpta:868982050024918" | "group:7"
  source: "sprpta" | "group" | "wialon";
  label: string; // "ND-7217"
  routeNo?: string; // "383/2"
  lat: number;
  lng: number;
  speedKmh: number;
  ts: number; // ms epoch
  stale: boolean; // ts older than 120s
};
