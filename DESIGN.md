# BusEka.lk — DESIGN.md

**SE3090 Assignment 2 — Mini Hackathon (4 hours, in-class, supervised)**
Sri Lanka's public transport is trackable — but the data is scattered across three
incompatible operator apps, and the 80% of vehicles with no tracker at all are invisible.
BusEka is one map for all of it.

---

## 0. Read this first — three corrections to the brief

I checked the assumptions in the request before designing around them. Three of them
don't hold, and the design accounts for that.

### 0.1 The RDMNS GitHub repo is **not** a live train feed

`A-Samod/sri-lanka-railways-location-api` is a **self-hosted Express + MongoDB ingest
server**. It has:

- no deployed public base URL (README only documents `localhost:5000`)
- no data source — `POST /location` is an endpoint *you* feed, not one that is fed
- five endpoints total: `POST /location`, `GET /location/:trainId`,
  `GET /location/history/:trainId`, `GET /train-history`, `GET /location-history`
- a 90-day retention cron

`rdmns.lk` (the popular app) is a **separate commercial product** whose live positions are
**crowdsourced from ~1,000 volunteer "updators"**, and it publishes **no public API**.

**What this means:** you cannot get live Sri Lanka Railways GPS from either. Sri Lanka
Railways does not operate a public real-time position API.

**Design decision:** we implement the **RDMNS endpoint contract** ourselves on
Cloudflare D1, and feed it from **BusEka's own crowdsourced reports** plus seeded
timetable data. That is honest, it is demoable in four hours, and — importantly for the
*"practicality & creativity"* 15 marks — it is the same mechanism the real RDMNS uses.
See §5.3. Do **not** claim live railway GPS in the demo video.

### 0.2 Four core features + AI in four hours is over-scope for a cold start

The rubric's largest single block is **20 marks for the ten minimum requirements
"present and working reliably"** — not for feature count. A team that ships four features
at 70% scores *lower* than a team that ships four at 100%. §9 therefore defines a
**Minute-175 Cut Line**: an explicit, pre-agreed list of what gets deleted rather than
debugged. Agree to it at minute 20 and do not renegotiate it at minute 160.

Also note the integrity rule: *"submitting a pre-built or previous project as new work is
not permitted."* This document is a **plan** (permitted — §2.1 of the brief lists
"researching the problem and framing the idea" and "generating UI layout" as permitted AI
uses). Code gets written in the session. Every member must be able to explain any file
they touched — the evaluator can ask for a live modification.

### 0.3 Credentials

The four Wialon tokens supplied are **live credentials**, and two of them
(`WIALON_TOKEN` and `KOLLUPITIYA_TOKEN`) are byte-identical — so there are **three
distinct fleets**, not four. They must:

- **never** be committed (`.dev.vars` is gitignored; production uses
  `wrangler secret put`)
- be redacted from the mandatory AI Prompt Log and the submission PDF (§2.2 of the brief
  requires this explicitly)

The Lanka Metro "public website JWT" from `findings 1.md` is **Lanka Metro's
infrastructure token**, not ours. Their own findings note says don't hardcode it. We use
it **read-only for the live map only**, behind a single config constant, with visible
attribution — and the design works without it (§5.1 fallback). Never touch their
wallet/pass/payment endpoints in a graded submission; those need a user's own OTP login
and carry real money.

---

## 1. The problem (in-app copy — Requirement #2, worth 10 marks)

> **The problem.** A commuter in Sri Lanka waiting for a bus has no way to know if one is
> coming. Three separate operators already track buses live — SPRPTA tracks 1,192 buses in
> the Southern Province, Lanka Metro tracks the Colombo MetroBus corridors, and private
> depots track their own fleets on Wialon — but each sits in its own app, and none of them
> talk to each other. Meanwhile the vehicles families care about most — the school van, the
> office shuttle, the factory bus — have no tracking at all, so a parent's only option is to
> phone the driver.
>
> **Who this affects.** Daily commuters on 356+ Southern Province routes; Colombo
> MetroBus riders on CM01/CM02; parents of the children in Sri Lanka's private school-van
> fleet; and the small bus and van owners who have no way to offer tracking without buying
> hardware.
>
> **What BusEka does.** One map for every operator, plus a way for any owner to put their
> own vehicle on it in 60 seconds using nothing but the driver's phone.

Keep this on `/` and `/about`. Rubric band 9–10 requires *"affected users named"* — name
them.

---

## 2. Architecture

Everything is one Cloudflare Worker. One `wrangler deploy`. Free tier throughout.

