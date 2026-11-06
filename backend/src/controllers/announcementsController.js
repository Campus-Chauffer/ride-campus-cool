const pool = require('../db/pool');
const { sendBulkPushNotifications } = require('../utils/notifications');

const VALID_AUDIENCES = ['all', 'passenger', 'driver'];

// Admin: create an announcement and push it to the target audience — or,
// when target_user_id is set, to that one user only (e.g. a personal
// loyalty discount), overriding audience entirely.
const createAnnouncement = async (req, res) => {
  const { title, body, audience = 'all', target_user_id } = req.body;

  if (!title || !body) {
    return res.status(400).json({ error: 'Title and body are required' });
  }
  if (!target_user_id && !VALID_AUDIENCES.includes(audience)) {
    return res.status(400).json({ error: 'Invalid audience' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO announcements (title, body, audience, target_user_id, created_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [title, body, audience, target_user_id || null, req.user.id]
    );
    const announcement = result.rows[0];

    const tokensResult = target_user_id
      ? await pool.query('SELECT push_token FROM users WHERE id = $1 AND push_token IS NOT NULL', [target_user_id])
      : await pool.query(
          audience === 'all'
            ? `SELECT push_token FROM users WHERE role IN ('passenger', 'driver') AND push_token IS NOT NULL`
            : `SELECT push_token FROM users WHERE role = $1 AND push_token IS NOT NULL`,
          audience === 'all' ? [] : [audience]
        );

    const { sent } = await sendBulkPushNotifications(
      tokensResult.rows.map((r) => r.push_token),
      title,
      body,
      { type: 'announcement', announcement_id: announcement.id }
    );

    res.json({ announcement, recipients: tokensResult.rows.length, sent });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Admin: list past announcements
const getAnnouncementsAdmin = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*, u.first_name, u.last_name,
              t.first_name as target_first_name, t.last_name as target_last_name
       FROM announcements a
       LEFT JOIN users u ON u.id = a.created_by
       LEFT JOIN users t ON t.id = a.target_user_id
       ORDER BY a.created_at DESC LIMIT 100`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Passenger/driver: fetch announcements relevant to them
const getMyAnnouncements = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, title, body, audience, created_at FROM announcements
       WHERE target_user_id = $2 OR (target_user_id IS NULL AND (audience = 'all' OR audience = $1))
       ORDER BY created_at DESC LIMIT 50`,
      [req.user.role, req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { createAnnouncement, getAnnouncementsAdmin, getMyAnnouncements };
