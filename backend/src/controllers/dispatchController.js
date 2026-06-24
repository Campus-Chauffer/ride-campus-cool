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
      `SELECT d.*, COALESCE(w.is_locked, FALSE) as is_locked FROM drivers d
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
      const currentTrip = await pool.query(
        'SELECT status FROM trips WHERE id = $1',
        [trip_id]
      );
      if (currentTrip.rows[0].status !== 'requested') return;

      await pool.query(
        "UPDATE trips SET driver_id = $1, status = 'offered', matched_at = NOW() WHERE id = $2",
        [driver.id, trip_id]
      );

      const driverUser = await pool.query(
        'SELECT push_token FROM users WHERE id = $1',
        [driver.user_id]
      );
      await sendPushNotification(
        driverUser.rows[0]?.push_token,
        'New Ride Request!',
        `Pickup: ${trip.pickup_address} → ${trip.dropoff_address}`,
        { trip_id: trip.id }
      );

      await new Promise(resolve => setTimeout(resolve, OFFER_TIMEOUT_SECONDS * 1000));

      const updatedTrip = await pool.query(
        'SELECT status FROM trips WHERE id = $1',
        [trip_id]
      );

      if (updatedTrip.rows[0].status === 'accepted') {
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

      await pool.query(
        "UPDATE trips SET driver_id = NULL, status = 'requested' WHERE id = $1",
        [trip_id]
      );
    }

    await pool.query(
      "UPDATE trips SET status = 'no_driver_found' WHERE id = $1",
      [trip_id]
    );

  } catch (err) {
    console.error('Dispatch error:', err);
  }
};

module.exports = { dispatchRide };