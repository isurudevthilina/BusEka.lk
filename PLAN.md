# BusEka.lk — PLAN.md

**Two-hour build. Cloudflare Workers + D1 + KV + Workers AI. One deploy, one URL.**
Companion to `DESIGN.md` — that file is the *why*, this file is the *do*.

---

## 0. What changed because it's 2 hours, not 4

I cut three things from `DESIGN.md`, and each cut removes a specific failure mode:

| Cut | Why | What replaces it |
|---|---|---|
| **Durable Objects** | `new_sqlite_classes` migrations, a class that must deploy cleanly first time, and one person who has to learn the API mid-build. ~25 min of risk for a UX difference of about 3 seconds. | Client polls `GET /api/fleet` every 6 s and `GET /api/groups/:code/live` every 4 s. Boring, works, everyone can debug it. |
| **Vectorize + embeddings** | Index creation, seeding, a reindex endpoint. ~30 min. | Pass the (small) list of seeded stop names to the model in the prompt and let it pick. Same result at this data size, zero infrastructure. |
| **Upstream WebSockets** | `wss://ws.spgps.lk` needs a persistent connection, which needs a DO. | Poll `GET https://api.spgps.lk/api/public/bus-live-locations-for-map` server-side, cache in KV for 12 s. **The findings doc already names this as the supported no-proxy alternative.** |

**Also dropped:** Lanka Metro (their token, their infrastructure, +1 coordinate quirk —
not worth 20 minutes), trains (no live feed exists; see `DESIGN.md` §0.1), Vectorize,
voice input, `/route/:id`, `/stop/:id`.

**Wialon is a stretch goal**, not a lane. If the map works with SPRPTA at minute 70, one
person adds it; otherwise it never gets mentioned.

Team assumed: **4 people**. With 3, lane D folds into lane A and you cut F4's `/ask` page
down to a single card on `/`.

---

## 1. Cloudflare product choices — the answer, with reasons

You asked Pages vs Workers vs database. Direct answers:

| Question | Answer | Reason (say this in the demo) |
|---|---|---|
| **Pages or Workers?** | **Workers, with Static Assets.** Not Pages. | Cloudflare's own docs now say it outright: *"If you are starting a new project, use Workers instead of Pages. Pages continues to work, but new features and optimizations are focused on Workers."* Workers also gets Cron Triggers, Durable Objects and full observability; Pages doesn't. And it's **one deploy for frontend + API**, so there is no CORS, no second URL, no environment drift. |
| **Which database?** | **D1** for anything relational (groups, vehicles, stops, positions). **KV** for the cached fleet snapshot. | D1 is SQLite — the team already knows the dialect, and groups→vehicles→positions are genuinely relational. KV is the right tool for one hot blob read by every visitor and tolerant of 12 s staleness. Using both, correctly, is itself a defensible stack decision. |
| **What about R2?** | **No.** | No file uploads in scope. Adding an unused binding invites a question you gain nothing by answering. |
| **Which AI?** | **Workers AI**, `@cf/zai-org/glm-4.7-flash` primary, `@cf/google/gemma-4-26b-a4b-it` fallback. | Both confirmed available on the **Workers Free** plan. No API key, no external egress, nothing to rate-limit you mid-demo. Avoid `kimi-k2.6`, `kimi-k2.7-code`, `glm-5.2` — those now return **HTTP 403 / error 5035** on free accounts. |

### 1.1 Free-tier budget — know these four numbers

