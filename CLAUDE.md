# CLAUDE.md — BusEka.lk

**Two-hour build, executed with Claude Cowork + Claude Design.**
Alternative to `PLAN.md` (which assumes manual coding + Google Stitch). Same product, same
architecture, different process. `PLAN.md` is untouched — pick one path and commit to it.

> **This file has two jobs.** Cowork reads a repo-root `CLAUDE.md` automatically at the
> start of every session in this folder, so §1 is written as *instructions to Claude*, not
> notes to yourself. Everything from §2 down is the plan for the humans. Keeping both in
> one file is the point: the rules that govern the build are the same rules every session
> inherits, without anyone having to remember to paste them.

`DESIGN.md` is the specification. Nothing here contradicts it.

---

## 1. Rules for Claude in this repository

**Read `DESIGN.md` before writing any code. It is the specification and it wins every
disagreement.**

1. **Never rename anything.** Routes, API paths, file paths, type names, table and column
   names are fixed by `DESIGN.md` §7, §8 and §15. `/plan` is not `/ask`.
   `POST /api/ai/plan` is not `POST /api/plan`.
2. **`Vehicle` (in `src/worker/env.d.ts`) is the only integration contract.** Every module
   produces or consumes `Vehicle[]`. Do not introduce a parallel shape.
3. **Every failing endpoint returns**
   `{ "error": { "code", "message", "field?" } }`. `message` is user-facing English written
   for a stressed commuter, and the frontend renders it verbatim. Never return a bare 500.
4. **Stay inside the lane you were given.** If the task names files, touch only those files.
   If a fix requires editing outside them, stop and say so instead of doing it.
5. **Do not build anything that is not in `DESIGN.md`.** Good idea? Add it to
   "Future work" in `README.md` and carry on.
6. **The LLM never computes a number.** (`DESIGN.md` §4, F4.) Distances and ETAs are
   deterministic TypeScript in `src/worker/lib/`. Models parse input and phrase output.
   Never move a calculation into a prompt.
7. **Positions are upserted, one row per vehicle.** D1 free-tier row-write limits have been
   enforced since 1 Sep 2026 — queries fail rather than degrade. Fleet data never touches
   D1; it lives in KV.
8. **Explain as you go.** Every non-obvious function gets a one-line comment saying *why*,
   not what. A team member has to defend this file to an examiner who may ask for a live
   modification.
9. **Ask rather than invent.** Missing an API shape, a column, a token? Stop and ask. A
   plausible guess that compiles is worse than a question, because it survives to the demo.
10. **Never write a secret into a tracked file.** Wialon tokens and keys go in `.dev.vars`
    (gitignored) and `wrangler secret put`. `.dev.vars.example` carries key names with
    empty values.
11. **Commit in small steps, and the human is the author.** Their `git config user.name`
    must be their own; Claude appears as `Co-Authored-By`. That is the honest record and it
    is what the marking scheme wants to see.

**Poll intervals are fixed:** fleet 6 s, group 4 s. Never lower them — Workers free is
100,000 requests/day.

---

## 2. What changes versus PLAN.md

