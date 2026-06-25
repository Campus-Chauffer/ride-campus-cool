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

   // Check if passenger is within UG LEGON geofence (polygon)
    if (!isWithinCampus(pickup_lat, pickup_lng)) {
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

// UG Legon campus boundary (matches mobile app polygon)
const UG_LEGON_BOUNDARY = [
  { lat: 5.6672053, lng: -0.1831126 },
  { lat: 5.6571712, lng: -0.1830943 },
  { lat: 5.6572139, lng: -0.1913126 },
  { lat: 5.6536266, lng: -0.1913126 },
  { lat: 5.6536479, lng: -0.1974709 },
  { lat: 5.6478612, lng: -0.197664 },
  { lat: 5.6478185, lng: -0.1895745 },
  { lat: 5.6429925, lng: -0.1898749 },
  { lat: 5.6414551, lng: -0.1872571 },
  { lat: 5.6382093, lng: -0.1858409 },
  { lat: 5.6359013, lng: -0.1900219 },
  { lat: 5.632869,  lng: -0.1886057 },
  { lat: 5.6298367, lng: -0.1867604 },
  { lat: 5.6315023, lng: -0.1836276 },
  { lat: 5.6342784, lng: -0.1849579 },
  { lat: 5.6374387, lng: -0.1777482 },
  { lat: 5.6406845, lng: -0.1782631 },
  { lat: 5.6467063, lng: -0.1796793 },
  { lat: 5.6467383, lng: -0.1805269 },
  { lat: 5.648895,  lng: -0.1805591 },
  { lat: 5.6508702, lng: -0.1807415 },
  { lat: 5.6525358, lng: -0.1807522 },
  { lat: 5.6540839, lng: -0.1807522 },
  { lat: 5.6541052, lng: -0.1821899 },
  { lat: 5.6561765, lng: -0.1822006 },
  { lat: 5.6562512, lng: -0.1802372 },
  { lat: 5.6570306, lng: -0.1800441 },
  { lat: 5.6570199, lng: -0.1808381 },
  { lat: 5.6575751, lng: -0.1808702 },
  { lat: 5.6575965, lng: -0.180087 },
  { lat: 5.6594862, lng: -0.1800119 },
  { lat: 5.6594649, lng: -0.1821577 },
  { lat: 5.6618671, lng: -0.1821792 },
  { lat: 5.6618991, lng: -0.1790571 },
  { lat: 5.6638529, lng: -0.1790463 },
  { lat: 5.6638636, lng: -0.1808273 },
  { lat: 5.6672267, lng: -0.1808273 },
  { lat: 5.6672267, lng: -0.1817822 },
  { lat: 5.6672053, lng: -0.1831126 },
];

// Ray casting point-in-polygon algorithm
const isWithinCampus = (lat, lng) => {
  let inside = false;
  for (let i = 0, j = UG_LEGON_BOUNDARY.length - 1; i < UG_LEGON_BOUNDARY.length; j = i++) {
    const xi = UG_LEGON_BOUNDARY[i].lng, yi = UG_LEGON_BOUNDARY[i].lat;
    const xj = UG_LEGON_BOUNDARY[j].lng, yj = UG_LEGON_BOUNDARY[j].lat;
    const intersect = ((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
};

module.exports = { requestRide, getRideHistory, cancelRide };