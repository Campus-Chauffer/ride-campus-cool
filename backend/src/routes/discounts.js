const express = require('express');
const router = express.Router();
const {
  createDiscountCode, getAllDiscountCodes, updateDiscountCode, getAvailableDiscounts,
} = require('../controllers/discountController');
const { authenticate } = require('../middleware/auth');
const { adminAuth } = require('../middleware/adminAuth');

router.get('/available', authenticate, getAvailableDiscounts);

router.post('/', adminAuth, createDiscountCode);
router.get('/', adminAuth, getAllDiscountCodes);
router.patch('/:id', adminAuth, updateDiscountCode);

module.exports = router;