| | `PLAN.md` (Stitch) | `CLAUDE.md` (Cowork + Claude Design) |
|---|---|---|
| UI design | Google Stitch, 9 prompts | **Claude Design canvas** — one artboard per screen, all 12 on one pan/zoom canvas |
| Design → code | **HTML/CSS export → hand-convert to `.tsx`, ~40 min** | **No conversion step.** The session that drew the canvas writes the `.tsx` with the design still in context |
| Design consistency | Design-system block pasted into every prompt (Stitch can't enforce one) | One canvas, one system, consistent by construction |
| Sharing designs | Screenshots in the group chat | Published Artifact — one URL all four people open, live |
| Infra setup | `wrangler d1 create`, `wrangler kv namespace create` | **Cloudflare MCP** creates D1/KV and answers docs questions in-session |
| Code | Typed by hand | Written in-session against `DESIGN.md` |
| **Biggest risk** | Conversion overruns | **Nobody can explain the code.** See §3 |

**~40 minutes of conversion time comes back.** It goes to §3's explain-back checkpoint
(non-negotiable) and, if green at minute 75, promoting `/route/:id` from stub to real.

Everything technical is unchanged: Cloudflare Workers + Static Assets (not Pages), D1 + KV,
Workers AI (`@cf/zai-org/glm-4.7-flash`, fallback `@cf/google/gemma-4-26b-a4b-it`), the
four features F1–F4, the reductions in `PLAN.md` §0.1, the schema and `wrangler.jsonc` in
`PLAN.md` §5 Step 2. Read those; don't re-derive them.

---

## 3. The integrity contract — read this before anything else

The brief is explicit. **Permitted:** researching, generating UI layout and styling,
generating/refactoring/debugging code, sample data, drafting the README, deployment config.
**Not permitted:** *"submitting code no member can explain."* Section 2.4: during the demo
the evaluator *"may ask any member to explain a section of code, justify a design or stack
decision, or make a small live modification."*

Cowork writes code faster than you can read it. That is the whole risk of this path, and
it is a real one — it is entirely possible to arrive at minute 100 with a working app and
four people who cannot answer a question about it. Three rules:

**Rule 1 — you own your lane's files.** Read every line Claude writes in your lane before
committing. Not skim. If you don't understand a line, ask Claude to explain it *in the
session*, then keep or rewrite it.

**Rule 2 — the explain-back checkpoint at minute 95 is mandatory.** Fifteen minutes, all
four people, laptops closed except one. Each person opens a file from **someone else's**
lane, picks a function, and the owner explains it out loud in under a minute. Anything that
can't be explained gets deleted or rewritten simple. Yes, deleted — a smaller app you can
defend outscores a bigger one you can't, in two separate criteria at once.

**Rule 3 — keep the prompt log as you go, not at the end.** After each significant task,
paste into `AI-LOG.md`: tool, the prompt, what it was for, what you changed about the
output. "What you changed" is the column that shows ownership; if it says "nothing" for
every row, that is itself the finding. The declaration in `README.md` needs one line per
tool — Claude Cowork, Claude Design, Cloudflare Workers AI — saying what each did.

---

## 4. Team setup — minutes 0–12

**Four people, four Cowork sessions, one repo, four branches.** Each person:

1. Opens Claude Cowork on their own machine and **connects the `BusEka.lk` folder**
   (Add folder in the desktop app). Cowork then edits files in place — no uploading,
   no downloading, your local copy stays current.
2. Confirms the connection works: *"list the files in the connected folder."*
   If it reports the workspace failed to start, see §10 — there's a fallback and it costs
   about two minutes, not the session.
3. Sets git identity **before the first commit**:
   `git config user.name "Your Name" && git config user.email "your@email"`.
4. `git checkout -b lane-a` (…b, c, d).

**One person does the scaffold while the other three watch** — this is the only step that
must be serial:

```
Prompt: Scaffold a Cloudflare Workers app in this folder using
`npm create cloudflare@latest -- . --framework=react --platform=workers`,
then install hono, zod, leaflet, react-router-dom, qrcode and the dev deps
@types/leaflet, tailwindcss, @tailwindcss/vite. Set up wrangler.jsonc exactly as
specified in PLAN.md §5 Step 1 — Workers with Static Assets, D1 binding DB, KV
binding CACHE, AI binding. Create src/worker/index.ts with only a /api/health
route. Then run the build and tell me what directory Vite wrote to, because
assets.directory must match it. Do not create any other files yet.
```

Then use the **Cloudflare MCP** rather than the CLI for provisioning — it creates the
resources and hands back the IDs in one step:

```
Prompt: Using the Cloudflare MCP, create a D1 database named "buseka" and a KV
namespace named CACHE, then paste the real IDs into wrangler.jsonc.
```

**Deploy at minute 12.** Not a suggestion. A URL that exists and says "BusEka — coming up"
is worth more than a perfect app that first deploys at minute 105.

```
Prompt: Run npm run build then npx wrangler deploy, and give me the deployed URL.
Then commit everything with the message "chore: scaffold worker, assets, d1, kv"
and push.
```

Open the URL **in a private window**. Paste it in the group chat. That is your submission
link from now on.

---

## 5. Claude Design — the UI, minutes 12–45

One person (lane B) starts this at **minute 12**, in parallel with the scaffold. They do
not join the contract discussion; they get the outcome in the chat.

### 5.1 Generate the canvas

Ask Claude for a design canvas — it will load the design skill and lay every screen out as
artboards on one pan/zoom canvas, published as an Artifact with its own URL.

```
Prompt: Create a design canvas for BusEka, a live public-transport tracking web
app for Sri Lanka. Read DESIGN.md §7 for the page list and §1 for the problem
framing before you start.

Audience: daily bus commuters and parents tracking a school van, mostly on cheap
Android phones on mobile data. Utility over decoration — think Citymapper, not a
marketing site.

Design system, applied across every artboard:
  primary #1D4ED8, live #16A34A, delayed #D97706, stale #6B7280,
  page #F5F7FA, surface #FFFFFF, text #0F172A, border #E2E8F0
  dark: page #0B1220, surface #131C2E, text #E6EDF7, border #1E293B
  Inter; 15px body, 13px secondary, 20px semibold headings
  12px radius, 1px borders not heavy shadows, 44px minimum touch targets
  Sinhala and Tamil text may appear (කොළඹ) — never clip it, allow two lines
  Mobile-first at 360x640, working to 1440x900, no horizontal scroll anywhere

Artboards, in this order — do the map first so the visual language settles:

1  /map — full-bleed map; translucent top bar with the status strip
   "1,043 buses · 812 live · updated 3s ago" (the live number in green, big
   enough to read across a room); route-number search; filter chips All /
   SPRPTA / MetroBus / Depot / Community / Moving only; flat 10px circle
   markers, green live and grey stale, NOT pin shapes; a bottom sheet peeking
   one bus — plate ND-7217, route 383/2, LIVE pill, 34 km/h — expanding to show
   "Next stop: Ambalangoda · 6 min" and a Track button.
   Plus two more artboards: EMPTY ("No buses reporting right now" + Retry) and
   OFFLINE (amber banner "Can't reach the bus network — showing last known
   positions from 2 minutes ago", map dimmed).

2  /drive/:token — three artboards. IDLE: vehicle name and plate, one enormous
   green "Start trip" button at least 120px tall, the reassurance line "Your
   location is shared only with people who have this van's group code", and a
   secondary "Simulate route (demo)" button. BROADCASTING: pulsing green LIVE
   dot, "Accuracy ±8 m / 14 pings sent / 3 people watching", small map preview,
   large red "End trip". BLOCKED: amber card "Location is blocked for this
   site", two numbered steps to fix it, "Try again" and the simulate button.
   No bottom nav on this screen — the driver is doing one thing.

3  /join — centred card, max 420px. Six separate square code boxes, monospace,
   uppercase, 56px tall. "Your name" field. Full-width "Join". Link: "Have a
   vehicle instead? Create a group". Plus three error artboards: "That code is
   5 characters — join codes are 6.", "No group with that code. Check with
   whoever shared it.", and "Too many tries. Wait a minute and try again."
   Errors inline under the field, with an icon as well as red — never colour
   alone.

4  /owner — create-group form (name, type select, 4-digit PIN, confirm PIN);
   then the group card showing the code K7M2QX large and monospace with a copy
   button, a "Rotate code" button warning "The old code stops working
   immediately", a vehicles list with LIVE/OFFLINE pills and a "Driver link"
   button that opens a QR code plus copyable URL, and an add-vehicle form.
   Include the validation errors: "Group name needs at least 3 characters",
   "Your PINs don't match", "Plate looks like ND-7217 or WP-CAB-1234".

5  /g/:code — group name, LIVE pill, "2 vehicles · 6 watching", a map with only
   one or two markers, a vehicle list with "Last seen 4 seconds ago" and
   "Arriving at Kollupitiya in about 7 min", a "Leave group" link. Plus an
   empty artboard: "No one is driving right now. You'll see the van here as
   soon as the driver starts their trip."

6  /plan — "Where are you going?", a large textarea, three example chips
   ("Galle to Matara", "Kollupitiya to Negombo", "කොළඹ සිට ගාල්ල"), an Ask
   button. Answer card: two sentences in larger text, then an "Evidence" block
   in small grey listing plate ND-7217, route 383/2, "4 min away at
   Bambalapitiya", "about 41 km total", and the footnote "ETAs are calculated
   from live GPS positions, not estimated by the AI." Plus loading skeleton,
   empty-input error, and a no-answer artboard.

7  /  — hero "Every bus in Sri Lanka. One map." with the sub-line about the
   school van; a live counter card "812 buses live right now"; two buttons
   "Open the map" and "Track my group"; a "The problem" section of three short
   paragraphs in prose at 65 characters per line; three cards — One live map /
   Private groups / No hardware; a "Network status right now" card with one
   AI-written paragraph labelled "Updated 4 min ago · written by AI from live
   data"; footer attributing "Live data from SPRPTA (spgps.lk)".

8  /about — the problem, "Who this helps" (commuters, parents of school-van
   children, small van owners with no tracking hardware), a team table with
   Name / Student ID / What they built, an AI-usage table, data sources, and a
   card showing the demo group code DEMO24.

9  Stubs, one artboard with four variants sharing a layout — centred card, icon,
   heading, one paragraph, one button: /trains ("Train tracking is coming — Sri
   Lanka Railways doesn't publish live train positions, so we are building this
   from passenger reports"), /route/:id, /stop/:id, and 404.

Every screen except /drive gets the bottom navigation bar below 768px — Map,
Plan, Trains, Group, More — becoming a top bar with the wordmark above 768px.
```

**Publish it and share the URL.** All four people work from the same picture. If visual
editing is enabled on the account, lane B nudges spacing and colour directly on the canvas;
if not, refinement is a follow-up prompt — either way don't spend more than 10 minutes on
polish here.

### 5.2 Canvas → React, minutes 45–85

The advantage over Stitch: **the session that drew the canvas writes the components**, with
the design still in context. There is no export, no `class=` → `className=` pass, no
deleting a fake map.

```
Prompt: Now build the React components from the canvas you just made. Read
CLAUDE.md §1 first.

Create, in this order:
  src/web/components/NavBar.tsx, Field.tsx, EmptyState.tsx, CodeInput.tsx
  src/web/router.tsx declaring ALL 12 routes from DESIGN.md §7, with stub
    pages for /route/:id, /stop/:id and /trains
  src/web/pages/Home.tsx, About.tsx, NotFound.tsx and the three stubs

Tailwind utility classes only — no custom CSS files, no inline style attributes.
Props and state for anything that changes; no hardcoded numbers that will sit
still on camera. Every component renders its loading, empty and error states —
those are on the canvas as separate artboards and they are graded.

Stop when those are done. Do not build Map.tsx yet, and do not touch anything
under src/worker/.
```

**Merge to `main` at minute 50.** Lanes C and D are blocked until `NavBar`, `Field` and
`CodeInput` land. That handoff is the tightest timing in this plan.

Then `Map.tsx` — the one place to be specific, because the default will be wrong:

```
Prompt: Build src/web/components/Map.tsx using Leaflet with preferCanvas: true
and OpenStreetMap tiles. 780+ markers must stay smooth on a projector, so: one
L.layerGroup that gets cleared and refilled each poll, L.circleMarker at radius
5, never create and destroy markers per tick. Clear the interval in the effect
cleanup. Then MapPage.tsx consuming useLive('/api/fleet/snapshot', 6000) from
src/web/lib/sse.ts — that hook polls internally today; keep its name and
signature so the Durable Object upgrade in DESIGN.md §2 stays a one-file change.
```

---

## 6. Lane prompts — minutes 20–85

Each person pastes their lane's prompt into their own Cowork session. Commit every ~10
minutes. Nobody merges to `main` before minute 85, except lane A's `lib/geo.ts` (early —
lane D needs it) and lane B's shared components at minute 50.

