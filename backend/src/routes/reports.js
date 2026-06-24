const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { adminAuth } = require('../middleware/adminAuth');
const {
  submitReport, getAllReports, reviewReport, searchUsers
} = require('../controllers/reportsController');

router.post('/', authenticate, submitReport);
router.get('/admin', adminAuth, getAllReports);
router.patch('/admin/:report_id/review', adminAuth, reviewReport);
router.get('/admin/search', adminAuth, searchUsers);

module.exports = router;