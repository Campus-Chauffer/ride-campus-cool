const pool = require('../db/pool');
const { findCodeByString, findBestAutoApplyCode, claimDiscount } = require('../utils/discounts');
const { calculateFare } = require('../utils/fareCalc');
const { attemptSharedMatch, recomputeGroupFares, getGroupSiblings } = require('../utils/sharedRides');
const { sendPushNotification } = require('../utils/notifications');
const { sendSMS } = require('../utils/sms');

// Create a ride request
const requestRide = async (req, res) => {
  const { pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, pickup_address, dropoff_address, discount_code, share_opted_in } = req.body;
  const passenger_id = req.user.id;

  if (!pickup_lat || !pickup_lng || !dropoff_lat || !dropoff_lng) {
    return res.status(400).json({ error: 'Pickup and dropoff coordinates required' });
  }

  const client = await pool.connect();
  try {
    // Get pricing config
    const configResult = await client.query('SELECT key, value FROM config');
    const config = {};
    configResult.rows.forEach(row => config[row.key] = parseFloat(row.value));

    // Determine day or night
    const hour = new Date().getHours();
    const isNight = hour >= config.night_start || hour < config.night_end;

    // Calculate distance between pickup and dropoff
    const distanceKm = getDistanceKm(pickup_lat, pickup_lng, dropoff_lat, dropoff_lng);

    const fare = calculateFare(distanceKm, config, isNight);
    const originalFare = fare;
    const commission = Math.round(originalFare * config.commission_rate * 100) / 100;

   // Check if passenger is within UG LEGON geofence (polygon)
    if (!isWithinCampus(pickup_lat, pickup_lng)) {
      return res.status(400).json({ error: 'Pickup must be within University of Ghana, Legon campus area' });
    }
    if (!isWithinCampus(dropoff_lat, dropoff_lng)) {
      return res.status(400).json({ error: 'Dropoff must be within University of Ghana, Legon campus area' });
    }

    // Resolve which discount code (if any) applies BEFORE creating the trip
    // row — a manually entered code that's invalid blocks the ride with a
    // clear reason; an auto-apply candidate that turns out ineligible just
    // means no discount, never a blocked ride.
    let resolvedCode = null;
    if (discount_code) {
      try {
        resolvedCode = await findCodeByString(client, discount_code, { passenger_id, originalFare, isNight });
      } catch (err) {
        return res.status(400).json({ error: err.message });
      }
    } else {
      resolvedCode = await findBestAutoApplyCode(client, { passenger_id, originalFare, isNight });
    }

    await client.query('BEGIN');

    // Create trip — inserted at the full (pre-discount) fare first, since
    // claimDiscount needs a real trip_id to attach the redemption row to.
    const result = await client.query(
      `INSERT INTO trips
        (passenger_id, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, pickup_address, dropoff_address, fare, original_fare, commission, distance_km, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'requested') RETURNING *`,
      [passenger_id, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, pickup_address, dropoff_address, originalFare, originalFare, commission, distanceKm]
    );
    let trip = result.rows[0];

    if (resolvedCode) {
      const claimResult = await claimDiscount(client, {
        code: resolvedCode, passenger_id, trip_id: trip.id, originalFare,
      });

      if (claimResult) {
        const updated = await client.query(
          `UPDATE trips SET fare = $1, commission = $2, discount_code = $3 WHERE id = $4 RETURNING *`,
          [claimResult.fare, claimResult.commission, resolvedCode.code, trip.id]
        );
        trip = updated.rows[0];
      } else if (discount_code) {
        // The code passed validation moments ago but lost the claim race
        // (sold out, or this user's per-use cap filled) before this trip
        // could attach to it. Only a real problem for a code the passenger
        // explicitly typed in — roll back the trip entirely rather than
        // silently charging full price for a discount they asked for.
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'This code just became unavailable. Please try again without it.' });
      }
      // else: an auto-apply candidate that lost its claim race — proceed
      // with the ride at full price, no rollback needed.
    }

    // Ride-sharing: try to attach to an existing open, compatible group
    // BEFORE committing, so a lost match attempt just falls through to
    // this trip becoming its own (brand new) anchor rather than needing a
    // second round-trip. Either way this trip is dispatched/assigned
    // exactly once — either directly (driver already on the matched
    // group), implicitly (rides along with the anchor's own in-flight
    // dispatch), or via a normal fresh broadcast as a new anchor.
    let matchOutcome = null;
    if (share_opted_in) {
      matchOutcome = await attemptSharedMatch(client, trip, config);
      if (matchOutcome.attached) {
        trip = matchOutcome.trip;
      } else {
        const anchorResult = await client.query(
          `UPDATE trips SET shared_group_id = id, ride_type = 'shared' WHERE id = $1 RETURNING *`,
          [trip.id]
        );
        trip = anchorResult.rows[0];
      }
    }

    await client.query('COMMIT');

    if (!matchOutcome || !matchOutcome.attached) {
      // No match found — this trip is its own (brand new) anchor, dispatch
      // exactly like a normal solo request, unchanged.
      const { dispatchRide } = require('../controllers/dispatchController');
      dispatchRide(trip.id);
    } else if (matchOutcome.driverIdToNotify) {
      // Attached directly onto a group that already has a driver — notify
      // that driver of the new stop instead of dispatching.
      const driverUser = await pool.query(
        `SELECT u.push_token FROM drivers d JOIN users u ON d.user_id = u.id WHERE d.id = $1`,
        [matchOutcome.driverIdToNotify]
      );
      sendPushNotification(
        driverUser.rows[0]?.push_token,
        'New stop added',
        `A rider is sharing this trip — pick them up at ${trip.pickup_address}, along your route.`,
        { type: 'shared_ride_matched', trip_id: trip.id }
      ).catch(() => {});
    }
    // else: attached to a group with no driver yet — rides along with the
    // anchor's own dispatch (already triggered when the anchor was
    // created), nothing further to do here.

    if (matchOutcome?.attached) {
      // Tell the anchor passenger they've been matched and their fare just
      // dropped — they're off on RideMatchingScreen/PickingUpPartnerScreen
      // with no other way to learn this landed.
      const anchorUser = await pool.query(
        `SELECT push_token FROM users WHERE id = $1`,
        [matchOutcome.anchorPassengerId]
      );
      sendPushNotification(
        anchorUser.rows[0]?.push_token,
        "You've been matched!",
        `Another rider is sharing your trip — your fare just dropped to GH₵${trip.fare}.`,
        { type: 'shared_ride_matched', trip_id: trip.id }
      ).catch(() => {});
    }

    res.status(201).json(trip);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
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
          d.vehicle_make, d.vehicle_model, d.vehicle_color, d.plate_number,
          d.current_lat as driver_lat, d.current_lng as driver_lng
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

