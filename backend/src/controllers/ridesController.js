const pool = require('../db/pool');

// Create a ride request
const requestRide = async (req, res) => {
  const { pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, pickup_address, dropoff_address } = req.body;
  const passenger_id = req.user.id;

  if (!pickup_lat || !pickup_lng || !dropoff_lat || !dropoff_lng) {
    return res.status(400).json({ error: 'Pickup and dropoff coordinates required' });
  }

  try {
    // Get pricing config
    const configResult = await pool.query('SELECT key, value FROM config');
    const config = {};
    configResult.rows.forEach(row => config[row.key] = parseFloat(row.value));

    // Determine day or night
    const hour = new Date().getHours();
    const isNight = hour >= config.night_start || hour < config.night_end;

    // Calculate distance between pickup and dropoff
    const distanceKm = getDistanceKm(pickup_lat, pickup_lng, dropoff_lat, dropoff_lng);

    // Dynamic pricing logic
    let fare;
    const lowerDist = config.lower_distance_km;
    const upperDist = config.upper_distance_km;
    const lowerFlat = isNight ? config.night_lower_flat : config.day_lower_flat;
    const upperFlat = isNight ? config.night_upper_flat : config.day_upper_flat;

    if (distanceKm <= lowerDist) {
      fare = lowerFlat;
    } else if (distanceKm >= upperDist) {
      fare = upperFlat;
    } else {
      fare = Math.round(config.base_fare + distanceKm * config.price_per_km);
      fare = Math.min(Math.max(fare, lowerFlat), upperFlat);
    }

    const commission = Math.round(fare * config.commission_rate * 100) / 100;

    // Check if passenger is within UG LEGON geofence
    const ug_lat = 5.6502;
    const ug_lng = -0.1870;
    const radius_km = 5;

    const distance = getDistanceKm(pickup_lat, pickup_lng, ug_lat, ug_lng);
    if (distance > radius_km) {
      return res.status(400).json({ error: 'Pickup must be within University of Ghana, Legon campus area' });
   }

    // Create trip
    const result = await pool.query(
      `INSERT INTO trips 
        (passenger_id, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, pickup_address, dropoff_address, fare, commission, distance_km, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'requested') RETURNING *`,
      [passenger_id, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, pickup_address, dropoff_address, fare, commission, distanceKm]
    );

    const trip = result.rows[0];

    // Trigger dispatch in background
    const { dispatchRide } = require('../controllers/dispatchController');
    dispatchRide(trip.id);

    res.status(201).json(trip);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get ride history for passenger
const getRideHistory = async (req, res) => {
  const passenger_id = req.user.id;
  try {
    const result = await pool.query(
  `SELECT t.*, 
          u.first_name as driver_first_name, 
          u.last_name as driver_last_name,
          u.phone_number as driver_phone,
          u.profile_photo as driver_photo,
          d.user_id as driver_user_id,
          d.vehicle_make, d.vehicle_model, d.vehicle_color, d.plate_number
   FROM trips t
   LEFT JOIN drivers d ON t.driver_id = d.id
   LEFT JOIN users u ON d.user_id = u.id
   WHERE t.passenger_id = $1
   ORDER BY t.created_at DESC`,
  [passenger_id]
);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Cancel a ride
const cancelRide = async (req, res) => {
  const { trip_id } = req.params;
  const passenger_id = req.user.id;

  try {
    const result = await pool.query(
      `UPDATE trips SET status = 'cancelled', cancelled_by = 'passenger'
       WHERE id = $1 AND passenger_id = $2 AND status IN ('requested', 'offered', 'accepted') RETURNING *`,
      [trip_id, passenger_id]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Trip not found or cannot be cancelled' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Haversine formula to calculate distance between two coordinates
const getDistanceKm = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

const toRad = (deg) => deg * (Math.PI / 180);

module.exports = { requestRide, getRideHistory, cancelRide };