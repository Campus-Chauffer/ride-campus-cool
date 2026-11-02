const pool = require('../db/pool');
const { sendPushNotification, sendBulkPushNotifications } = require('../utils/notifications');

const DISPATCH_RADIUS_KM = 10;
const OFFER_TIMEOUT_SECONDS = 15;
// How many of the nearest available drivers get offered a ride at once.
// Broadcasting to a batch instead of one driver at a time means the whole
// fan-out finishes in a handful of 15s rounds instead of one round per
// driver, while still not paging every online driver on campus for a
// single ride. Starting conservative at 3 while the driver pool is still
// small — worth raising as the driver population grows, since a bigger
// batch means fewer 15s rounds (faster worst-case match) for the same
// number of nearby drivers.
const BROADCAST_BATCH_SIZE = 3;

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

// Nudges every approved driver (online or not) to get/stay online whenever a
// trip ends up unmatched — the whole point is reaching the OFFLINE ones who
// weren't in the dispatch pool at all, so there's no is_online filter here.
const notifyDriversOfUnfilledDemand = async () => {
  try {
    const result = await pool.query(
      `SELECT u.push_token
       FROM drivers d
       JOIN users u ON u.id = d.user_id
       WHERE d.approval_status = 'approved' AND u.push_token IS NOT NULL`
    );
    await sendBulkPushNotifications(
      result.rows.map(r => r.push_token),
      'Rides are coming in!',
      "A passenger just couldn't find a driver nearby — go online now to catch the next one.",
      { type: 'demand_surge' }
    );
  } catch (err) {
    console.error('Demand-surge broadcast error:', err);
  }
};

const notifyPassengerDriverFound = async (trip, driver) => {
  const passengerUser = await pool.query(
    'SELECT push_token FROM users WHERE id = $1',
    [trip.passenger_id]
  );
  // ETA is a straight-line-distance estimate (same distance calc used for
  // dispatch radius), not a routed one, since calling the Directions API on
  // this hot path would add latency and cost for a number that's advisory
  // at best.
  const AVG_CAMPUS_SPEED_KMH = 25;
  const etaMinutes = Math.max(1, Math.round((driver.distance / AVG_CAMPUS_SPEED_KMH) * 60));
  await sendPushNotification(
    passengerUser.rows[0]?.push_token,
    'Driver Found!',
    `${driver.first_name} is on the way in a ${driver.vehicle_color} ${driver.vehicle_make} ${driver.vehicle_model} (${driver.plate_number}) — ETA ${etaMinutes} min.`,
    { type: 'driver_found', trip_id: trip.id, driver_id: driver.id, eta_minutes: etaMinutes }
  );
};

const clearOffers = (trip_id) =>
  pool.query('DELETE FROM trip_offers WHERE trip_id = $1', [trip_id]);

