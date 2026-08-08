const express = require('express');
const router = express.Router();
const { getMyAnnouncements } = require('../controllers/announcementsController');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, getMyAnnouncements);

module.exports = router;
