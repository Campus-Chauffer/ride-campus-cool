const pool = require('../db/pool');
const { sendPushNotification } = require('./notifications');

// Shared cap across BOTH the demand-triggered nudge (fires on a real
// no_driver_found) and the twice-daily backstop check — a bad day for
// demand shouldn't be able to stack reminders past this on one driver.
const MAX_DAILY_REMINDERS = 3;

// Approved drivers with a push token who haven't logged a single online
// session yet today, and are still under today's reminder cap. This is
// the one query both callers share, so "already nudged enough today" is
// never computed two different ways.
async function findDriversNeedingNudge() {
  const result = await pool.query(
    `SELECT d.id as driver_id, u.push_token
     FROM drivers d
     JOIN users u ON u.id = d.user_id
     WHERE d.approval_status = 'approved' AND u.push_token IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM driver_sessions ds
       WHERE ds.driver_id = d.id AND ds.went_online_at >= CURRENT_DATE
     )
     AND (
       SELECT COUNT(*) FROM driver_reminders dr
       WHERE dr.driver_id = d.id AND dr.sent_at >= CURRENT_DATE
     ) < $1`,
    [MAX_DAILY_REMINDERS]
  );
  return result.rows;
}

// Sends the nudge to every driver currently eligible, and records each one
// against today's cap. Returns how many were actually notified.
async function nudgeOfflineDrivers(reason, title, body) {
  const drivers = await findDriversNeedingNudge();
  for (const driver of drivers) {
    await sendPushNotification(driver.push_token, title, body, { type: 'demand_surge' });
    await pool.query(
      'INSERT INTO driver_reminders (driver_id, reason) VALUES ($1, $2)',
      [driver.driver_id, reason]
    );
  }
  return drivers.length;
}

module.exports = { findDriversNeedingNudge, nudgeOfflineDrivers };