Before the lanes start, one person freezes the contracts — `src/worker/env.d.ts`
(`Env` + `Vehicle`), `src/worker/lib/validate.ts` (Zod schemas + the error shape) — and
pushes them to `main`. Copy the exact definitions from `PLAN.md` §5 Step 2(a) and (b).
**Frozen means frozen**; a change after minute 20 costs three people a merge conflict.

### Lane A — data

```
Prompt: Read DESIGN.md §4 (F1) and CLAUDE.md §1. Build only these files:
  src/worker/sources/sprpta.ts
  src/worker/routes/fleet.ts
  src/worker/lib/geo.ts
  src/worker/lib/eta.ts

GET /api/fleet/snapshot returns { vehicles: Vehicle[], live, total, ts, stale }.
Read CACHE.get('fleet','json'); if it's under 12 seconds old, return it.
Otherwise fetch https://api.spgps.lk/api/public/bus-live-locations-for-map and
normalise to Vehicle — id `sprpta:${imei}`, label from
routePermitBus?.busNumber, routeNo from
routePermitBus?.routePermit?.route?.routeNumber. Every one of those accessors is
nullable; use ?. all the way down. Upstream calls the field "lon"; our type
calls it "lng". Drop null coordinates and isOnline: false. Cache with
expirationTtl 60.

On upstream failure return the LAST CACHED payload with stale: true. Never a
500 — the UI has a designed offline state and this is what feeds it.

lib/geo.ts: haversineKm. lib/eta.ts: etaMinutes and formatEta exactly as
DESIGN.md §4 F4 specifies, including the comment explaining why a bus under
2 km/h is treated as 25 km/h. Push lib/geo.ts to main as soon as it works —
lane D is waiting on it.

Then write me a two-sentence explanation of the caching logic that I can say out
loud, and stop.
```

