-- One-time migration for the stale-online-driver cleanup job. Run against
-- the live database once, then it's done — schema.sql has already been
-- updated to match for any future fresh DB.

ALTER TABLE drivers ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMP;