```
                      ┌───────────────────── UPSTREAMS ──────────────────────┐
                      │                                                      │
   api.spgps.lk  ─────┤ REST snapshot (1,192 buses) + wss://ws.spgps.lk      │
   metrobusapi…  ─────┤ REST routes/stops + wss ticketing-service/ws         │
   hst-api.wialon ────┤ token/login → core/search_items (3 depot fleets)     │
                      └──────────────────────────┬───────────────────────────┘
                                                 │ (server-side only:
                                                 │  Origin header spoofing,
                                                 │  +1 coord correction,
                                                 │  secret handling)
                    ┌────────────────────────────▼────────────────────────────┐
                    │  Durable Object:  FleetHub  (singleton, SQLite-backed)  │
                    │  • holds upstream WS connections                        │
                    │  • normalises 3 schemas → one Vehicle shape             │
                    │  • in-memory ring of latest positions                   │
                    │  • fans out to N browser clients over SSE               │
                    └────────────────────────────┬────────────────────────────┘
                                                 │
   ┌──────────────┐   ┌──────────────────────────▼──────────────┐   ┌──────────────┐
   │ Durable Obj: │   │        Worker (Hono)                    │   │  Workers AI  │
   │  GroupRoom   │◄──┤  /api/*  routes • auth • validation      ├──►│ glm-4.7-flash│
   │  (per group, │   │  /*      static assets (React SPA)       │   │ bge-m3 embed │
   │   SQLite)    │   │  scheduled() cron every 1 min            │   │  + Vectorize │
   └──────────────┘   └──────┬──────────────┬──────────────┬─────┘   └──────────────┘
                             │              │              │
                          ┌──▼──┐       ┌───▼───┐     ┌────▼────┐
                          │ D1  │       │  KV   │     │Vectorize│
                          │ SQL │       │ cache │     │ routes  │
                          └─────┘       └───────┘     └─────────┘
```

### 2.1 Why each choice (worth 10 marks — *"stack choices justified"*)

| Choice | Justification you say out loud in the demo |
|---|---|
| **Single Worker + Assets** | One deploy artifact, one URL, no CORS between front and back, no cold start. Rubric wants *"a public link that works reliably for anyone"* — fewer moving parts, fewer ways to fail. |
| **Durable Object hub** | `wss://ws.spgps.lk` **rejects any connection whose `Origin` isn't `https://spgps.lk`** — a browser cannot forge that header, a Worker can. The DO is not decoration; it is the only thing that makes the SPRPTA feed reachable at all. It also collapses 3 upstream sockets into 1 regardless of how many users are watching. |
| **SSE, not WebSocket, to the browser** | One-way data. SSE auto-reconnects natively, survives proxies, and is ~20 lines. WebSocket would be extra code for zero benefit. |
| **SQLite-backed DOs** | Confirmed available on the **Workers Free plan** (KV-backed DOs are not). Config must use `new_sqlite_classes`. |
| **D1** | Relational data (routes → stops → groups → vehicles) with real joins. SQLite semantics the whole team already knows. |
| **KV** | Read-heavy, latency-critical, tolerant of staleness: the fleet snapshot and the cached AI digest. |
| **Workers AI only** | Zero external keys, zero egress risk, nothing to rate-limit us mid-demo, and it keeps the "entirely on Cloudflare" story clean. Free allocation is **10,000 Neurons/day, reset 00:00 UTC**. Budget in §6.5. |
| **React + Vite + Hono** | Four people can own four page groups in parallel with no merge conflicts. Build is ~3 s. |

---

## 3. The four core functions

These are the four that must work. Not user management — user management is a *supporting*
concern (§5.4) and is deliberately kept to almost nothing.

| # | Function | One-line demo proof |
|---|---|---|
| **F1** | **Unified live transport map** | Three operators' buses moving on one map, filterable, with a live vehicle counter. |
| **F2** | **Private group tracking with 6-digit join codes** | Owner creates "Lyceum Van 12", gets code `483911`; a parent types it and sees the van. |
| **F3** | **Driver broadcast — phone as GPS tracker** | Presenter opens `/drive` on their phone, taps *Start trip*, and their own dot appears on the audience's screen within 5 seconds. |
| **F4** | **AI journey assistant** | Type *"Kollupitiya to Negombo now"* → a bus+train itinerary built from live positions, in English, Sinhala or Tamil. |

**F3 is the demo hero.** It is the only feature whose value is *felt* by the room — a
live dot that follows the presenter walking across the lecture hall. Build it third but
rehearse it first.

---

## 4. Feature specifications

### F1 — Unified live transport map

**Sources and their quirks (all three verified from the findings docs):**

| Source | Transport | Key | Gotcha |
|---|---|---|---|
| SPRPTA (`api.spgps.lk`) | REST snapshot + `wss://ws.spgps.lk?token=public&tabId=<uuid>` | `imei` | `Origin: https://spgps.lk` **exactly** — `www.` gives 401. Send `"ping"` every 60 s. Batches ~50 moved buses at a time. |
| Lanka Metro | REST `/fare-service/api/v1/routes/geo` + `wss://…/ticketing-service/ws?token=` | `registration_number` | **Server adds +1 to both lat and lng as anti-scraping. Subtract 1 from both before doing anything.** Payload contains all routes; filter by `route_id` + `direction_id`. |
| Wialon (3 depots) | `token/login` → `core/search_items` polling | `unit id` | Session ID expires after ~5 min idle. Position is `pos:{x:lon, y:lat, s:speed, c:course, t:unix}` — **x is longitude**, a classic swap bug. |

**Wialon call sequence** (each depot token, in the DO, once at boot then re-login on 1003):

