const pool = require('../db/pool');
const { takeDriverOffline } = require('./driversController');

// Get all drivers
const getAllDrivers = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT d.*, u.first_name, u.last_name, u.phone_number, u.email, u.profile_photo,
              w.total_commission_owed, w.total_paid, w.is_locked,
              (w.total_commission_owed - w.total_paid) as outstanding_balance
       FROM drivers d
       JOIN users u ON d.user_id = u.id
       LEFT JOIN wallets w ON w.driver_id = d.id
       ORDER BY d.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Approve a driver
const approveDriver = async (req, res) => {
  const { driver_id } = req.params;
  try {
    const result = await pool.query(
      `UPDATE drivers SET approval_status = 'approved' WHERE id = $1 RETURNING *`,
      [driver_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }
    res.json({ message: 'Driver approved', driver: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Edit a driver's profile fields. Available regardless of approval status —
// meant for an admin filling in or correcting info a driver skipped or got
// wrong during registration (e.g. a missing plate number), not just a
// pre-approval review step. Only touches fields explicitly provided, so an
// admin can fill in one missing field without needing to resend everything.
const EDITABLE_DRIVER_FIELDS = [
  'vehicle_make', 'vehicle_model', 'vehicle_color', 'plate_number',
  'ghana_card_number', 'license_number', 'license_expiry',
  'ghana_card_image', 'license_image',
  'vehicle_front_image', 'vehicle_side_image', 'vehicle_back_image',
];

const updateDriverProfile = async (req, res) => {
  const { driver_id } = req.params;
  // profile_photo lives on users, not drivers (same as the mobile
  // registration flow — driverRegistrationController.js writes it there
  // too), so it's handled as a separate query below rather than folded
  // into the drivers UPDATE.
  const { profile_photo, ...driverFields } = req.body;

  const updates = Object.keys(driverFields).filter((key) => EDITABLE_DRIVER_FIELDS.includes(key));
  if (updates.length === 0 && profile_photo === undefined) {
    return res.status(400).json({ error: 'No editable fields provided' });
  }

  try {
    let driver;
    if (updates.length > 0) {
      const setClause = updates.map((field, i) => `${field} = $${i + 1}`).join(', ');
      const values = updates.map((field) => driverFields[field] || null);
      const result = await pool.query(
        `UPDATE drivers SET ${setClause} WHERE id = $${updates.length + 1} RETURNING *`,
        [...values, driver_id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Driver not found' });
      }
      driver = result.rows[0];
    } else {
      const existing = await pool.query('SELECT * FROM drivers WHERE id = $1', [driver_id]);
      if (existing.rows.length === 0) {
        return res.status(404).json({ error: 'Driver not found' });
      }
      driver = existing.rows[0];
    }

    if (profile_photo !== undefined) {
      await pool.query('UPDATE users SET profile_photo = $1 WHERE id = $2', [profile_photo || null, driver.user_id]);
      driver = { ...driver, profile_photo };
    }

    res.json({ message: 'Driver profile updated', driver });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'This plate number is already registered to another driver' });
    }
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Block a driver
const blockDriver = async (req, res) => {
  const { driver_id } = req.params;
  try {
    const driverResult = await pool.query('SELECT user_id FROM drivers WHERE id = $1', [driver_id]);
    if (driverResult.rows.length === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }
    const { user_id } = driverResult.rows[0];

    // Reuses the same cleanup switchRole/logout use — this used to just set
    // is_online = FALSE inline, leaving any in_progress trip stuck forever
    // (the driver has no way to complete it once blocked) and the open
    // driver_sessions row never closed.
    await takeDriverOffline(user_id);

    await pool.query(`UPDATE drivers SET approval_status = 'blocked' WHERE id = $1`, [driver_id]);
    await pool.query(`UPDATE users SET status = 'blocked' WHERE id = $1`, [user_id]);
    res.json({ message: 'Driver blocked' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Get all trips
const getAllTrips = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, 
              pu.first_name as passenger_first_name, pu.last_name as passenger_last_name,
              du.first_name as driver_first_name, du.last_name as driver_last_name
       FROM trips t
       JOIN users pu ON t.passenger_id = pu.id
       LEFT JOIN drivers d ON t.driver_id = d.id
       LEFT JOIN users du ON d.user_id = du.id
       ORDER BY t.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Get revenue summary. Accepts optional ?from=&to= (ISO timestamps, exclusive
// upper bound) to scope the summary + daily breakdown to a period instead of
// all-time — used by the admin dashboard's day/week/month/year filter.
// Wallet summary is always global since it's a current-balance snapshot, not
// something that makes sense scoped to a past period.
const getRevenueSummary = async (req, res) => {
  const { from, to } = req.query;
  const hasRange = Boolean(from && to);
  const rangeParams = hasRange ? [from, to] : [];

  try {
    const totalResult = await pool.query(
      `SELECT
        COUNT(*) as total_trips,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN fare ELSE 0 END), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN commission ELSE 0 END), 0) as total_commission,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_trips,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_trips,
        COUNT(CASE WHEN status = 'no_driver_found' THEN 1 END) as no_driver_trips
       FROM trips
       ${hasRange ? 'WHERE created_at >= $1 AND created_at < $2' : ''}`,
      rangeParams
    );

    const dailyResult = await pool.query(
      `SELECT
        DATE(created_at) as date,
        COUNT(*) as trips,
        SUM(fare) as revenue,
        SUM(commission) as commission
       FROM trips
       WHERE status = 'completed'
       ${hasRange ? 'AND created_at >= $1 AND created_at < $2' : "AND created_at >= NOW() - INTERVAL '30 days'"}
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      rangeParams
    );

    const walletSummary = await pool.query(
      `SELECT
        SUM(total_commission_owed) as total_owed,
        SUM(total_paid) as total_paid,
        SUM(total_commission_owed - total_paid) as total_outstanding,
        COUNT(CASE WHEN is_locked = TRUE THEN 1 END) as locked_wallets
       FROM wallets`
    );

    res.json({
      summary: totalResult.rows[0],
      daily: dailyResult.rows,
      wallet_summary: walletSummary.rows[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Ride history + ratings + complaints for a single user, for the admin
// detail panel. Works for either role (a driver's own user_id, or a
// passenger's id) since the two need different joins — a driver's rides
// are found via trips.driver_id (through the drivers table), a passenger's
// via trips.passenger_id directly. Scoped to what's actually relevant for
// admin decisions (ride activity, ratings received, complaints filed
// against them) rather than dumping the full user record.
const getUserRideHistory = async (req, res) => {
  const { user_id } = req.params;

  try {
    const userResult = await pool.query('SELECT role FROM users WHERE id = $1', [user_id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const { role } = userResult.rows[0];

    let trips;
    if (role === 'driver') {
      const driverResult = await pool.query('SELECT id FROM drivers WHERE user_id = $1', [user_id]);
      const driver_id = driverResult.rows[0]?.id;
      trips = driver_id
        ? await pool.query(
            `SELECT t.id, t.created_at, t.completed_at, t.status, t.fare, t.commission,
                    t.pickup_address, t.dropoff_address,
                    t.passenger_rating as rating_received, t.passenger_comment as feedback_received,
                    pu.first_name as other_party_first_name, pu.last_name as other_party_last_name
             FROM trips t
             JOIN users pu ON t.passenger_id = pu.id
             WHERE t.driver_id = $1
             ORDER BY t.created_at DESC
             LIMIT 100`,
            [driver_id]
          )
        : { rows: [] };
    } else {
      trips = await pool.query(
        `SELECT t.id, t.created_at, t.completed_at, t.status, t.fare,
                t.pickup_address, t.dropoff_address,
                t.driver_rating as rating_received, t.driver_comment as feedback_received,
                du.first_name as other_party_first_name, du.last_name as other_party_last_name
         FROM trips t
         LEFT JOIN drivers d ON t.driver_id = d.id
         LEFT JOIN users du ON d.user_id = du.id
         WHERE t.passenger_id = $1
         ORDER BY t.created_at DESC
         LIMIT 100`,
        [user_id]
      );
    }

    // Complaints filed against this person (either role), with trip context
    // when the report is tied to a specific ride.
    const reports = await pool.query(
      `SELECT r.id, r.type, r.description, r.status, r.created_at,
              ru.first_name as reporter_first_name, ru.last_name as reporter_last_name,
              t.pickup_address, t.dropoff_address, t.created_at as trip_date
       FROM reports r
       JOIN users ru ON r.reporter_id = ru.id
       LEFT JOIN trips t ON r.trip_id = t.id
       WHERE r.reported_id = $1
       ORDER BY r.created_at DESC`,
      [user_id]
    );

    const completedRatings = trips.rows.filter(t => t.rating_received != null);
    const avgRating = completedRatings.length > 0
      ? (completedRatings.reduce((sum, t) => sum + t.rating_received, 0) / completedRatings.length).toFixed(1)
      : null;

    res.json({
      role,
      trips: trips.rows,
      reports: reports.rows,
      total_trips: trips.rows.length,
      completed_trips: trips.rows.filter(t => t.status === 'completed').length,
      average_rating: avgRating,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get all users. LEFT JOINs drivers so the admin UI can tell apart a
// plain passenger from a dual-role account currently browsing as a
// passenger — role alone only reflects the CURRENT active mode, not
// whether the account also has an approved driver profile.
const getAllUsers = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.phone_number, u.email, u.first_name, u.last_name,
              u.role, u.status, u.created_at, d.approval_status as driver_status
       FROM users u
       LEFT JOIN drivers d ON d.user_id = u.id
       ORDER BY u.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Block a user
const blockUser = async (req, res) => {
  const { user_id } = req.params;
  // The admin UI sends { action: 'block' | 'unblock' } — this previously
  // always set status to 'blocked' regardless, so "Unblock" silently
  // re-blocked the user instead of restoring them.
  const status = req.body.action === 'unblock' ? 'active' : 'blocked';
  try {
    if (status === 'blocked') {
      // This is the Users page, not the Drivers page — a dual-role account
      // currently browsing as a passenger can still have an approved,
      // possibly-online driver profile attached. Without this, blocking
      // them here left that driver profile untouched: still eligible for
      // ride dispatch and still showing online, on an account that's
      // supposed to be blocked from using the app at all.
      await takeDriverOffline(user_id);
    }
    await pool.query(
      `UPDATE users SET status = $1 WHERE id = $2`,
      [status, user_id]
    );
    res.json({ message: status === 'blocked' ? 'User blocked' : 'User unblocked' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Update config
const updateConfig = async (req, res) => {
  const { key, value } = req.body;

  if (!key || !value) {
    return res.status(400).json({ error: 'Key and value required' });
  }

  try {
    const result = await pool.query(
      `UPDATE config SET value = $1 WHERE key = $2 RETURNING *`,
      [value, key]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Config key not found' });
    }

    res.json({ message: 'Config updated', config: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Get all reports
const getAllReports = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.*, 
              ru.first_name as reporter_first_name, ru.last_name as reporter_last_name,
              rd.first_name as reported_first_name, rd.last_name as reported_last_name
       FROM reports r
       LEFT JOIN users ru ON r.reporter_id = ru.id
       LEFT JOIN users rd ON r.reported_id = rd.id
       ORDER BY r.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Update report status
const updateReport = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: 'Status required' });
  try {
    const result = await pool.query(
      `UPDATE reports SET status = $1 WHERE id = $2 RETURNING *`,
      [status, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Report not found' });
    res.json({ message: 'Report updated', report: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Get all config
const getAllConfig = async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM config ORDER BY key ASC`);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Analytics data for planning
const getAnalytics = async (req, res) => {
  try {
    // Average times
    const timings = await pool.query(`
      SELECT
        AVG(EXTRACT(EPOCH FROM (matched_at - created_at))/60) as avg_matching_minutes,
        AVG(EXTRACT(EPOCH FROM (started_at - accepted_at))/60) as avg_wait_minutes,
        AVG(EXTRACT(EPOCH FROM (completed_at - started_at))/60) as avg_transit_minutes,
        AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/60) as avg_total_minutes,
        AVG(distance_km) as avg_distance_km,
        AVG(fare) as avg_fare
      FROM trips
      WHERE status = 'completed'
      AND matched_at IS NOT NULL
      AND started_at IS NOT NULL
    `);

    // Peak hours
    const peakHours = await pool.query(`
      SELECT
        EXTRACT(HOUR FROM created_at) as hour,
        COUNT(*) as trip_count,
        AVG(fare) as avg_fare
      FROM trips
      WHERE status = 'completed'
      GROUP BY EXTRACT(HOUR FROM created_at)
      ORDER BY hour ASC
    `);

    // Peak days of week
    const peakDays = await pool.query(`
      SELECT
        TO_CHAR(created_at, 'Day') as day_name,
        EXTRACT(DOW FROM created_at) as day_number,
        COUNT(*) as trip_count
      FROM trips
      WHERE status = 'completed'
      GROUP BY day_name, day_number
      ORDER BY day_number ASC
    `);

    // Top pickup locations
    const pickupHeatmap = await pool.query(`
      SELECT
        ROUND(pickup_lat::numeric, 3) as lat,
        ROUND(pickup_lng::numeric, 3) as lng,
        COUNT(*) as count,
        AVG(fare) as avg_fare
      FROM trips
      WHERE status IN ('completed', 'cancelled', 'no_driver_found')
      AND pickup_lat IS NOT NULL
      GROUP BY ROUND(pickup_lat::numeric, 3), ROUND(pickup_lng::numeric, 3)
      ORDER BY count DESC
      LIMIT 50
    `);

    // Top dropoff locations
    const dropoffHeatmap = await pool.query(`
      SELECT
        ROUND(dropoff_lat::numeric, 3) as lat,
        ROUND(dropoff_lng::numeric, 3) as lng,
        COUNT(*) as count
      FROM trips
      WHERE status = 'completed'
      AND dropoff_lat IS NOT NULL
      GROUP BY ROUND(dropoff_lat::numeric, 3), ROUND(dropoff_lng::numeric, 3)
      ORDER BY count DESC
      LIMIT 50
    `);

    // Cancellation analysis
    const cancellations = await pool.query(`
      SELECT
        cancelled_by,
        COUNT(*) as count,
        AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/60) as avg_minutes_before_cancel
      FROM trips
      WHERE status = 'cancelled'
      GROUP BY cancelled_by
    `);

    // No driver found by hour
    const noDriverByHour = await pool.query(`
      SELECT
        EXTRACT(HOUR FROM created_at) as hour,
        COUNT(*) as count
      FROM trips
      WHERE status = 'no_driver_found'
      GROUP BY EXTRACT(HOUR FROM created_at)
      ORDER BY hour ASC
    `);
    

    // Distance distribution
    const distanceBuckets = await pool.query(`
      SELECT
        CASE
          WHEN distance_km < 0.7 THEN 'Under 0.7km'
          WHEN distance_km < 4 THEN '0.7km - 4km'
          ELSE 'Over 4km'
        END as bucket,
        COUNT(*) as count,
        AVG(fare) as avg_fare
      FROM trips
      WHERE status = 'completed'
      AND distance_km IS NOT NULL
      GROUP BY bucket
      ORDER BY bucket ASC
    `);

    res.json({
      timings: timings.rows[0],
      peak_hours: peakHours.rows,
      peak_days: peakDays.rows,
      pickup_heatmap: pickupHeatmap.rows,
      dropoff_heatmap: dropoffHeatmap.rows,
      cancellations: cancellations.rows,
      no_driver_by_hour: noDriverByHour.rows,
      distance_buckets: distanceBuckets.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

const getReverseGeocode = async (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) {
    return res.status(400).json({ error: 'lat and lng required' });
  }

  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    console.log('Geocode status:', data.status, data.error_message || '');

    if (data.status === 'OK' && data.results.length > 0) {
      // Prefer a named point of interest over a raw street address if one exists
      const poiResult = data.results.find(r => r.types.includes('point_of_interest') || r.types.includes('establishment'));
      const best = poiResult || data.results[0];
      res.json({ name: best.formatted_address });
    } else {
      res.json({ name: `${parseFloat(lat).toFixed(4)}, ${parseFloat(lng).toFixed(4)}` });
    }
  } catch (err) {
    console.error('Reverse geocode error:', err);
    res.json({ name: `${parseFloat(lat).toFixed(4)}, ${parseFloat(lng).toFixed(4)}` });
  }
};

// Get admin payment ledger
const getAdminLedger = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT l.*, u.first_name, u.last_name, u.phone_number
       FROM ledger l
       JOIN drivers d ON l.driver_id = d.id
       JOIN users u ON d.user_id = u.id
       WHERE l.type = 'payment'
       ORDER BY l.created_at DESC
       LIMIT 100`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Today's snapshot for the admin dashboard: ride requests by status, revenue
// generated, and which drivers went online today with how many rides they
// completed. All queries are scoped to the server's local calendar day via
// CURRENT_DATE, matching what an admin means by "today" at a glance.
const getTodayStats = async (req, res) => {
  const RIDE_STATUSES = ['requested', 'offered', 'accepted', 'arrived', 'in_progress', 'completed', 'cancelled', 'no_driver_found'];

  try {
    const ridesResult = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM trips
      WHERE created_at >= CURRENT_DATE AND created_at < CURRENT_DATE + INTERVAL '1 day'
      GROUP BY status
    `);

    const rides = {};
    for (const s of RIDE_STATUSES) rides[s] = 0;
    let totalRequests = 0;
    for (const row of ridesResult.rows) {
      rides[row.status] = parseInt(row.count);
      totalRequests += parseInt(row.count);
    }

    const revenueResult = await pool.query(`
      SELECT COALESCE(SUM(fare), 0) as revenue, COALESCE(SUM(commission), 0) as commission
      FROM trips
      WHERE status = 'completed'
      AND completed_at >= CURRENT_DATE AND completed_at < CURRENT_DATE + INTERVAL '1 day'
    `);

    // Drivers who had at least one online session today, and how many rides
    // each completed today. DISTINCT driver_id first, then join to trips
    // separately — joining trips directly against driver_sessions would fan
    // out and double-count rides for any driver with more than one session.
    const driverActivityResult = await pool.query(`
      WITH online_today AS (
        SELECT DISTINCT driver_id FROM driver_sessions
        WHERE went_online_at >= CURRENT_DATE AND went_online_at < CURRENT_DATE + INTERVAL '1 day'
      )
      SELECT
        ot.driver_id,
        u.first_name, u.last_name, u.phone_number,
        COUNT(t.id) FILTER (
          WHERE t.status = 'completed'
          AND t.completed_at >= CURRENT_DATE AND t.completed_at < CURRENT_DATE + INTERVAL '1 day'
        ) as rides_completed_today
      FROM online_today ot
      JOIN drivers d ON d.id = ot.driver_id
      JOIN users u ON u.id = d.user_id
      LEFT JOIN trips t ON t.driver_id = ot.driver_id
      GROUP BY ot.driver_id, u.first_name, u.last_name, u.phone_number
      ORDER BY rides_completed_today DESC
    `);

    res.json({
      date: new Date().toISOString().slice(0, 10),
      rides,
      total_requests: totalRequests,
      revenue: parseFloat(revenueResult.rows[0].revenue),
      commission: parseFloat(revenueResult.rows[0].commission),
      drivers_online_today: driverActivityResult.rows.length,
      driver_activity: driverActivityResult.rows.map(r => ({
        driver_id: r.driver_id,
        first_name: r.first_name,
        last_name: r.last_name,
        phone_number: r.phone_number,
        rides_completed_today: parseInt(r.rides_completed_today),
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

const getDriverActivity = async (req, res) => {
  try {
    const totalDrivers = await pool.query(
      `SELECT COUNT(*) FROM drivers WHERE approval_status = 'approved'`
    );

    const weeklyLogins = await pool.query(
      `SELECT driver_id, COUNT(*) as login_count
       FROM driver_sessions
       WHERE went_online_at >= NOW() - INTERVAL '7 days'
       GROUP BY driver_id`
    );

    const driversWithLoginsThisWeek = weeklyLogins.rows.length;
    const total = parseInt(totalDrivers.rows[0].count);

    res.json({
      total_drivers: total,
      drivers_active_this_week: driversWithLoginsThisWeek,
      weekly_login_rate: total > 0 ? (driversWithLoginsThisWeek / total * 100).toFixed(1) : 0,
      per_driver_logins: weeklyLogins.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};


module.exports = {
  getAllDrivers, approveDriver, blockDriver, updateDriverProfile,
  getAllTrips, getRevenueSummary,
  getAllUsers, blockUser, updateConfig,
  getAllReports, updateReport, getAllConfig,
  getAnalytics, getAdminLedger, getDriverActivity, getReverseGeocode,
  getTodayStats, getUserRideHistory
};