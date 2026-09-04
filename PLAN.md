# BusEka.lk — PLAN.md

**Two-hour build · Cloudflare Workers + D1 + KV + Workers AI · UI generated with Google Stitch**

`DESIGN.md` is the specification. **This plan does not deviate from it.** Where two hours
forces a reduction, the reduction is stated against the DESIGN.md section it reduces, and
**no name is ever changed** — routes, types, file paths and API paths are exactly as
DESIGN.md defines them, so the deferred parts drop in later without a rename.

---

## 0. Rules of strict conformance

Read these four out loud at minute 0. They are what stop four people building four
slightly different apps.

1. **No renaming.** If DESIGN.md calls it `/plan`, it is `/plan` — not `/ask`. If it calls
   it `POST /api/ai/plan`, that is the path. Same for files, components, columns.
2. **`Vehicle` is the only integration contract.** (DESIGN.md §4, F1.) Every lane produces
   or consumes `Vehicle[]`. No lane invents its own shape.
3. **Nothing gets built that isn't in DESIGN.md.** New idea at minute 60? Write it in
   `README.md` under "Future work" and keep building.
4. **Deferred ≠ deleted.** A deferred route still exists as a stub page that says what's
   coming. Navigation stays complete (Requirement #8), and nothing is renamed later.

### 0.1 What two hours reduces, section by section

| DESIGN.md | Spec | 2-hour build | Why |
|---|---|---|---|
| §2 `FleetHub` Durable Object | Upstream WS → SSE fan-out | **Deferred.** Worker polls SPRPTA REST, caches in KV 12 s; client polls `/api/fleet/snapshot` every 6 s | DO migrations + a class that must deploy clean first time ≈ 25 min of risk for ~3 s of UX. `findings.md` names REST polling as the supported no-proxy alternative. |
| §2 `GroupRoom` Durable Object | Driver pings + member SSE | **Deferred.** Pings upsert into D1 `positions`; viewers poll `/api/groups/:code/live` every 4 s | Same reason. Rate limiting moves to a D1 table (§5 lane C). |
| §6 AI-2 Vectorize + bge-m3 | Embedding place match | **Deferred.** Seeded stop list passed in the prompt | 12 seeded stops fit in a prompt. Index creation + seeding ≈ 30 min for no gain at this size. |
| §4 F1 Lanka Metro source | 3rd live source | **Deferred** (DESIGN.md §5.1 fallback path) | Their token, their infrastructure, the +1 coordinate quirk. ~20 min. |
| §5.3 Trains | RDMNS-contract ingest | **Stub page** at `/trains` | No live feed exists (DESIGN.md §0.1). Page explains that honestly — which is itself a good answer. |
| §4 F1 Wialon source | 3 depot fleets | **Stretch.** Only if the map is green at minute 70 | Highest-risk unknown per DESIGN.md §10, and unverified. |
| §5.1/§5.2 `/route/:id`, `/stop/:id` | Route + stop boards | **Stub pages** | Folded into the vehicle sheet on `/map`. |
| §6 AI-3, AI-4, AI-5 | Digest, triage, voice | **AI-3 seeded, AI-4/AI-5 deferred** | AI-1 is the one that demos. |

**Everything else in DESIGN.md ships.** F1, F2, F3, F4 all work.

### 0.2 Cut order — agree at minute 20, execute without discussion

DESIGN.md §9.1, unchanged: **(1)** Wialon → **(2)** `/plan` page, collapse into a card on
`/` → **(3)** group ETA-to-stop → **(4)** F4 entirely, replace with the seeded AI-3
paragraph.

**Never cut:** `/drive/:token`, the `/join` form and its validation, the problem statement
on `/`, the README. Graded directly, cheap to build.

---

## 1. Platform decisions (DESIGN.md §2.1, resolved)

| Question | Decision | Say this in the demo |
|---|---|---|
| **Pages or Workers?** | **Workers with Static Assets.** Not Pages. | Cloudflare's docs say it outright: *"If you are starting a new project, use Workers instead of Pages."* Workers also gets Cron Triggers, Durable Objects and full observability; Pages doesn't. And it's **one deploy for frontend + API** — no CORS, no second URL, no environment drift. |
| **Database** | **D1** for relational (groups, vehicles, positions, stops). **KV** for the cached fleet snapshot. | D1 is SQLite the team already knows and the data is genuinely relational. KV is right for one hot blob read by every visitor, tolerant of 12 s staleness. Using both, correctly, is a defensible decision. |
| **R2?** | **No.** | Nothing uploads files. An unused binding only invites a question you gain nothing by answering. |
| **AI models** | `@cf/zai-org/glm-4.7-flash` primary, `@cf/google/gemma-4-26b-a4b-it` fallback | Both confirmed on **Workers Free**. Avoid `kimi-k2.6`, `kimi-k2.7-code`, `glm-5.2` — those return **403 / error 5035** on free accounts. |

### 1.1 Four free-tier numbers that actually bite

| Limit | Value | Mitigation |
|---|---|---|
| Worker requests | **100,000/day**, resets 00:00 UTC (Error 1027) | 10 clients × 6 s polling × 2 h ≈ 12,000. Safe. **Never drop the poll below 4 s.** |
| Workers AI | **10,000 Neurons/day** | A `glm-4.7-flash` round trip is small change. Safe. |
| D1 rows | **Daily row read/write caps enforced on free since 1 Sep 2026 — queries *fail*, they don't degrade** | Positions are **upserted**, one row per vehicle. Fleet data never touches D1. |
| External subrequests | **50 per invocation** on free | We make 1–4. |

---

## 2. Folder structure — DESIGN.md §15, annotated with scope

Markers: **[✓]** built in the 2 h · **[stub]** page exists, says what's coming ·
**[—]** deferred, file not created · **[?]** stretch

```
BusEka.lk/
├── PLAN.md                        ← this file
├── DESIGN.md                      ← the spec. Do not contradict it.
├── README.md                      ← WRITE LAST. All 10 required items + AI declaration
├── STITCH-PROMPTS.md              ← §4 of this file, copy-pasted. Becomes the AI Prompt Log.
├── package.json
├── wrangler.jsonc
├── vite.config.ts
├── tsconfig.json
├── index.html
├── .gitignore                     ← .dev.vars .wrangler dist node_modules
├── .dev.vars.example              ← KEY NAMES ONLY, never values
│
├── migrations/
│   └── 0001_init.sql              [✓]
├── seed/
│   ├── stops.json                 [✓] 12 real stops, EN + SI
│   └── demo-groups.json           [✓] one demo group, code shown on /about
│
└── src/
    ├── worker/
    │   ├── index.ts               [✓] Hono app, mounts /api/*
    │   ├── env.d.ts               [✓] Env + Vehicle — the shared contract
    │   ├── do/
    │   │   ├── FleetHub.ts        [—] DESIGN.md §2 — polling substitutes
    │   │   └── GroupRoom.ts       [—] DESIGN.md §2 — D1 substitutes
    │   ├── sources/
    │   │   ├── sprpta.ts          [✓] fetch → normalise → KV               (A)
    │   │   ├── lmt.ts             [—] DESIGN.md §5.1 fallback taken
    │   │   └── wialon.ts          [?] stretch only                          (A)
    │   ├── routes/
    │   │   ├── fleet.ts           [✓] GET /api/fleet/snapshot               (A)
    │   │   ├── groups.ts          [✓] create / join / vehicles / live       (C)
    │   │   ├── drive.ts           [✓] start / ping / stop                   (C)
    │   │   ├── trains.ts          [stub] returns the honest "no feed" note  (D)
    │   │   └── ai.ts              [✓] POST /api/ai/plan, GET /api/ai/digest (D)
    │   ├── ai/
    │   │   ├── intent.ts          [✓] AI-1 — NL → {fromId,toId,lang}        (D)
    │   │   ├── places.ts          [✓] AI-2 reduced — stop list, no Vectorize(D)
    │   │   ├── digest.ts          [✓] AI-3 — seeded text in v1              (D)
    │   │   └── triage.ts          [—] AI-4 deferred
    │   └── lib/
    │       ├── geo.ts             [✓] haversineKm, nearestStop             (A)
    │       ├── eta.ts             [✓] DESIGN.md §4 F4 maths                (A)
    │       ├── codes.ts           [✓] 6-char code gen                      (C)
    │       ├── pin.ts             [✓] SHA-256 + salt (WebCrypto)           (C)
    │       └── validate.ts        [✓] Zod schemas + shared error shape     (all)
    │
    └── web/
        ├── main.tsx               [✓]
        ├── router.tsx             [✓] all 12 DESIGN.md §7 routes declared
        ├── index.css              [✓] @import "tailwindcss";
        ├── lib/
        │   ├── api.ts             [✓] typed fetch, one place for errors
        │   ├── sse.ts             [✓] useLive() hook — POLLING inside, SSE later.
        │   │                          Keeping the filename + hook signature is why
        │   │                          the DO upgrade is a one-file change.
        │   └── i18n.ts            [✓] en / si strings for the 6 UI labels that matter
        ├── components/
        │   ├── NavBar.tsx         [✓] bottom tabs <768px, top bar above    (B)
        │   ├── Map.tsx            [✓] Leaflet, canvas renderer             (B)
        │   ├── VehicleSheet.tsx   [✓] bottom sheet, not a modal            (B)
        │   ├── FilterChips.tsx    [✓] operator + "moving only"             (B)
        │   ├── EtaList.tsx        [✓] used by /g/:code and /plan           (B)
        │   ├── CodeInput.tsx      [✓] 6-box code entry                     (C)
        │   ├── Field.tsx          [+] label + input + inline error + aria  (C)
        │   └── EmptyState.tsx     [+] empty / offline / error              (B)
        └── pages/
            ├── Home.tsx           [✓] /                    Req 1, 2, 10
            ├── Map.tsx            [✓] /map        F1       Req 3, 6
            ├── Route.tsx          [stub] /route/:id
            ├── Stop.tsx           [stub] /stop/:id
            ├── Plan.tsx           [✓] /plan       F4       Req 3, 4, 5
            ├── Trains.tsx         [stub] /trains
            ├── Join.tsx           [✓] /join       F2       Req 4, 5
            ├── Group.tsx          [✓] /g/:code    F2       Req 3, 6
            ├── Owner.tsx          [✓] /owner      F2       Req 4, 5, 6
            ├── Drive.tsx          [✓] /drive/:token F3     Req 3
            ├── About.tsx          [✓] /about               Req 2, 10
            └── NotFound.tsx       [✓] *                    Req 8
```

`[+]` = added by this plan, not in DESIGN.md §15. Only three, all presentational.

**Ownership is by folder, so nobody edits the same file.** The only shared files are
`env.d.ts`, `lib/validate.ts`, `lib/api.ts` and `router.tsx` — agree them by minute 20,
then freeze.

---

## 3. Lanes — Stitch runs in parallel from minute 12

| Lane | Person | Owns | Window |
|---|---|---|---|
| **A — Data** | | `sources/`, `routes/fleet.ts`, `lib/geo.ts`, `lib/eta.ts` | 20–85 |
| **B — UI (Stitch)** | | **Stitch generation 12–45**, then conversion 45–85: `components/`, `Home`, `Map`, `About`, `NotFound`, stubs | 12–85 |
| **C — Groups & driver** | | `routes/groups.ts`, `routes/drive.ts`, `lib/codes.ts`, `lib/pin.ts`, `Owner`, `Join`, `Group`, `Drive`, `CodeInput`, `Field` | 20–85 |
| **D — AI** | | `ai/`, `routes/ai.ts`, `routes/trains.ts`, `Plan` | 20–85 |

Lane B is the critical path — **B starts at minute 12, not 20**, because C and D need B's
converted components. B ships `NavBar` + `Field` + the page shells to `main` by **minute
50** so C and D aren't blocked. That handoff is the single most important timing in this
plan.

With three people: fold D into A, and cut `/plan` down to a card on `/`.

---

## 4. The Stitch prompt library

Google Stitch (stitch.withgoogle.com) generates UI from text. Three facts shape how you
use it:

- **It exports HTML + CSS. There is no React export.** Conversion to `.tsx` is real work —
  budget 40 minutes for it, which is why lane B starts early.
- **Free tier: 350 Standard generations/month (Gemini 2.5 Flash), 50 Experimental/month
  (Gemini 2.5 Pro, accepts image input).** Every refine counts as a generation. **Spend
  Experimental only on `/map` and `/drive/:token`** — the two screens the video lives on.
  Everything else is Standard.
- **Stitch cannot enforce a design system across generations.** So **paste block 4.1 at
  the top of every single prompt.** Skip it once and that screen will come back a
  different colour with different corner radii, and you'll burn generations re-rolling it.

Save this whole section as `STITCH-PROMPTS.md` in the repo. It doubles as the mandatory
**AI Prompt Log** (brief §2.2), and the brief lists *"generating UI layout, components and
styling"* as explicitly permitted — so this is a strength to declare, not a risk to hide.

### 4.1 Design-system block — paste at the top of EVERY prompt

```
DESIGN SYSTEM — apply exactly, on every screen.

Product: BusEka — a live public-transport tracking web app for Sri Lanka.
Audience: daily bus commuters, and parents tracking a school van. Many are on
cheap Android phones on mobile data. Utility over decoration.

Output: responsive HTML using Tailwind CSS utility classes only. No custom
<style> blocks, no inline style attributes, no CSS files. Mobile-first, designed
at 360x640 and working up to 1440x900. No horizontal scrolling at any width.

Colours:
  primary   #1D4ED8   (bus blue, buttons and active states)
  live      #16A34A   (green — vehicle is reporting now)
  delayed   #D97706   (amber — reported but late)
  stale     #6B7280   (grey — last seen a while ago)
  page      #F5F7FA   surface #FFFFFF   text #0F172A   border #E2E8F0
  dark mode page #0B1220  surface #131C2E  text #E6EDF7  border #1E293B

Type: Inter. 15px body, 13px secondary, 20px semibold section headings.
Shape: 12px corner radius. 1px borders, not heavy shadows.
Touch targets minimum 44x44px.

Text may appear in Sinhala (කොළඹ) or Tamil. Never clip it — allow two lines
and let containers grow.

Every screen includes a bottom navigation bar below 768px with five items:
Map, Plan, Trains, Group, More — active item in primary blue. Above 768px the
same five become a top bar with the BusEka wordmark on the left.

Generate both light and dark variants.
```

### 4.2 Screen prompts

Nine prompts. Order matters — generate `/map` first, so the visual language is settled
before the rest.

---

**① `/map` — Live Map (F1) · use EXPERIMENTAL mode**

```
[paste design system block]

SCREEN: Live bus map. The main screen of the app.

Full-bleed map filling the whole viewport below the header. On top of it:

- A translucent top bar with the BusEka wordmark and a status strip reading
  "1,043 buses · 812 live · updated 3s ago". The "812 live" is in the live
  green. This strip is the most important text on the screen — make it
  readable from across a room.
- A search field pinned under the top bar, placeholder "Search route number
  — try 383/2".
- A horizontal row of filter chips under the search: "All", "SPRPTA",
  "MetroBus", "Depot", "Community", "Moving only". Selected chips filled
  primary blue, unselected outlined.
- Small round bus markers scattered across the map. Green for live, grey for
  stale. Do not draw pin-shaped markers — flat circles, 10px.
- A bottom sheet, collapsed to a peek showing one bus: plate "ND-7217",
  route "383/2", a green LIVE pill, and speed "34 km/h". Expanded, it also
  shows "Next stop: Ambalangoda · 6 min" and a "Track this bus" button.
- The bottom navigation bar.

Also generate two alternate states of the same screen:
(a) EMPTY — no vehicles, centred message "No buses reporting right now" with
    a "Retry" button.
(b) OFFLINE — an amber banner across the top reading "Can't reach the bus
    network — showing last known positions from 2 minutes ago", map dimmed.
```

---

**② `/drive/:token` — Driver broadcast (F3) · use EXPERIMENTAL mode**

```
[paste design system block]

SCREEN: Driver broadcast page. Opened by a bus or school-van driver on their
phone, one-handed, possibly in sunlight. Very large touch targets, very few
words, high contrast.

State 1 — IDLE:
  Vehicle name "Lyceum Van 12" and plate "WP-CAB-1234" at the top.
  One enormous green button, at least 120px tall, full width: "Start trip".
  Below it, small grey text: "Your location is shared only with people who
  have this van's group code. Sharing stops when you tap End trip."
  A secondary outlined button at the bottom: "Simulate route (demo)".

State 2 — BROADCASTING:
  A pulsing green dot with "LIVE" beside it, large.
  A status list: "Accuracy ±8 m", "14 pings sent", "3 people watching".
  A small map preview showing the current position.
  One large red button: "End trip".

State 3 — PERMISSION BLOCKED:
  An amber card: "Location is blocked for this site." Then two numbered
  steps telling the user to tap the padlock in the address bar and allow
  location. Then a "Try again" button and the "Simulate route (demo)"
  button.

No bottom navigation on this screen — the driver is doing one thing.
```

---

**③ `/join` — Join a group (F2)**

```
[paste design system block]

SCREEN: Join a tracking group by code.

Centred card, max-width 420px.
  Heading "Join a group".
  Sub-line "Enter the 6-character code from whoever runs your van, shuttle
  or bus."
  A 6-box code input — six separate square boxes, monospace, uppercase,
  auto-advancing. Boxes 56px tall.
  A "Your name" text field with helper "So the group knows who's watching."
  A full-width primary button "Join".
  A small link: "Have a vehicle instead? Create a group".

Also generate three error states of the same card:
(a) code too short — red text under the boxes: "That code is 5 characters —
    join codes are 6."
(b) no such group — "No group with that code. Check with whoever shared it."
(c) rate limited — an amber card: "Too many tries. Wait a minute and try
    again."

Errors appear inline beneath the field, with a small warning icon as well as
red colour — never colour alone.
```

---

**④ `/owner` — Owner console (F2)**

```
[paste design system block]

SCREEN: Owner console. A van or bus owner sets up tracking for their vehicles.

Two sections stacked on mobile, side by side above 1024px.

Section 1 — "Create a group":
  Fields: Group name (helper "e.g. Lyceum Van 12"), Group type as a select
  (School van / Staff shuttle / Public bus route / Tour group), a 4-digit PIN
  input, and Confirm PIN. Primary button "Create group".

Section 2 — "Your group", shown after creation:
  A large card displaying the join code "K7M2QX" in big monospace, with a
  copy button, and text "Share this code with parents or passengers."
  A "Rotate code" secondary button with the warning "The old code stops
  working immediately."
  Below it, a "Vehicles" list. Each row: label, plate, a status pill
  (LIVE green / OFFLINE grey), and a "Driver link" button.
  Tapping "Driver link" opens a panel with a QR code, the URL in a copyable
  box, and the line "Send this to the driver. Opening it on their phone
  starts tracking."
  An "Add vehicle" form: Label, Plate (helper "Like ND-7217"), optional
  route number.

Include the validation error states: "Group name needs at least 3 characters",
"Your PINs don't match", "Plate looks like ND-7217 or WP-CAB-1234".
```

---

**⑤ `/g/:code` — Group map (F2)**

```
[paste design system block]

SCREEN: Group live view. A parent watching their child's school van.

Header: group name "Lyceum Van 12", a green LIVE pill, and small text
"2 vehicles · 6 watching".
A map filling most of the screen, showing one or two vehicle markers only —
this is a private view, not the whole city.
Below the map, a list of the group's vehicles. Each row: label, plate,
a status pill, "Last seen 4 seconds ago", and an ETA line
"Arriving at Kollupitiya in about 7 min".
A "Leave group" text link at the bottom.

Also generate an empty state: "No one is driving right now. You'll see the
van here as soon as the driver starts their trip."

Include the bottom navigation bar.
```

---

**⑥ `/plan` — AI journey assistant (F4)**

```
[paste design system block]

SCREEN: Ask about a journey. An AI assistant that answers transport questions.

Top: heading "Where are you going?" and a large textarea, placeholder
"Kollupitiya to Negombo".
Under it, three tappable example chips: "Galle to Matara",
"Kollupitiya to Negombo", "කොළඹ සිට ගාල්ල".
A primary button "Ask".

Answer state — a card containing:
  A two-sentence plain-language answer in larger text.
  Beneath it, an "Evidence" block in smaller grey text listing the actual
  bus used: plate "ND-7217", route "383/2", "4 min away at Bambalapitiya",
  "about 41 km total".
  A small footnote: "ETAs are calculated from live GPS positions, not
  estimated by the AI."

Also generate:
(a) LOADING — a skeleton card with three shimmer lines.
(b) EMPTY INPUT ERROR — inline red text under the textarea: "Tell me where
    you're starting from — try 'Galle to Matara'."
(c) NO ANSWER — a grey card: "I couldn't work that one out. Try naming two
    places, like 'Fort to Kadawatha'."

Include the bottom navigation bar.
```

---

**⑦ `/` — Home / landing**

```
[paste design system block]

SCREEN: Landing page. Explains the problem before showing the product.

Hero: the BusEka wordmark, then a headline "Every bus in Sri Lanka. One map."
and a sub-line "Plus a way to track the school van, using nothing but the
driver's phone."
A live counter strip directly under the hero, in a bordered card:
"812 buses live right now" with the number in the live green and a pulsing
dot.
Two primary actions side by side: "Open the map" and "Track my group".

A section titled "The problem", three short paragraphs in readable prose
(not bullets), max-width 65 characters per line.

A three-card row titled "What BusEka does":
  card 1 "One live map" — every operator in one place
  card 2 "Private groups" — a 6-character code, no accounts
  card 3 "No hardware" — the driver's phone is the tracker

A card titled "Network status right now" containing one paragraph of
plain-language text about current conditions, with a small "Updated 4 min
ago · written by AI from live data" label under it.

Footer with links: About, GitHub, and an attribution line
"Live data from SPRPTA (spgps.lk)".

Include the bottom navigation bar.
```

---

**⑧ `/about` — About**

```
[paste design system block]

SCREEN: About page.

Sections stacked:
1. "The problem we chose" — three paragraphs.
2. "Who this helps" — three rows, each an icon, a heading and one line:
   daily commuters, parents of school-van children, small van owners with no
   tracking hardware.
3. "The team" — a table with columns Name, Student ID, What they built.
   Four rows.
4. "How we used AI" — a table with columns Tool, What it was used for.
   Rows for Google Stitch, Claude, and Cloudflare Workers AI.
5. "Data sources" — a short list with links.
6. "Try it" — a card showing a demo group code "DEMO24" and the line
   "Use this code on the Join page to see a group in action."

Readable, document-like, generous line height. Include the bottom navigation.
```

---

**⑨ Stubs — `/trains`, `/route/:id`, `/stop/:id`, and 404 · one generation, four states**

```
[paste design system block]

SCREEN: Four simple placeholder screens in one design, sharing a layout.

Shared layout: a centred card, max-width 420px, with an icon, a heading, one
paragraph, and a primary button.

1. TRAINS: heading "Train tracking is coming".
   Paragraph: "Sri Lanka Railways doesn't publish live train positions, so we
   are building this from passenger reports instead. The reporting screen
   isn't ready yet."
   Button: "Back to the map".

2. ROUTE DETAIL: heading "Route view is coming". Paragraph: "For now, tap any
   bus on the map to see its route and next stop." Button: "Open the map".

3. STOP BOARD: heading "Stop board is coming". Paragraph: "Departure boards
   for individual stops are next on our list." Button: "Open the map".

4. NOT FOUND: heading "That page doesn't exist". Paragraph: "The link may be
   old, or mistyped." Button: "Go home".

Include the bottom navigation bar on all four.
```

### 4.3 Converting Stitch HTML → React (lane B, minutes 45–85)

Work in this order. Roughly 6 minutes per screen once the first is done.

1. **Take the markup, not the page.** Copy what's inside `<body>` into
   `src/web/pages/<Name>.tsx`, wrapped in a component. Discard Stitch's `<head>`,
   its font links, and any `<style>` block it emitted despite the prompt.
2. **Fix JSX-isms:** `class=` → `className=`, `for=` → `htmlFor=`, self-close `<img>`
   and `<input>`, `tabindex` → `tabIndex`. Your editor's find-and-replace does this in
   about 20 seconds.
3. **Delete the fake map.** Stitch draws a map as a static image or a coloured `div`.
   Replace it with `<div ref={mapRef} className="h-full w-full" />` and let
   `components/Map.tsx` mount Leaflet into it. **This is the #1 place people waste ten
   minutes** — don't try to style around Stitch's fake map, delete it.
4. **Replace every hardcoded string with state.** "812 live" → `{stats.live}`,
   "ND-7217" → `{v.label}`, "4 seconds ago" → `{relTime(v.ts)}`. Grep the file for digits
   before you commit; a leftover hardcoded number that never changes on camera is the
   easiest thing for an evaluator to catch.
5. **Wire the three states Stitch gave you.** It generated loading / empty / error as
   separate screens — they become `if (loading) … if (error) … if (!data.length) …` at the
   top of the component. This is why the prompts asked for them: those states are
   Requirement #5 and part of the 15 usability marks.
6. **Extract only what repeats.** `NavBar`, `Field`, `EmptyState`, `CodeInput`. Resist
   extracting anything else — component archaeology is not what you're graded on.
7. **Keep the dark variant only if it costs nothing.** If Stitch used `dark:` utilities,
   it's free. If it produced a separate document, drop it.

**Every member converts at least one screen.** Contribution from all registered members is
5 marks, and *"submitting code no member can explain"* is a declared breach — the person
who converts a screen is the person who can explain it.

---

## 5. Step by step

### Step 0 — before the clock (5 min, day before) — verification only

```bash
node -v                 # >= 20
npx wrangler login && npx wrangler whoami
```

- [ ] `https://api.spgps.lk/api/public/bus-live-locations-for-map` returns 200 and a large
      array. If not, lane A changes and you need to know now.
- [ ] Everyone signed in to stitch.withgoogle.com; check the remaining Experimental
      generations — you need **at least 6** for screens ① and ② plus refines.
- [ ] Everyone's `git config user.name` and `user.email` set on their own machine.
- [ ] Phones charged, on **mobile data not venue Wi-Fi**, screen-record tested.

### Step 1 — minutes 0–12 · Scaffold and deploy something empty

One person drives. **Deploying at minute 12 is not optional** — a URL that exists and says
"BusEka — coming up" beats a perfect app that first deploys at minute 105.

```bash
cd ~/Documents/GitHub/BusEka.lk
npm create cloudflare@latest -- . --framework=react --platform=workers
npm i hono zod leaflet react-router-dom qrcode
npm i -D @types/leaflet @tailwindcss/vite tailwindcss

npx wrangler d1 create buseka
npx wrangler kv namespace create CACHE
```

`wrangler.jsonc` — DESIGN.md §8.3 minus the deferred bindings:

```jsonc
{
  "name": "buseka",
  "main": "src/worker/index.ts",
  "compatibility_date": "2026-09-04",
  "compatibility_flags": ["nodejs_compat"],
  "assets": {
    "directory": "./dist/client",
    "not_found_handling": "single-page-application"
  },
  "d1_databases": [
    { "binding": "DB", "database_name": "buseka", "database_id": "PASTE_ID" }
  ],
  "kv_namespaces": [{ "binding": "CACHE", "id": "PASTE_ID" }],
  "ai": { "binding": "AI" },
  "observability": { "enabled": true }
}
```

> `assets.directory` must match what Vite actually writes. The C3 React template outputs
> `dist/client`; a plain Vite app outputs `dist`. **Run `ls dist` after the first build.**
> A wrong path here is the single most common cause of "works locally, blank in
> production."

```ts
// src/worker/index.ts
import { Hono } from 'hono';
const app = new Hono<{ Bindings: Env }>();
app.get('/api/health', (c) => c.json({ ok: true, ts: Date.now() }));
export default app;
```

```bash
npm run build && npx wrangler deploy
git add -A && git commit -m "chore: scaffold worker, assets, d1, kv bindings" && git push
```

Open the `*.workers.dev` URL **in a private window**. Paste it in the team chat.

### Step 2 — minutes 12–20 · Freeze contracts, seed, and start Stitch

**Lane B leaves the room conversation at minute 12 and starts generating.** The other
three agree the following, then split.

**(a) `src/worker/env.d.ts` — the only integration contract** (DESIGN.md §4):

```ts
interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
  AI: Ai;
  ADMIN_KEY: string;
  WIALON_HOST?: string;
  WIALON_TOKEN_KOLLUPITIYA?: string;
}

type Vehicle = {
  id: string;            // "sprpta:868982050024918" | "group:7"
  source: 'sprpta' | 'group' | 'wialon';
  label: string;         // "ND-7217"
  routeNo?: string;      // "383/2"
  lat: number;
  lng: number;
  speedKmh: number;
  ts: number;            // ms epoch
  stale: boolean;        // ts older than 120s
};
```

**(b) The error shape** (DESIGN.md §8.2) — every failing endpoint returns:

```json
{ "error": { "code": "BAD_CODE", "message": "No group with that code. Check with whoever shared it.", "field": "code" } }
```

The frontend renders `message` verbatim. **All error copy lives server-side, in one file.**
It is also exactly the copy the Stitch prompts asked for, so the two match.

**(c) Schema + seed** (DESIGN.md §8.1, reduced to what ships):

```sql
-- migrations/0001_init.sql
CREATE TABLE groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'school',
  pin_hash TEXT NOT NULL, pin_salt TEXT NOT NULL,
  created_at INTEGER NOT NULL, expires_at INTEGER
);
CREATE TABLE group_vehicles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER NOT NULL REFERENCES groups(id),
  plate TEXT NOT NULL, label TEXT NOT NULL, route_no TEXT,
  drive_token TEXT UNIQUE NOT NULL, active INTEGER NOT NULL DEFAULT 1
);
-- ONE ROW PER VEHICLE, UPSERTED. D1 free-tier row writes are enforced since 1 Sep 2026.
CREATE TABLE positions (
  vehicle_id INTEGER PRIMARY KEY REFERENCES group_vehicles(id),
  lat REAL NOT NULL, lng REAL NOT NULL,
  speed_kmh REAL NOT NULL DEFAULT 0, accuracy_m REAL, ts INTEGER NOT NULL
);
CREATE TABLE stops (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name_en TEXT NOT NULL, name_si TEXT, lat REAL NOT NULL, lng REAL NOT NULL
);
CREATE TABLE join_attempts (ip TEXT NOT NULL, ts INTEGER NOT NULL);
CREATE INDEX idx_join_ip_ts ON join_attempts(ip, ts);
CREATE INDEX idx_gv_group   ON group_vehicles(group_id);
```

Sample data — Requirement #9, marks on its own:

```sql
INSERT INTO stops (name_en, name_si, lat, lng) VALUES
 ('Colombo Fort','කොටුව',6.9344,79.8500),
 ('Kollupitiya','කොල්ලුපිටිය',6.9110,79.8490),
 ('Bambalapitiya','බම්බලපිටිය',6.8940,79.8560),
 ('Dehiwala','දෙහිවල',6.8510,79.8650),
 ('Moratuwa','මොරටුව',6.7730,79.8820),
 ('Kadawatha','කඩවත',7.0000,79.9500),
 ('Ja-Ela','ජා-ඇල',7.0740,79.8920),
 ('Negombo','මීගමුව',7.2080,79.8380),
 ('Galle','ගාල්ල',6.0329,80.2170),
 ('Matara','මාතර',5.9490,80.5350),
 ('Ambalangoda','අම්බලන්ගොඩ',6.2350,80.0540),
 ('Hikkaduwa','හික්කඩුව',6.1400,80.1000);
```

```bash
npx wrangler d1 execute buseka --local  --file=./migrations/0001_init.sql
npx wrangler d1 execute buseka --remote --file=./migrations/0001_init.sql
npx wrangler d1 execute buseka --local  --file=./seed/stops.sql
npx wrangler d1 execute buseka --remote --file=./seed/stops.sql
```

> `--local` and `--remote` are **two separate databases.** Seeding only local and then
> demoing the deployed URL is a guaranteed panic at minute 100. Do both, now.

Then `git checkout -b lane-a` (…b, c, d).

### Step 3 — minutes 20–85 · Build

Commit to your own branch every ~10 minutes. Nobody merges to `main` before minute 85,
**except lane A's `lib/geo.ts` (early, lane D needs it) and lane B's shared components at
minute 50.**

---

#### Lane A — data

`GET /api/fleet/snapshot` → `{ vehicles: Vehicle[], live, total, ts, stale }`
(DESIGN.md §8.2, exact path.)

1. `CACHE.get('fleet','json')`; if `Date.now() - ts < 12000`, return it.
2. Else fetch `https://api.spgps.lk/api/public/bus-live-locations-for-map`.
3. Normalise, dropping null coords and `isOnline: false`:

```ts
{
  id: `sprpta:${bus.imei}`,
  source: 'sprpta',
  label: bus.routePermitBus?.busNumber ?? 'Unknown',
  routeNo: bus.routePermitBus?.routePermit?.route?.routeNumber,
  lat: bus.lat, lng: bus.lon,        // upstream says "lon", our type says "lng"
  speedKmh: 0, ts: Date.now(), stale: false,
}
```

Every one of those accessors is nullable — use `?.` the whole way down.

4. `CACHE.put('fleet', JSON.stringify(payload), { expirationTtl: 60 })`.
5. **On upstream failure, return the last cached payload with `stale: true`, not a 500.**
   A degraded map beats a broken one, and it's what Stitch screen ①(b) was designed for.

`lib/geo.ts`, pushed to `main` early:

```ts
export function haversineKm(aLat:number,aLng:number,bLat:number,bLng:number){
  const R=6371, toRad=(d:number)=>d*Math.PI/180;
  const dLat=toRad(bLat-aLat), dLng=toRad(bLng-aLng);
  const h=Math.sin(dLat/2)**2 + Math.cos(toRad(aLat))*Math.cos(toRad(bLat))*Math.sin(dLng/2)**2;
  return 2*R*Math.asin(Math.sqrt(h));
}
```

`lib/eta.ts` is DESIGN.md §4 F4, verbatim — see §7 below.

**Stretch, only if the map is green at minute 70:** `sources/wialon.ts` per DESIGN.md §4 —
`token/login` → `eid`, then `core/search_items` with `flags: 1025`. Position arrives as
`pos: { x: lon, y: lat, s: speed }` — **`x` is longitude**. Re-login on error `1003`.

---

#### Lane B — Stitch, then UI

**12–45 · generate.** Screens in order ① ② ③ ④ ⑤ ⑥ ⑦ ⑧ ⑨. Design-system block on every
one. Experimental mode for ① and ② only. Do not refine more than twice — a screen that's
80% right converts fine; a third re-roll costs a generation and five minutes.

**45–50 · ship the shared parts first.** `NavBar`, `Field`, `EmptyState`, `CodeInput` and
empty page shells for all 12 routes in `router.tsx` → merge to `main` at **minute 50**.
C and D are blocked until you do.

**50–85 · convert** per §4.3: `Home`, `Map`, `About`, `NotFound`, the four stubs. Hand
`Join`/`Owner`/`Group`/`Drive` markup to C and `Plan` to D — they wire their own state.

`components/Map.tsx` — Leaflet with the canvas renderer. 780 SVG markers will drop the
projector to single-digit fps:

```tsx
const map = L.map(el, { preferCanvas: true }).setView([6.9271, 79.8612], 9);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors', maxZoom: 18,
}).addTo(map);
const layer = L.layerGroup().addTo(map);   // clear + refill each poll
```

`L.circleMarker([v.lat, v.lng], { radius: 5 })` per vehicle. **Never create and destroy
780 markers per tick.** Clear the interval in the effect cleanup or you leak a timer per
navigation.

`lib/sse.ts` — one hook, polling inside:

```ts
export function useLive<T>(url: string, ms = 6000) { /* fetch, setState, setInterval, cleanup */ }
```

Keeping this filename and signature is what makes the DESIGN.md §2 Durable Object upgrade
a one-file change later.

---

#### Lane C — groups and driver

Build **in this order**, so that running out of time means running out at the right place.

1. **`lib/codes.ts`** (5 min)

```ts
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';   // no 0/O/1/I/l
export const newCode = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(6)))
       .map(b => ALPHABET[b % ALPHABET.length]).join('');
```

Retry on `UNIQUE` failure. **Say the number in the demo:** 32⁶ ≈ 1.07 billion versus 10⁶
for plain digits — that is *why* the alphabet isn't `0-9`, and it's DESIGN.md §4 F2's
security argument in one sentence.

2. **`lib/pin.ts`** (5 min) — SHA-256 over `salt + pin` via `crypto.subtle.digest`. Never
   store the PIN. Five lines, and it's the difference between "we thought about security"
   and "we didn't."
3. **`POST /api/groups`** (10 min) → `{ code }`. Zod-validated.
4. **`POST /api/groups/:code/vehicles`** (10 min) → `{ driveToken, driveUrl }`. Render
   `driveUrl` on `/owner` as **a QR code plus a copyable link** (`qrcode`, 3 lines). The
   driver scans it — no typing on a phone, and it demos beautifully.
5. **`POST /api/groups/:code/join`** (10 min) — rate limit **before** anything else:

```sql
DELETE FROM join_attempts WHERE ts < ?;                     -- now - 60000
SELECT COUNT(*) AS n FROM join_attempts WHERE ip = ? AND ts > ?;
-- n >= 5 → 429 "Too many tries. Wait a minute and try again."
INSERT INTO join_attempts (ip, ts) VALUES (?, ?);           -- c.req.header('cf-connecting-ip')
```

6. **`POST /api/drive/:token/ping`** (10 min) — **upsert, never append:**

```sql
INSERT INTO positions (vehicle_id, lat, lng, speed_kmh, accuracy_m, ts)
VALUES (?,?,?,?,?,?)
ON CONFLICT(vehicle_id) DO UPDATE SET
  lat=excluded.lat, lng=excluded.lng, speed_kmh=excluded.speed_kmh,
  accuracy_m=excluded.accuracy_m, ts=excluded.ts;
```

7. **`GET /api/groups/:code/live`** (5 min) — join `group_vehicles` + `positions` →
   `Vehicle[]` with `source: 'group'`. Reuses lane B's `Map.tsx` unchanged. (This is the
   2-hour stand-in for DESIGN.md's `/api/groups/:code/stream`; the SSE path keeps its name
   for later.)
