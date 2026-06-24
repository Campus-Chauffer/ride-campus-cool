const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { rateDriver, ratePassenger, getUserProfile } = require('../controllers/ratingsController');

router.post('/:trip_id/rate-driver', authenticate, rateDriver);
router.post('/:trip_id/rate-passenger', authenticate, ratePassenger);
router.get('/profile/:user_id', authenticate, getUserProfile);

module.exports = router;