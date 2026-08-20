const cron = require('node-cron');
const pool = require('../db/pool');
const { sendPushNotification } = require('./notifications');

// Lock all drivers at 4AM daily
const scheduleDailyLockout = () => {
  cron.schedule('0 4 * * *', async () => {
    console.log('Running 4AM daily lockout...');
    try {
      // Get all drivers with outstanding commission
      const driversResult = await pool.query(
        `SELECT d.id, u.push_token, u.first_name,
          (w.total_commission_owed - w.total_paid) as outstanding
         FROM drivers d
         JOIN users u ON d.user_id = u.id
         JOIN wallets w ON w.driver_id = d.id
         WHERE (w.total_commission_owed - w.total_paid) > 0`
      );

      for (const driver of driversResult.rows) {
        // Lock wallet
        await pool.query(
          `UPDATE wallets SET is_locked = TRUE WHERE driver_id = $1`,
          [driver.id]
        );

        // Force offline
        await pool.query(
          `UPDATE drivers SET is_online = FALSE WHERE id = $1`,
          [driver.id]
        );

        // Send push notification
        await sendPushNotification(
          driver.push_token,
          '🔒 Account Locked',
          `You have GH₵${parseFloat(driver.outstanding).toFixed(2)} in outstanding commission. Pay now to unlock your account.`,
          { type: 'lockout' }
        );

        console.log(`Driver ${driver.id} locked. Outstanding: GH₵${driver.outstanding}`);
      }

      console.log(`4AM lockout complete. ${driversResult.rows.length} drivers locked.`);
    } catch (err) {
      console.error('Lockout error:', err);
    }
  });
};

// Send warning notification at 11PM daily
const scheduleNightWarning = () => {
  cron.schedule('0 23 * * *', async () => {
    console.log('Running 11PM commission warning...');
    try {
      const driversResult = await pool.query(
        `SELECT d.id, u.push_token, u.first_name,
          (w.total_commission_owed - w.total_paid) as outstanding
         FROM drivers d
         JOIN users u ON d.user_id = u.id
         JOIN wallets w ON w.driver_id = d.id
         WHERE (w.total_commission_owed - w.total_paid) > 0
         AND w.is_locked = FALSE`
      );

      for (const driver of driversResult.rows) {
        await sendPushNotification(
          driver.push_token,
          '⚠️ Commission Reminder',
          `Hi ${driver.first_name}, you have GH₵${parseFloat(driver.outstanding).toFixed(2)} in outstanding commission. Pay before 4AM to avoid being locked out.`,
          { type: 'warning' }
        );

        console.log(`Warning sent to driver ${driver.id}. Outstanding: GH₵${driver.outstanding}`);
      }

      console.log(`11PM warnings sent to ${driversResult.rows.length} drivers.`);
    } catch (err) {
      console.error('Warning error:', err);
    }
  });
};

// Finalizes account deletions once their 30-day anonymization window has
// passed. Personal info on the users row is already scrubbed the moment
// deletion is requested (authController.requestAccountDeletion) — this only
// deals with what's still identifiable/sensitive at that point: a driver's
// verification documents, kept intact for 30 days specifically so an
// in-flight scam/fraud report against the account still has evidence to
// investigate, then purged once that window closes.
const schedulePurgeDeletedAccounts = () => {
  cron.schedule('0 3 * * *', async () => {
    console.log('Running account deletion purge...');
    try {
      const dueResult = await pool.query(
        `SELECT id FROM users
         WHERE status = 'pending_deletion'
         AND deletion_requested_at <= NOW() - INTERVAL '30 days'`
      );

      for (const user of dueResult.rows) {
        await pool.query(
          `UPDATE drivers SET
            ghana_card_number = NULL, ghana_card_image = NULL,
            license_number = NULL, license_image = NULL,
            vehicle_front_image = NULL, vehicle_side_image = NULL,
            vehicle_back_image = NULL
           WHERE user_id = $1`,
          [user.id]
        );
        await pool.query(`UPDATE users SET status = 'deleted' WHERE id = $1`, [user.id]);
      }

      console.log(`Deletion purge complete. ${dueResult.rows.length} account(s) finalized.`);
    } catch (err) {
      console.error('Deletion purge error:', err);
    }
  });
};

module.exports = { scheduleDailyLockout, scheduleNightWarning, schedulePurgeDeletedAccounts };