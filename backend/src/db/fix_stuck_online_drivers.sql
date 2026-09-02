-- Step 1: run this first to see who's currently marked online, and note
-- the driver_id(s) for your two stuck test accounts.

SELECT d.id as driver_id, u.first_name, u.last_name, u.phone_number, d.current_lat, d.current_lng
FROM drivers d
JOIN users u ON d.user_id = u.id
WHERE d.is_online = TRUE;

-- Step 2: replace the IDs below with the driver_id(s) from above, then run
-- this. Deliberately targeted rather than resetting every online driver —
-- a real driver could legitimately be online for real testing at the same
-- time, and the app has no way to notice or correct a driver flipped
-- offline out from under it until they manually toggle again.

UPDATE drivers SET is_online = FALSE WHERE id IN (/* driver_id, driver_id */);

UPDATE driver_sessions
SET went_offline_at = NOW()
WHERE driver_id IN (/* same driver_id, driver_id */)
AND went_offline_at IS NULL;
