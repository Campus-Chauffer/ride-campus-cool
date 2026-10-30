const express = require('express');
const router = express.Router();
const { getWallet, getLedger, recordPayment, initializePaystackPayment, paystackWebhook } = require('../controllers/walletController');
const { authenticate } = require('../middleware/auth');
const { adminAuth } = require('../middleware/adminAuth');

router.get('/', authenticate, getWallet);
router.get('/ledger', authenticate, getLedger);
// Admin-only: lets a caller clear ANY driver's commission debt and unlock
// their wallet by driver_id, so this must never be reachable by a plain
// authenticated user (was previously `authenticate`, allowing any logged-in
// account to fabricate payments for other drivers).
router.post('/payment', adminAuth, recordPayment);

router.post('/pay/initialize', authenticate, initializePaystackPayment);
// No auth middleware — Paystack calls this directly from its own servers,
// not from a logged-in user's session. paystackWebhook verifies Paystack's
// signature itself instead.
router.post('/paystack-webhook', paystackWebhook);

module.exports = router;