*Stretch, only if the map is green at minute 75:* `sources/wialon.ts` per `DESIGN.md` §4 —
`token/login` → `eid`, then `core/search_items` with `flags: 1025`. Position arrives as
`pos: { x: lon, y: lat, s: speed }` — **`x` is longitude**. Re-login on error `1003`.

### Lane C — groups and driver

```
Prompt: Read DESIGN.md §4 (F2, F3) and CLAUDE.md §1. Build only these files:
  src/worker/lib/codes.ts, lib/pin.ts
  src/worker/routes/groups.ts, routes/drive.ts
  src/web/pages/Owner.tsx, Join.tsx, Group.tsx, Drive.tsx

Build in this exact order and tell me as each one works, so if we run out of
time we run out at the right place:

1. lib/codes.ts — 6 characters from the alphabet 23456789ABCDEFGHJKLMNPQRSTUVWXYZ
   (no 0/O/1/I/l), via crypto.getRandomValues. Retry on UNIQUE failure.
2. lib/pin.ts — SHA-256 over salt+pin with crypto.subtle. Never store the PIN.
3. POST /api/groups → { code }. Zod-validated.
4. POST /api/groups/:code/vehicles → { driveToken, driveUrl }, PIN required.
   Render driveUrl on /owner as a QR code (the qrcode package) plus a copyable
   link.
5. POST /api/groups/:code/join — rate limit FIRST, before any lookup: delete
   join_attempts older than 60s, count by cf-connecting-ip, 5 or more in the
   last minute returns 429 "Too many tries. Wait a minute and try again.",
   otherwise insert and proceed. Set an HttpOnly member cookie.
6. POST /api/drive/:token/ping — INSERT ... ON CONFLICT(vehicle_id) DO UPDATE.
   Upsert, never append: one row per vehicle, forever. D1 free-tier row writes
   are enforced.
7. GET /api/groups/:code/live — join group_vehicles and positions, return
   Vehicle[] with source 'group'. Reuse Map.tsx unchanged.
8. Drive.tsx — navigator.geolocation.watchPosition with enableHighAccuracy,
   maximumAge 5000, timeout 15000, posting every ping. Request a screen wake
   lock. Handle PERMISSION_DENIED as a designed UI state, not an error. Build
   the "Simulate route (demo)" button that replays a hardcoded 8-point polyline
   through /ping on a 3-second timer.

Error messages come from lib/validate.ts — do not invent new copy, the design
canvas already shows the exact wording.
```