8. **`Drive.tsx`** (15 min) — wire Stitch screen ②'s three states to:

```tsx
navigator.geolocation.watchPosition(
  pos => post(`/api/drive/${token}/ping`, {
    lat: pos.coords.latitude, lng: pos.coords.longitude,
    speed: (pos.coords.speed ?? 0) * 3.6, accuracy: pos.coords.accuracy,
  }),
  err => setBlocked(err.code === err.PERMISSION_DENIED),
  { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
);
navigator.wakeLock?.request('screen').catch(() => {});
```

Three things that *will* bite you:

- **Geolocation requires HTTPS.** `workers.dev` and `localhost` are fine; a LAN IP like
  `192.168.1.5:5173` fails **silently**. Test on the deployed URL.
- **iOS Safari** throttles `watchPosition` hard when the tab backgrounds. Keep it
  foregrounded, keep the wake lock.
- **Build the "Simulate route (demo)" button** — it replays a hardcoded 8-point polyline
  through `/ping` on a 3 s timer. Fifteen minutes, and it is your insurance if venue Wi-Fi
  or a permission prompt kills the live demo. **Do not skip it because you're behind —
  it's the thing you're behind for.**

---

#### Lane D — AI

`POST /api/ai/plan` (DESIGN.md §8.2, exact path) → `{ legs, narration, lang }`.

