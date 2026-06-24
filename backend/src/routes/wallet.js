const express = require('express');
const router = express.Router();
const { getWallet, getLedger, recordPayment } = require('../controllers/walletController');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, getWallet);
router.get('/ledger', authenticate, getLedger);
router.post('/payment', authenticate, recordPayment);

module.exports = router;