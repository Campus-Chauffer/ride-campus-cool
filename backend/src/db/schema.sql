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
  emergency_contact_name VARCHAR(100),
  emergency_contact_phone VARCHAR(20),
  referral_code VARCHAR(6) UNIQUE,
  referred_by INTEGER REFERENCES users(id),
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
  -- Set alongside current_lat/current_lng on every write (goOnline,
  -- updateLocation, the driver:location socket handler). Lets
  -- scheduleStaleOnlineCleanup (scheduler.js) tell a driver who's still
  -- actually pinging apart from one whose app crashed/died while online —
  -- is_online alone can't distinguish those.
  location_updated_at TIMESTAMP,
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
  -- What this ride would have cost with no discount applied. NULL means no
  -- discount was used, in which case it always equals fare. Kept separate
  -- from fare so the passenger's trip screens can show the original price
  -- struck through next to what they actually paid.
  original_fare DECIMAL(10,2),
  discount_code VARCHAR(50),
  commission DECIMAL(10,2),
  distance_km DECIMAL(6,2),
  wait_penalty DECIMAL(10,2) DEFAULT 0,
  ride_type VARCHAR(20) DEFAULT 'standard',
  -- Shared-ride grouping: NULL for a normal solo trip. For a shared trip,
  -- every leg (including the first/anchor passenger) points at the anchor
  -- leg's own id, itself included — so group size is just
  -- COUNT(*) WHERE shared_group_id = $anchorId, and the anchor row is the
  -- natural lock target (SELECT ... FOR UPDATE WHERE id = shared_group_id)
  -- for serializing concurrent joins onto the same open seat.
  shared_group_id INTEGER REFERENCES trips(id),
  status VARCHAR(20) DEFAULT 'requested',
  -- Set only when status = 'no_driver_found', to tell apart "nobody was
  -- even online nearby" from "drivers are online but every one of them is
  -- already on a trip" — the passenger sees a different message for each.
  no_driver_reason VARCHAR(30),
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

