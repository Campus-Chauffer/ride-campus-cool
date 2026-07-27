const pool = require('../db/pool');
const { sendPushNotification } = require('../utils/notifications');

const DISPATCH_RADIUS_KM = 10;
const OFFER_TIMEOUT_SECONDS = 15;

const toRad = (deg) => deg * (Math.PI / 180);

const getDistanceKm = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

const dispatchRide = async (trip_id) => {
  try {
    const tripResult = await pool.query(
      'SELECT * FROM trips WHERE id = $1',
      [trip_id]
    );

    if (tripResult.rows.length === 0) return;
    const trip = tripResult.rows[0];

    const driversResult = await pool.query(
      `SELECT d.*, COALESCE(w.is_locked, FALSE) as is_locked 
       FROM drivers d
       LEFT JOIN wallets w ON w.driver_id = d.id
       WHERE d.is_online = TRUE
       AND COALESCE(w.is_locked, FALSE) = FALSE
       AND d.approval_status = 'approved'
       AND d.id NOT IN (
         SELECT driver_id FROM trips
         WHERE status IN ('offered', 'accepted', 'in_progress')
         AND driver_id IS NOT NULL
       )`
    );

    const nearbyDrivers = driversResult.rows
      .map(driver => ({
        ...driver,
        distance: (driver.current_lat && driver.current_lng)
          ? getDistanceKm(
              trip.pickup_lat, trip.pickup_lng,
              driver.current_lat, driver.current_lng
            )
          : 999
      }))
      .filter(driver => driver.distance <= DISPATCH_RADIUS_KM)
      .sort((a, b) => a.distance - b.distance);

    if (nearbyDrivers.length === 0) {
      await pool.query(
        "UPDATE trips SET status = 'no_driver_found' WHERE id = $1",
        [trip_id]
      );
      return;
    }

    for (const driver of nearbyDrivers) {
      // Check trip is still waiting
      const currentTrip = await pool.query(
        'SELECT status FROM trips WHERE id = $1',
        [trip_id]
      );
      if (currentTrip.rows[0].status !== 'requested') return;

      // ATOMIC LOCK — use a transaction with SELECT FOR UPDATE SKIP LOCKED
      // This prevents two dispatch loops from grabbing the same driver simultaneously
      const client = await pool.connect();
      let assigned = false;

      try {
        await client.query('BEGIN');

        // Lock this driver row — if another dispatch already locked it, skip instantly
        const lockResult = await client.query(
          `SELECT id FROM drivers 
           WHERE id = $1
           AND is_online = TRUE
           AND id NOT IN (
             SELECT driver_id FROM trips
             WHERE status IN ('offered', 'accepted', 'in_progress')
             AND driver_id IS NOT NULL
           )
           FOR UPDATE SKIP LOCKED`,
          [driver.id]
        );

        if (lockResult.rows.length === 0) {
          // Driver was grabbed by another dispatch — skip to next
          await client.query('ROLLBACK');
          continue;
        }

        // Driver is ours — assign the trip
        await client.query(
          "UPDATE trips SET driver_id = $1, status = 'offered', matched_at = NOW() WHERE id = $2",
          [driver.id, trip_id]
        );

        await client.query('COMMIT');
        assigned = true;

      } catch (err) {
        await client.query('ROLLBACK');
        console.error('Dispatch lock error:', err);
      } finally {
        client.release();
      }

      if (!assigned) continue;

      // Notify driver
      const driverUser = await pool.query(
        'SELECT push_token FROM users WHERE id = $1',
        [driver.user_id]
      );
      await sendPushNotification(
        driverUser.rows[0]?.push_token,
        'New Ride Request!',
        `Pickup: ${trip.pickup_address} \u2192 ${trip.dropoff_address}`,
        { trip_id: trip.id }
      );

      // Wait for driver to accept or timeout — poll every second instead of
      // sleeping blind for the full window. This closes the race condition where
      // a driver's acceptance lands just before the old single end-of-window
      // check, and is caught almost immediately instead of possibly losing to
      // a blind reset.
      let accepted = false;
      for (let elapsed = 0; elapsed < OFFER_TIMEOUT_SECONDS; elapsed++) {
        await new Promise(resolve => setTimeout(resolve, 1000));

        const check = await pool.query(
          'SELECT status FROM trips WHERE id = $1',
          [trip_id]
        );
        const status = check.rows[0]?.status;

        if (status === 'accepted') {
          accepted = true;
          break;
        }
        if (status !== 'offered') {
          // Trip left the offered state some other way (e.g. passenger cancelled
          // mid-offer). Stop dispatching entirely rather than continuing to the
          // next driver or resetting a trip that's no longer ours to manage.
          return;
        }
      }

      if (accepted) {
        // Notify passenger
        const passengerUser = await pool.query(
          'SELECT push_token FROM users WHERE id = $1',
          [trip.passenger_id]
        );
        await sendPushNotification(
          passengerUser.rows[0]?.push_token,
          'Driver Found!',
          `${driver.first_name} is on the way to pick you up.`,
          { trip_id: trip.id }
        );
        return;
      }

      // Genuinely timed out with no acceptance — reset and try next driver.
      // Guarded with status = 'offered' AND driver_id = this driver so that if
      // an acceptance landed in the same instant this write runs, the reset
      // becomes a no-op instead of clobbering a valid accepted trip.
      await pool.query(
        `UPDATE trips SET driver_id = NULL, status = 'requested' 
         WHERE id = $1 AND status = 'offered' AND driver_id = $2`,
        [trip_id, driver.id]
      );
    }

    // No driver in the list accepted — do a final guarded check before giving
    // up, in case the very last driver's acceptance is still settling.
    const finalCheck = await pool.query(
      'SELECT status FROM trips WHERE id = $1',
      [trip_id]
    );
    if (finalCheck.rows[0]?.status === 'requested') {
      await pool.query(
        "UPDATE trips SET status = 'no_driver_found' WHERE id = $1 AND status = 'requested'",
        [trip_id]
      );
    }

  } catch (err) {
    console.error('Dispatch error:', err);
  }
};

module.exports = { dispatchRide };