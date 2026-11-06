ALTER TABLE trips ADD COLUMN IF NOT EXISTS no_driver_reason VARCHAR(30);

CREATE TABLE IF NOT EXISTS trip_offers (
  id SERIAL PRIMARY KEY,
  trip_id INTEGER REFERENCES trips(id),
  driver_id INTEGER REFERENCES drivers(id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(trip_id, driver_id)
);