Three things that will bite lane C regardless of how good the code is:

- **Geolocation requires HTTPS.** `workers.dev` and `localhost` are fine; a LAN IP like
  `192.168.1.5:5173` fails **silently**. Test on the deployed URL.
- **iOS Safari** throttles `watchPosition` hard when the tab backgrounds. Keep it
  foregrounded, keep the wake lock.
- **The simulate button is not optional.** It is your insurance if venue Wi-Fi or a
  permission prompt kills the live demo — which is the demo. Don't skip it because you're
  behind; it's the thing you're behind *for*.

### Lane D — AI

```
Prompt: Read DESIGN.md §4 (F4) and §6, and CLAUDE.md §1 — especially rule 6.
Build only these files:
  src/worker/ai/intent.ts, ai/places.ts, ai/digest.ts
  src/worker/routes/ai.ts, routes/trains.ts
  src/web/pages/Plan.tsx

POST /api/ai/plan returns { legs, narration, lang }. Four stages:

1. SELECT id, name_en, name_si FROM stops — 12 rows, no Vectorize.
2. ai/intent.ts — @cf/zai-org/glm-4.7-flash, JSON mode, temperature 0. Give it
   the stop list and the raw question; get back { fromId, toId, lang } chosen
   only from those ids, or null if unclear. It must handle Singlish
   ("kollupitiya idn negombo"), Sinhala script, and misspellings.
3. DETERMINISTIC TypeScript, no model: fetch the fleet snapshot, find buses
   within 3 km of the from-stop using lib/geo.haversineKm, take the nearest,
   compute etaMin with lib/eta.etaMinutes and journeyKm with haversineKm.
4. glm-4.7-flash again, given ONLY those computed numbers, told: "Write two
   friendly sentences in <lang>. Use only these numbers. Do not invent or
   adjust any number."

Both model calls get a 6-second timeout and a fallback that must work:
stage 2 falls back to splitting on /\b(to|from|idn|සිට|ඉඳන්)\b/i and string
matching; stage 4 falls back to a templated English sentence built from the same
numbers. Validate the model's JSON with Zod before touching it — a malformed
response is a handled case, not a 500. Fallback model is
@cf/google/gemma-4-26b-a4b-it. Never use kimi-k2.6, kimi-k2.7-code or glm-5.2;
they return 403 on the free plan.

GET /api/ai/digest returns a seeded paragraph from KV for now.
routes/trains.ts returns the honest "no live feed exists" note.

Plan.tsx wires the canvas's four states. Keep the Evidence block — plate, route
number, distance — it is what makes the answer checkable.
```

