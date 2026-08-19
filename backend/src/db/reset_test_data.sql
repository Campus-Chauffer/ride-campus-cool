-- Resets all recorded test-activity data ahead of the beta launch, while
-- preserving every account (users) and driver profile (vehicle, license,
-- Ghana Card, approval status). Run once, right before launch.
--
-- IMPORTANT: take a full database backup before running this. It is
-- irreversible outside of restoring that backup.

BEGIN;

-- Ride history, commission ledger, complaints, online/offline session logs,
-- OTP codes, and announcements are all recorded during testing and unrelated
-- to any user's profile — safe to wipe clean. RESTART IDENTITY resets each
-- table's auto-increment counter back to 1 for a clean slate. CASCADE
-- handles the trips -> ledger/reports foreign keys since both dependent
-- tables are included in the same TRUNCATE.
TRUNCATE trips, ledger, reports, driver_sessions, otps, announcements
  RESTART IDENTITY CASCADE;

-- Wallet rows stay (drivers.wallet is expected to exist by the app), but
-- every balance accumulated during test rides resets to zero.
UPDATE wallets
SET balance = 0, total_commission_owed = 0, total_paid = 0, is_locked = FALSE;

-- Stale test session state on driver profiles — approval status, vehicle,
-- and license info are untouched (that's the profile being preserved).
UPDATE drivers
SET is_online = FALSE, current_lat = NULL, current_lng = NULL;

COMMIT;
