ALTER TABLE trips ADD COLUMN IF NOT EXISTS original_fare DECIMAL(10,2);
ALTER TABLE trips ADD COLUMN IF NOT EXISTS discount_code VARCHAR(50);

ALTER TABLE announcements ADD COLUMN IF NOT EXISTS target_user_id INTEGER REFERENCES users(id);

CREATE TABLE IF NOT EXISTS discount_codes (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  type VARCHAR(10) NOT NULL,
  value DECIMAL(10,2) NOT NULL,
  scope VARCHAR(20) NOT NULL DEFAULT 'general',
  target_user_id INTEGER REFERENCES users(id),
  max_uses INTEGER,
  max_uses_per_user INTEGER NOT NULL DEFAULT 1,
  uses_count INTEGER NOT NULL DEFAULT 0,
  min_fare_condition DECIMAL(10,2),
  time_condition VARCHAR(10),
  expires_at TIMESTAMP,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  auto_apply BOOLEAN NOT NULL DEFAULT FALSE,
  visible BOOLEAN NOT NULL DEFAULT TRUE,
  description TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS discount_redemptions (
  id SERIAL PRIMARY KEY,
  discount_code_id INTEGER REFERENCES discount_codes(id),
  user_id INTEGER REFERENCES users(id),
  trip_id INTEGER REFERENCES trips(id) UNIQUE,
  amount_discounted DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
