CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  phone_number VARCHAR(20) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role VARCHAR(20) DEFAULT 'passenger',
  -- 'active' | 'blocked' | 'pending_deletion' | 'deleted'. pending_deletion
  -- accounts have already been anonymized (see requestAccountDeletion in
  -- authController.js) and sit for 30 days before schedulePurgeDeletedAccounts
  -- finalizes them to 'deleted'.
  status VARCHAR(20) DEFAULT 'active',
  password_hash VARCHAR(255),
  push_token TEXT,
  profile_photo TEXT,
  deletion_requested_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS otps (
  id SERIAL PRIMARY KEY,
  phone_number VARCHAR(20) NOT NULL,
  otp_code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS drivers (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  vehicle_make VARCHAR(100),
  vehicle_model VARCHAR(100),
  vehicle_color VARCHAR(50),
  plate_number VARCHAR(20) UNIQUE,
  approval_status VARCHAR(20) DEFAULT 'pending',
  is_online BOOLEAN DEFAULT FALSE,
  current_lat DECIMAL(10,8),
  current_lng DECIMAL(11,8),
  ghana_card_number VARCHAR(50),
  ghana_card_image TEXT,
  license_number VARCHAR(50),
  license_image TEXT,
  license_expiry DATE,
  vehicle_front_image TEXT,
  vehicle_side_image TEXT,
  vehicle_back_image TEXT,
  vehicle_checklist JSONB,
  submission_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trips (
  id SERIAL PRIMARY KEY,
  passenger_id INTEGER REFERENCES users(id),
  driver_id INTEGER REFERENCES drivers(id),
  pickup_lat DECIMAL(10,8),
  pickup_lng DECIMAL(11,8),
  dropoff_lat DECIMAL(10,8),
  dropoff_lng DECIMAL(11,8),
  pickup_address TEXT,
  dropoff_address TEXT,
  fare DECIMAL(10,2),
  commission DECIMAL(10,2),
  distance_km DECIMAL(6,2),
  wait_penalty DECIMAL(10,2) DEFAULT 0,
  ride_type VARCHAR(20) DEFAULT 'standard',
  status VARCHAR(20) DEFAULT 'requested',
  cancelled_by VARCHAR(20),
  passenger_rating INTEGER,
  passenger_comment TEXT,
  rated_by_passenger BOOLEAN DEFAULT FALSE,
  driver_rating INTEGER,
  driver_comment TEXT,
  rated_by_driver BOOLEAN DEFAULT FALSE,
  matched_at TIMESTAMP,
  accepted_at TIMESTAMP,
  arrived_at TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wallets (
  id SERIAL PRIMARY KEY,
  driver_id INTEGER REFERENCES drivers(id) UNIQUE,
  balance DECIMAL(10,2) DEFAULT 0.00,
  total_commission_owed DECIMAL(10,2) DEFAULT 0.00,
  total_paid DECIMAL(10,2) DEFAULT 0.00,
  is_locked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ledger (
  id SERIAL PRIMARY KEY,
  driver_id INTEGER REFERENCES drivers(id),
  trip_id INTEGER REFERENCES trips(id),
  amount DECIMAL(10,2),
  type VARCHAR(20),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS driver_sessions (
  id SERIAL PRIMARY KEY,
  driver_id INTEGER REFERENCES drivers(id),
  went_online_at TIMESTAMP,
  went_offline_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reports (
  id SERIAL PRIMARY KEY,
  reporter_id INTEGER REFERENCES users(id),
  reported_id INTEGER REFERENCES users(id),
  trip_id INTEGER REFERENCES trips(id),
  type VARCHAR(50) DEFAULT 'behaviour',
  description TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS announcements (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  body TEXT NOT NULL,
  audience VARCHAR(20) NOT NULL DEFAULT 'all', -- 'all' | 'passenger' | 'driver'
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS config (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value VARCHAR(255) NOT NULL
);

-- The fare-tier keys below (lower/upper distance + flat fares, base fare,
-- per-km rate) are read by requestRide() in ridesController.js but were
-- previously never seeded here, only present in the live database via a
-- manual patch — meaning a fresh database built from this file could never
-- actually price a ride. Values are pulled from the mobile app's client-side
-- fare mirror (HomeScreen.tsx calculateFare, commented "mirrors backend"),
-- which is the closest available record of what production is likely using.
-- Verify against the live config table and adjust if they've drifted.
INSERT INTO config (key, value) VALUES
  ('day_price', '13'),
  ('night_price', '16'),
  ('commission_rate', '0.15'),
  ('lockout_threshold', '-40'),
  ('night_start', '23'),
  ('night_end', '5'),
  ('lower_distance_km', '0.7'),
  ('upper_distance_km', '4.0'),
  ('day_lower_flat', '10'),
  ('night_lower_flat', '13'),
  ('day_upper_flat', '19'),
  ('night_upper_flat', '20'),
  ('base_fare', '8'),
  ('price_per_km', '3')
ON CONFLICT (key) DO NOTHING;