```
GET {WIALON_HOST}/wialon/ajax.html
    ?svc=token/login&params={"token":"<secret>"}                    → { eid, user }

GET {WIALON_HOST}/wialon/ajax.html?sid={eid}
    &svc=core/search_items
    &params={"spec":{"itemsType":"avl_unit","propName":"sys_name",
             "propValueMask":"*","sortType":"sys_name"},
             "force":1,"flags":1025,"from":0,"to":0}
                              ↑ flags 1 (base) | 1024 (last position)
```

Poll `search_items` every 20 s per depot. `WIALON_HOST` defaults to
`https://hst-api.wialon.com` — **confirm this in the pre-flight checklist (§10)**; Sri
Lankan Wialon resellers frequently self-host on their own domain, and if they do, only
the host string changes.

**Normalised internal shape — everything upstream collapses to this:**

```ts
type Vehicle = {
  id: string;              // "sprpta:868982050024918" | "lmt:NA-1234" | "wln:kollupitiya:41"
  source: 'sprpta' | 'lmt' | 'wialon' | 'group' | 'driver';
  label: string;           // "ND-7217"
  routeNo?: string;        // "383/2"
  lat: number; lng: number;
  speedKmh: number;
  headingDeg?: number;
  ts: number;              // ms epoch
  stale: boolean;          // ts older than 120 s
};
```

**UI:** MapLibre GL JS + free OSM raster tiles (no key, no billing surprise). At 780+
live buses, **do not create 780 DOM markers** — that will drop the demo to 5 fps on the
projector. Use one `GeoJSON` source + a `circle` layer with a `symbol` layer above it,
and call `source.setData()` on each SSE frame. Cluster above zoom 11.

**Filters:** operator chips (SPRPTA / MetroBus / Depot / Community), route-number search,
"only moving", and a live counter — *"1,043 vehicles · 812 live · updated 2 s ago"*. That
counter is your proof-of-life on camera.

### F2 — Private group tracking, 6-digit join code

**Flow:**

```
Owner  → /owner → "Create group" form → group + 6-digit code + owner PIN
       → "Add vehicle" form → vehicle + a per-vehicle driver link  /drive/<driveToken>
       → shares the 6-digit code with parents / staff

Member → /join → types 483911 (+ display name) → cookie-scoped membership
       → /g/483911 → map showing ONLY that group's vehicles + ETA to a saved stop
```

**Security — say this in the demo, it reads as engineering maturity:**

- A 6-digit code is only 10⁶ possibilities. Brute force is a real attack.
- Mitigation: rate-limit joins to **5 attempts / minute / IP**, counted **inside the
  `GroupRoom` DO** (a DO is a single-threaded actor, so the counter is genuinely
  consistent — this is a *reason* to use a DO, not an accident of one).
- Codes exclude `0/O/1/I` (base-32 Crockford-ish alphabet over 6 chars) to kill
  transcription errors, and are checked for collision on insert.
- Owner actions require a **4-digit owner PIN**, hashed with SHA-256 + per-group salt via
  WebCrypto. Members are cookie-scoped; no accounts, no passwords, no email.
- Store display names only. No child names, no phone numbers, no NIC. Say this out loud —
  it is a school-van app.

**Codes are not secrets forever:** `expires_at` defaults to 90 days, and the owner can
rotate the code from `/owner` (old code dies immediately).

### F3 — Driver broadcast (phone as GPS)

The feature that makes F2 real without a single piece of hardware.

```
/drive/<driveToken>
  ├─ big green [ Start trip ] button
  ├─ navigator.geolocation.watchPosition({ enableHighAccuracy: true, maximumAge: 5000 })
  ├─ POST /api/drive/ping every 5 s (or on 25 m movement, whichever first)
  ├─ wake-lock via navigator.wakeLock so the screen doesn't sleep mid-run
  ├─ live status line: accuracy ±8 m · 14 pings sent · 3 viewers watching
  └─ [ End trip ]
```

Pings go straight to the vehicle's `GroupRoom` DO, which appends to its own SQLite and
broadcasts to every SSE listener on that group. Public-route drivers (a bus owner with no
tracker) can instead attach their broadcast to a **public route number**, which puts them
on the main `/map` under the `community` source — that is the "let other bus owners share
their location" ask, and it is the same code path.

**Three things that will bite you, in order of likelihood:**

1. **Geolocation requires HTTPS.** `workers.dev` is HTTPS, so deployed is fine — but
   `localhost` is also treated as a secure origin, so local dev works too. A LAN IP like
   `192.168.1.5:5173` will **silently fail**. Test on the deployed URL.
2. **iOS Safari** throttles `watchPosition` hard when the tab backgrounds. Keep the screen
   on (wake-lock) and keep the tab foregrounded during the demo.
3. **Permission denial is not an error state, it's a UI state.** Show *"Location blocked —
   here's how to enable it"* with the two-tap path, and offer a **Simulate route** button
   that replays a canned polyline. That button is also your insurance policy if the venue
   Wi-Fi blocks geolocation. Build it; it costs 15 minutes and saves the demo.

### F4 — AI journey assistant

**The single most important design rule in this document:**

