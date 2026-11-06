-- Reduces day short-trip and mid-distance fares by 1 cedi. base_fare is
-- shared with night pricing (no day/night split exists for it), so this
-- also shifts night fares down by 1 cedi for trips roughly 2.5km-4km —
-- night's flat-16 tier (up to 2.5km) and the 4km+ ceiling are unaffected.
UPDATE config SET value = '12' WHERE key = 'day_lower_flat';
UPDATE config SET value = '11' WHERE key = 'base_fare';
