-- One-time migration for the account-deletion feature. Run against the
-- live database once (Railway data console or psql), then it's done —
-- schema.sql has already been updated to match for any future fresh DB.

ALTER TABLE users ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMP;