-- Which drivers currently have a live, unexpired offer out for a trip.
-- Broadcast dispatch sends one ride to several drivers' phones at once
-- (trips.driver_id stays NULL until someone actually accepts), so this is
-- what checkOffers reads to know a trip is meant for a given driver, and
-- what busy-driver filtering checks so a driver mid-decision on one offer
-- isn't also handed a second one. Rows are deleted as soon as a batch
-- resolves (accepted, timed out, or the trip leaves play some other way).
CREATE TABLE IF NOT EXISTS trip_offers (
  id SERIAL PRIMARY KEY,
  trip_id INTEGER REFERENCES trips(id),
  driver_id INTEGER REFERENCES drivers(id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(trip_id, driver_id)
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
  -- Set only for payments made via Paystack; the admin manual-entry path
  -- leaves this NULL. Unique so the webhook handler can treat a retried
  -- delivery of the same Paystack event as a no-op instead of crediting
  -- the driver twice for one payment.
  paystack_reference VARCHAR(100) UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS driver_sessions (
  id SERIAL PRIMARY KEY,
  driver_id INTEGER REFERENCES drivers(id),
  went_online_at TIMESTAMP,
  went_offline_at TIMESTAMP
);

-- Every "go online" nudge sent to a driver who hasn't had a single online
-- session yet today — whether triggered by real failed demand
-- (no_driver_found) or the twice-daily backstop check. Both mechanisms
-- share this table specifically so they can't independently stack past the
-- same daily cap on one driver.
CREATE TABLE IF NOT EXISTS driver_reminders (
  id SERIAL PRIMARY KEY,
  driver_id INTEGER REFERENCES drivers(id),
  reason VARCHAR(20) NOT NULL, -- 'demand_surge' | 'backstop'
  sent_at TIMESTAMP DEFAULT NOW()
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
  -- When set, this is a private announcement for one specific user (e.g. a
  -- personal loyalty discount code) and overrides audience entirely — it
  -- shows only to this user, regardless of their role.
  target_user_id INTEGER REFERENCES users(id),
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- A promo code an admin creates. General codes are listed to any eligible
-- passenger (unless hidden); user-specific ones can only ever be redeemed
-- by target_user_id, checked against the authenticated requester, never a
-- client-asserted identity.
CREATE TABLE IF NOT EXISTS discount_codes (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  type VARCHAR(10) NOT NULL, -- 'percent' | 'flat'
  value DECIMAL(10,2) NOT NULL,
  scope VARCHAR(20) NOT NULL DEFAULT 'general', -- 'general' | 'user_specific'
  target_user_id INTEGER REFERENCES users(id),
  -- NULL max_uses = unlimited stock. When it IS set, max_uses_per_user is
  -- always forced to 1 at creation time — a "first 40 people" code means
  -- 40 different people, never one person claiming several slots.
  max_uses INTEGER,
  max_uses_per_user INTEGER NOT NULL DEFAULT 1,
  uses_count INTEGER NOT NULL DEFAULT 0,
  min_fare_condition DECIMAL(10,2),
  time_condition VARCHAR(10), -- 'day' | 'night' | NULL (any)
  expires_at TIMESTAMP,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  -- If true, silently applied to an eligible ride with no passenger action.
  auto_apply BOOLEAN NOT NULL DEFAULT FALSE,
  -- If false, never listed in the passenger's browsable Discounts tab —
  -- still redeemable, but only by typing the exact code (e.g. a flyer or
  -- social-media promo not meant to be discoverable in-app).
  visible BOOLEAN NOT NULL DEFAULT TRUE,
  description TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- One row per actual redemption. amount_discounted is frozen at redemption
-- time so it stays historically accurate even if the code is edited later.
-- The UNIQUE constraint on trip_id is what makes "one code per ride, no
-- stacking" a database guarantee rather than something application code
-- has to remember to enforce.
CREATE TABLE IF NOT EXISTS discount_redemptions (
  id SERIAL PRIMARY KEY,
  discount_code_id INTEGER REFERENCES discount_codes(id),
  user_id INTEGER REFERENCES users(id),
  trip_id INTEGER REFERENCES trips(id) UNIQUE,
  amount_discounted DECIMAL(10,2) NOT NULL,
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
  ('day_lower_flat', '12'),
  ('night_lower_flat', '16'),
  ('day_upper_flat', '20'),
  ('night_upper_flat', '20'),
  ('base_fare', '11'),
  ('price_per_km', '2'),
  -- Hard floor applied last, after every tier/branch of the fare
  -- calculation — regardless of which config value produced a number, no
  -- ride is ever quoted below this. Added after a short-trip flat rate
  -- (day_lower_flat, above) was quietly priced well under what drivers
  -- considered a fair minimum, which broke trust badly enough that drivers
  -- stopped going online. This exists so a future misconfigured tier can't
  -- reproduce that silently. Must stay <= the lowest of day_lower_flat/
  -- night_lower_flat, or it would override a deliberately-set low tier.
  ('minimum_fare', '12'),
  -- Ride-sharing (v1): flat cedis off each matched passenger's own
  -- normally-computed fare (not a percentage, not a flat shared price —
  -- two co-riders can have different distances/fares). Matching window is
  -- how long a request stays open to a match before falling back to a
  -- normal solo dispatch at full price. Radius/bearing are the hard
  -- route-proximity filter (straight-line, no routing-API call needed at
  -- this stage). shared_max_passengers is enforced in code, not a DB
  -- constraint, so raising it later (the discussed future 4-passenger
  -- scale) is a config change, not a migration.
  ('shared_fare_discount', '3'),
  ('shared_match_window_seconds', '120'),
  ('shared_match_radius_km', '1.5'),
  ('shared_match_bearing_deg', '45'),
  ('shared_max_passengers', '2'),
  -- Read by checkVersion() in appController.js to power the in-app "update
  -- available" prompt. latestBuild starts at 1 (below any real build number
  -- EAS will produce) so a fresh database never nags anyone until these are
  -- deliberately raised to match a real release via the admin dashboard.
  ('ios_latest_build', '1'),
  ('ios_update_url', ''),
  ('android_latest_build', '1'),
  ('android_update_url', 'https://play.google.com/store/apps/details?id=com.campuschauffeur.app'),
  -- Referral program: every referral_reward_threshold qualifying referrals
  -- (a referred user's first completed trip) earns the referrer a genuinely
  -- free ride — see claimDiscount's 'free_ride' branch in discounts.js.
  -- referral_welcome_discount is a flat discount off a NEW signup's first
  -- ride when they entered someone else's code, same ordinary 'flat'
  -- discount type as any other promo code.
  ('referral_reward_threshold', '10'),
  ('referral_welcome_discount', '3'),
  -- "What's new" popup (ChangelogModal.tsx): bump changelog_version and
  -- update changelog_items (one bullet per line) via the admin Config page
  -- whenever there's something worth telling existing users about. The app
  -- shows it once per version, tracked locally per device.
  ('changelog_version', '0'),
  ('changelog_items', '')
ON CONFLICT (key) DO NOTHING;
