const express = require('express');
const router = express.Router();
const { requestRide, getRideHistory, cancelRide } = require('../controllers/ridesController');
const { authenticate } = require('../middleware/auth');

router.post('/request', authenticate, requestRide);
router.get('/history', authenticate, getRideHistory);
router.delete('/cancel/:trip_id', authenticate, cancelRide);

module.exports = router;