**DESIGN.md §4 F4's governing rule, unchanged: the LLM never computes a number.**

```
①  SELECT id, name_en, name_si FROM stops                       (12 rows — no Vectorize)

②  ai/intent.ts — glm-4.7-flash, JSON mode, temperature 0:
      "Here is a list of bus stops with ids. The user wrote: '<question>'.
       Return {fromId, toId, lang} choosing only from these ids. Null if unclear."
    Handles "kollupitiya idn negombo", "කොළඹ ඉඳන් ගාල්ල", typos, Singlish.

③  DETERMINISTIC TypeScript — no model:
      • GET /api/fleet/snapshot
      • buses within 3 km of fromStop via lib/geo.haversineKm
      • nearest one wins
      • etaMin  = lib/eta.etaMinutes(bus, fromStop)
      • journeyKm = haversineKm(fromStop, toStop)

④  glm-4.7-flash again, given ONLY those computed numbers:
      "Write two friendly sentences in <lang>. Use only these numbers.
       Do not invent or adjust any number."
```

Both calls wrapped:

```ts
const withTimeout = <T,>(p: Promise<T>, ms = 6000) =>
  Promise.race([p, new Promise<never>((_, r) => setTimeout(() => r(new Error('timeout')), ms))]);
```

**Both fallbacks are mandatory** (DESIGN.md §6.1): ② fails → split on
`/\b(to|from|idn|සිට|ඉඳන්)\b/i` and string-match stop names; ④ fails → return a templated
English sentence from the same numbers. Validate the model's JSON with **Zod** before
touching it — a malformed response is a handled case, not a 500.

