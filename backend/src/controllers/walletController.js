const crypto = require('crypto');
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

// Shared by the admin manual-entry endpoint and the Paystack webhook -
// records a payment, updates the wallet, and unlocks + notifies the driver
// if it clears their outstanding balance. paystack_reference is only set
// for the webhook path; the ledger's unique constraint on that column
// (NULLs excluded, per normal SQL semantics - every admin-recorded NULL
// reference is still treated as distinct) makes a duplicate webhook
// delivery for the same transaction a no-op instead of double-crediting
// the driver.
async function applyPayment({ driver_id, amount, description, paystack_reference = null }) {
  const ledgerResult = await pool.query(
    `INSERT INTO ledger (driver_id, amount, type, description, paystack_reference)
     VALUES ($1, $2, 'payment', $3, $4)
     ON CONFLICT (paystack_reference) DO NOTHING
     RETURNING id`,
    [driver_id, amount, description || `Commission payment of GH₵${amount}`, paystack_reference]
  );

  if (paystack_reference && ledgerResult.rows.length === 0) {
    // Already processed this exact Paystack transaction (a retried
    // webhook delivery, most likely) - nothing more to do.
    return null;
  }

  await pool.query(
    `UPDATE wallets SET total_paid = total_paid + $1 WHERE driver_id = $2`,
    [amount, driver_id]
  );

  const walletResult = await pool.query('SELECT * FROM wallets WHERE driver_id = $1', [driver_id]);
  const wallet = walletResult.rows[0];
  const outstanding = parseFloat(wallet.total_commission_owed) - parseFloat(wallet.total_paid);

  // Unlock wallet immediately after any payment clears outstanding
  if (outstanding <= 0 && wallet.is_locked) {
    await pool.query(
      'UPDATE wallets SET is_locked = FALSE WHERE driver_id = $1',
      [driver_id]
    );

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

  return { outstanding, is_locked: outstanding <= 0 ? false : wallet.is_locked };
}

// Record a commission payment (admin records this)
const recordPayment = async (req, res) => {
  const { driver_id, amount, description } = req.body;

  if (!driver_id || !amount) {
    return res.status(400).json({ error: 'Driver ID and amount required' });
  }

  try {
    const result = await applyPayment({ driver_id, amount, description });

    res.json({
      message: 'Payment recorded successfully',
      outstanding_balance: result.outstanding.toFixed(2),
      is_locked: result.is_locked,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Starts a Paystack transaction for the driver's exact outstanding
// commission balance and hands back the hosted checkout URL for the app
// to open in an in-app browser. Reconciliation happens separately, via
// paystackWebhook below, once Paystack confirms the charge actually went
// through - this endpoint only ever initiates, never credits anything.
const initializePaystackPayment = async (req, res) => {
  const user_id = req.user.id;

  try {
    const driverResult = await pool.query(
      `SELECT d.id as driver_id, u.email
       FROM drivers d JOIN users u ON u.id = d.user_id
       WHERE d.user_id = $1`,
      [user_id]
    );

    if (driverResult.rows.length === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    const { driver_id, email } = driverResult.rows[0];
    if (!email) {
      return res.status(400).json({ error: 'Add an email to your profile before paying with Paystack' });
    }

    const walletResult = await pool.query('SELECT * FROM wallets WHERE driver_id = $1', [driver_id]);
    const wallet = walletResult.rows[0];
    const outstanding = parseFloat(wallet.total_commission_owed) - parseFloat(wallet.total_paid);

    if (outstanding <= 0) {
      return res.status(400).json({ error: 'No outstanding commission to pay' });
    }

    const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: Math.round(outstanding * 100), // GHS -> pesewas, Paystack's subunit
        currency: 'GHS',
        metadata: { driver_id, user_id, type: 'commission_payment' },
      }),
    });
    const data = await paystackRes.json();

    if (!data.status) {
      console.error('Paystack initialize error:', data);
      return res.status(502).json({ error: 'Could not start payment' });
    }

    res.json({ authorization_url: data.data.authorization_url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Public endpoint - Paystack calls this directly, so there's no auth
// middleware in front of it. Security comes entirely from verifying the
// signature below, not from who's allowed to call the route.
const paystackWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-paystack-signature'];
    const hash = crypto
      .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
      .update(req.rawBody)
      .digest('hex');

    if (!signature || hash !== signature) {
      console.error('Paystack webhook: invalid signature');
      return res.sendStatus(401);
    }

    const event = req.body;

    if (event.event === 'charge.success') {
      const { reference, amount, metadata } = event.data;
      const driver_id = metadata?.driver_id;

      if (driver_id) {
        await applyPayment({
          driver_id,
          amount: amount / 100, // pesewas -> GHS
          description: `Paystack commission payment (${reference})`,
          paystack_reference: reference,
        });
      } else {
        console.error('Paystack webhook: charge.success with no driver_id in metadata', reference);
      }
    }

    // 200 once the signature checks out, whatever the event type - so
    // Paystack doesn't keep retrying something we've already looked at,
    // including event types this deliberately ignores.
    res.sendStatus(200);
  } catch (err) {
    console.error('Paystack webhook error:', err);
    res.sendStatus(500);
  }
};

module.exports = { getWallet, getLedger, recordPayment, initializePaystackPayment, paystackWebhook };
