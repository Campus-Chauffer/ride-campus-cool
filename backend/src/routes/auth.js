const express = require('express');
const router = express.Router();
const {
  requestOTP, verifyOTP, register, login,
  forgotPassword, resetPassword,
  getProfile, savePushToken, updateProfile, switchRole
} = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

router.post('/request-otp', requestOTP);
router.post('/verify-otp', verifyOTP);
router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/profile', authenticate, getProfile);
router.post('/push-token', authenticate, savePushToken);
router.patch('/profile', authenticate, updateProfile);
router.patch('/switch-role', authenticate, switchRole);

module.exports = router;