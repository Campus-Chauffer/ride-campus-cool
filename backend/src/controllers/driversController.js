const pool = require('../db/pool');
const { sendPushNotification } = require('../utils/notifications');
const { sendRatingReminder, sendRideReceipt } = require('../utils/email');


// Driver goes online
const goOnline = async (req, res) => {
  const { lat, lng } = req.body;
  const user_id = req.user.id;

  if (!lat || !lng) {
    return res.status(400).json({ error: 'Location required' });
  }

  try {
    const driverResult = await pool.query(
      'SELECT * FROM drivers WHERE user_id = $1',
      [user_id]
    );

    if (driverResult.rows.length === 0) {
      return res.status(404).json({ error: 'Driver profile not found' });
    }

    const driver = driverResult.rows[0];

    if (driver.approval_status !== 'approved') {
      return res.status(403).json({ error: 'Driver not approved yet' });
    }

    const walletResult = await pool.query(
      'SELECT * FROM wallets WHERE driver_id = $1',
      [driver.id]
    );

    if (walletResult.rows[0]?.is_locked) {
      return res.status(403).json({ error: 'Wallet locked. Please clear outstanding balance.' });
    }

    await pool.query(
      `UPDATE drivers SET is_online = TRUE, current_lat = $1, current_lng = $2, location_updated_at = NOW()
       WHERE user_id = $3`,
      [lat, lng, user_id]
    );

    // Log this session start for weekly login rate tracking
    await pool.query(
      `INSERT INTO driver_sessions (driver_id, went_online_at) VALUES ($1, NOW())`,
      [driver.id]
    );

    res.json({ message: 'You are now online' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Shared by the explicit "go offline" toggle AND switchRole (authController.js)
// when a driver switches to passenger mode — that switch used to leave
// is_online untouched, so a driver who went online, then switched to
// passenger without toggling off first, stayed "online" forever: visible as
// online on the admin dashboard indefinitely, and still eligible to be
// dispatched ride offers by dispatchController.js despite having no driver
// screen open to ever see or accept one.
const takeDriverOffline = async (user_id) => {
  const driverResult = await pool.query(
    'SELECT id FROM drivers WHERE user_id = $1', [user_id]
  );
  const driver_id = driverResult.rows[0]?.id;
  if (!driver_id) return;

  // Auto-complete any stuck in_progress trip for this driver
  await pool.query(
    `UPDATE trips SET status = 'completed'
     WHERE driver_id = $1 AND status = 'in_progress'`,
    [driver_id]
  );

  await pool.query(
    'UPDATE drivers SET is_online = FALSE WHERE id = $1', [driver_id]
  );

  // Close the most recent open session for this driver. Plain UPDATE
  // doesn't support ORDER BY/LIMIT in Postgres, so target the row via a
  // subquery instead.
  await pool.query(
    `UPDATE driver_sessions
     SET went_offline_at = NOW()
     WHERE id = (
       SELECT id FROM driver_sessions
       WHERE driver_id = $1 AND went_offline_at IS NULL
       ORDER BY went_online_at DESC
       LIMIT 1
     )`,
    [driver_id]
  );
};

// Driver goes offline
const goOffline = async (req, res) => {
  const user_id = req.user.id;
  try {
    await takeDriverOffline(user_id);
    res.json({ message: 'You are now offline' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Update driver location
const updateLocation = async (req, res) => {
  const { lat, lng } = req.body;
  const user_id = req.user.id;
  try {
    await pool.query(
      'UPDATE drivers SET current_lat = $1, current_lng = $2, location_updated_at = NOW() WHERE user_id = $3',
      [lat, lng, user_id]
    );
    res.json({ message: 'Location updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Check for pending ride offers
const checkOffers = async (req, res) => {
  const user_id = req.user.id;
  try {
    const driverResult = await pool.query(
      'SELECT * FROM drivers WHERE user_id = $1',
      [user_id]
    );

    if (driverResult.rows.length === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    const driver = driverResult.rows[0];

    // Broadcast dispatch offers a trip to several drivers at once without
    // assigning driver_id until someone accepts (see dispatchController.js),
    // so "is this trip meant for me" is answered by trip_offers membership
    // rather than trips.driver_id.
    const tripResult = await pool.query(
      `SELECT t.* FROM trips t
       JOIN trip_offers o ON o.trip_id = t.id
       WHERE o.driver_id = $1 AND t.status = 'offered'
       ORDER BY t.created_at DESC LIMIT 1`,
      [driver.id]
    );

    if (tripResult.rows.length === 0) {
      return res.json({ offer: null });
    }

    res.json({ offer: tripResult.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Accept a ride offer
const acceptOffer = async (req, res) => {
  const { trip_id } = req.params;
  const user_id = req.user.id;

  try {
    const driverResult = await pool.query(
      `SELECT d.*, u.phone_number as driver_phone, u.profile_photo as driver_photo,
              u.first_name as driver_first_name, u.last_name as driver_last_name
       FROM drivers d JOIN users u ON d.user_id = u.id
       WHERE d.user_id = $1`,
      [user_id]
    );
    const driver = driverResult.rows[0];

    // Atomic claim, part 1: two drivers racing to accept the SAME offer both
    // reach the UPDATE below targeting the SAME trip row, so Postgres's own
    // row lock serializes them for free — whichever commits first flips
    // status/driver_id, and the loser's WHERE clause (status = 'offered'
    // AND driver_id IS NULL) no longer matches, so it affects 0 rows
    // instead of double-assigning the trip.
    //
    // Atomic claim, part 2: that row lock does NOT help when the SAME
    // driver races to accept TWO DIFFERENT trips at once (possible since
    // two trips dispatched close together can briefly both think that
    // driver is free before either offer is recorded) — those two UPDATEs
    // target different rows, so there's no lock forcing one to see the
    // other's write before committing. A NOT EXISTS check here alone is
    // NOT enough (verified empirically: it fails most of the time under
    // real concurrency, since both transactions read "no accepted trip
    // yet" before either commits). Explicitly locking the driver's own row
    // first forces the second transaction to wait for the first to commit,
    // so its own check of "does this driver already have an accepted
    // trip" is guaranteed to see that commit.
    const client = await pool.connect();
    let result;
    try {
      await client.query('BEGIN');
      await client.query('SELECT id FROM drivers WHERE id = $1 FOR UPDATE', [driver.id]);

      result = await client.query(
        `UPDATE trips SET status = 'accepted', driver_id = $2, accepted_at = NOW()
         WHERE id = $1 AND status = 'offered' AND driver_id IS NULL
         AND EXISTS (SELECT 1 FROM trip_offers WHERE trip_id = $1 AND driver_id = $2)
         AND NOT EXISTS (SELECT 1 FROM trips WHERE driver_id = $2 AND status IN ('accepted', 'in_progress'))
         RETURNING *`,
        [trip_id, driver.id]
      );

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'This ride was just accepted by another driver, or the offer has expired.' });
    }

    const trip = result.rows[0];

    // Ride-sharing: a second passenger can join this group before a driver
    // is found for it, in which case their leg never went through
    // trip_offers/broadcast at all — it's just been sitting at 'requested'
    // waiting for the anchor's own dispatch to land a driver. Propagate
    // that assignment to any such sibling now.
    if (trip.shared_group_id) {
      await pool.query(
        `UPDATE trips SET driver_id = $1, status = 'accepted', accepted_at = NOW()
         WHERE shared_group_id = $2 AND id != $3 AND status = 'requested'`,
        [driver.id, trip.shared_group_id, trip.id]
      );
    }

    const passengerResult = await pool.query(
      `SELECT first_name, last_name, phone_number FROM users WHERE id = $1`,
      [trip.passenger_id]
    );
    const passenger = passengerResult.rows[0];

    res.json({
      ...trip,
      passenger_first_name: passenger?.first_name,
      passenger_last_name: passenger?.last_name,
      passenger_phone: passenger?.phone_number,
      driver_first_name: driver.driver_first_name,
      driver_last_name: driver.driver_last_name,
      driver_phone: driver.driver_phone,
      driver_photo: driver.driver_photo,
      vehicle_make: driver.vehicle_make,
      vehicle_model: driver.vehicle_model,
      vehicle_color: driver.vehicle_color,
      plate_number: driver.plate_number,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Start a trip
const startTrip = async (req, res) => {
  const { trip_id } = req.params;
  const user_id = req.user.id;

  try {
    const driverResult = await pool.query(
      'SELECT id FROM drivers WHERE user_id = $1', [user_id]
    );
    const driver_id = driverResult.rows[0]?.id;
    if (!driver_id) return res.status(404).json({ error: 'Driver not found' });

    // Get trip with arrived_at timestamp
    const tripResult = await pool.query(
      'SELECT * FROM trips WHERE id = $1 AND driver_id = $2',
      [trip_id, driver_id]
    );

    if (tripResult.rows.length === 0) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    const trip = tripResult.rows[0];

    // Ride-sharing: a match can land while the driver is already sitting on
    // the solo ArrivedAtPickupScreen (the normal "I've arrived" flow for a
    // trip that wasn't shared yet) — a tap on that screen's own Start Trip
    // button in the brief window before the client notices and switches to
    // the multi-stop flow would otherwise start this leg alone while a
    // just-matched co-rider is still waiting to be picked up, desyncing
    // the group's unified start. Block it here; the client's own poll will
    // catch up and move the driver into the correct multi-stop screen,
    // where this leg auto-starts normally once everyone's confirmed.
    if (trip.shared_group_id) {
      const groupResult = await pool.query(
        `SELECT status FROM trips WHERE shared_group_id = $1 AND status != 'cancelled'`,
        [trip.shared_group_id]
      );
      const allOnboard = groupResult.rows.every((t) => ['arrived', 'in_progress', 'completed'].includes(t.status));
      if (!allOnboard) {
        return res.status(400).json({ error: 'Waiting for the other passenger to be picked up first.' });
      }
    }

    // Calculate wait penalty
    let waitPenalty = 0;
    if (trip.arrived_at) {
      const arrivedAt = new Date(trip.arrived_at);
      const now = new Date();
      const waitSeconds = Math.floor((now - arrivedAt) / 1000);
      const freeWaitSeconds = 300; // 5 minutes free

      if (waitSeconds > freeWaitSeconds) {
        const extraSeconds = waitSeconds - freeWaitSeconds;
        const extraPeriods = Math.floor(extraSeconds / 120); // every 2 minutes
        waitPenalty = extraPeriods * 1; // GH₵1 per 2 minute period
      }
    }

    const newFare = parseFloat(trip.fare) + waitPenalty;
    const configResult = await pool.query("SELECT value FROM config WHERE key = 'commission_rate'");
    const commissionRate = parseFloat(configResult.rows[0]?.value) || 0.15;
    const newCommission = Math.round(newFare * commissionRate * 100) / 100;

    const result = await pool.query(
      `UPDATE trips 
       SET status = 'in_progress', fare = $1, commission = $2, wait_penalty = $3
       WHERE id = $4 AND driver_id = $5 AND status = 'arrived'
       RETURNING *`,
      [newFare, newCommission, waitPenalty, trip_id, driver_id]
    );
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Trip not found or not ready to start' });
    }  

    const updatedTrip = result.rows[0];

    // Notify passenger trip has started
    const passengerResult = await pool.query(
      'SELECT push_token FROM users WHERE id = $1',
      [trip.passenger_id]
    );

    const message = waitPenalty > 0
      ? `Your trip has started! A wait fee of GH₵${waitPenalty} was added. Total fare: GH₵${newFare.toFixed(2)}`
      : `Your trip has started! You're on your way to ${trip.dropoff_address}.`;

    await sendPushNotification(
      passengerResult.rows[0]?.push_token,
      '🚀 Trip started!',
      message,
      { type: 'trip_started', trip_id: trip.id }
    );

    res.json(updatedTrip);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Complete a trip
const completeTrip = async (req, res) => {
  const { trip_id } = req.params;
  const user_id = req.user.id;

  try {
    const driverResult = await pool.query(
      'SELECT * FROM drivers WHERE user_id = $1',
      [user_id]
    );
    const driver = driverResult.rows[0];

    // If already completed return success silently — handles double tap race condition
    const existing = await pool.query(
      `SELECT * FROM trips WHERE id = $1 AND driver_id = $2`,
      [trip_id, driver.id]
    );
    if (existing.rows[0]?.status === 'completed') {
      return res.json({ trip: existing.rows[0], message: 'Trip completed successfully' });
    }

    const result = await pool.query(
      `UPDATE trips SET status = 'completed', completed_at = NOW()
       WHERE id = $1 AND driver_id = $2 AND status = 'in_progress' RETURNING *`,
      [trip_id, driver.id]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Trip not found or not in progress' });
    }

    const trip = result.rows[0];

    // Record commission in ledger
    await pool.query(
      `INSERT INTO ledger (driver_id, trip_id, amount, type, description)
       VALUES ($1, $2, $3, 'commission', $4)`,
      [driver.id, trip.id, trip.commission, `Commission for trip #${trip.id}`]
    );

    // Update wallet
    await pool.query(
      `UPDATE wallets 
       SET total_commission_owed = total_commission_owed + $1
       WHERE driver_id = $2`,
      [trip.commission, driver.id]
    );

    // Notify passenger — pay reminder doubles as the completion notice since
    // fares are settled in cash with the driver, not in-app.
    const passengerUser = await pool.query(
      'SELECT push_token FROM users WHERE id = $1',
      [trip.passenger_id]
    );
    await sendPushNotification(
      passengerUser.rows[0]?.push_token,
      'Trip Completed!',
      `You've arrived at ${trip.dropoff_address}. Pay GH₵${trip.fare} to your driver, and don't forget to rate your ride!`,
      { type: 'trip_completed_passenger', trip_id: trip.id }
    );

    // Send receipt and rating reminders
    const passengerData = await pool.query(
      'SELECT email, first_name FROM users WHERE id = $1',
      [trip.passenger_id]
    );
    const driverData = await pool.query(
      'SELECT u.email, u.first_name, u.push_token FROM users u WHERE u.id = $1',
      [req.user.id]
    );

    const passenger = passengerData.rows[0];
    const driverUser = driverData.rows[0];

    // Notify driver — amount to collect plus a rating nudge
    if (driverUser) {
      await sendPushNotification(
        driverUser.push_token,
        'Trip Complete!',
        `Collect GH₵${trip.fare} from your passenger, and remember to rate them.`,
        { type: 'trip_completed_driver', trip_id: trip.id }
      );
    }

    if (passenger) {
      await sendRideReceipt(passenger.email, passenger.first_name, trip);
      await sendRatingReminder(passenger.email, passenger.first_name, trip.id, 'passenger');
    }
    if (driverUser) {
      await sendRatingReminder(driverUser.email, driverUser.first_name, trip.id, 'driver');
    }

    res.json({ trip, message: 'Trip completed successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

const arrivedAtPickup = async (req, res) => {
  const { trip_id } = req.params;
  const user_id = req.user.id;

  try {
    const driverResult = await pool.query(
      'SELECT id FROM drivers WHERE user_id = $1', [user_id]
    );
    const driver_id = driverResult.rows[0]?.id;
    if (!driver_id) return res.status(404).json({ error: 'Driver not found' });

    const result = await pool.query(
      `UPDATE trips SET status = 'arrived', arrived_at = NOW()
       WHERE id = $1 AND driver_id = $2 AND status = 'accepted'
       RETURNING *`,
      [trip_id, driver_id]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Trip not found or already updated' });
    }

    const trip = result.rows[0];

    // Get passenger push token
    const passengerResult = await pool.query(
      'SELECT push_token, first_name FROM users WHERE id = $1',
      [trip.passenger_id]
    );
    const passenger = passengerResult.rows[0];

    // Notify passenger
    await sendPushNotification(
      passenger?.push_token,
      '🚗 Your driver has arrived!',
      `Your driver is waiting at ${trip.pickup_address}. You have 5 free minutes before a wait fee applies.`,
      { type: 'driver_arrived', trip_id: trip.id }
    );

    // Ride-sharing: once every active member of this group has reached
    // 'arrived' (confirmed onboard), the trip starts for all of them at
    // once — no separate "Start Trip" tap. A no-op for a solo trip or a
    // shared trip that never matched a second passenger (group size < 2),
    // which keeps today's explicit Start Trip flow completely unchanged
    // for the common case.
    if (trip.shared_group_id) {
      const { tryAutoStartGroup } = require('../utils/sharedRides');
      const startedLegs = await tryAutoStartGroup(pool, trip.shared_group_id);
      if (startedLegs) {
        for (const leg of startedLegs) {
          const legPassenger = await pool.query('SELECT push_token FROM users WHERE id = $1', [leg.passenger_id]);
          sendPushNotification(
            legPassenger.rows[0]?.push_token,
            '🚀 Trip started!',
            leg.wait_penalty > 0
              ? `Your trip has started! A wait fee of GH₵${leg.wait_penalty} was added. Total fare: GH₵${parseFloat(leg.fare).toFixed(2)}`
              : `Your trip has started! You're on your way to ${leg.dropoff_address}.`,
            { type: 'trip_started', trip_id: leg.id }
          ).catch(() => {});
        }
      }
    }

    res.json(trip);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};
const getWaitFare = async (req, res) => {
  const { trip_id } = req.params;
  try {
    const result = await pool.query(
      'SELECT fare, arrived_at FROM trips WHERE id = $1',
      [trip_id]
    );
    const trip = result.rows[0];
    if (!trip) return res.status(404).json({ error: 'Trip not found' });

    let waitPenalty = 0;
    let waitSeconds = 0;

    if (trip.arrived_at) {
      const arrivedAt = new Date(trip.arrived_at);
      waitSeconds = Math.floor((new Date() - arrivedAt) / 1000);
      const freeWaitSeconds = 300;
      if (waitSeconds > freeWaitSeconds) {
        const extraPeriods = Math.floor((waitSeconds - freeWaitSeconds) / 120);
        waitPenalty = extraPeriods * 1;
      }
    }

    res.json({
      original_fare: parseFloat(trip.fare),
      wait_penalty: waitPenalty,
      current_fare: parseFloat(trip.fare) + waitPenalty,
      wait_seconds: waitSeconds,
      free_wait_seconds: 300,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};


module.exports = { goOnline, goOffline, updateLocation, checkOffers, acceptOffer, startTrip, arrivedAtPickup,getWaitFare,  completeTrip, takeDriverOffline };