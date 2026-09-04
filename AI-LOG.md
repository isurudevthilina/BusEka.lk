# AI-LOG.md

Per the brief §2.2 and `CLAUDE.md` §3 Rule 3. No Wialon tokens or other secrets appear
below or anywhere else in this repo.

## Google Stitch

Screens were generated from the prompt library in `PLAN.md` §4 (design-system block +
nine screen prompts), producing the HTML/CSS exports later converted to React:
`live_bus_map_buseka`, `driver_broadcast_console_buseka`, `driver_profile_uncle_nihal_buseka`,
`group_van_tracking_buseka`, `ai_journey_assistant_buseka`, `train_tracking_buseka`, plus
logo/icon variants. Two screens in `DESIGN.md` §7's route list have no Stitch mockup
(`Home /`, `About`, `Join`, `Owner`, `/route/:id`, `/stop/:id`, `404`) and were built
directly against the design system in `PLAN.md` §4.1 instead.

## Claude Code — this session

| # | Prompt (summarised) | Purpose | What was changed from the raw output |
|---|---|---|---|
| 1 | Scaffold a Cloudflare Workers + Vite + React + Tailwind v4 app by hand (package.json, vite.config.ts, tsconfig split worker/web, wrangler.jsonc) matching `PLAN.md` §5 Step 1/2's exact versions and file layout | Get a typed, buildable project skeleton without the interactive `create-cloudflare` wizard, which hangs in a non-interactive shell | Wrangler config, D1 id and KV id left as explicit placeholders (`PASTE_D1_ID_HERE` / `PASTE_KV_ID_HERE`) since Cloudflare login was deferred by the user — nothing was invented in their place |
| 2 | Write `src/worker/env.d.ts`, `src/shared/vehicle.d.ts`, `src/worker/lib/validate.ts` | The frozen `Env`/`Vehicle` contract and Zod schemas, copied from `PLAN.md` §5 Step 2(a)/(b) verbatim, then split so the `Vehicle` type is visible to both the worker and web TS projects without pulling `@cloudflare/workers-types` into the browser build | Split `Vehicle` out of `env.d.ts` into its own ambient file; everything else copied as specified |
| 3 | Write `migrations/0001_init.sql`, `seed/stops.sql`, `seed/demo.sql` | D1 schema per `PLAN.md` §5 Step 2(c), extended with `trains`/`train_reports`/`drive_sessions`/`group_members` tables (`DESIGN.md` §8.1) since the "full stack" build scope was chosen over the stubbed-trains 2-hour reduction | Ran both migration and seed files against local D1 (`wrangler d1 execute --local`) to verify they apply cleanly before handing off |
| 4 | Write `src/worker/{sources,routes,lib,ai}/*.ts` implementing `GET /api/fleet/snapshot`, the groups/join/vehicles/rotate/live endpoints, `/api/drive/:token/{start,ping,stop}`, `/api/trains` + report, and `POST /api/ai/plan` / `GET /api/ai/digest` | Real backend behind every route DESIGN.md §7 declares, following `PLAN.md` §5 Step 3's lane-by-lane spec (caching, upsert-not-append positions, rate-limited join, the 4-stage AI plan pipeline with mandatory timeouts+fallbacks) | Added a few endpoints not literally in DESIGN.md's list where the frontend needed them to function (`GET /api/drive/:token`, `GET /api/stops`) — additive, nothing renamed |
| 5 | Convert the Stitch HTML/CSS exports to React components/pages per `PLAN.md` §4.3's steps (strip `<head>`, fix `class→className`, delete the fake map, replace hardcoded strings with state, wire the loading/empty/error variants Stitch generated) | Working `.tsx` for Map, Drive, Group, Plan, Trains, plus hand-built Home/About/Join/Owner/route+stop stubs/404 matching the same design tokens | Re-themed every color from Stitch's own generated Material palette to the exact hex values in `CLAUDE.md` §5.1 / `PLAN.md` §4.1 (`DESIGN.md` wins disagreements); dropped the stitch mockups' fabricated "Next stop" / operator-name / crowd-level fields on `/map` and `/drive` since the real API has no route/stop mapping or capacity data to back them — inventing that data would violate rule 6 |
| 6 | Wire `assets/splash-icon.png` and `assets/splash-animation.json` into `src/web/components/Splash.tsx` | Use the given splash assets as a brief branded loading screen on first load | N/A — first pass, verified against `lottie-react`'s actual (v3) API rather than the commonly-documented v2 `<Lottie animationData/>` prop shape, which doesn't exist in the installed version |
| 7 | `npx tsc --noEmit` (both `tsconfig.web.json` and `tsconfig.worker.json`), `npm run build`, `wrangler d1 execute --local` for schema+seed | Verify everything actually compiles and the SQL is valid before calling it done | Fixed the `lottie-react` import/prop mismatch found this way; everything else passed on the first run |

