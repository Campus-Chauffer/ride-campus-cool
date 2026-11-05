-- Closes the gap between the short-trip flat rate and what drivers already
-- consider a fair "normal" fare, and adds a hard floor so no future tier
-- misconfiguration can silently undercut it again.
UPDATE config SET value = '15' WHERE key = 'day_lower_flat';
UPDATE config SET value = '18' WHERE key = 'night_lower_flat';
UPDATE config SET value = '20' WHERE key = 'day_upper_flat';

INSERT INTO config (key, value) VALUES ('minimum_fare', '15')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