| Limit | Value | Does it bite us? |
|---|---|---|
| Worker requests | **100,000/day**, resets 00:00 UTC (Error 1027 past it) | 10 clients polling every 6 s for 2 h ≈ 12,000. Safe. Don't drop the interval below 4 s. |
| Workers AI | **10,000 Neurons/day** | A `glm-4.7-flash` round trip is small change. Safe. |
| D1 rows | **Row read/write daily caps are now enforced on free** (as of 1 Sep 2026 — queries *fail*, they don't degrade) | Only bites if you write fleet positions to D1. **Don't.** Fleet lives in KV; D1 only takes driver pings (~1 write per vehicle per 5 s). |
| External subrequests | **50 per invocation** on free | We make 1–4. Fine. |

---

## 2. Scope — four features, each deliberately small

| # | Feature | Reduced to | Owner | Est. |
|---|---|---|---|---|
| **F1** | Live bus map | SPRPTA only, ~780 live buses, filter + search + live counter | **B** | 45 min |
| **F2** | Groups with 6-digit codes | Create group, add vehicle, join by code, group map | **C** | 40 min |
| **F3** | Driver broadcast | Phone GPS → POST every 5 s → appears on group map | **C** | 20 min |
| **F4** | AI journey assistant | One question in → one answer with a real live ETA | **D** | 30 min |

Assignment requires **at least two** working features. Three of these four working
perfectly beats four working partially — the rubric's biggest block (20 marks) is
*"all ten requirements present and working **reliably**"*.

### 2.1 Cut order — agree at minute 20, execute without debate

1. Wialon (if it was ever started)
2. F4's `/ask` page → collapse into a card on `/`
3. Group ETA-to-stop → just show the map
4. F4 entirely → replace with a **seeded** AI network-status paragraph on `/`

**Never cut:** `/drive`, the `/join` form and its validation, the problem statement on `/`,
the README. Those four are graded directly and are cheap.

---

## 3. Folder structure

```
BusEka.lk/
├── PLAN.md                      ← this file
├── DESIGN.md                    ← architecture + rationale
├── README.md                    ← WRITE THIS LAST, all 10 required items
├── package.json
├── wrangler.jsonc               ← Worker + assets + D1 + KV + AI bindings
├── vite.config.ts
├── tsconfig.json
├── index.html
├── .gitignore                   ← .dev.vars .wrangler dist node_modules
├── .dev.vars.example            ← KEY NAMES ONLY, never values
│
├── migrations/
│   └── 0001_init.sql            ← schema
├── seed/
│   └── seed.sql                 ← sample data (Requirement #9)
│
└── src/
    ├── worker/
    │   ├── index.ts             ← Hono app, mounts /api/*, exports default
    │   ├── env.d.ts             ← Env bindings type
    │   ├── routes/
    │   │   ├── fleet.ts         ← GET /api/fleet, /api/fleet/stats        [A]
    │   │   ├── groups.ts        ← create / join / vehicles / live         [C]
    │   │   ├── drive.ts         ← start / ping / stop                     [C]
    │   │   └── ai.ts            ← POST /api/ai/ask                        [D]
    │   ├── sources/
    │   │   ├── sprpta.ts        ← fetch + normalise + KV cache            [A]
    │   │   └── wialon.ts        ← STRETCH ONLY                            [A]
    │   └── lib/
    │       ├── geo.ts           ← haversine, nearestStop, bbox
    │       ├── eta.ts           ← ETA maths (see §7)
    │       ├── codes.ts         ← 6-char code gen + validate
    │       ├── pin.ts           ← SHA-256 + salt via WebCrypto
    │       └── validate.ts      ← Zod schemas, shared error shape
    │
    └── web/
        ├── main.tsx             ← React root + router
        ├── App.tsx              ← layout shell + <NavBar/>
        ├── api.ts               ← typed fetch wrapper, one place for errors
        ├── index.css            ← Tailwind entry
        ├── components/
        │   ├── NavBar.tsx       ← bottom tabs (mobile) / top bar (desktop) [B]
        │   ├── MapView.tsx      ← Leaflet wrapper, canvas renderer         [B]
        │   ├── Field.tsx        ← label + input + inline error + aria      [C]
        │   ├── CodeInput.tsx    ← 6-box code entry                         [C]
        │   ├── EmptyState.tsx   ← "no vehicles yet" / "offline"            [B]
        │   └── Spinner.tsx
        └── pages/
            ├── Home.tsx         ← problem, live counter, AI card    Req 1,2,10
            ├── MapPage.tsx      ← F1                                Req 3,6
            ├── Join.tsx         ← F2 join form                      Req 4,5
            ├── GroupPage.tsx    ← F2 group map                      Req 3,6
            ├── Owner.tsx        ← F2 create group + add vehicle     Req 4,5,6
            ├── Drive.tsx        ← F3                                Req 3
            ├── Ask.tsx          ← F4                                Req 3,4,5
            ├── About.tsx        ← team, contributions, AI declaration  Req 2,10
            └── NotFound.tsx     ← friendly 404                      Req 8
```

**Ownership is by folder, so nobody edits the same file.** The only shared files are
`api.ts`, `validate.ts` and `App.tsx` — agree those in the first 20 minutes and then
freeze them.

---

## 4. Step-by-step

### Step 0 — before the clock starts (5 min, the day before)

Verification only, no code:

```bash
node -v                 # need >= 20
npx wrangler --version
npx wrangler login
npx wrangler whoami     # confirms account + that workers.dev subdomain is claimed
```

- [ ] Open `https://api.spgps.lk/api/public/bus-live-locations-for-map` in a browser.
      **200 and a big JSON array?** If not, the whole map lane changes and you need to
      know now, not at minute 40.
- [ ] Everyone's `git config user.name` / `user.email` is set correctly on their own
      machine. This is worth marks (§10.2) and takes 20 seconds.
- [ ] Phones charged, on mobile data, screen-record tested.

---

### Step 1 — minutes 0–12 · Scaffold and deploy something empty

**One person drives; the other three watch and set up their editors.**
Deploying at minute 12 is not optional. A URL that exists and says "BusEka — coming up"
is worth more than a perfect app that first deploys at minute 105.

```bash
cd ~/Documents/GitHub/BusEka.lk

npm create cloudflare@latest -- . --framework=react --platform=workers
# accept: TypeScript yes, git yes, deploy NOT YET

npm i hono zod leaflet
npm i -D @types/leaflet @tailwindcss/vite tailwindcss
```

Create the D1 database and KV namespace:

```bash
npx wrangler d1 create buseka
npx wrangler kv namespace create CACHE
```

Both commands print a config block. Paste the IDs into `wrangler.jsonc`:

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
    { "binding": "DB", "database_name": "buseka", "database_id": "PASTE_ID_HERE" }
  ],
  "kv_namespaces": [
    { "binding": "CACHE", "id": "PASTE_ID_HERE" }
  ],
  "ai": { "binding": "AI" },

  "observability": { "enabled": true }
}
```

> `assets.directory` must match what Vite actually writes. The C3 React template
> outputs to `dist/client`; a plain Vite app outputs to `dist`. **Check with `ls dist`
> after the first build** — a wrong path here is the single most common reason
> "it works locally, blank page in production."

Wire Tailwind v4 in `vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import { cloudflare } from '@cloudflare/vite-plugin';