`GET /api/ai/digest` (AI-3) returns a seeded paragraph from KV in v1; the cron-generated
version is DESIGN.md §6 and comes later.

`routes/trains.ts` returns the honest note that backs Stitch screen ⑨(1).

`Plan.tsx` — wire Stitch screen ⑥'s four states. Keep the "Evidence" block: plate, route
number, distance. It is what makes the answer checkable.

**Say this in the video:** *"The model parses the question and writes the sentence. Every
distance and every ETA is computed in TypeScript — we don't let it invent a number."*
That sentence is precisely what the top AI band asks for.

---

### Step 4 — minutes 85–100 · Integrate and polish

```bash
git checkout main
git merge lane-a lane-b lane-c lane-d
npm run build && npx wrangler deploy
```

Then **all four people, on the deployed URL, in a private window:**

| Check | Req |
|---|---|
| All 12 routes reachable; stubs look intentional, not broken; 404 is friendly | 8 |
| 360×640 — no horizontal scroll anywhere, map full-bleed, bottom tabs reachable | 7 |
| Submit every form **empty** → friendly message, not a crash | 5 |
| Join with `12345`, `ZZZZZZ`, then 6 times fast → three distinct helpful messages | 5 |
| Kill Wi-Fi mid-map → stale banner, no white screen | 5 |
| `/drive/:token` on a real phone → dot appears on someone else's laptop | 3 |
| Nonsense question on `/plan` → graceful "I couldn't work that one out" | 5 |
| Problem statement on `/`, affected users named | 2, 10 |
| Seeded stops visible; `DEMO24` works on `/join` | 9 |
| **Grep the pages for leftover Stitch placeholder text** | 15 |

