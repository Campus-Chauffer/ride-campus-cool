const express = require('express');
const router = express.Router();
const { adminAuth } = require('../middleware/adminAuth');
const {
  getAllDrivers, approveDriver, blockDriver, updateDriverProfile,
  getAllTrips, getRevenueSummary,
  getAllUsers, blockUser, updateConfig,
  getAllReports, updateReport, getAllConfig,
  getAnalytics, getAdminLedger, getDriverActivity, getReverseGeocode,
  getTodayStats, getUserRideHistory
} = require('../controllers/adminController');
const { createAnnouncement, getAnnouncementsAdmin } = require('../controllers/announcementsController');

router.get('/drivers', adminAuth, getAllDrivers);
router.patch('/drivers/:driver_id/approve', adminAuth, approveDriver);
router.patch('/drivers/:driver_id/block', adminAuth, blockDriver);
router.patch('/drivers/:driver_id', adminAuth, updateDriverProfile);
router.get('/trips', adminAuth, getAllTrips);
router.get('/revenue', adminAuth, getRevenueSummary);
router.get('/users', adminAuth, getAllUsers);
router.patch('/users/:user_id/block', adminAuth, blockUser);
router.get('/users/:user_id/rides', adminAuth, getUserRideHistory);
router.patch('/config', adminAuth, updateConfig);
router.get('/config', adminAuth, getAllConfig);
router.get('/reports', adminAuth, getAllReports);
router.patch('/reports/:id', adminAuth, updateReport);
router.get('/analytics', adminAuth, getAnalytics);
router.get('/analytics/driver-activity', adminAuth, getDriverActivity);
router.get('/ledger', adminAuth, getAdminLedger);
router.get('/geocode', adminAuth, getReverseGeocode);
router.get('/stats/today', adminAuth, getTodayStats);
router.post('/announcements', adminAuth, createAnnouncement);
router.get('/announcements', adminAuth, getAnnouncementsAdmin);

module.exports = router;