> **The LLM never computes a number.** Distances, ETAs and transfer times are computed in
> deterministic TypeScript. The model only (a) turns messy trilingual text into structured
> intent, and (b) turns a computed itinerary into a readable sentence.

Say exactly that sentence in the demo. The rubric's top band for AI is *"AI output
reviewed and tested; code fully explained"* — a team that can articulate where the model
is **not** trusted is demonstrating precisely that.

**Pipeline:**

```
"kollupitiya idn negombo yanna oona"        ← Singlish, real user input
        │
   ①  Intent extraction  — @cf/zai-org/glm-4.7-flash, JSON mode
        │  { from:"Kollupitiya", to:"Negombo", when:"now", lang:"si-latn" }
        │
   ②  Place resolution   — @cf/baai/bge-m3 embeddings → Vectorize
        │  (bge-m3 is multilingual across 100+ languages — it handles
        │   "කොළඹ", "Colombo", "kolamba" against the same vector)
        │  → { fromStop: id 4412, toStop: id 8871, confidence 0.91 }
        │
   ③  Itinerary search   — PURE TYPESCRIPT, no model
        │  route graph over D1 route_stops, ≤1 transfer,
        │  live ETA per leg from FleetHub, train legs from §5.3
        │
   ④  Narration          — glm-4.7-flash, temperature 0.2, given ONLY the
                           computed legs, told "do not invent times"
        │
   → "Take the 240 from Kollupitiya — one is 4 minutes away at Bambalapitiya.
      Change at Ja-Ela for the 4-4. Total about 1 h 25 m."
```

**ETA maths (deterministic, lifted from the pattern in `findings 1.md`):**

```
1. candidate buses = live vehicles on (route, direction)
2. for each: nearestStopIndex via haversine over the route's stop list
3. keep only nearestStopIndex <= userStopIndex   (hasn't passed you yet)
4. remaining distance = sum of stop-to-stop legs from bus → user stop
5. effectiveSpeed = speed > 2 km/h ? speed : 25    (a stopped bus isn't stopped forever)
6. eta = remainingDistance / effectiveSpeed
7. display:  ≤1 min → "Arriving" | ≤10 min → "6 min" | >10 min → "3:45 PM"
             + amber "delayed" badge when |live − scheduled| > 2 min
```

Unit-test steps 2, 3 and 5 — they are three lines each and they are exactly the kind of
thing an evaluator can ask you to modify live.

---

## 5. Supporting functions

### 5.1 Route & stop explorer
`/route/:id` — polyline, ordered stops, every live vehicle on it, per-stop ETA board.
Lanka Metro stops carry `stop_name_en` / `_si` / `_tm`, so trilingual labels come free
there. **Watch out:** the CM01 stop sequence has gaps (5, 7–9, 12, 14, 18, 22–24, 27) for
`status:"inactive"` stops — filter on `status === "active"`, don't assume contiguous
`sequence_number`.

**Fallback if the Lanka Metro token is unusable:** drop MetroBus from the live layer and
keep its static routes/stops from a seeded JSON. F1 still demonstrates three sources
(SPRPTA + Wialon + community broadcasts). Nothing else in the design changes.

### 5.2 Stop board
`/stop/:id` — a departure board for one stop. This is the screen a real commuter would
pin, and it is the cleanest possible answer to Requirement #6 (*display, search, filter,
calculate, update or process information*).

### 5.3 Train tracking — the RDMNS-contract approach

Since no live railway feed exists (§0.1), we build the missing piece:

- **D1 tables** `trains`, `train_reports` mirroring the RDMNS repo's schema, and endpoints
  that **match its contract exactly**: `POST /api/location`, `GET /api/location/:trainId`,
  `GET /api/location/history/:trainId`. That means anyone already running that open-source
  server can point at us, and we can point at them — say this, it is a genuine
  interoperability argument.
- **Fed by:** (a) passengers reporting *"Train 1005 just left Ragama"* from `/trains` —
  two taps, no typing; (b) seeded SLR timetable rows so the board is never empty.
- **Confidence model:** a position is `confirmed` (≥2 independent reports within 4 min),
  `reported` (1), or `scheduled` (timetable only). Render these as green / amber / grey.
  Never draw a scheduled train as if it were tracked.
- **AI role:** the incident triage model (§6.3) deduplicates and classifies free-text
  reports before they hit the board.

This satisfies "train tracking" honestly, adds a genuinely original mechanic, and is
maybe 40 minutes of work.

### 5.4 Deliberately minimal identity

No accounts. No passwords. No email. A signed cookie holds `{ deviceId, groupMemberships[] }`.
Owners get a 4-digit PIN. **Every minute spent on auth is a minute not spent on the ten
graded requirements** — and none of those ten mention users.

### 5.5 Offline & poor-network behaviour
Last snapshot cached in `localStorage`, rendered greyed-out with *"Last updated 4 minutes
ago — reconnecting"*. Sri Lankan mobile data is the actual deployment environment; showing
you designed for it is worth real marks under *"handles bad input gracefully"*.

---

## 6. AI functions (Workers AI, free tier)