// Pricing fields relevant to fare estimation — a subset of the full config
// table (which also holds unrelated settings like the wallet lockout
// threshold) that's safe to expose to any logged-in user, since it's the
// same math requestRide already applies once a ride is actually requested.
const PRICING_CONFIG_KEYS = [
  'lower_distance_km', 'upper_distance_km',
  'day_lower_flat', 'night_lower_flat',
  'day_upper_flat', 'night_upper_flat',
  'base_fare', 'price_per_km',
  'night_start', 'night_end',
  'minimum_fare',
];

// Live fare-estimate pricing for the mobile app's home screen. Without this,
// the pre-request fare estimate has to hardcode its own copy of these
// numbers, which then silently drifts out of sync with whatever an admin
// sets in the config table — the actual charged fare from requestRide
// already reads this table live, only the client-side preview didn't.
const getPricingConfig = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT key, value FROM config WHERE key = ANY($1)',
      [PRICING_CONFIG_KEYS]
    );
    const pricing = {};
    result.rows.forEach((row) => { pricing[row.key] = parseFloat(row.value); });
    res.json(pricing);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get a single trip's current status. Same row shape as getRideHistory, but
// scoped to one trip instead of the passenger's entire ride history — used
// for the mobile app's in-ride status polling (every 3s while a ride is
// active), where fetching the whole growing history table on every tick is
// unnecessary weight that hurts most exactly when the network is weakest.
const getTripStatus = async (req, res) => {
  const passenger_id = req.user.id;
  const { trip_id } = req.params;
  try {
    const result = await pool.query(
      `SELECT t.*,
              u.first_name as driver_first_name,
              u.last_name as driver_last_name,
              u.phone_number as driver_phone,
              u.profile_photo as driver_photo,
              d.user_id as driver_user_id,
              d.vehicle_make, d.vehicle_model, d.vehicle_color, d.plate_number,
              d.current_lat as driver_lat, d.current_lng as driver_lng
       FROM trips t
       LEFT JOIN drivers d ON t.driver_id = d.id
       LEFT JOIN users u ON d.user_id = u.id
       WHERE t.id = $1 AND t.passenger_id = $2`,
      [trip_id, passenger_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Trip not found' });
    }
    const trip = result.rows[0];
    const co_riders = await getGroupSiblings(pool, trip);
    res.json({ ...trip, co_riders });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Passenger-triggered safety alert during an active ride. One-shot SMS to
// the passenger's own emergency contact (not a live-updating tracking
// link — a static map pin at wherever the driver was when this fired),
// plus a log entry on the existing reports table so Campus Chauffeur's
// own team sees it on the admin Reports page alongside ordinary reports.
const sendSafetyAlert = async (req, res) => {
  const passenger_id = req.user.id;
  const { trip_id } = req.params;

  try {
    const tripResult = await pool.query(
      `SELECT t.*,
              u.first_name as driver_first_name,
              u.last_name as driver_last_name,
              d.user_id as driver_user_id,
              d.vehicle_make, d.vehicle_model, d.vehicle_color, d.plate_number,
              d.current_lat as driver_lat, d.current_lng as driver_lng,
              d.location_updated_at
       FROM trips t
       LEFT JOIN drivers d ON t.driver_id = d.id
       LEFT JOIN users u ON d.user_id = u.id
       WHERE t.id = $1 AND t.passenger_id = $2`,
      [trip_id, passenger_id]
    );
    if (tripResult.rows.length === 0) {
      return res.status(404).json({ error: 'Trip not found' });
    }
    const trip = tripResult.rows[0];
    if (!trip.driver_user_id) {
      // Nobody to name in the alert or log against yet — safety alerts
      // only make sense once a driver is actually assigned to the trip.
      return res.status(400).json({ error: 'A safety alert is available once a driver is assigned to your ride.' });
    }

    const passengerResult = await pool.query(
      'SELECT emergency_contact_name, emergency_contact_phone FROM users WHERE id = $1',
      [passenger_id]
    );
    const { emergency_contact_name, emergency_contact_phone } = passengerResult.rows[0] || {};
    if (!emergency_contact_phone) {
      return res.status(400).json({ error: 'No emergency contact set' });
    }

    const locationIsFresh = trip.location_updated_at &&
      (Date.now() - new Date(trip.location_updated_at).getTime()) < 5 * 60 * 1000;
    const locationLine = (locationIsFresh && trip.driver_lat && trip.driver_lng)
      ? `Driver's last known location: https://www.google.com/maps?q=${trip.driver_lat},${trip.driver_lng}`
      : `Pickup location: ${trip.pickup_address}`;

    const driverName = trip.driver_first_name
      ? `${trip.driver_first_name} ${trip.driver_last_name || ''}`.trim()
      : 'their driver';
    const vehicleLine = trip.vehicle_make
      ? `Vehicle: ${trip.vehicle_make} ${trip.vehicle_model}, ${trip.vehicle_color} (${trip.plate_number})`
      : '';

    const message = [
      `Campus Chauffeur safety alert: a rider you're listed as an emergency contact for has triggered a safety alert during a ride.`,
      `Driver: ${driverName}`,
      vehicleLine,
      `Route: ${trip.pickup_address} to ${trip.dropoff_address}`,
      locationLine,
    ].filter(Boolean).join('\n');

    const smsResult = await sendSMS(emergency_contact_phone, message);

    await pool.query(
      `INSERT INTO reports (reporter_id, reported_id, trip_id, type, description)
       VALUES ($1, $2, $3, 'safety_alert', $4)`,
      [
        passenger_id,
        trip.driver_user_id,
        trip_id,
        `Passenger triggered a safety alert mid-trip. Emergency contact: ${emergency_contact_name || 'unnamed'} (${emergency_contact_phone}).`,
      ]
    );

    res.json({ success: true, sms_sent: smsResult.success });
  } catch (err) {
    console.error(err);
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

    const trip = result.rows[0];

    // Ride-sharing: this guard (status IN requested/offered/accepted) is
    // already exactly the right cutoff for a matched co-rider cancelling —
    // once someone's been picked up ('arrived' or later) they can't
    // self-cancel via this endpoint at all, so there's nothing to revert
    // for that case. If the group is back down to 1 active member, their
    // fare reverts to full solo and both they and the driver (if assigned
    // by then) are alerted.
    if (trip.shared_group_id) {
      const configResult = await pool.query('SELECT key, value FROM config');
      const config = {};
      configResult.rows.forEach((row) => { config[row.key] = parseFloat(row.value); });

      const updatedMembers = await recomputeGroupFares(pool, trip.shared_group_id, config);
      if (updatedMembers.length === 1) {
        const remaining = updatedMembers[0];
        const remainingUser = await pool.query('SELECT push_token FROM users WHERE id = $1', [remaining.passenger_id]);
        sendPushNotification(
          remainingUser.rows[0]?.push_token,
          'Ride partner cancelled',
          `Your ride partner cancelled — continuing as a solo trip at GH₵${remaining.fare}.`,
          { type: 'shared_ride_partner_cancelled', trip_id: remaining.id }
        ).catch(() => {});

        if (remaining.driver_id) {
          const driverUser = await pool.query(
            `SELECT u.push_token FROM drivers d JOIN users u ON d.user_id = u.id WHERE d.id = $1`,
            [remaining.driver_id]
          );
          sendPushNotification(
            driverUser.rows[0]?.push_token,
            'Ride partner cancelled',
            'The second passenger cancelled — this is now a solo trip.',
            { type: 'shared_ride_partner_cancelled', trip_id: remaining.id }
          ).catch(() => {});
        }
      }
    }

    res.json(trip);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Fetches turn-by-turn route coordinates between two points via Google Directions API,
// decodes the returned polyline into an array the mobile app can render directly.
const getDirections = async (req, res) => {
  const { origin_lat, origin_lng, dest_lat, dest_lng } = req.query;
  if (!origin_lat || !origin_lng || !dest_lat || !dest_lng) {
    return res.status(400).json({ error: 'origin and destination coordinates required' });
  }

  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin_lat},${origin_lng}&destination=${dest_lat},${dest_lng}&key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' || !data.routes?.length) {
      // Google returns HTTP 200 even for key/billing/quota failures, with the
      // real reason only in the body — surfacing it here is the difference
      // between "no route exists" and "the API key can't be used server-side"
      // showing up as the exact same silent empty response to the client.
      if (data.status !== 'ZERO_RESULTS') {
        console.error('Directions API non-OK status:', data.status, data.error_message || '');
      }
      return res.json({ coordinates: [] });
    }

    const encoded = data.routes[0].overview_polyline.points;
    const coordinates = decodePolyline(encoded);
    const leg = data.routes[0].legs?.[0];

    res.json({
      coordinates,
      duration_minutes: leg?.duration ? Math.ceil(leg.duration.value / 60) : null,
      duration_text: leg?.duration?.text || null,
    });
  } catch (err) {
    console.error('Directions error:', err);
    res.json({ coordinates: [] });
  }
};

// Reverse geocode a coordinate to a human-readable place name. Proxied
// server-side so the Google Maps API key never ships inside the mobile
// app bundle, where it would be extractable from the compiled APK/IPA.
const getGeocode = async (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) {
    return res.status(400).json({ error: 'lat and lng required' });
  }

  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Geocode API non-OK status:', data.status, data.error_message || '');
    }
    res.json({ results: data.results || [] });
  } catch (err) {
    console.error('Geocode error:', err);
    res.json({ results: [] });
  }
};