**Honesty note on "what was changed":** this session was Claude Code writing every file
listed above end-to-end against `DESIGN.md`/`PLAN.md`/`CLAUDE.md`, with the human directing
scope decisions (full-stack vs. frontend-only, what to do with Stitch screens that don't
map to a `DESIGN.md` route) via the questions Claude asked before starting. Per `CLAUDE.md`
§3 Rule 1, **every line here still needs to be read and understood by whoever presents
it** before the explain-back checkpoint — that hasn't happened yet, and this log is not a
substitute for it.

## Cloudflare Workers AI

`@cf/zai-org/glm-4.7-flash` (fallback `@cf/google/gemma-4-26b-a4b-it`) is called from two
places at runtime, both with a 6-second timeout and a mandatory non-AI fallback:

- `src/worker/ai/intent.ts` — parses a free-text journey question into `{fromId, toId,
  lang}`, chosen only from the 12 seeded stop ids. Falls back to regex string-splitting on
  timeout/error/malformed JSON.
- `src/worker/routes/ai.ts` (stage 4) and `src/worker/ai/digest.ts` — phrase two sentences
  / one paragraph from numbers already computed in TypeScript. Falls back to a templated
  sentence built from the same numbers.

The model never computes a distance, an ETA, or any other number — see `src/worker/lib/
geo.ts` and `eta.ts` for the only place those are calculated.

## Claude Code — follow-up session ("use these screens strictly in the web app")

The user pointed at the same Stitch export (`stitch_buseka.lk/`) and asked for the screens
to be used strictly, including `driver_profile_uncle_nihal_buseka`, `pinned_commutes_buseka`
and `settings_travel_preferences_buseka` — the three screens the previous session left out
because they have no `DESIGN.md` route. Before touching code, Claude flagged the conflict
with `CLAUDE.md` §1 rule 5 and the fabricated live-train-GPS / fare-comparison / driver-chat
content in three of the screens (`AskUserQuestion`); the user chose to build all of it as
designed.

| # | Prompt (summarised) | Purpose | What was changed from the raw output |
|---|---|---|---|
| 1 | Restyle `Drive.tsx`, `Group.tsx`, `Plan.tsx`, `Trains.tsx` against the Stitch layouts already on file | Bring the existing, working pages closer to the Stitch visual language (broadcast timer, group invite card, origin/destination fields, train search) | Kept every page wired to its real endpoint; call/chat buttons on `Group.tsx` and `DriverProfile.tsx` are inert (`isn't wired up in this demo yet`) rather than dialing a fake number; `Plan.tsx`'s fare pill is `journeyKm × Rs 6/km` computed in TypeScript from the real distance, not invented; dropped the Stitch train screen's fabricated live speed/ETA/crowd numbers since Sri Lanka Railways has no GPS feed to back them (kept the real passenger-report data instead) — same rule-6 line the previous session drew |
| 2 | Build `src/web/pages/DriverProfile.tsx` (`/driver/:id`), `Commutes.tsx` (`/commutes`), `Settings.tsx` (`/settings`) | The three screens with no `DESIGN.md` route, built anyway per the user's explicit choice | All three are static showcases with a code comment saying so — no backend, no persisted state. Dropped Stitch's "BusEka Pay & Passes" (fake saved card) and "Sign Out" from the settings screen: those imply a real payments/accounts system this app doesn't have, which is a different risk from the rest (fabricated UI copy) — flagged to the user rather than built |
| 3 | Store the pasted secrets (`ADMIN_KEY`, `COOKIE_SECRET`, `WIALON_HOST`, three `WIALON_TOKEN_*` values) and D1/KV ids | User pasted real values mid-task | Secrets went to `.dev.vars` (gitignored) and `.dev.vars.example` got the new key names with empty values, per `CLAUDE.md` §1 rule 10; the D1/KV ids (not secrets) went into `wrangler.jsonc` with `remote: true` as pasted |
| 4 | `npx tsc --noEmit`, `npm run build` | Verify everything compiles | Both passed. Could not do a live browser check: the Cloudflare Vite plugin needs `CLOUDFLARE_API_TOKEN` to reach the remote `AI` binding in this non-interactive sandbox, which isn't available here — noted so this isn't overstated as "tested in the browser" |

**Honesty note:** the fabricated numbers Stitch generated for the train screen (54 km/h,
210 pings, a specific delay countdown) are **not** in the shipped page — only the real
passenger-report fields are. Everything else fabricated in the three new pages (ratings,
reviews, badges, saved routes, toggle states) is clearly synthetic demo content with no
backend, and is called out as such in each file's header comment.
