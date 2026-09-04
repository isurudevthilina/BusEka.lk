INSERT OR IGNORE INTO stops (name_en, name_si, lat, lng) VALUES
  ('Colombo Fort',  'කොටුව',         6.9344, 79.8500),
  ('Kollupitiya',   'කොල්ලුපිටිය',   6.9110, 79.8490),
  ('Bambalapitiya', 'බම්බලපිටිය',     6.8940, 79.8560),
  ('Dehiwala',      'දෙහිවල',         6.8510, 79.8650),
  ('Moratuwa',      'මොරටුව',         6.7730, 79.8820),
  ('Kadawatha',     'කඩවත',           7.0000, 79.9500),
  ('Ja-Ela',        'ජා-ඇල',          7.0740, 79.8920),
  ('Negombo',       'මීගමුව',         7.2080, 79.8380),
  ('Galle',         'ගාල්ල',          6.0329, 80.2170),
  ('Matara',        'මාතර',           5.9490, 80.5350),
  ('Ambalangoda',   'අම්බලන්ගොඩ',     6.2350, 80.0540),
  ('Hikkaduwa',     'හික්කඩුව',       6.1400, 80.1000);

-- Demo group for the /about page (code: DEMO24)
INSERT OR IGNORE INTO groups (code, name, kind, pin_hash, pin_salt, created_at)
VALUES (
  'DEMO24',
  'Demo School Van',
  'school',
  '0000000000000000000000000000000000000000000000000000000000000000',
  'demo-salt',
  strftime('%s','now') * 1000
);
