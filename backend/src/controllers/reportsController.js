const pool = require('../db/pool');

// Submit a report
const submitReport = async (req, res) => {
  const reporter_id = req.user.id;
  const { reported_id, trip_id, type, description } = req.body;

  if (!reported_id || !description) {
    return res.status(400).json({ error: 'Reported user and description required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO reports (reporter_id, reported_id, trip_id, type, description)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [reporter_id, reported_id, trip_id, type || 'behaviour', description]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get all reports (admin)
const getAllReports = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.*,
        ru.first_name as reporter_first_name, ru.last_name as reporter_last_name,
        ru.role as reporter_role,
        rd.first_name as reported_first_name, rd.last_name as reported_last_name,
        rd.role as reported_role,
        t.pickup_address, t.dropoff_address
       FROM reports r
       JOIN users ru ON r.reporter_id = ru.id
       JOIN users rd ON r.reported_id = rd.id
       LEFT JOIN trips t ON r.trip_id = t.id
       ORDER BY r.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Mark report as reviewed (admin)
const reviewReport = async (req, res) => {
  const { report_id } = req.params;
  try {
    const result = await pool.query(
      `UPDATE reports SET status = 'reviewed' WHERE id = $1 RETURNING *`,
      [report_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Search users and drivers (admin)
const searchUsers = async (req, res) => {
  const { query } = req.query;

  if (!query) {
    return res.status(400).json({ error: 'Search query required' });
  }

  try {
    const usersResult = await pool.query(
      `SELECT 
        u.*,
        COUNT(DISTINCT r.id) as report_count,
        COUNT(DISTINCT t.id) as total_trips
       FROM users u
       LEFT JOIN reports r ON r.reported_id = u.id AND r.status = 'pending'
       LEFT JOIN trips t ON t.passenger_id = u.id
       WHERE 
        u.first_name ILIKE $1 OR 
        u.last_name ILIKE $1 OR
        CONCAT(u.first_name, ' ', u.last_name) ILIKE $1 OR
        u.phone_number ILIKE $1
       GROUP BY u.id
       ORDER BY report_count DESC`,
      [`%${query}%`]
    );

    // For each user get ride history
    const users = await Promise.all(usersResult.rows.map(async (user) => {
      const ridesResult = await pool.query(
        `SELECT t.*, 
          du.first_name as driver_first_name, du.last_name as driver_last_name
         FROM trips t
         LEFT JOIN drivers d ON t.driver_id = d.id
         LEFT JOIN users du ON d.user_id = du.id
         WHERE t.passenger_id = $1
         ORDER BY t.created_at DESC
         LIMIT 10`,
        [user.id]
      );

      const reportsResult = await pool.query(
        `SELECT r.*, 
          ru.first_name as reporter_first_name, ru.last_name as reporter_last_name
         FROM reports r
         JOIN users ru ON r.reporter_id = ru.id
         WHERE r.reported_id = $1
         ORDER BY r.created_at DESC`,
        [user.id]
      );

      return {
        ...user,
        is_flagged: parseInt(user.report_count) > 0,
        ride_history: ridesResult.rows,
        reports: reportsResult.rows,
      };
    }));

    // Search drivers too
    const driversResult = await pool.query(
      `SELECT 
        d.*, u.first_name, u.last_name, u.phone_number, u.email, u.status,
        w.total_commission_owed, w.total_paid, w.is_locked,
        (w.total_commission_owed - w.total_paid) as outstanding_balance,
        COUNT(DISTINCT r.id) as report_count,
        COUNT(DISTINCT t.id) as total_trips
       FROM drivers d
       JOIN users u ON d.user_id = u.id
       LEFT JOIN wallets w ON w.driver_id = d.id
       LEFT JOIN reports r ON r.reported_id = u.id AND r.status = 'pending'
       LEFT JOIN trips t ON t.driver_id = d.id
       WHERE 
        u.first_name ILIKE $1 OR 
        u.last_name ILIKE $1 OR
        CONCAT(u.first_name, ' ', u.last_name) ILIKE $1 OR
        u.phone_number ILIKE $1
       GROUP BY d.id, u.id, w.id
       ORDER BY report_count DESC`,
      [`%${query}%`]
    );

    const drivers = await Promise.all(driversResult.rows.map(async (driver) => {
      const ridesResult = await pool.query(
        `SELECT t.*,
          pu.first_name as passenger_first_name, pu.last_name as passenger_last_name
         FROM trips t
         JOIN users pu ON t.passenger_id = pu.id
         WHERE t.driver_id = $1
         ORDER BY t.created_at DESC
         LIMIT 10`,
        [driver.id]
      );

      const reportsResult = await pool.query(
        `SELECT r.*,
          ru.first_name as reporter_first_name, ru.last_name as reporter_last_name
         FROM reports r
         JOIN users ru ON r.reporter_id = ru.id
         WHERE r.reported_id = $1
         ORDER BY r.created_at DESC`,
        [driver.user_id]
      );

      return {
        ...driver,
        is_flagged: parseInt(driver.report_count) > 0,
        ride_history: ridesResult.rows,
        reports: reportsResult.rows,
      };
    }));

    res.json({ users, drivers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { submitReport, getAllReports, reviewReport, searchUsers };