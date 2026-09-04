-- One demo group so evaluators can use /join without owning a vehicle first
-- (About page advertises this code). PIN "4242" is a seed value only — never
-- reused for a real group. salt/hash computed with lib/pin.ts's algorithm.
INSERT INTO groups (code, name, kind, pin_hash, pin_salt, created_at) VALUES
 ('DEMO24', 'Lyceum Van 12', 'school',
  'a8b76cbe7e5fe810e1592863b591c3d14a4d264808f644852c6939179166b7ae',
  'buseka-demo-salt-24',
  strftime('%s','now') * 1000);

INSERT INTO group_vehicles (group_id, plate, label, route_no, drive_token, active) VALUES
 ((SELECT id FROM groups WHERE code = 'DEMO24'), 'WP-CAB-1234', 'Uncle Nihal''s Van 12', NULL,
  'demo-nihal-van12', 1);

INSERT INTO positions (vehicle_id, lat, lng, speed_kmh, accuracy_m, ts) VALUES
 ((SELECT id FROM group_vehicles WHERE drive_token = 'demo-nihal-van12'),
  6.9110, 79.8490, 28, 8, strftime('%s','now') * 1000);

-- Named Sri Lanka Railways services (real train names/numbers), backing the
-- honest crowd-reported /trains board (DESIGN.md §5.3).
INSERT INTO trains (train_no, name, origin, destination) VALUES
 ('8056', 'Samudra Devi', 'Colombo Fort', 'Matara'),
 ('8058', 'Galu Kumari', 'Colombo Fort', 'Beliatta'),
 ('4085', 'Rajarata Rejini', 'Colombo Fort', 'Anuradhapura'),
 ('8096', 'Sagarika', 'Colombo Fort', 'Galle');

INSERT INTO train_reports (train_id, stop_id, device_id, reported_at, confidence) VALUES
 ((SELECT id FROM trains WHERE train_no = '8056'),
  (SELECT id FROM stops WHERE name_en = 'Bambalapitiya'),
  'seed-demo-device', strftime('%s','now') * 1000 - 240000, 2);