That last one matters more than it sounds. A hardcoded "812 live" that never changes on
camera is the easiest thing in the world for an evaluator to spot.

**Do not start anything new after minute 85.**

### Step 5 — minutes 100–110 · Ship

Final deploy, then `README.md` with all ten required items: title · problem · solution ·
main features · technologies · **AI tools, one line each** · team members + IDs + **what
each person actually did** · install/run · deployed link · video link.

```bash
git shortlog -sn        # every registered member must appear
```

Zero commits from someone caps that criterion at 3–4/10, and "contribution from all
registered members" is a separate 5 marks on top. Fix it before you deploy.

Verify the deployed link **in a private window, on a phone, on mobile data**.

### Step 6 — minutes 110–120 · Record and submit

DESIGN.md §13, unchanged. **2:00 hard ceiling, rehearse once against a timer.**

| Time | Shot | Say |
|---|---|---|
| 0:00–0:15 | Team + `/` | Names, IDs, problem in one sentence, users named |
| 0:15–0:40 | `/map` | "Real live data — 812 buses moving right now, one map" |
| 0:40–1:00 | `/plan` | The "model never computes a number" line |
| 1:00–1:30 | Phone `/drive/:token` → laptop `/g/K7M2QX` | **Walk. The dot moves. This wins the room.** |
| 1:30–1:45 | `/join` with a bad code | Show the friendly error deliberately |
| 1:45–2:00 | URL + repo + impact | "Any van owner is on this map in 60 seconds, no hardware" |