export default defineConfig({ plugins: [react(), tailwind(), cloudflare()] });
```

`src/web/index.css` is one line: `@import "tailwindcss";`

Minimal `src/worker/index.ts` so the deploy has something to run:

```ts
import { Hono } from 'hono';
const app = new Hono<{ Bindings: Env }>();
app.get('/api/health', (c) => c.json({ ok: true, ts: Date.now() }));
export default app;
```

**Deploy now:**

```bash
npm run build && npx wrangler deploy
```

Open the printed `*.workers.dev` URL **in a private window**. Paste it in the team chat.
That URL is now your submission link and it only gets better from here.

```bash
git add -A && git commit -m "chore: scaffold worker + assets + d1 + kv bindings" && git push
```

---

### Step 2 — minutes 12–20 · Lock the contracts, split, seed

Everyone in the room agrees these three things, then nobody talks to each other for 60
minutes.

**(a) The one shared type** — `src/worker/env.d.ts`:

```ts
interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
  AI: Ai;
  WIALON_HOST?: string;
  WIALON_TOKEN_KOLLUPITIYA?: string;
  ADMIN_KEY: string;
}

type Vehicle = {
  id: string;            // "sprpta:868982050024918" | "grp:7"
  source: 'sprpta' | 'group';
  label: string;         // "ND-7217"
  routeNo?: string;      // "383/2"
  lat: number;
  lng: number;
  speedKmh: number;
  ts: number;            // ms epoch
};
```

Every lane produces or consumes `Vehicle[]`. That is the entire integration contract.

**(b) The one error shape** — every failing endpoint returns:

```json
{ "error": { "code": "BAD_CODE", "message": "No group with that code. Check with whoever shared it.", "field": "code" } }
```

The frontend renders `message` verbatim. Error copy is written once, server-side.

**(c) Schema + seed.** Run these while people are still opening editors.

`migrations/0001_init.sql`:

```sql
CREATE TABLE groups (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  code         TEXT UNIQUE NOT NULL,
  name         TEXT NOT NULL,
  kind         TEXT NOT NULL DEFAULT 'school',
  pin_hash     TEXT NOT NULL,
  pin_salt     TEXT NOT NULL,
  created_at   INTEGER NOT NULL
);