| # | Function | Model | Trigger | Why it isn't a gimmick |
|---|---|---|---|---|
| **AI-1** | Journey intent extraction | `@cf/zai-org/glm-4.7-flash` | `/api/ai/plan` | Turns Singlish/Sinhala/Tamil free text into structured intent. Rule-based parsing genuinely cannot do this. |
| **AI-2** | Multilingual place matching | `@cf/baai/bge-m3` → Vectorize | on AI-1 | 356 SPRPTA route names in three scripts with heavy misspelling. Embeddings beat fuzzy string matching outright here. |
| **AI-3** | Network status digest | `glm-4.7-flash` | cron `*/5` → KV | Converts telemetry (per-route mean speed, stopped-vehicle counts, report volume) into one plain-language paragraph on `/`. Cached, so it costs 12 calls/hour flat. |
| **AI-4** | Incident report triage | `glm-4.7-flash`, JSON mode | `POST /api/reports` | Classifies free-text into `{type, severity, routeRef, isPII}` and **strips names and phone numbers before storage**. Privacy-by-design, and it is the moderation layer that makes crowdsourcing safe. |
| **AI-5** *(stretch)* | Voice input | `@cf/openai/whisper-large-v3-turbo` | mic on `/plan` | Hands-free at a bus halt. Cut first if time is short. |

### 6.1 Guardrails
- Every model call is wrapped in `withTimeout(6000)` and a `try/catch` that returns a
  **rule-based fallback**, never an error page. AI-1 falls back to a two-token
  "X to Y" split; AI-3 falls back to the last cached digest.
- JSON responses validated with **Zod** before use. A malformed model response is a
  handled case, not a 500.
- Temperature 0.2. Narration prompt ends with: *"Use only the times given. Do not invent
  or adjust any number."*

### 6.2 Neuron budget (10,000/day, resets 00:00 UTC)
`glm-4.7-flash` on a ~700-token round trip is small change. AI-3 at 12 calls/hour is
~290 calls/day. Even 500 planner queries during the demo window stays well inside the
allocation. **But**: if you exceed any limit, calls **fail with an error**, they don't
degrade — hence the fallbacks in 6.1. Also note the free plan **excludes** the heavyweight
models (`kimi-k2.6`, `kimi-k2.7-code`, `glm-5.2` return HTTP 403 / error 5035). Don't
reach for those.

### 6.3 Vectorize seeding
Embed all route names, stop names and town names **once** during setup via a
`/api/admin/reindex` route guarded by a secret. ~2,000 vectors. Do this at minute 60, not
minute 170.

---

## 7. UI pages & routing

React Router v6, browser history, SPA fallback served by Workers Assets
(`not_found_handling: "single-page-application"`).

| Route | Page | Purpose | Req# |
|---|---|---|---|
| `/` | **Home** | Problem statement, live counter, AI network digest, three big CTAs | 1, 2, 10 |
| `/map` | **Live Map** | F1. All operators, filter chips, search, vehicle sheet | 3, 6 |
| `/route/:id` | **Route detail** | Polyline, stops, live vehicles, ETA board | 6 |
| `/stop/:id` | **Stop board** | Departure board for one stop | 6 |
| `/plan` | **Journey planner** | F4. Text/voice in, itinerary out, EN/SI/TA | 3, 4, 5 |
| `/trains` | **Trains** | Board + report-a-train form | 3, 4, 5 |
| `/join` | **Join a group** | 6-digit code + name form, full validation | 4, 5 |
| `/g/:code` | **Group map** | F2. That group's vehicles only, ETA to saved stop | 3, 6 |
| `/owner` | **Owner console** | Create group, add vehicles, rotate code, driver links | 4, 5, 6 |
| `/drive/:token` | **Driver** | F3. Start/stop broadcast, status, simulate | 3 |
| `/about` | **About** | Problem, team + contributions, AI declaration, sources | 2, 10 |
| `*` | **404** | Friendly, links home | 8 |

