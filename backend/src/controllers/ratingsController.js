const pool = require('../db/pool');
const { sendPushNotification } = require('../utils/notifications');

// Passenger rates driver
const rateDriver = async (req, res) => {
  const { trip_id } = req.params;
  const { rating, comment } = req.body;
  const passenger_id = req.user.id;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5' });
  }

  try {
    // Get trip
    const tripResult = await pool.query(
      'SELECT * FROM trips WHERE id = $1 AND passenger_id = $2',
      [trip_id, passenger_id]
    );

    if (tripResult.rows.length === 0) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    const trip = tripResult.rows[0];

    if (trip.status !== 'completed') {
      return res.status(400).json({ error: 'Can only rate completed trips' });
    }

    if (trip.rated_by_passenger) {
      return res.status(400).json({ error: 'You have already rated this trip' });
    }

    // Check 3 hour window
    const completedAt = new Date(trip.completed_at);
    const now = new Date();
    const hoursDiff = (now - completedAt) / (1000 * 60 * 60);

    if (hoursDiff > 3) {
      return res.status(400).json({ error: 'Rating window has expired (3 hours)' });
    }

    // Save rating
    await pool.query(
      `UPDATE trips SET 
        passenger_rating = $1, 
        passenger_comment = $2,
        rated_by_passenger = TRUE
       WHERE id = $3`,
      [rating, comment, trip_id]
    );

    // Notify driver
    const driverResult = await pool.query(
      `SELECT u.push_token, u.first_name FROM users u
       JOIN drivers d ON d.user_id = u.id
       WHERE d.id = $1`,
      [trip.driver_id]
    );

    if (driverResult.rows[0]) {
      await sendPushNotification(
        driverResult.rows[0].push_token,
        'New Rating Received',
        `You received a ${rating}⭐ rating for your recent trip.`,
        { type: 'rating', trip_id: trip.id }
      );
    }

    res.json({ message: 'Rating submitted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Driver rates passenger
const ratePassenger = async (req, res) => {
  const { trip_id } = req.params;
  const { rating, comment } = req.body;
  const user_id = req.user.id;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5' });
  }

  try {
    // Get driver
    const driverResult = await pool.query(
      'SELECT * FROM drivers WHERE user_id = $1',
      [user_id]
    );

    if (driverResult.rows.length === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    const driver = driverResult.rows[0];

    // Get trip
    const tripResult = await pool.query(
      'SELECT * FROM trips WHERE id = $1 AND driver_id = $2',
      [trip_id, driver.id]
    );

    if (tripResult.rows.length === 0) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    const trip = tripResult.rows[0];

    if (trip.status !== 'completed') {
      return res.status(400).json({ error: 'Can only rate completed trips' });
    }

    if (trip.rated_by_driver) {
      return res.status(400).json({ error: 'You have already rated this trip' });
    }

    // Check 3 hour window
    const completedAt = new Date(trip.completed_at);
    const now = new Date();
    const hoursDiff = (now - completedAt) / (1000 * 60 * 60);

    if (hoursDiff > 3) {
      return res.status(400).json({ error: 'Rating window has expired (3 hours)' });
    }

    // Save rating
    await pool.query(
      `UPDATE trips SET 
        driver_rating = $1,
        driver_comment = $2,
        rated_by_driver = TRUE
       WHERE id = $3`,
      [rating, comment, trip_id]
    );

    // Notify passenger
    const passengerResult = await pool.query(
      'SELECT push_token, first_name FROM users WHERE id = $1',
      [trip.passenger_id]
    );

    if (passengerResult.rows[0]) {
      await sendPushNotification(
        passengerResult.rows[0].push_token,
        'New Rating Received',
        `You received a ${rating}⭐ rating for your recent trip.`,
        { type: 'rating', trip_id: trip.id }
      );
    }

    res.json({ message: 'Rating submitted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get user profile with rating and stats
const getUserProfile = async (req, res) => {
  const { user_id } = req.params;

  try {
    const userResult = await pool.query(
      'SELECT id, first_name, last_name, phone_number, role, created_at FROM users WHERE id = $1',
      [user_id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    if (user.role === 'driver') {
      // Get driver stats
      const statsResult = await pool.query(
        `SELECT 
          COUNT(*) as total_trips,
          AVG(passenger_rating) as average_rating,
          COUNT(passenger_rating) as total_ratings
         FROM trips
         WHERE driver_id = (SELECT id FROM drivers WHERE user_id = $1)
         AND status = 'completed'`,
        [user_id]
      );

      const stats = statsResult.rows[0];
      const totalTrips = parseInt(stats.total_trips);
      const showRating = totalTrips >= 5;

      return res.json({
        ...user,
        total_trips: totalTrips,
        average_rating: showRating
          ? parseFloat(stats.average_rating).toFixed(1)
          : null,
        total_ratings: parseInt(stats.total_ratings),
        rating_visible: showRating,
      });
    } else {
      // Get passenger stats
      const statsResult = await pool.query(
        `SELECT 
          COUNT(*) as total_trips,
          AVG(driver_rating) as average_rating,
          COUNT(driver_rating) as total_ratings
         FROM trips
         WHERE passenger_id = $1
         AND status = 'completed'`,
        [user_id]
      );

      const stats = statsResult.rows[0];
      const totalTrips = parseInt(stats.total_trips);
      const showRating = totalTrips >= 5;

      return res.json({
        ...user,
        total_trips: totalTrips,
        average_rating: showRating
          ? parseFloat(stats.average_rating).toFixed(1)
          : null,
        total_ratings: parseInt(stats.total_ratings),
        rating_visible: showRating,
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { rateDriver, ratePassenger, getUserProfile };