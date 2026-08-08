const express = require('express');
const router = express.Router();
const { getWallet, getLedger, recordPayment } = require('../controllers/walletController');
const { authenticate } = require('../middleware/auth');
const { adminAuth } = require('../middleware/adminAuth');

router.get('/', authenticate, getWallet);
router.get('/ledger', authenticate, getLedger);
// Admin-only: lets a caller clear ANY driver's commission debt and unlock
// their wallet by driver_id, so this must never be reachable by a plain
// authenticated user (was previously `authenticate`, allowing any logged-in
// account to fabricate payments for other drivers).
router.post('/payment', adminAuth, recordPayment);

module.exports = router;