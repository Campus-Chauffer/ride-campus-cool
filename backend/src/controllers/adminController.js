const pool = require('../db/pool');

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

// Block a driver
const blockDriver = async (req, res) => {
  const { driver_id } = req.params;
  try {
    await pool.query(
      `UPDATE drivers SET approval_status = 'blocked', is_online = FALSE WHERE id = $1`,
      [driver_id]
    );
    await pool.query(
      `UPDATE users SET status = 'blocked' WHERE id = (SELECT user_id FROM drivers WHERE id = $1)`,
      [driver_id]
    );
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

// Get revenue summary
const getRevenueSummary = async (req, res) => {
  try {
    const totalResult = await pool.query(
      `SELECT 
        COUNT(*) as total_trips,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN fare ELSE 0 END), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN commission ELSE 0 END), 0) as total_commission,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_trips,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_trips,
        COUNT(CASE WHEN status = 'no_driver_found' THEN 1 END) as no_driver_trips
       FROM trips`
    );

    const dailyResult = await pool.query(
      `SELECT 
        DATE(created_at) as date,
        COUNT(*) as trips,
        SUM(fare) as revenue,
        SUM(commission) as commission
       FROM trips
       WHERE status = 'completed'
       AND created_at >= NOW() - INTERVAL '30 days'
       GROUP BY DATE(created_at)
       ORDER BY date DESC`
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

// Get all users
const getAllUsers = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, phone_number, email, first_name, last_name, role, status, created_at
       FROM users ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Block a user
const blockUser = async (req, res) => {
  const { user_id } = req.params;
  try {
    await pool.query(
      `UPDATE users SET status = 'blocked' WHERE id = $1`,
      [user_id]
    );
    res.json({ message: 'User blocked' });
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

module.exports = {
  getAllDrivers, approveDriver, blockDriver,
  getAllTrips, getRevenueSummary,
  getAllUsers, blockUser, updateConfig,
  getAllReports, updateReport, getAllConfig,
  getAnalytics, getAdminLedger
};