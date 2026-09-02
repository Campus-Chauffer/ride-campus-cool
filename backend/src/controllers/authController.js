const pool = require('../db/pool');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { sendRatingReminder } = require('../utils/email');
const { sendSMS } = require('../utils/sms');
const { takeDriverOffline } = require('./driversController');

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// Request OTP (for registration phone verification)
const requestOTP = async (req, res) => {
  const { phone_number } = req.body;
  if (!phone_number) return res.status(400).json({ error: 'Phone number required' });

  const otp = generateOTP();
  const expires_at = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  try {
    await pool.query('UPDATE otps SET used = TRUE WHERE phone_number = $1', [phone_number]);
    await pool.query(
      'INSERT INTO otps (phone_number, otp_code, expires_at) VALUES ($1, $2, $3)',
      [phone_number, otp, expires_at]
    );

    const message = `Your Campus Chauffeur verification code is: ${otp}. Valid for 10 minutes. Do not share this code.`;
    const smsResult = await sendSMS(phone_number, message);

    if (!smsResult.success) {
      // The OTP row above is still written and valid — this only means the
      // text itself didn't go out (missing/invalid mNotify credentials, no
      // balance, delivery failure). Previously this was swallowed into a
      // "sent successfully" response, so a real SMS outage looked to every
      // user like the app was simply broken, with nothing in the client to
      // act on and no signal short of support complaints.
      console.warn(`SMS delivery issue for ${phone_number}, OTP: ${otp}`);
      return res.status(502).json({ error: 'Could not send verification code. Please try again.' });
    }

    res.json({ message: 'OTP sent successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Verify OTP (phone verification only)
const verifyOTP = async (req, res) => {
  const { phone_number, otp_code } = req.body;
  if (!phone_number || !otp_code) {
    return res.status(400).json({ error: 'Phone number and OTP required' });
  }

  try {
    const otpResult = await pool.query(
      `SELECT * FROM otps WHERE phone_number = $1 AND otp_code = $2 AND used = FALSE AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [phone_number, otp_code]
    );

    if (otpResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    await pool.query('UPDATE otps SET used = TRUE WHERE id = $1', [otpResult.rows[0].id]);

    res.json({ verified: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Register new user
const register = async (req, res) => {
  const { phone_number, first_name, last_name, email, password, role } = req.body;

  if (!phone_number || !first_name || !last_name || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  // role is client-supplied input — never trust it beyond the two roles a
  // self-signup is allowed to create. Admin accounts must be provisioned
  // out-of-band, never through this public endpoint.
  const requestedRole = role === 'driver' ? 'driver' : 'passenger';

  try {
    const existing = await pool.query(
      'SELECT id FROM users WHERE phone_number = $1 OR email = $2',
      [phone_number, email]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Account already exists' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (phone_number, first_name, last_name, email, role, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [phone_number, first_name, last_name, email, requestedRole, password_hash]
    );

    const user = result.rows[0];

    if (requestedRole === 'driver') {
      const driverResult = await pool.query(
        'INSERT INTO drivers (user_id) VALUES ($1) RETURNING *',
        [user.id]
      );
      await pool.query('INSERT INTO wallets (driver_id) VALUES ($1)', [driverResult.rows[0].id]);
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Login with phone/email + password
const login = async (req, res) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Phone/email and password required' });
  }

  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE phone_number = $1 OR email = $1',
      [identifier]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Account not found' });
    }

    const user = result.rows[0];

    if (!user.password_hash) {
      return res.status(400).json({ error: 'Please register with a password first' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(400).json({ error: 'Incorrect password' });
    }

    if (user.status === 'blocked') {
      return res.status(403).json({ error: 'Account blocked. Contact support.' });
    }
    if (user.status === 'pending_deletion' || user.status === 'deleted') {
      return res.status(403).json({ error: 'This account has been deleted.' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Forgot password - send reset OTP via email
const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No account found with this email' });
    }

    const user = result.rows[0];
    const otp = generateOTP();
    const expires_at = new Date(Date.now() + 60 * 60 * 1000);

    await pool.query('UPDATE otps SET used = TRUE WHERE phone_number = $1', [user.phone_number]);
    await pool.query(
      'INSERT INTO otps (phone_number, otp_code, expires_at) VALUES ($1, $2, $3)',
      [user.phone_number, otp, expires_at]
    );

    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });

    await transporter.sendMail({
      from: `Campus Chauffeur <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Reset your Campus Chauffeur password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
          <div style="background: #FFB800; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: #1A1A2E; margin: 0;">Campus Chauffeur</h1>
          </div>
          <div style="background: #f5f5f5; padding: 24px; border-radius: 0 0 8px 8px;">
            <h2>Hi ${user.first_name},</h2>
            <p>Your password reset code is:</p>
            <h1 style="color: #FFB800; letter-spacing: 8px;">${otp}</h1>
            <p>This code expires in 1 hour.</p>
          </div>
        </div>
      `,
    });

    console.log(`Password reset OTP for ${email}: ${otp}`);
    // The mobile client needs phone_number for the follow-up resetPassword
    // call (which looks up the OTP by phone, not email) — omitting it here
    // meant every reset attempt silently failed at the final step with
    // "Invalid or expired code," even with a correct OTP, because the
    // client was checking it against an empty phone number instead of the
    // real one.
    res.json({ message: 'Reset code sent to your email', phone_number: user.phone_number });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Reset password
const resetPassword = async (req, res) => {
  const { phone_number, otp_code, new_password } = req.body;

  if (!phone_number || !otp_code || !new_password) {
    return res.status(400).json({ error: 'All fields required' });
  }

  try {
    const otpResult = await pool.query(
      `SELECT * FROM otps WHERE phone_number = $1 AND otp_code = $2 AND used = FALSE AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [phone_number, otp_code]
    );

    if (otpResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired code' });
    }

    const password_hash = await bcrypt.hash(new_password, 10);
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE phone_number = $2',
      [password_hash, phone_number]
    );

    await pool.query('UPDATE otps SET used = TRUE WHERE id = $1', [otpResult.rows[0].id]);

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Get profile
const getProfile = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, phone_number, email, first_name, last_name, role, status FROM users WHERE id = $1',
      [req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Save push token
const savePushToken = async (req, res) => {
  const { push_token } = req.body;
  const user_id = req.user.id;
  if (!push_token) return res.status(400).json({ error: 'Push token required' });

  try {
    await pool.query('UPDATE users SET push_token = $1 WHERE id = $2', [push_token, user_id]);
    res.json({ message: 'Push token saved' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Update profile
const updateProfile = async (req, res) => {
  const { first_name, last_name, email } = req.body;
  const user_id = req.user.id;

  try {
    const result = await pool.query(
      `UPDATE users SET 
        first_name = COALESCE($1, first_name),
        last_name = COALESCE($2, last_name),
        email = COALESCE($3, email)
       WHERE id = $4 RETURNING id, first_name, last_name, email, phone_number, role`,
      [first_name, last_name, email, user_id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Switch between passenger and driver mode on the same account. Switching
// to 'passenger' is always allowed — anyone can request rides. Switching to
// 'driver' requires an approved drivers row for this user, so someone can't
// grant themselves driver access by simply calling this endpoint before
// their vehicle/documents have actually been reviewed.
const switchRole = async (req, res) => {
  const user_id = req.user.id;
  const { role } = req.body;

  if (role !== 'passenger' && role !== 'driver') {
    return res.status(400).json({ error: 'Invalid role' });
  }

  try {
    if (role === 'driver') {
      const driverResult = await pool.query(
        `SELECT approval_status FROM drivers WHERE user_id = $1`,
        [user_id]
      );
      if (driverResult.rows.length === 0 || driverResult.rows[0].approval_status !== 'approved') {
        return res.status(403).json({ error: 'You do not have an approved driver profile yet' });
      }
    }

    // Switching away from driver mode used to leave is_online untouched —
    // a driver who went online and then switched to passenger without
    // toggling off first stayed "online" indefinitely, since they'd never
    // open the driver screen again to do it themselves.
    if (role === 'passenger') {
      await takeDriverOffline(user_id);
    }

    const result = await pool.query(
      `UPDATE users SET role = $1 WHERE id = $2
       RETURNING id, phone_number, email, first_name, last_name, role, status`,
      [role, user_id]
    );
    const user = result.rows[0];

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Logging out was previously purely a client-side action (clear the local
// token/storage) with no server call at all — a driver who hit Logout while
// online, instead of toggling offline first, would stay "online" forever
// for the exact same reason switchRole did before the fix above.
const logout = async (req, res) => {
  try {
    await takeDriverOffline(req.user.id);
    res.json({ message: 'Logged out' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Request account deletion. Anonymizes personal info immediately (so the
// account is unusable and unidentifiable right away) but doesn't hard-delete
// it — trips/ledger/reports reference this row via foreign keys, and other
// parties' ride history + any open reports need to survive. The account sits
// as 'pending_deletion' for 30 days (schedulePurgeDeletedAccounts in
// scheduler.js) before the last sensitive traces — driver verification
// documents — are purged, giving a window to investigate any in-flight
// scam/fraud report tied to the account before that evidence disappears.
const requestAccountDeletion = async (req, res) => {
  const user_id = req.user.id;
  try {
    const userResult = await pool.query('SELECT id FROM users WHERE id = $1', [user_id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // phone_number is NOT NULL + UNIQUE, so it can't just be cleared —
    // "del-<id>" is guaranteed unique (ids are unique) and well under the
    // column's 20-char limit, and no longer resembles a real phone number.
    const anonymizedPhone = `del-${user_id}`;

    await pool.query(
      `UPDATE users SET
        first_name = 'Deleted',
        last_name = 'User',
        email = NULL,
        phone_number = $1,
        password_hash = NULL,
        push_token = NULL,
        profile_photo = NULL,
        status = 'pending_deletion',
        deletion_requested_at = NOW()
       WHERE id = $2`,
      [anonymizedPhone, user_id]
    );

    res.json({ message: 'Account deleted. Any remaining data will be fully removed within 30 days.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  requestOTP, verifyOTP, register, login,
  forgotPassword, resetPassword,
  getProfile, savePushToken, updateProfile, switchRole,
  requestAccountDeletion, logout
};