const markNoDriverFound = async (trip_id, reason) => {
  const result = await pool.query(
    "UPDATE trips SET status = 'no_driver_found', no_driver_reason = $2 WHERE id = $1 AND status = 'requested'",
    [trip_id, reason]
  );
  if (result.rowCount > 0) await notifyDriversOfUnfilledDemand();
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
      `SELECT d.*, u.first_name, u.last_name, u.push_token, COALESCE(w.is_locked, FALSE) as is_locked
       FROM drivers d
       JOIN users u ON u.id = d.user_id
       LEFT JOIN wallets w ON w.driver_id = d.id
       WHERE d.is_online = TRUE
       AND COALESCE(w.is_locked, FALSE) = FALSE
       AND d.approval_status = 'approved'`
    );

    const allNearbyOnline = driversResult.rows
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

    // "Busy" covers both a driver already mid-trip AND one currently
    // sitting with a live offer out for some OTHER ride — without the
    // latter, a driver deciding on one ride could get handed a second one
    // at the same time.
    const busyResult = await pool.query(
      `SELECT driver_id FROM trips WHERE status IN ('accepted', 'in_progress') AND driver_id IS NOT NULL
       UNION
       SELECT driver_id FROM trip_offers`
    );
    const busyDriverIds = new Set(busyResult.rows.map(r => r.driver_id));

    const nearbyDrivers = allNearbyOnline.filter(driver => !busyDriverIds.has(driver.id));

    if (nearbyDrivers.length === 0) {
      // Tell apart "nobody's even online nearby" from "drivers are online
      // but every one of them is already on a trip" — the passenger gets a
      // different, more honest message for the second case.
      const reason = allNearbyOnline.length > 0 ? 'all_drivers_busy' : 'no_drivers_online';
      await markNoDriverFound(trip_id, reason);
      return;
    }

    for (let i = 0; i < nearbyDrivers.length; i += BROADCAST_BATCH_SIZE) {
      const batch = nearbyDrivers.slice(i, i + BROADCAST_BATCH_SIZE);

      const currentTrip = await pool.query(
        'SELECT status FROM trips WHERE id = $1',
        [trip_id]
      );
      if (currentTrip.rows[0]?.status !== 'requested') return;

      await pool.query(
        "UPDATE trips SET status = 'offered', matched_at = NOW() WHERE id = $1",
        [trip_id]
      );
      for (const driver of batch) {
        await pool.query(
          'INSERT INTO trip_offers (trip_id, driver_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [trip_id, driver.id]
        );
      }

      await sendBulkPushNotifications(
        batch.map(d => d.push_token),
        'New Ride Request!',
        `Pickup: ${trip.pickup_address} → ${trip.dropoff_address}`,
        { type: 'ride_request', trip_id: trip.id }
      );

      // Poll every second instead of sleeping blind for the whole window —
      // whichever driver in the batch accepts first wins atomically (see
      // acceptOffer in driversController.js), so this just needs to notice
      // that as soon as possible rather than at the end of 15s.
      let winnerDriverId = null;
      for (let elapsed = 0; elapsed < OFFER_TIMEOUT_SECONDS; elapsed++) {
        await new Promise(resolve => setTimeout(resolve, 1000));

        const check = await pool.query(
          'SELECT status, driver_id FROM trips WHERE id = $1',
          [trip_id]
        );
        const status = check.rows[0]?.status;

        if (status === 'accepted') {
          winnerDriverId = check.rows[0].driver_id;
          break;
        }
        if (status !== 'offered') {
          // Trip left the offered state some other way (e.g. passenger
          // cancelled mid-offer). Stop dispatching entirely.
          await clearOffers(trip_id);
          return;
        }
      }

      if (winnerDriverId) {
        await clearOffers(trip_id);
        const winner = nearbyDrivers.find(d => d.id === winnerDriverId);
        if (winner) await notifyPassengerDriverFound(trip, winner);
        return;
      }

      // Nobody in this batch accepted within the window. Reset and move to
      // the next batch — guarded so a late acceptance landing in the same
      // instant isn't clobbered by this reset.
      const resetResult = await pool.query(
        `UPDATE trips SET driver_id = NULL, status = 'requested'
         WHERE id = $1 AND status = 'offered'`,
        [trip_id]
      );
      await clearOffers(trip_id);

      if (resetResult.rowCount === 0) {
        // Someone accepted in the exact instant the reset ran — find out
        // who and notify the passenger instead of moving on to a new batch.
        const boundaryCheck = await pool.query(
          'SELECT status, driver_id FROM trips WHERE id = $1',
          [trip_id]
        );
        if (boundaryCheck.rows[0]?.status === 'accepted') {
          const winner = nearbyDrivers.find(d => d.id === boundaryCheck.rows[0].driver_id);
          if (winner) await notifyPassengerDriverFound(trip, winner);
        }
        return;
      }
    }

    // Every nearby driver had a shot and nobody accepted.
    await markNoDriverFound(trip_id, 'no_drivers_accepted');

  } catch (err) {
    console.error('Dispatch error:', err);
  }
};

module.exports = { dispatchRide };
