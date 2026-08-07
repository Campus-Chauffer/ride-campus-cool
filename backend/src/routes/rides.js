const express = require('express');
const router = express.Router();
const { requestRide, getRideHistory, cancelRide, getDirections } = require('../controllers/ridesController');
const { authenticate } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

const rideLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'Too many ride requests. Please wait a moment.' },
  keyGenerator: (req) => req.user?.id?.toString() || req.ip,
});

router.post('/request', authenticate, rideLimiter, requestRide);
router.get('/history', authenticate, getRideHistory);
router.delete('/cancel/:trip_id', authenticate, cancelRide);
router.get('/directions', authenticate, getDirections);

module.exports = router;