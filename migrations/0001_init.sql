-- BusEka D1 Schema — migrations/0001_init.sql

CREATE TABLE IF NOT EXISTS groups (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  code       TEXT    UNIQUE NOT NULL,
  name       TEXT    NOT NULL,
  kind       TEXT    NOT NULL DEFAULT 'school',
  pin_hash   TEXT    NOT NULL,
  pin_salt   TEXT    NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER
);

CREATE TABLE IF NOT EXISTS group_vehicles (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id    INTEGER NOT NULL REFERENCES groups(id),
  plate       TEXT    NOT NULL,
  label       TEXT    NOT NULL,
  route_no    TEXT,
  drive_token TEXT    UNIQUE NOT NULL,
  active      INTEGER NOT NULL DEFAULT 1
);

-- ONE ROW PER VEHICLE, UPSERTED. D1 free-tier row writes are enforced.
CREATE TABLE IF NOT EXISTS positions (
  vehicle_id INTEGER PRIMARY KEY REFERENCES group_vehicles(id),
  lat        REAL    NOT NULL,
  lng        REAL    NOT NULL,
  speed_kmh  REAL    NOT NULL DEFAULT 0,
  accuracy_m REAL,
  ts         INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS stops (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  name_en TEXT NOT NULL,
  name_si TEXT,
  lat     REAL NOT NULL,
  lng     REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS join_attempts (
  ip TEXT NOT NULL,
  ts INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_join_ip_ts ON join_attempts(ip, ts);
CREATE INDEX IF NOT EXISTS idx_gv_group   ON group_vehicles(group_id);