**Navigation (Req #8):** bottom tab bar on mobile — Map · Plan · Trains · Group · More;
top bar on desktop. Persistent, never more than one tap from anywhere.

**Responsive (Req #7):** Tailwind, mobile-first. Test at **360×640** (the actual Sri
Lankan median phone) and 1440×900. The map must be full-bleed on mobile with the vehicle
detail as a bottom sheet, not a modal.

### 7.1 Forms and validation (Req #4 + #5 — these two are cheap marks, don't skip them)

| Form | Fields | Validation, with the *message you actually show* |
|---|---|---|
| Join group | code, display name | `"That code is 5 digits — join codes are 6."` / `"No group with that code. Check with whoever shared it."` / `"Too many tries. Wait 60 seconds."` |
| Create group | name, type, owner PIN, PIN confirm | `"Group name needs at least 3 characters."` / `"Your PINs don't match."` / `"Use a PIN that isn't 1234 or your vehicle number."` |
| Add vehicle | plate, label, route no. (optional) | Sri Lankan plate regex `^[A-Z]{2,3}-?\d{4}$` → `"Plate looks like ND-7217 or WP-CAB-1234."` |
| Report a train | train, station, direction | `"Pick a station first."` / `"You already reported this train 2 minutes ago."` |
| Journey plan | free text | `"Tell me where you're starting from — try 'Galle to Matara'."` |

Inline errors under the field, `aria-invalid`, `aria-describedby`, red only as a
*secondary* signal (colour-blind users). Disable submit while in flight; never let a
double-tap create two groups.

---

## 8. Data model & API surface

### 8.1 D1 schema (condensed)

```sql
operators(id, name, kind, attribution_url)
routes(id, operator_id, route_no, name_en, name_si, name_ta, distance_km, geojson_url)
stops(id, name_en, name_si, name_ta, lat, lng)
route_stops(route_id, stop_id, seq, direction, PRIMARY KEY(route_id, direction, seq))
vehicles(id, operator_id, external_key, plate, label, route_id, kind)

groups(id, code UNIQUE, name, type, owner_pin_hash, owner_salt, created_at, expires_at)
group_vehicles(id, group_id, plate, label, drive_token UNIQUE, active)
group_members(id, group_id, device_id, display_name, joined_at)

drive_sessions(id, drive_token, started_at, ended_at, ping_count)

trains(id, train_no, name, origin, destination)
train_reports(id, train_id, stop_id, device_id, reported_at, confidence)

reports(id, kind, severity, route_id, body_clean, created_at)   -- AI-4 output
```

Positions are **not** in D1 — they live in the DO's SQLite and in KV. Writing 800 rows/s
to D1 would burn the free tier in minutes and buy nothing.

### 8.2 API (Hono)

```
GET  /api/health                       → { ok, upstreams:{sprpta,lmt,wialon}, ts }
GET  /api/fleet/snapshot               → Vehicle[]  (KV, ≤10 s stale)
GET  /api/stream?box=&ops=             → SSE, ~2 s frames, from FleetHub
GET  /api/routes?q=&operator=          → paginated
GET  /api/routes/:id                   → route + stops + polyline
GET  /api/stops/:id/board              → computed ETA board

POST /api/groups                       → { code, ownerToken }        (owner PIN)
GET  /api/groups/:code                 → public metadata only
POST /api/groups/:code/join            → sets member cookie          (rate limited)
POST /api/groups/:code/vehicles        → { driveToken, driveUrl }    (owner PIN)
POST /api/groups/:code/rotate          → new code, old code dies     (owner PIN)
GET  /api/groups/:code/stream          → SSE scoped to that group

POST /api/drive/:token/start           → { sessionId }
POST /api/drive/:token/ping            → { lat, lng, speed, accuracy, ts }
POST /api/drive/:token/stop

GET  /api/trains                       → board with confidence tiers
POST /api/location                     → RDMNS-compatible ingest
GET  /api/location/:trainId            → RDMNS-compatible read
GET  /api/location/history/:trainId    → RDMNS-compatible history

POST /api/ai/plan                      → { legs[], narration, lang }
POST /api/reports                      → AI-4 triage → stored
GET  /api/ai/digest                    → cached network status (KV)
```

Validate **every** body with Zod at the edge. Return
`{ error: { code, message, field? } }` — the frontend renders `message` directly, so error
copy lives in one place.

### 8.3 `wrangler.jsonc`

```jsonc
{
  "name": "buseka",
  "main": "src/worker/index.ts",
  "compatibility_date": "2026-09-01",
  "compatibility_flags": ["nodejs_compat"],
  "assets": { "directory": "./dist", "not_found_handling": "single-page-application" },
  "durable_objects": { "bindings": [
    { "name": "FLEET", "class_name": "FleetHub" },
    { "name": "GROUP", "class_name": "GroupRoom" }
  ]},
  "migrations": [
    { "tag": "v1", "new_sqlite_classes": ["FleetHub", "GroupRoom"] }
  ],
  "d1_databases":  [{ "binding": "DB", "database_name": "buseka", "database_id": "…" }],
  "kv_namespaces": [{ "binding": "CACHE", "id": "…" }],
  "vectorize":     [{ "binding": "VEC", "index_name": "buseka-places" }],
  "ai":            { "binding": "AI" },
  "triggers":      { "crons": ["*/5 * * * *"] }
}
```

`new_sqlite_classes` — **not** `new_classes`. KV-backed DOs are paid-plan only and the
deploy will be rejected on a free account.

Secrets (`wrangler secret put`, never in the repo):
`WIALON_HOST`, `WIALON_TOKEN_KOLLUPITIYA`, `WIALON_TOKEN_JAELA`, `WIALON_TOKEN_NEGOMBO`,
`LMT_PUBLIC_JWT`, `ADMIN_KEY`, `COOKIE_SECRET`.

---

## 9. The four hours

Locking scope at minute 20 and stopping the build at minute 175 are the two rules the
brief itself says save teams every year. Take them literally.

| Time | Phase | A — Data/DO | B — Map/UI | C — Groups/Driver | D — AI/Deploy |
|---|---|---|---|---|---|
| 0–20 | **Plan** | All four: agree scope, agree the cut line, split the repo by folder | | | |
| 20–45 | **Design** | DO skeleton + `Vehicle` type | Layout, nav, Tailwind, map shell | D1 schema + migrations | Worker scaffold, **deploy an empty page now** |
| 45–90 | **Build 1** | SPRPTA REST + WS in FleetHub | Map renders snapshot | `/owner`, `/join`, code gen | Hono routes, Zod, Vectorize seed |
| 90–135 | **Build 2** | Wialon + LMT (−1 fix) | SSE live updates, filters | `GroupRoom` DO, `/g/:code` | AI-1 + AI-2 planner |
| 135–175 | **Build 3** | Train ingest + board | `/route/:id`, `/stop/:id` | `/drive` + simulate button | AI-3 digest, AI-4 triage |
| 175–205 | **Polish** | All four: **incognito test on two phones**, empty states, error copy, 360 px pass | | | |
| 205–225 | **Ship** | Final push, deploy, README with all ten items, verify link in a private window | | | |
| 225–240 | **Submit** | Record 2:00 video, assemble PDF + AI Prompt Log | | | |

### 9.1 The Minute-175 Cut Line — agree at minute 20

Cut in this order, without discussion, the moment you're behind:

1. AI-5 voice input
2. `/stop/:id` board (fold into `/route/:id`)
3. Train history endpoints (keep current position only)
4. Wialon (F1 still has two live sources)
5. AI-3 digest → replace with a static seeded paragraph

**Never cut:** `/drive` (the demo hero), the `/join` form + validation (Reqs 4 & 5), the
problem statement on `/`, or the README. Those are graded directly.

### 9.2 Git discipline (10 marks, and the easiest 10 in the whole rubric)

All four members commit under **their own configured name and email**, in small commits,
throughout the session — the rubric explicitly wants *"meaningful history from all
registered members."* One person pushing 40 files at minute 220 caps that criterion at
3–4/10 no matter how good the code is. Four branches → PRs into `main` → squash. Check
`git shortlog -sn` at minute 200; if anyone is at zero, fix it before you deploy.

---

## 10. Pre-flight checklist (30 minutes, the day before — verification, not building)

Every item is a *yes/no answer*, not code. If any answer is no, you find out now instead
of at minute 95.

- [ ] `WIALON_HOST` — does `token/login` on `https://hst-api.wialon.com` return an `eid`
      for each of the **three distinct** tokens? If not, get the correct host from whoever
      issued them. **This is the single highest-risk unknown in the design.**
- [ ] For each token: how many units come back from `core/search_items`, and do they have
      live `pos` objects? A depot with three parked vans is not a demo.
- [ ] `GET https://api.spgps.lk/api/public/bus-live-locations-for-map` — 200? How many
      `isOnline: true`?
- [ ] `wss://ws.spgps.lk` with `Origin: https://spgps.lk` — does it accept and stream?
- [ ] Is the Lanka Metro website token still valid (it expires 2027-03-27), and are you
      comfortable using it read-only with attribution? If not → §5.1 fallback.
- [ ] Cloudflare account on the **Workers Free** plan with Workers AI, D1, KV, Vectorize
      and Durable Objects enabled; `wrangler login` works for whoever deploys.
- [ ] `npm create cloudflare@latest` runs on all four machines. Node ≥ 20.
- [ ] A `workers.dev` subdomain is claimed (this occasionally needs a dashboard click).
- [ ] Phones charged, on mobile data not venue Wi-Fi, geolocation permission pre-granted
      for `*.workers.dev`.
- [ ] Screen recorder tested — 2:00 is a hard ceiling and re-recording costs 10 minutes.

---

## 11. MCP servers to use

| MCP | Endpoint | Used for |
|---|---|---|
| **Cloudflare Docs** | `https://docs.mcp.cloudflare.com/mcp` | Free-tier limits, binding syntax, DO migration flags. Faster and more current than searching the web mid-build. |
| **Cloudflare Bindings** | `https://bindings.mcp.cloudflare.com/mcp` | Create D1/KV/R2, run D1 queries, list Workers — without leaving the editor. |
| **Cloudflare Observability** | `https://observability.mcp.cloudflare.com/mcp` | Read Worker logs and errors during the build. Worth its weight when the DO misbehaves at minute 120. |
| **GitHub MCP** | `https://api.githubcopilot.com/mcp/` | Branches, PRs, and — importantly — checking commit attribution across all four members before you submit. |
| **Chrome / Playwright MCP** | local | Load the deployed URL in a clean profile, screenshot at 360 px and 1440 px, read the console. This *is* your incognito test, automated. |
| **Context7** | `https://mcp.context7.com/mcp` | Version-correct docs for Hono, MapLibre, React Router. Prevents the classic "AI wrote v5 Router syntax" 20-minute detour. |
| **Tavily / web search** | — | Planning phase only. |

Declare all of these in the README AI section — the brief requires a per-tool one-liner
("what it was used for"), and an undeclared dependency spotted in the demo is treated as a
breach.

---

## 12. Requirement coverage (20 marks — check this table at minute 200)

| # | Requirement | Where it lives | Owner |
|---|---|---|---|
| 1 | Clear landing page | `/` | B |
| 2 | Problem explained in-app | `/` hero + `/about` | B |
| 3 | ≥2 functional features | F1–F4 (four) | all |
| 4 | ≥1 form accepting input | 5 forms (§7.1) | C |
| 5 | Validation + friendly errors | §7.1 table, Zod both sides | C |
| 6 | Display/search/filter/calculate | Map filters, route search, ETA computation | B/D |
| 7 | Responsive desktop + mobile | Tailwind, tested 360 & 1440 | B |
| 8 | Navigation between sections | Bottom tabs / top bar | B |
| 9 | Sample data | Seeded routes, stops, 3 demo groups w/ codes, train timetable | A |
| 10 | Value to Sri Lankan users demonstrated | `/` + the live driver demo | all |

---

## 13. Demo video — 2:00, shot list

| Time | Shot | Say |
|---|---|---|
| 0:00–0:15 | Team + `/` | Names, IDs, the problem in one sentence with users named |
| 0:15–0:40 | `/map` live | "Three operators, one map — 812 vehicles live right now" |
| 0:40–1:00 | `/plan` | Type Singlish → itinerary. **"The model parses the question; the ETAs are computed in code — we don't let it invent a number."** |
| 1:00–1:30 | Phone on `/drive` → laptop on `/g/483911` | Walk. The dot moves. **This is the moment that wins the room.** |
| 1:30–1:45 | `/join` bad code | Show the friendly error. Deliberately. It is 15 marks of usability. |
| 1:45–2:00 | Deployed URL + repo + impact | "Any van owner can be on this map in 60 seconds with no hardware." |

Rehearse once against a timer. Over-length costs a mark; a rushed live feature costs more.

---

## 14. Risk register

| Risk | Likelihood | Mitigation |
|---|---|---|
| Wialon host/tokens wrong | **Medium-high** | §10 checklist the day before; feature is cut #4 |
| SPRPTA WS `Origin` rejected from DO | Medium | REST poll every 15 s — already the documented alternative |
| LMT token expired / withdrawn | Medium | §5.1 static fallback; nothing else changes |
| Venue Wi-Fi blocks geolocation | Medium | **Simulate route** button + mobile data on the demo phone |
| DO migration rejected on free plan | Low | `new_sqlite_classes`; deploy an empty DO at minute 45 to prove it |
| Workers AI 429 / neuron exhaustion | Low | Rule-based fallbacks (§6.1), cached digest |
| 800 markers tank the framerate | Medium | GeoJSON source + clustering, never DOM markers |
| One member has no commits | Medium | `git shortlog -sn` at minute 200 |
| Nothing deployed by minute 205 | Low | **Deploy an empty page at minute 45** and redeploy continuously |

---

## 15. Repository layout

```
BusEka.lk/
├── DESIGN.md              ← this file
├── README.md              ← all ten required items + AI declaration + contributions
├── wrangler.jsonc
├── package.json
├── .dev.vars.example      ← names only, NO VALUES
├── .gitignore             ← .dev.vars, .wrangler, dist, node_modules
├── migrations/
│   └── 0001_init.sql
├── seed/
│   ├── routes.json  stops.json  trains.json  demo-groups.json
└── src/
    ├── worker/
    │   ├── index.ts            Hono app + scheduled()
    │   ├── do/FleetHub.ts      upstreams → normalise → SSE fan-out
    │   ├── do/GroupRoom.ts     driver pings, members, rate limiting
    │   ├── sources/{sprpta,lmt,wialon}.ts
    │   ├── routes/{fleet,groups,drive,trains,ai}.ts
    │   ├── lib/{eta.ts,geo.ts,codes.ts,validate.ts}
    │   └── ai/{intent.ts,places.ts,digest.ts,triage.ts}
    └── web/
        ├── main.tsx  router.tsx
        ├── pages/    Home Map Route Stop Plan Trains Join Group Owner Drive About
        ├── components/ Map VehicleSheet FilterChips EtaList CodeInput NavBar
        └── lib/{sse.ts,api.ts,i18n.ts}
```

`lib/geo.ts` and `lib/eta.ts` are the two files most likely to be the subject of "explain
this / modify this live." Keep them short, commented, and make sure **more than one person**
has read them.

---

## 16. Sources

- SE3090 Assignment 2 specification and marking scheme (supplied)
- `findings.md` — SP Buses / SPRPTA API teardown (supplied)
- `findings 1.md` — Lanka Metro / LMT-GO API teardown (supplied)
- [A-Samod/sri-lanka-railways-location-api](https://github.com/A-Samod/sri-lanka-railways-location-api) — verified: self-hosted ingest server, no public feed
- [RDMNS.LK](https://rdmns.lk/) — verified: crowdsourced, no public API
- [Durable Objects pricing & free-plan limits](https://developers.cloudflare.com/durable-objects/platform/pricing/)
- [Workers AI pricing — 10,000 Neurons/day free](https://developers.cloudflare.com/workers-ai/platform/pricing/)
- [Models requiring Workers Paid](https://developers.cloudflare.com/changelog/post/2026-07-28-models-require-workers-paid/)