CREATE TABLE group_vehicles (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id     INTEGER NOT NULL REFERENCES groups(id),
  plate        TEXT NOT NULL,
  label        TEXT NOT NULL,
  drive_token  TEXT UNIQUE NOT NULL,
  active       INTEGER NOT NULL DEFAULT 1
);

-- ONE ROW PER VEHICLE, UPSERTED. Never append; D1 free-tier row writes are enforced.
CREATE TABLE positions (
  vehicle_id   INTEGER PRIMARY KEY REFERENCES group_vehicles(id),
  lat          REAL NOT NULL,
  lng          REAL NOT NULL,
  speed_kmh    REAL NOT NULL DEFAULT 0,
  accuracy_m   REAL,
  ts           INTEGER NOT NULL
);

CREATE TABLE stops (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  name_en TEXT NOT NULL,
  name_si TEXT,
  lat     REAL NOT NULL,
  lng     REAL NOT NULL
);

CREATE TABLE join_attempts (
  ip     TEXT NOT NULL,
  ts     INTEGER NOT NULL
);
CREATE INDEX idx_join_ip_ts ON join_attempts(ip, ts);
CREATE INDEX idx_gv_group   ON group_vehicles(group_id);
```

`seed/seed.sql` — this is **Requirement #9, worth marks on its own**. Real coordinates:

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

-- demo group: code DEMO24, PIN 4321 (hash generated at runtime, see §5 lane C)
```

```bash
npx wrangler d1 execute buseka --local  --file=./migrations/0001_init.sql
npx wrangler d1 execute buseka --remote --file=./migrations/0001_init.sql
npx wrangler d1 execute buseka --local  --file=./seed/seed.sql
npx wrangler d1 execute buseka --remote --file=./seed/seed.sql
```

> `--local` and `--remote` are **two separate databases**. Seeding only local and then
> demoing the deployed URL is a classic 10-minute panic at minute 100. Do both, now.

Then everyone: `git checkout -b lane-a` (…b, c, d) and go.

---

### Step 3 — minutes 20–85 · Four parallel lanes

Nobody merges to `main` until minute 85. Commit to your own branch every ~10 minutes.

---

#### Lane A — data (`sources/sprpta.ts`, `routes/fleet.ts`, `lib/geo.ts`)

`GET /api/fleet` → `{ vehicles: Vehicle[], live: number, total: number, ts: number }`

Logic:

1. Read `CACHE.get('fleet', 'json')`. If present and `Date.now() - ts < 12000`, return it.
2. Otherwise `fetch('https://api.spgps.lk/api/public/bus-live-locations-for-map')`.
3. Normalise → `Vehicle[]`, dropping anything with null `lat`/`lon` or `isOnline: false`:

```ts
// bus.routePermitBus?.routePermit?.route?.routeNumber  — deep and nullable, use ?. all the way
{
  id: `sprpta:${bus.imei}`,
  source: 'sprpta',
  label: bus.routePermitBus?.busNumber ?? 'Unknown',
  routeNo: bus.routePermitBus?.routePermit?.route?.routeNumber,
  lat: bus.lat, lng: bus.lon,      // ← note: upstream says "lon", our type says "lng"
  speedKmh: 0,
  ts: Date.now(),
}
```

4. `CACHE.put('fleet', JSON.stringify(payload), { expirationTtl: 60 })`.
5. Wrap the whole fetch in `try/catch`. **On upstream failure, return the last cached
   payload with `stale: true`** rather than a 500. A degraded map beats a broken one, and
   "handles bad input gracefully" is 15 marks.

Also ship `lib/geo.ts`:

```ts
export function haversineKm(aLat:number,aLng:number,bLat:number,bLng:number){
  const R=6371, toRad=(d:number)=>d*Math.PI/180;
  const dLat=toRad(bLat-aLat), dLng=toRad(bLng-aLng);
  const h=Math.sin(dLat/2)**2 + Math.cos(toRad(aLat))*Math.cos(toRad(bLat))*Math.sin(dLng/2)**2;
  return 2*R*Math.asin(Math.sqrt(h));
}
```

Lane D depends on this. Push it to `main` early — it's the one exception to the
no-merge rule.

**Stretch only, if the map is green at minute 70:** `sources/wialon.ts` —
`token/login` → `eid`, then `core/search_items` with `flags: 1025`. Position comes back as
`pos: { x: lon, y: lat, s: speed }` — **`x` is longitude**. Session expires after ~5 min
idle, so re-login on error `1003`.

