const jwt = require('jsonwebtoken');
const pool = require('../db/pool');

const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Tokens are stateless and last 30 days with no revocation list, so
    // blocking a user (or a full account deletion, which promises "signed
    // out everywhere" in the Privacy Policy) previously did nothing to a
    // token already issued to them — every endpoint not specifically gated
    // on approval_status kept working right up to natural expiry. Checking
    // status here on every request makes a block or deletion take effect
    // immediately instead of up to a month later.
    const result = await pool.query('SELECT status FROM users WHERE id = $1', [decoded.id]);
    if (result.rows.length === 0 || result.rows[0].status !== 'active') {
      return res.status(401).json({ error: 'Account is no longer active' });
    }

    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = { authenticate };