Submission PDF: repo link, deployed link, video link, names + IDs, problem/solution
paragraph, technology + AI tool list, **and the AI Prompt Log** — `STITCH-PROMPTS.md` is
most of it already. Record tool, exact prompt, purpose, and how the output was checked or
modified. **Redact the Wialon tokens and any keys** — the brief requires this explicitly.

---

## 6. Credentials

Wialon tokens go in `.dev.vars` (gitignored) locally and
`npx wrangler secret put WIALON_TOKEN_KOLLUPITIYA` in production. Two of the four supplied
are byte-identical, so there are **three** distinct fleets. `.dev.vars.example` carries key
names with empty values. They must not appear in the repo, README, PDF or prompt log.

---

## 7. Reference — `lib/eta.ts` (DESIGN.md §4 F4, verbatim)

The algorithm an evaluator is most likely to ask you to explain or modify live. Keep it
short, keep the comments, and make sure **two people** have read it.

```ts
export function etaMinutes(
  busLat: number, busLng: number, busSpeedKmh: number,
  stopLat: number, stopLng: number,
): number {
  const km = haversineKm(busLat, busLng, stopLat, stopLng);
  // A bus at 0 km/h is at a stop or in traffic — it is not stopped forever.
  // 25 km/h is the observed urban average and matches what LMT-GO's own app assumes.
  const effectiveKmh = busSpeedKmh > 2 ? busSpeedKmh : 25;
  return (km / effectiveKmh) * 60;
}

export function formatEta(min: number): string {
  if (min <= 1)  return 'Arriving';
  if (min <= 10) return `${Math.round(min)} min`;
  return new Date(Date.now() + min * 60_000)
    .toLocaleTimeString('en-LK', { hour: 'numeric', minute: '2-digit' });
}
```

