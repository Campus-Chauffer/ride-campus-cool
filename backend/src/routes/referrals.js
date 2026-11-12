const express = require('express');
const router = express.Router();
const { getReferralProgress } = require('../controllers/referralsController');
const { authenticate } = require('../middleware/auth');

router.get('/progress', authenticate, getReferralProgress);

module.exports = router;
