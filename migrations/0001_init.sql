-- DESIGN.md §8.1, reduced to what a 2-hour build ships (PLAN.md §5 Step 2c).
-- Positions are NOT the SPRPTA fleet — that never touches D1, it lives in KV.
-- This table is only for group-tracked vehicles (F2/F3), one row per vehicle,
-- upserted. D1 free-tier row-write caps are enforced since 1 Sep 2026.

CREATE TABLE groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'school',
  pin_hash TEXT NOT NULL,
  pin_salt TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER
);

CREATE TABLE group_vehicles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER NOT NULL REFERENCES groups(id),
  plate TEXT NOT NULL,
  label TEXT NOT NULL,
  route_no TEXT,
  drive_token TEXT UNIQUE NOT NULL,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE positions (
  vehicle_id INTEGER PRIMARY KEY REFERENCES group_vehicles(id),
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  speed_kmh REAL NOT NULL DEFAULT 0,
  accuracy_m REAL,
  ts INTEGER NOT NULL
);

CREATE TABLE drive_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vehicle_id INTEGER NOT NULL REFERENCES group_vehicles(id),
  started_at INTEGER NOT NULL,
  ended_at INTEGER,
  ping_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE group_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER NOT NULL REFERENCES groups(id),
  device_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  joined_at INTEGER NOT NULL
);

CREATE TABLE stops (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name_en TEXT NOT NULL,
  name_si TEXT,
  lat REAL NOT NULL,
  lng REAL NOT NULL
);

CREATE TABLE join_attempts (ip TEXT NOT NULL, ts INTEGER NOT NULL);
CREATE INDEX idx_join_ip_ts ON join_attempts(ip, ts);
CREATE INDEX idx_gv_group   ON group_vehicles(group_id);
CREATE INDEX idx_gm_group   ON group_members(group_id);

-- Trains (DESIGN.md §5.3): Sri Lanka Railways publishes no live GPS feed, so
-- /trains is backed by honest crowd-sourced "I'm at this station" reports
-- instead of a fake live map.
CREATE TABLE trains (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  train_no TEXT NOT NULL,
  name TEXT NOT NULL,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL
);

CREATE TABLE train_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  train_id INTEGER NOT NULL REFERENCES trains(id),
  stop_id INTEGER NOT NULL REFERENCES stops(id),
  device_id TEXT NOT NULL,
  reported_at INTEGER NOT NULL,
  confidence INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX idx_tr_train_time ON train_reports(train_id, reported_at);
