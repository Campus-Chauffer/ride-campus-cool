const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const pool = require('../db/pool');
const { getGroupSiblings, getFullGroup } = require('../utils/sharedRides');

const {
  goOnline, goOffline, updateLocation,
  checkOffers, acceptOffer, startTrip, arrivedAtPickup,
  getWaitFare,  completeTrip
} = require('../controllers/driversController');

router.post('/online', authenticate, goOnline);
router.post('/offline', authenticate, goOffline);
router.patch('/location', authenticate, updateLocation);
router.get('/offers', authenticate, checkOffers);
router.patch('/accept/:trip_id', authenticate, acceptOffer);
router.patch('/start/:trip_id', authenticate, startTrip);
router.patch('/arrived/:trip_id', authenticate, arrivedAtPickup);
router.get('/wait-fare/:trip_id', authenticate, getWaitFare);
router.patch('/complete/:trip_id', authenticate, completeTrip);
router.get('/trip/:trip_id', authenticate, async (req, res) => {
  const { trip_id } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM trips WHERE id = $1',
      [trip_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Trip not found' });
    const trip = result.rows[0];
    // co_riders lets DriverHomeScreen's existing 5s poll (today only used
    // to catch passenger cancellation) also notice a shared group growing
    // to 2 and switch into the multi-stop pickup flow.
    const co_riders = await getGroupSiblings(pool, trip);
    res.json({ ...trip, co_riders });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Full leg details for every active member of a shared-ride group, for the
// driver app's multi-stop pickup/drop-off screens — richer than the
// co_riders field on /trip/:id (which is just enough for the lightweight
// "did my group just grow" poll), with map coordinates, fare, and who to
// call for each passenger.
router.get('/shared-group/:group_id', authenticate, async (req, res) => {
  const { group_id } = req.params;
  const user_id = req.user.id;
  try {
    const driverResult = await pool.query('SELECT id FROM drivers WHERE user_id = $1', [user_id]);
    const driver_id = driverResult.rows[0]?.id;
    if (!driver_id) return res.status(404).json({ error: 'Driver not found' });

    const anchorCheck = await pool.query(
      'SELECT id FROM trips WHERE id = $1 AND driver_id = $2', [group_id, driver_id]
    );
    if (anchorCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not your trip group' });
    }

    const group = await getFullGroup(pool, group_id);
    res.json({ group });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/history', authenticate, async (req, res) => {
  const user_id = req.user.id;
  try {
    const driverResult = await pool.query(
      'SELECT id FROM drivers WHERE user_id = $1',
      [user_id]
    );
    if (driverResult.rows.length === 0) return res.status(404).json({ error: 'Driver not found' });
    const driver_id = driverResult.rows[0].id;

    const result = await pool.query(
      `SELECT t.*,
              u.first_name as passenger_first_name,
              u.last_name as passenger_last_name,
              u.phone_number as passenger_phone
       FROM trips t
       JOIN users u ON t.passenger_id = u.id
       WHERE t.driver_id = $1
       ORDER BY t.created_at DESC`,
      [driver_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;