**Say this in the video:** *"The model parses the question and writes the sentence. Every
distance and every ETA is computed in TypeScript — we don't let it invent a number."*
That is exactly what the top AI band asks for.

---

## 7. Using Cowork well

**MCP servers** — use these, declare them in the README:

| Server | For |
|---|---|
| **Cloudflare Developer Platform** | Create D1/KV, run D1 queries to check data landed, and search Cloudflare docs in-session. Faster and more current than web search mid-build. |
| **Cloudflare Observability** (if available) | Read Worker logs when something 500s at minute 70 |
| **Chrome / browser tools** | Load the deployed URL, screenshot at 360px and 1440px, read the console. This *is* the incognito test, automated. |

**Subagents: use sparingly.** Each one starts cold and re-derives context you already have,
which costs minutes you don't have. One good use: at minute 90, in a session with no other
work in flight — *"review the diff on main for bugs, unhandled errors, and hardcoded values
that should be state."* Not four subagents running four lanes; that's how you get four
incompatible implementations of the same type.

**Task lists.** Ask Claude to keep one per lane. It's how a returning teammate sees where
you are without interrupting you.

**One session per lane, kept open.** Restarting loses the context that makes the second
hour faster than the first.

---

## 8. Timeline

| Minutes | Phase | A | B | C | D |
|---|---|---|---|---|---|
| 0–12 | Setup | *watch* | *watch* | scaffold + MCP provisioning + **deploy empty** | *watch* |
| 12–20 | Freeze | contracts | **Design canvas starts** | contracts | contracts |
| 20–45 | Build 1 | sprpta + fleet | canvas → refine → publish | codes, pin, POST /groups | intent.ts |
| 45–50 | **Handoff** | push `lib/geo.ts` | **push NavBar/Field/CodeInput/router → main** | *blocked* | *blocked* |
| 50–85 | Build 2 | eta, (Wialon?) | Map.tsx, Home, About, stubs | join, vehicles, ping, Drive.tsx | ai/plan, Plan.tsx |
| 85–95 | Integrate | merge, deploy, fix | | | |
| **95–110** | **Explain-back + polish** | **§3 Rule 2 — mandatory** | | | |
| 110–115 | Ship | final deploy, README, `git shortlog -sn` | | | |
| 115–120 | Submit | record 2:00, assemble PDF + AI-LOG.md | | | |

With three people: fold D into A, and cut `/plan` to a card on `/`.

**Cut order if behind** (`DESIGN.md` §9.1, unchanged): Wialon → the `/plan` page → group
ETA-to-stop → F4 entirely, replaced by the seeded digest.
**Never cut:** `/drive/:token`, the `/join` validation, the problem statement on `/`, the
README.

---

## 9. Verification, minutes 85–110

Run this against **the deployed URL, in a private window** — not localhost, not your cache.

