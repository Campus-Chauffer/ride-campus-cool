const pool = require('../db/pool');

// Mirrors the exact same live-count query recordReferralProgress (in
// utils/referrals.js) uses to decide when to issue a reward — a derived
// count rather than a stored counter, so it can never drift from reality,
// and the same source of truth the backend used to decide the last reward.
const getReferralProgress = async (req, res) => {
  try {
    const configResult = await pool.query(
      `SELECT value FROM config WHERE key = 'referral_reward_threshold'`
    );
    const threshold = parseInt(configResult.rows[0]?.value, 10) || 5;

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM users ru
       WHERE ru.referred_by = $1
       AND EXISTS (SELECT 1 FROM trips t WHERE t.passenger_id = ru.id AND t.status = 'completed')`,
      [req.user.id]
    );
    const referralCount = parseInt(countResult.rows[0].count, 10);

    const pendingResult = await pool.query(
      `SELECT 1 FROM discount_codes
       WHERE target_user_id = $1 AND type = 'free_ride' AND uses_count = 0 AND active = TRUE`,
      [req.user.id]
    );

    res.json({
      threshold,
      cycle_progress: referralCount % threshold,
      has_unredeemed_reward: pendingResult.rows.length > 0,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { getReferralProgress };