// Place autocomplete predictions for the search box, proxied for the same
// reason as getGeocode above.
const getPlaceAutocomplete = async (req, res) => {
  const { query, lat, lng } = req.query;
  if (!query) {
    return res.status(400).json({ error: 'query required' });
  }

  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    const locationParam = (lat && lng) ? `&location=${lat},${lng}&radius=5000` : '';
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}${locationParam}&key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Places Autocomplete API non-OK status:', data.status, data.error_message || '');
    }
    res.json({ predictions: data.predictions || [] });
  } catch (err) {
    console.error('Place autocomplete error:', err);
    res.json({ predictions: [] });
  }
};

// Resolve a place_id (from autocomplete) to coordinates, proxied for the
// same reason as getGeocode above.
const getPlaceDetails = async (req, res) => {
  const { place_id } = req.query;
  if (!place_id) {
    return res.status(400).json({ error: 'place_id required' });
  }

  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&fields=geometry,name,formatted_address&key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.status !== 'OK') {
      console.error('Place Details API non-OK status:', data.status, data.error_message || '');
    }
    res.json({ result: data.result || null });
  } catch (err) {
    console.error('Place details error:', err);
    res.json({ result: null });
  }
};

// Standard Google polyline decoding algorithm
function decodePolyline(encoded) {
  const points = [];
  let index = 0, lat = 0, lng = 0;

  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) ? ~(result >> 1) : (result >> 1);
    lng += dlng;

    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return points;
}

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

module.exports = {
  requestRide, getRideHistory, getTripStatus, cancelRide, getDirections,
  getGeocode, getPlaceAutocomplete, getPlaceDetails, getPricingConfig,
  sendSafetyAlert,
};