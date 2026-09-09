const express = require('express');
const router = express.Router();
const { checkVersion } = require('../controllers/appController');

// No auth — must be reachable from the login/OTP screens too, before a
// token exists.
router.get('/version-check', checkVersion);

module.exports = router;