Straight-line distance under-estimates road distance by roughly 20–30%. **Say that in the
demo** — knowing your approximation's error is worth more than pretending it's exact.

---

## 8. Risk register

| Risk | Mitigation |
|---|---|
| `assets.directory` wrong → blank page in production | `ls dist` after first build; deploy at minute 12 |
| Seeded `--local` but not `--remote` | Both commands, side by side, Step 2 |
| **Stitch conversion overruns** | Lane B starts at minute 12; shared components merged by minute 50; max two refines per screen |
| Stitch emits custom CSS despite the prompt | Design-system block says Tailwind utilities only; if it still does, keep the `<style>` block rather than rewriting — it's ugly, it works, move on |
| Experimental generations run out | Only screens ① and ② use it; check the quota the day before |
| Geolocation blocked at the venue | "Simulate route (demo)" button, lane C step 8 |
| Upstream bus API down | KV returns last snapshot with `stale: true` |
| Workers AI slow or erroring | 6 s timeout + rule-based fallback both directions |
| 780 markers tank the framerate | Leaflet `preferCanvas: true`, one `layerGroup` |
| D1 free-tier row limits (enforced since 1 Sep 2026) | Positions upserted; fleet never touches D1 |
| Merge conflicts at minute 85 | Ownership by folder; four shared files frozen at minute 20 |
| A member has no commits | `git shortlog -sn` at minute 100 |

