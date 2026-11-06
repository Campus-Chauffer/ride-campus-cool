const pool = require('../db/pool');

const VALID_TYPES = ['percent', 'flat'];
const VALID_TIME_CONDITIONS = ['day', 'night'];

// Admin: create a code
const createDiscountCode = async (req, res) => {
  const {
    code, type, value, scope = 'general', target_user_id,
    max_uses, min_fare_condition, time_condition,
    expires_at, auto_apply = false, visible = true, description,
  } = req.body;

  if (!code || !type || value == null) {
    return res.status(400).json({ error: 'code, type, and value are required' });
  }
  if (!VALID_TYPES.includes(type)) {
    return res.status(400).json({ error: "type must be 'percent' or 'flat'" });
  }
  if (type === 'percent' && (value <= 0 || value > 100)) {
    return res.status(400).json({ error: 'A percentage discount must be between 1 and 100' });
  }
  if (scope === 'user_specific' && !target_user_id) {
    return res.status(400).json({ error: 'A user-specific code needs a target user' });
  }
  if (time_condition && !VALID_TIME_CONDITIONS.includes(time_condition)) {
    return res.status(400).json({ error: "time_condition must be 'day' or 'night'" });
  }

  // A stock-limited code means N different people, never one person
  // claiming several slots — this isn't admin-configurable, same rule
  // enforced here as in the redemption check itself.
  const maxUsesPerUser = max_uses != null ? 1 : (req.body.max_uses_per_user || 1);

  try {
    const result = await pool.query(
      `INSERT INTO discount_codes
        (code, type, value, scope, target_user_id, max_uses, max_uses_per_user,
         min_fare_condition, time_condition, expires_at, auto_apply, visible, description, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [code.toUpperCase(), type, value, scope, scope === 'user_specific' ? target_user_id : null,
       max_uses || null, maxUsesPerUser, min_fare_condition || null, time_condition || null,
       expires_at || null, auto_apply, visible, description || null, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') { // unique_violation on code
      return res.status(409).json({ error: 'A code with that name already exists' });
    }
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Admin: list all codes with redemption stats
const getAllDiscountCodes = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT dc.*, u.first_name as target_first_name, u.last_name as target_last_name,
              COALESCE(SUM(dr.amount_discounted), 0) as total_discounted
       FROM discount_codes dc
       LEFT JOIN users u ON u.id = dc.target_user_id
       LEFT JOIN discount_redemptions dr ON dr.discount_code_id = dc.id
       GROUP BY dc.id, u.first_name, u.last_name
       ORDER BY dc.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Admin: deactivate/reactivate or edit a code
const updateDiscountCode = async (req, res) => {
  const { id } = req.params;
  const fields = ['active', 'expires_at', 'description', 'visible', 'auto_apply'];
  const sets = [];
  const values = [];
  fields.forEach((f) => {
    if (req.body[f] !== undefined) {
      sets.push(`${f} = $${sets.length + 1}`);
      values.push(req.body[f]);
    }
  });
  if (sets.length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }
  values.push(id);
  try {
    const result = await pool.query(
      `UPDATE discount_codes SET ${sets.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Code not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Passenger: codes available to them right now, plus ones they've used up
// or that expired, so the Discounts tab can show both sections. Not tied
// to a specific ride (no fare/time known yet) — min_fare/time conditions
// are surfaced as plain-language notes here, and re-checked for real
// against the actual ride at request time.
const getAvailableDiscounts = async (req, res) => {
  const passenger_id = req.user.id;
  try {
    const result = await pool.query(
      `SELECT dc.* FROM discount_codes dc
       WHERE (dc.scope = 'general' AND dc.visible = TRUE)
          OR (dc.scope = 'user_specific' AND dc.target_user_id = $1)
       ORDER BY dc.created_at DESC`,
      [passenger_id]
    );

    const redemptionsResult = await pool.query(
      `SELECT discount_code_id, COUNT(*) as count FROM discount_redemptions
       WHERE user_id = $1 GROUP BY discount_code_id`,
      [passenger_id]
    );
    const usedCounts = {};
    redemptionsResult.rows.forEach((r) => { usedCounts[r.discount_code_id] = parseInt(r.count, 10); });

    const active = [];
    const unavailable = [];
    const now = new Date();

    result.rows.forEach((code) => {
      const myUses = usedCounts[code.id] || 0;
      const soldOut = code.max_uses != null && code.uses_count >= code.max_uses;
      const expired = code.expires_at && new Date(code.expires_at) <= now;
      const usedUp = myUses >= code.max_uses_per_user;

      if (!code.active || soldOut || expired || usedUp) {
        unavailable.push({ ...code, reason: !code.active ? 'deactivated' : soldOut ? 'sold_out' : expired ? 'expired' : 'used' });
      } else {
        active.push(code);
      }
    });

    res.json({ active, unavailable });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Admin: every actual redemption, with the rider, the code, and what the
// ride cost before/after the discount — the full "who got what discount"
// picture, not just code-level stats.
const getDiscountRedemptions = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT dr.*, dc.code,
              u.first_name, u.last_name, u.phone_number,
              t.original_fare, t.fare as discounted_fare,
              t.pickup_address, t.dropoff_address, t.created_at as trip_date
       FROM discount_redemptions dr
       JOIN discount_codes dc ON dc.id = dr.discount_code_id
       JOIN users u ON u.id = dr.user_id
       JOIN trips t ON t.id = dr.trip_id
       ORDER BY dr.created_at DESC
       LIMIT 200`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { createDiscountCode, getAllDiscountCodes, updateDiscountCode, getAvailableDiscounts, getDiscountRedemptions };