---

#### Lane B — map & shell (`MapView.tsx`, `MapPage.tsx`, `Home.tsx`, `NavBar.tsx`)

**Use Leaflet with the canvas renderer.** 780 SVG markers will drop the projector to
single-digit fps; `preferCanvas` keeps it smooth and costs one option.

```tsx
const map = L.map(el, { preferCanvas: true }).setView([6.9271, 79.8612], 9);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors', maxZoom: 18,
}).addTo(map);

// one layer, cleared and refilled each poll — do NOT create/destroy 780 markers
const layer = L.layerGroup().addTo(map);
```

- Poll `GET /api/fleet` every **6 s** with `setInterval`; clear it in the effect cleanup
  or you'll leak a timer per navigation.
- `L.circleMarker([v.lat, v.lng], { radius: 5 })` per vehicle, `bindPopup` with label +
  route number.
- Header strip: **"1,043 buses · 812 live · updated 3s ago"**. This is your proof-of-life
  on camera — make it big.
- Filter chips + a route-number search box (client-side `filter()`, no API call). This is
  Requirement #6 (*display, search, filter*) done in ten lines.
- `EmptyState` for zero vehicles and for a failed poll: *"Can't reach the bus network —
  showing the last known positions from 2 minutes ago."*

`Home.tsx` carries the problem statement from `DESIGN.md` §1 verbatim. Requirement #2 is
10 marks and the top band needs *affected users named* — name them: commuters on 356+
Southern Province routes, parents of school-van children, small van owners with no
tracking hardware.

`NavBar.tsx`: fixed bottom tabs on mobile (`Map · Ask · Join · More`), top bar ≥`md`.
Test at **360×640** — that's the real Sri Lankan median phone, not 390.

---

#### Lane C — groups & driver (`routes/groups.ts`, `routes/drive.ts`, `Owner.tsx`, `Join.tsx`, `GroupPage.tsx`, `Drive.tsx`, `Field.tsx`, `CodeInput.tsx`)

The biggest lane. **Build in this order** — if you run out of time, you run out at the
right place:

**1. `lib/codes.ts` (5 min)**

```ts
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';   // no 0/O/1/I/l
export const newCode = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(6)))
       .map(b => ALPHABET[b % ALPHABET.length]).join('');
```

Retry on `UNIQUE` constraint failure. Say the entropy number out loud in the demo:
32⁶ ≈ 1.07 billion, versus 10⁶ for plain digits — that's why the alphabet isn't `0-9`.

**2. `lib/pin.ts` (5 min)** — SHA-256 over `salt + pin` via `crypto.subtle.digest`.
Never store the PIN. It's five lines and it's the difference between "we thought about
security" and "we didn't."

**3. `POST /api/groups` (10 min)** — body `{ name, kind, pin }` → creates group, returns
`{ code }`. Zod-validated.

**4. `POST /api/groups/:code/vehicles` (10 min)** — requires `pin`; returns
`{ driveToken, driveUrl }`. Show `driveUrl` on `/owner` as **a QR code plus a copyable
link** — the driver scans it, no typing. `qrcode` npm package, 3 lines, huge demo value.

**5. `POST /api/groups/:code/join` (10 min)** — sets an `HttpOnly` cookie.
**Rate limit before anything else:**

```sql
DELETE FROM join_attempts WHERE ts < ?;                       -- now - 60000
SELECT COUNT(*) AS n FROM join_attempts WHERE ip = ? AND ts > ?;
-- n >= 5  →  429  "Too many tries. Wait a minute."
INSERT INTO join_attempts (ip, ts) VALUES (?, ?);             -- c.req.header('cf-connecting-ip')
```

**6. `POST /api/drive/:token/ping` (10 min)**

```sql
INSERT INTO positions (vehicle_id, lat, lng, speed_kmh, accuracy_m, ts)
VALUES (?,?,?,?,?,?)
ON CONFLICT(vehicle_id) DO UPDATE SET
  lat=excluded.lat, lng=excluded.lng, speed_kmh=excluded.speed_kmh,
  accuracy_m=excluded.accuracy_m, ts=excluded.ts;
```

**Upsert, never insert-append.** One row per vehicle, forever.

**7. `GET /api/groups/:code/live` (5 min)** — join `group_vehicles` + `positions`,
return `Vehicle[]` with `source: 'group'`. Reuses lane B's `MapView` unchanged.

