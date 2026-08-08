const pool = require('../db/pool');

// Get wallet details
const getWallet = async (req, res) => {
  const user_id = req.user.id;

  try {
    const driverResult = await pool.query(
      'SELECT * FROM drivers WHERE user_id = $1',
      [user_id]
    );

    if (driverResult.rows.length === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    const driver = driverResult.rows[0];

    const walletResult = await pool.query(
      'SELECT * FROM wallets WHERE driver_id = $1',
      [driver.id]
    );

    const wallet = walletResult.rows[0];
    const outstanding = parseFloat(wallet.total_commission_owed) - parseFloat(wallet.total_paid);

    // Calculate total revenue from completed trips
    const revenueResult = await pool.query(
      `SELECT COALESCE(SUM(fare), 0) as total_revenue
       FROM trips WHERE driver_id = $1 AND status = 'completed'`,
      [driver.id]
    );

    const totalRevenue = parseFloat(revenueResult.rows[0].total_revenue);
    const totalPaid = parseFloat(wallet.total_paid);
    // Earnings = total revenue minus what hasn't been paid yet
    const earnings = totalRevenue - Math.max(outstanding, 0);

    res.json({
      ...wallet,
      outstanding_balance: outstanding.toFixed(2),
      total_revenue: totalRevenue.toFixed(2),
      total_paid: totalPaid.toFixed(2),
      earnings: Math.max(earnings, 0).toFixed(2),
      // Explicit alias to avoid DB column override
      commission_outstanding: outstanding.toFixed(2),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get ledger history
const getLedger = async (req, res) => {
  const user_id = req.user.id;

  try {
    const driverResult = await pool.query(
      'SELECT * FROM drivers WHERE user_id = $1',
      [user_id]
    );

    if (driverResult.rows.length === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    const driver = driverResult.rows[0];

    const ledgerResult = await pool.query(
      `SELECT l.*, t.pickup_address, t.dropoff_address, t.fare
       FROM ledger l
       LEFT JOIN trips t ON l.trip_id = t.id
       WHERE l.driver_id = $1
       ORDER BY l.created_at DESC`,
      [driver.id]
    );

    res.json(ledgerResult.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Record a commission payment (admin records this)
const recordPayment = async (req, res) => {
  const { driver_id, amount, description } = req.body;

  if (!driver_id || !amount) {
    return res.status(400).json({ error: 'Driver ID and amount required' });
  }

  try {
    // Record in ledger
    await pool.query(
      `INSERT INTO ledger (driver_id, amount, type, description)
       VALUES ($1, $2, 'payment', $3)`,
      [driver_id, amount, description || `Commission payment of GH₵${amount}`]
    );

    // Update wallet
    await pool.query(
      `UPDATE wallets SET total_paid = total_paid + $1
       WHERE driver_id = $2`,
      [amount, driver_id]
    );

    // Check if outstanding is now below lockout threshold
    const walletResult = await pool.query(
      'SELECT * FROM wallets WHERE driver_id = $1',
      [driver_id]
    );

    const wallet = walletResult.rows[0];
    const outstanding = parseFloat(wallet.total_commission_owed) - parseFloat(wallet.total_paid);

    // Unlock wallet immediately after any payment clears outstanding
if (outstanding <= 0 && wallet.is_locked) {
  await pool.query(
    'UPDATE wallets SET is_locked = FALSE WHERE driver_id = $1',
    [driver_id]
  );

  // Notify driver they are unlocked
  const driverUser = await pool.query(
    `SELECT u.push_token, u.first_name FROM users u
     JOIN drivers d ON d.user_id = u.id
     WHERE d.id = $1`,
    [driver_id]
  );

  if (driverUser.rows[0]) {
    const { sendPushNotification } = require('../utils/notifications');
    await sendPushNotification(
      driverUser.rows[0].push_token,
      '✅ Account Unlocked',
      `Hi ${driverUser.rows[0].first_name}, your commission has been cleared. You can now go online and accept rides.`,
      { type: 'unlocked' }
    );
  }
}

    res.json({
      message: 'Payment recorded successfully',
      outstanding_balance: outstanding.toFixed(2),
      is_locked: outstanding >= 40
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { getWallet, getLedger, recordPayment };