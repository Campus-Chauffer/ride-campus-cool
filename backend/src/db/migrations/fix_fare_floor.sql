-- Closes the gap between the short-trip flat rate and what drivers consider
-- a fair fare, and adds a hard floor so no future tier misconfiguration can
-- silently undercut it again. Day ranges 13-20 (mid-distance trips landing
-- on 14/15/16), night ranges 16-20.
UPDATE config SET value = '13' WHERE key = 'day_lower_flat';
UPDATE config SET value = '16' WHERE key = 'night_lower_flat';
UPDATE config SET value = '20' WHERE key = 'day_upper_flat';
UPDATE config SET value = '12' WHERE key = 'base_fare';
UPDATE config SET value = '2' WHERE key = 'price_per_km';

INSERT INTO config (key, value) VALUES ('minimum_fare', '12')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