**8. `Drive.tsx` (15 min)**

```tsx
navigator.geolocation.watchPosition(
  pos => post(`/api/drive/${token}/ping`, {
    lat: pos.coords.latitude, lng: pos.coords.longitude,
    speed: (pos.coords.speed ?? 0) * 3.6, accuracy: pos.coords.accuracy,
  }),
  err => setBlocked(err.code === err.PERMISSION_DENIED),
  { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
);
navigator.wakeLock?.request('screen').catch(() => {});   // stop the screen sleeping
```

Three things that *will* bite you:

- **Geolocation needs HTTPS.** `workers.dev` and `localhost` are fine; a LAN IP like
  `192.168.1.5:5173` fails **silently**. Test on the deployed URL.
- **iOS Safari** throttles `watchPosition` hard when the tab backgrounds. Keep it
  foregrounded, keep the wake lock.
- **Build the `[ Simulate route ]` button.** It replays a hardcoded 8-point polyline
  through `POST /ping` on a 3 s timer. It is 15 minutes and it is your insurance if venue
  Wi-Fi or a permission prompt kills the live demo. Do not skip it because you're behind —
  this is the thing you're behind *for*.

Status line while broadcasting: `accuracy ±8 m · 14 pings sent · live`.

---

#### Lane D — AI (`routes/ai.ts`, `Ask.tsx`)

`POST /api/ai/ask` → `{ answer, leg, confidence }`

**The rule that earns the marks: the model never computes a number.**

```
①  SELECT id, name_en, name_si FROM stops          (12 rows — cheap, no Vectorize)

②  glm-4.7-flash, JSON mode, temperature 0:
    "Here is a list of bus stops with ids. The user wrote: '<question>'.
     Return {fromId, toId, lang} choosing only from these ids. If unclear, null."
    → handles "kollupitiya idn negombo", "කොළඹ ඉඳන් ගාල්ල", typos, Singlish

③  DETERMINISTIC TypeScript — no model:
    • fetch /api/fleet
    • buses within 3 km of fromStop, using lib/geo.haversineKm
    • pick the nearest
    • etaMin = haversineKm(bus, fromStop) / (speed > 2 ? speed : 25) * 60
    • journeyKm = haversineKm(fromStop, toStop)

④  glm-4.7-flash again, given ONLY the computed numbers:
    "Write two friendly sentences in <lang>. Use only these numbers.
     Do not invent or adjust any number."
```

Both calls wrapped:

```ts
const withTimeout = <T,>(p: Promise<T>, ms = 6000) =>
  Promise.race([p, new Promise<never>((_, r) => setTimeout(() => r(new Error('timeout')), ms))]);
```

**Fallbacks, both mandatory:**
- Step ② fails → split the input on `/\b(to|from|idn|සිට|ඉඳන්)\b/i` and string-match stop
  names.
- Step ④ fails → return a templated English sentence built from the same numbers.

Validate the model's JSON with Zod before touching it. A malformed response is a handled
case, not a 500.

`Ask.tsx`: textarea, three example chips ("Kollupitiya to Negombo", "Galle to Matara",
"කොළඹ සිට ගාල්ල"), a loading state, and the answer with the bus's plate and route number
shown underneath as evidence. Empty input → *"Tell me where you're starting from — try
'Galle to Matara'."*

**Say this sentence in the video:** *"The model parses the question and writes the
sentence. Every distance and every ETA is computed in TypeScript — we don't let it invent
a number."* That is exactly what the top AI band asks for.

---

### Step 4 — minutes 85–100 · Integrate and polish

```bash
git checkout main
git merge lane-a && git merge lane-b && git merge lane-c && git merge lane-d
npm run build && npx wrangler deploy
```

Then, **all four people, on the deployed URL, in a private window**:

| Check | Req |
|---|---|
| Every nav link works; 404 page is friendly | 8 |
| 360×640 — nothing overflows horizontally, map is full-bleed, bottom tabs reachable | 7 |
| Submit every form **empty** — friendly message, not a crash | 5 |
| Join with `12345`, `999999`, `ABCDEF` — three distinct, helpful messages | 5 |
| Kill Wi-Fi mid-map — stale banner appears, no white screen | 5 |
| `/drive` on a real phone → dot appears on someone else's laptop | 3 |
| Ask a nonsense question → graceful "I couldn't work that out" | 5 |
| Problem statement is on `/`, names affected users | 2, 10 |
| Seeded stops visible somewhere | 9 |

