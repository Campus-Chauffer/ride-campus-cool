-- Ride-sharing v1: grouping column + config. See schema.sql for the
-- full column/config comments (kept in sync there for fresh databases).
ALTER TABLE trips ADD COLUMN IF NOT EXISTS shared_group_id INTEGER REFERENCES trips(id);

INSERT INTO config (key, value) VALUES
  ('shared_fare_discount', '3'),
  ('shared_match_window_seconds', '120'),
  ('shared_match_radius_km', '1.5'),
  ('shared_match_bearing_deg', '45'),
  ('shared_max_passengers', '2')
ON CONFLICT (key) DO NOTHING;
