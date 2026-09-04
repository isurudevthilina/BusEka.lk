# BusEka.lk

**Every bus in Sri Lanka. One map.** Plus a way to track the school van, using nothing but
the driver's phone.

## The problem

A commuter in Sri Lanka waiting for a bus has no way to know if one is coming. Three
separate operators already track buses live — SPRPTA tracks 1,192 buses in the Southern
Province, Lanka Metro tracks the Colombo MetroBus corridors, and private depots track
their own fleets on Wialon — but each sits in its own app, and none of them talk to each
other. Meanwhile the vehicles families care about most — the school van, the office
shuttle, the factory bus — have no tracking at all, so a parent's only option is to phone
the driver.

**Who this affects:** daily commuters on 356+ Southern Province routes; Colombo MetroBus
riders on CM01/CM02; parents of the children in Sri Lanka's private school-van fleet; and
the small bus and van owners who have no way to offer tracking without buying hardware.

## The solution

BusEka is one live map for every operator's public buses, plus **private group
tracking**: any owner can put their own vehicle on the map in under a minute using nothing
but the driver's phone as the GPS transponder. A 6-character code, no accounts, no
hardware to buy.

## Main features

- **Live map** (`/map`) — every SPRPTA bus in one place, filterable, searchable, with a
  vehicle detail sheet.
- **Private group tracking** (`/join`, `/owner`, `/g/:code`) — create a group, add
  vehicles, share a 6-character join code. Only people with the code can see the group's
  vehicles.
- **Driver broadcast** (`/drive/:token`) — the driver's own phone becomes the GPS tracker,
  no app install, no hardware. Includes a "simulate route" fallback for demos.
- **AI journey assistant** (`/plan`) — ask "Galle to Matara" in English, Sinhala or
  Singlish; the model parses the question, but every distance and ETA is computed in
  TypeScript, never invented by the model.
- **Honest train tracking** (`/trains`) — Sri Lanka Railways publishes no live GPS feed,
  so this board runs on passenger "I'm at this station" reports instead of pretending to
  track trains it can't see.

## Technologies

- **Cloudflare Workers** (with Static Assets) — one deployment for the API and the SPA,
  no CORS, no second URL.
- **Cloudflare D1** — groups, vehicles, positions (group-tracked vehicles only, upserted
  one row per vehicle), stops, trains.
- **Cloudflare KV** — the cached public fleet snapshot (12s freshness, 60s TTL) and the
  AI network digest.
- **Cloudflare Workers AI** (`@cf/zai-org/glm-4.7-flash`, fallback
  `@cf/google/gemma-4-26b-a4b-it`) — journey-question parsing and answer phrasing only;
  never a calculation.
- **Hono** (API routing) + **Zod** (validation) on the Worker.
- **React 19 + React Router 7 + Tailwind CSS v4 + Leaflet** on the frontend, built with
  Vite and `@cloudflare/vite-plugin`.

## AI tools used

- **Google Stitch** — generated the initial screen layouts (live map, driver broadcast,
  group tracking, AI journey assistant, train board) and design system used as the visual
  reference for the React components.
- **Claude Code** — converted the Stitch mockups to Tailwind/React, wrote every Worker
  route, the D1 schema, and the AI orchestration in `src/worker/routes/ai.ts` against
  `DESIGN.md`.
- **Cloudflare Workers AI** (`glm-4.7-flash`) — runs inside the deployed app to parse
  journey questions and phrase the two-sentence answer on `/plan`, and to write the
  one-paragraph network digest on `/`. All distances and ETAs are computed in
  `src/worker/lib/geo.ts` / `eta.ts` — the model only ever phrases numbers it's handed.

## Team

| Name | Student ID | What they built |
|---|---|---|
| — | — | _fill in_ |
| — | — | _fill in_ |
| — | — | _fill in_ |
| — | — | _fill in_ |

## Install & run

```bash
npm install

# One-time Cloudflare setup (see "Cloudflare setup" below)
npx wrangler login
npx wrangler d1 create buseka
npx wrangler kv namespace create CACHE
# paste the returned IDs into wrangler.jsonc

npx wrangler d1 execute buseka --local  --file=./migrations/0001_init.sql
npx wrangler d1 execute buseka --remote --file=./migrations/0001_init.sql
npx wrangler d1 execute buseka --local  --file=./seed/stops.sql
npx wrangler d1 execute buseka --remote --file=./seed/stops.sql
npx wrangler d1 execute buseka --local  --file=./seed/demo.sql
npx wrangler d1 execute buseka --remote --file=./seed/demo.sql

npm run dev      # local dev (needs the Cloudflare steps above — Workers AI has no local emulator)
npm run deploy   # build + wrangler deploy
```

### Cloudflare setup

This repo ships with **placeholder IDs** in `wrangler.jsonc` (`PASTE_D1_ID_HERE`,
`PASTE_KV_ID_HERE`) — no D1 database or KV namespace has been created yet, and nothing has
been deployed. After `npx wrangler login`:

1. `npx wrangler d1 create buseka` → paste the `database_id` into `wrangler.jsonc`.
2. `npx wrangler kv namespace create CACHE` → paste the `id` into `wrangler.jsonc`.
3. Run the migration + seed commands above, both `--local` and `--remote` (two separate
   databases — seeding only one is a guaranteed gap between what you see locally and what
   the deployed URL shows).
4. `npm run deploy`.

The `AI` binding needs no setup — Workers AI is available on every account. Local `npm run
dev` still needs `wrangler login` (or a `CLOUDFLARE_API_TOKEN`) because Workers AI has no
local emulator; the Worker's dev session proxies AI calls to the real edge.

## Deployed link

_Add the `*.workers.dev` URL here after running `npm run deploy`._

## Video

_Add the demo video link here._

## Future work

- `/route/:id`, `/stop/:id` — full route polylines and per-stop departure boards (folded
  into the `/map` vehicle sheet for now).
- Group ETA-to-a-saved-stop on `/g/:code`.
- Wialon depot fleets as a third live source (`sources/wialon.ts`, see `DESIGN.md` §4).
- Lanka Metro as a fourth live source (`DESIGN.md` §5.1).
- Durable Objects (`FleetHub`, `GroupRoom`) replacing polling with real SSE fan-out —
  `src/web/lib/sse.ts`'s `useLive()` hook keeps the same name/signature specifically so
  this becomes a one-file change later.
