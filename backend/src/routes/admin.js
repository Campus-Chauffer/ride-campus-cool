const express = require('express');
const router = express.Router();
const { adminAuth } = require('../middleware/adminAuth');
const {
  getAllDrivers, approveDriver, blockDriver,
  getAllTrips, getRevenueSummary,
  getAllUsers, blockUser, updateConfig,
  getAllReports, updateReport, getAllConfig,
  getAnalytics, getAdminLedger
} = require('../controllers/adminController');

router.get('/drivers', adminAuth, getAllDrivers);
router.patch('/drivers/:driver_id/approve', adminAuth, approveDriver);
router.patch('/drivers/:driver_id/block', adminAuth, blockDriver);
router.get('/trips', adminAuth, getAllTrips);
router.get('/revenue', adminAuth, getRevenueSummary);
router.get('/users', adminAuth, getAllUsers);
router.patch('/users/:user_id/block', adminAuth, blockUser);
router.patch('/config', adminAuth, updateConfig);
router.get('/config', adminAuth, getAllConfig);
router.get('/reports', adminAuth, getAllReports);
router.patch('/reports/:id', adminAuth, updateReport);
router.get('/analytics', adminAuth, getAnalytics);
router.get('/ledger', adminAuth, getAdminLedger);

module.exports = router;