Fix only what's broken. **Do not start anything new after minute 85.**

---

### Step 5 — minutes 100–110 · Ship

Final deploy, then write `README.md` with all ten required items:

1. Project title · 2. The problem · 3. The solution · 4. Main features ·
5. Technologies · 6. **AI tools used, one line each** · 7. Team members + IDs +
**what each person actually did** · 8. Install/run instructions · 9. Deployed link ·
10. Demo video link

Check attribution before you stop:

```bash
git shortlog -sn        # every registered member must appear with real commits
```

If someone shows zero, fix it now — that criterion caps at 3–4/10 otherwise, and
"contribution from all registered members" is a separate 5 marks on top.

Verify the deployed link **in a private window on a phone on mobile data**. Not your
laptop, not your cache.

---

### Step 6 — minutes 110–120 · Record and submit

**2:00 hard ceiling. Rehearse once against a timer.**

| Time | Shot | Say |
|---|---|---|
| 0:00–0:15 | Team + `/` | Names, IDs, the problem in one sentence, users named |
| 0:15–0:40 | `/map` | "Real live data — 812 buses moving right now, one map" |
| 0:40–1:00 | `/ask` | The "model never computes a number" line |
| 1:00–1:30 | Phone `/drive` → laptop `/g/CODE` | **Walk. The dot moves. This wins the room.** |
| 1:30–1:45 | `/join` with a bad code | Show the friendly error deliberately |
| 1:45–2:00 | URL + repo + impact | "Any van owner is on this map in 60 seconds, no hardware" |

Submission PDF: repo link, deployed link, video link, names + IDs, problem/solution
paragraph, technology + AI tool list, **and the AI Prompt Log** — tool, prompt, purpose,
how you checked the output. **Redact the Wialon tokens and any keys**; the brief requires
that explicitly.

---

## 5. Credentials

The Wialon tokens go in `.dev.vars` (gitignored) locally and
`npx wrangler secret put WIALON_TOKEN_KOLLUPITIYA` in production. Two of the four you have
are byte-identical, so there are **three** distinct fleets, not four. `.dev.vars.example`
holds key names with empty values so the next person knows what's needed.

They must not appear in the repo, the README, the PDF, or the prompt log.

---

## 6. Risk register

| Risk | Mitigation |
|---|---|
| `assets.directory` wrong → blank page in production | `ls dist` after the first build; deploy at minute 12 so you find out then |
| Seeded `--local` but not `--remote` | Both commands in Step 2, side by side |
| Geolocation blocked at the venue | **Simulate route** button (lane C, step 8) |
| Upstream bus API down | KV returns last snapshot with `stale: true` |
| Workers AI slow or erroring | 6 s timeout + rule-based fallback, both directions |
| 780 markers tank the framerate | Leaflet `preferCanvas: true`, one `layerGroup` |
| D1 free-tier row limits (now enforced) | Positions are **upserted**, one row per vehicle; fleet never touches D1 |
| Merge conflicts at minute 85 | Ownership is by folder; only 3 shared files, frozen at minute 20 |
| One member has no commits | `git shortlog -sn` at minute 100 |

---

## 7. Reference — the ETA maths

The one algorithm an evaluator is most likely to ask you to explain or modify. Keep it in
`lib/eta.ts`, keep it commented, and make sure **two people** have read it.

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

## 8. Sources

- SE3090 Assignment 2 specification and marking scheme (supplied)
- `findings.md` — SPRPTA API teardown (supplied); REST polling named as the no-proxy alternative
- [Workers best practices — use Workers Static Assets for new projects](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/)
- [Cloudflare Pages get-started — "Start new projects with Workers"](https://developers.cloudflare.com/pages/get-started/)
- [Workers platform limits — 100,000 requests/day free](https://developers.cloudflare.com/workers/platform/limits/)
- [D1 free-tier daily query limits now enforced (1 Sep 2026)](https://developers.cloudflare.com/changelog/post/2026-09-01-d1-free-tier-limit-enforcement/)
- [Workers AI pricing — 10,000 Neurons/day free](https://developers.cloudflare.com/workers-ai/platform/pricing/)
- [Models requiring Workers Paid (kimi, glm-5.2)](https://developers.cloudflare.com/changelog/post/2026-07-28-models-require-workers-paid/)
