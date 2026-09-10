const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { submitRegistration, getRegistrationStatus, getRegistrationDraft } = require('../controllers/driverRegistrationController');

router.post('/submit', authenticate, submitRegistration);
router.get('/status', authenticate, getRegistrationStatus);
router.get('/draft', authenticate, getRegistrationDraft);

module.exports = router;