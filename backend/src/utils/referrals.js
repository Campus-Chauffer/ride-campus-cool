const pool = require('../db/pool');
const { sendPushNotification } = require('./notifications');

// Visually-ambiguous characters left out on purpose (0/O, 1/I/L) — these
// codes get read aloud and typed by hand, unlike discount codes which are
// usually copy-pasted from a promo.
const CODE_CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function randomCode(length) {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += CODE_CHARSET[Math.floor(Math.random() * CODE_CHARSET.length)];
  }
  return code;
}

// Generic unique-code generator — retries on the rare collision rather than
// assuming one away. Used both for a new user's own referral_code and for
// the code string on an auto-issued discount_codes row (welcome discount,
// free-ride reward), so there's one place this collision-retry logic lives.
async function generateUniqueCode(client, table, column, length, maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    const code = randomCode(length);
    const existing = await client.query(
      `SELECT 1 FROM ${table} WHERE ${column} = $1`,
      [code]
    );
    if (existing.rows.length === 0) return code;
  }
  throw new Error(`Could not generate a unique code for ${table}.${column} after ${maxAttempts} attempts`);
}

// Called once at registration if the new signup entered a valid referral
// code. Issues them a one-time, auto-applying flat discount on their own
// first ride — separate from (and much smaller than) the referrer's
// eventual free-ride reward, just enough to make entering the code worth
// the extra tap.
async function issueWelcomeDiscount(client, newUserId) {
  const configResult = await client.query(
    `SELECT value FROM config WHERE key = 'referral_welcome_discount'`
  );
  const value = parseFloat(configResult.rows[0]?.value) || 3;
  const code = await generateUniqueCode(client, 'discount_codes', 'code', 8);

  await client.query(
    `INSERT INTO discount_codes
      (code, type, value, scope, target_user_id, max_uses, max_uses_per_user, auto_apply, visible, description, expires_at)
     VALUES ($1, 'flat', $2, 'user_specific', $3, 1, 1, TRUE, FALSE, 'Referral welcome discount', NOW() + INTERVAL '7 days')`,
    [code, value, newUserId]
  );
}

// Called after a trip completes (driversController.js's completeTrip).
// Checks whether this was the referred passenger's first completed ride,
// and if so, whether the referrer has now banked enough qualifying
// referrals to earn another free ride — issuing at most one unredeemed
// free_ride code at a time no matter how far ahead their running total
// gets (the "no stacking" rule), using the live count below as the single
// source of truth rather than a counter that could drift.
async function recordReferralProgress(passengerId) {
  const client = await pool.connect();
  try {
    const passengerResult = await client.query(
      'SELECT referred_by FROM users WHERE id = $1',
      [passengerId]
    );
    const referredBy = passengerResult.rows[0]?.referred_by;
    if (!referredBy) return;

    const completedCountResult = await client.query(
      `SELECT COUNT(*) FROM trips WHERE passenger_id = $1 AND status = 'completed'`,
      [passengerId]
    );
    if (parseInt(completedCountResult.rows[0].count, 10) !== 1) return; // not their first completed ride

    await client.query('BEGIN');
    // Lock the referrer's own row so two referred passengers completing
    // their first ride at the same instant can't both see "no reward
    // issued yet" and both issue one.
    await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [referredBy]);

    const configResult = await client.query(
      `SELECT value FROM config WHERE key = 'referral_reward_threshold'`
    );
    const threshold = parseInt(configResult.rows[0]?.value, 10) || 5;

    const referralCountResult = await client.query(
      `SELECT COUNT(*) FROM users ru
       WHERE ru.referred_by = $1
       AND EXISTS (SELECT 1 FROM trips t WHERE t.passenger_id = ru.id AND t.status = 'completed')`,
      [referredBy]
    );
    const referralCount = parseInt(referralCountResult.rows[0].count, 10);

    const issuedCountResult = await client.query(
      `SELECT COUNT(*) FROM discount_codes WHERE target_user_id = $1 AND type = 'free_ride'`,
      [referredBy]
    );
    const alreadyIssued = parseInt(issuedCountResult.rows[0].count, 10);

    const eligibleRewards = Math.floor(referralCount / threshold);

    if (eligibleRewards > alreadyIssued) {
      const pendingResult = await client.query(
        `SELECT 1 FROM discount_codes WHERE target_user_id = $1 AND type = 'free_ride' AND uses_count = 0 AND active = TRUE`,
        [referredBy]
      );
      if (pendingResult.rows.length === 0) {
        const code = await generateUniqueCode(client, 'discount_codes', 'code', 8);
        await client.query(
          `INSERT INTO discount_codes
            (code, type, value, scope, target_user_id, max_uses, max_uses_per_user, auto_apply, visible, description, expires_at)
           VALUES ($1, 'free_ride', 0, 'user_specific', $2, 1, 1, TRUE, TRUE, 'Referral reward: free ride', NOW() + INTERVAL '7 days')`,
          [code, referredBy]
        );

        const referrerResult = await client.query('SELECT push_token FROM users WHERE id = $1', [referredBy]);
        sendPushNotification(
          referrerResult.rows[0]?.push_token,
          "You've earned a free ride!",
          `${referralCount} friends you referred have taken their first ride. Your next ride is on us — valid for 7 days.`,
          { type: 'referral_reward_earned' }
        ).catch(() => {});
      }
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Referral progress error:', err);
  } finally {
    client.release();
  }
}

module.exports = { generateUniqueCode, issueWelcomeDiscount, recordReferralProgress };
