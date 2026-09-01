const express = require('express');
const router = express.Router();
const {
  requestRide, getRideHistory, getTripStatus, cancelRide, getDirections,
  getGeocode, getPlaceAutocomplete, getPlaceDetails, getPricingConfig,
} = require('../controllers/ridesController');
const { authenticate } = require('../middleware/auth');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

// Authenticated route, so key by user ID when available. Falls back to IP
// only if req.user isn't populated for some reason, which shouldn't happen
// since this sits behind the `authenticate` middleware — the fallback goes
// through ipKeyGenerator so IPv6 addresses are subnet-normalized instead of
// keyed per-address, which would let an IPv6 client dodge the limit by
// rotating the suffix of their own /64.
const rideLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'Too many ride requests. Please wait a moment.' },
  keyGenerator: (req) => req.user?.id?.toString() || ipKeyGenerator(req.ip),
});

router.post('/request', authenticate, rideLimiter, requestRide);
router.get('/history', authenticate, getRideHistory);
router.get('/status/:trip_id', authenticate, getTripStatus);
router.delete('/cancel/:trip_id', authenticate, cancelRide);
router.get('/pricing', authenticate, getPricingConfig);
router.get('/directions', authenticate, getDirections);
router.get('/geocode', authenticate, getGeocode);
router.get('/places/autocomplete', authenticate, getPlaceAutocomplete);
router.get('/places/details', authenticate, getPlaceDetails);

module.exports = router;