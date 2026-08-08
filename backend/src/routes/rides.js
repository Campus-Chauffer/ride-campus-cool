const express = require('express');
const router = express.Router();
const {
  requestRide, getRideHistory, cancelRide, getDirections,
  getGeocode, getPlaceAutocomplete, getPlaceDetails,
} = require('../controllers/ridesController');
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
router.get('/geocode', authenticate, getGeocode);
router.get('/places/autocomplete', authenticate, getPlaceAutocomplete);
router.get('/places/details', authenticate, getPlaceDetails);

module.exports = router;