-- One-time migration for the referral program + "what's new" changelog
-- popup. Run against the live database once, then it's done — schema.sql
-- has already been updated to match for any future fresh DB.

ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code VARCHAR(6) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by INTEGER REFERENCES users(id);

INSERT INTO config (key, value) VALUES
  ('referral_reward_threshold', '10'),
  ('referral_welcome_discount', '3'),
  ('changelog_version', '0'),
  ('changelog_items', '')
ON CONFLICT (key) DO NOTHING;
