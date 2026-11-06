CREATE TABLE IF NOT EXISTS driver_reminders (
  id SERIAL PRIMARY KEY,
  driver_id INTEGER REFERENCES drivers(id),
  reason VARCHAR(20) NOT NULL,
  sent_at TIMESTAMP DEFAULT NOW()
);