---

## 9. Requirement coverage (DESIGN.md §12 — check at minute 100)

| # | Requirement | Where | Lane |
|---|---|---|---|
| 1 | Clear landing page | `/` (Stitch ⑦) | B |
| 2 | Problem explained in-app | `/` + `/about` (⑦, ⑧) | B |
| 3 | ≥2 functional features | F1–F4, four shipped | all |
| 4 | ≥1 form accepting input | `/join`, `/owner` ×2, `/plan` | C, D |
| 5 | Validation + friendly errors | Stitch error states ③④⑥, Zod both sides | C, D |
| 6 | Display/search/filter/calculate | Map filters + route search + ETA maths | A, B |
| 7 | Responsive | Design-system block, tested 360 & 1440 | B |
| 8 | Navigation between sections | `NavBar`, all 12 routes reachable | B |
| 9 | Sample data | 12 seeded stops, demo group `DEMO24` | C |
| 10 | Value demonstrated | `/` + the live driver demo | all |

---

## 10. Sources

- SE3090 Assignment 2 specification and marking scheme (supplied)
- `findings.md` — SPRPTA teardown (supplied); REST polling named as the no-proxy alternative
- [Workers best practices — use Workers Static Assets for new projects](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/)
- [Cloudflare Pages get-started — "Start new projects with Workers"](https://developers.cloudflare.com/pages/get-started/)
- [Workers platform limits — 100,000 requests/day free](https://developers.cloudflare.com/workers/platform/limits/)
- [D1 free-tier daily query limits enforced (1 Sep 2026)](https://developers.cloudflare.com/changelog/post/2026-09-01-d1-free-tier-limit-enforcement/)
- [Workers AI pricing — 10,000 Neurons/day free](https://developers.cloudflare.com/workers-ai/platform/pricing/)
- [Models requiring Workers Paid](https://developers.cloudflare.com/changelog/post/2026-07-28-models-require-workers-paid/)
- [Google Stitch guide — modes, free-tier limits, HTML/CSS export](https://www.nxcode.io/resources/news/google-stitch-complete-guide-vibe-design-2026)