| Check | Req |
|---|---|
| All 12 routes reachable; stubs look intentional; 404 is friendly | 8 |
| 360×640 — no horizontal scroll, map full-bleed, bottom tabs reachable | 7 |
| Submit every form empty → friendly message, not a crash | 5 |
| Join with `12345`, `ZZZZZZ`, then 6 times fast → three distinct messages | 5 |
| Kill Wi-Fi mid-map → stale banner, no white screen | 5 |
| `/drive/:token` on a real phone → dot on someone else's laptop | 3 |
| Nonsense on `/plan` → graceful "I couldn't work that one out" | 5 |
| Problem statement on `/`, affected users named | 2, 10 |
| Seeded stops present; `DEMO24` works on `/join` | 9 |
| **Grep every page for hardcoded numbers that should be state** | 15 |
| **Explain-back completed, all four people** | §3 |

`git shortlog -sn` — every registered member must appear with real commits. Zero from
someone caps that criterion at 3–4/10, and "contribution from all registered members" is a
separate 5 marks on top.

---

## 10. Risks specific to this path

| Risk | Mitigation |
|---|---|
| **Nobody can explain the code** | §3. The explain-back at minute 95 is the whole reason the conversion time was saved. |
| **Cowork's device workspace fails to start** | It happens. Fallback: Claude works in its own cloud container and writes results back to the folder; or you run `wrangler` yourself in a terminal and use Cowork for the code. Costs ~2 min, not the session. Find out at minute 0, not minute 40. |
| Four sessions drift into four architectures | Contracts frozen and pushed by minute 20; `CLAUDE.md` §1 is read by every session automatically |
| Visual editing not enabled on the account | You still get a viewable, exportable canvas; refine by re-prompting instead. Don't spend more than 10 min either way. |
| Merge conflicts at minute 85 | Ownership by folder; only `env.d.ts`, `validate.ts`, `api.ts`, `router.tsx` are shared, and they're frozen |
| `assets.directory` wrong → blank page in production | Ask for the build output path explicitly in the scaffold prompt; deploy at minute 12 so you find out then |
| Seeded `--local` but not `--remote` | Two separate databases. Do both, minute 20. |
| Geolocation blocked at the venue | The simulate button |
| Upstream bus API down | KV returns the last snapshot with `stale: true` |
| Workers AI slow or erroring | 6-second timeout + rule-based fallback both directions |
| 780 markers tank the framerate | `preferCanvas: true`, one `layerGroup` |
| D1 row-write limits (enforced since 1 Sep 2026) | Positions upserted; fleet never touches D1 |

---

## 11. What goes in the submission

`README.md`, all ten items: title · problem · solution · main features · technologies ·
**AI tools, one line each** · team members + IDs + **what each person actually did** ·
install/run · deployed link · video link.

The AI declaration, one line per tool, in your own words. For example:
*"Claude Design — generated the twelve screen layouts and the design system from our
written spec; we adjusted the map's marker style and rewrote the empty-state copy."*
*"Claude Cowork — wrote the Worker routes and React pages against DESIGN.md; each member
reviewed and can explain the files in their own lane."*
*"Cloudflare Workers AI (glm-4.7-flash) — runs inside the app to parse journey questions
and phrase answers; all distances and ETAs are computed in our own TypeScript."*

`AI-LOG.md` — tool, prompt, purpose, what you changed. **Redact the Wialon tokens and any
keys**; the brief requires this explicitly.

**Demo video, 2:00 hard ceiling** (`DESIGN.md` §13): team + problem · `/map` live ·
`/plan` with the "never computes a number" line · **phone `/drive` → laptop `/g/CODE`,
walk, the dot moves** · `/join` with a bad code · URL + repo + impact. Rehearse once
against a timer.

---

## 12. Sources

- SE3090 Assignment 2 specification and marking scheme (supplied)
- `DESIGN.md` — the specification this plan implements
- `PLAN.md` — the Stitch/manual alternative; schema, `wrangler.jsonc` and seed data are shared
- `findings.md` — SPRPTA teardown (supplied)
- [Workers best practices — use Workers Static Assets for new projects](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/)
- [Workers platform limits — 100,000 requests/day free](https://developers.cloudflare.com/workers/platform/limits/)
- [D1 free-tier daily query limits enforced (1 Sep 2026)](https://developers.cloudflare.com/changelog/post/2026-09-01-d1-free-tier-limit-enforcement/)
- [Workers AI pricing — 10,000 Neurons/day free](https://developers.cloudflare.com/workers-ai/platform/pricing/)
- [Models requiring Workers Paid](https://developers.cloudflare.com/changelog/post/2026-07-28-models-require-workers-paid/)
