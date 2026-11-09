const { calculateFare } = require('./fareCalc');

// Local haversine/bearing — mirrors the (already duplicated, per existing
// convention) copies in ridesController.js/dispatchController.js rather
// than introducing a cross-cutting geo-utils refactor those files don't
// otherwise need.
const toRad = (deg) => deg * (Math.PI / 180);
const toDeg = (rad) => rad * (180 / Math.PI);

const getDistanceKm = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// Compass bearing (0-360) from point 1 to point 2 — used to compare "which
// general direction is this trip headed," the cheap stand-in for a real
// route-based detour check (that's the mid-trip-matching fast-follow; v1's
// pre-pickup matching only needs "roughly the same direction").
const bearing = (lat1, lng1, lat2, lng2) => {
  const y = Math.sin(toRad(lng2 - lng1)) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lng2 - lng1));
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
};

const angleDiff = (a, b) => {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
};

const isNightNow = (config) => {
  const hour = new Date().getHours();
  return hour >= config.night_start || hour < config.night_end;
};

// Recomputes fare/commission for every active (non-cancelled) leg in a
// group, from scratch, off each leg's own stored distance_km — the single
// function both "a match just landed" (fare goes down) and "a co-rider just
// cancelled" (fare goes back up) call, so the two directions can't drift
// into different math. Discount only applies once there are 2+ active
// members; a group that's back down to 1 prices exactly like a solo trip.
async function recomputeGroupFares(db, groupId, config) {
  const night = isNightNow(config);
  const members = await db.query(
    `SELECT * FROM trips WHERE shared_group_id = $1 AND status != 'cancelled'`,
    [groupId]
  );
  const discount = members.rows.length >= 2 ? (config.shared_fare_discount || 0) : 0;
  const minimumFare = config.minimum_fare || 12;

  const updated = [];
  for (const leg of members.rows) {
    const normalFare = calculateFare(parseFloat(leg.distance_km), config, night);
    const newFare = Math.max(minimumFare, normalFare - discount);
    const newCommission = Math.round(newFare * config.commission_rate * 100) / 100;
    const result = await db.query(
      `UPDATE trips SET fare = $1, commission = $2 WHERE id = $3 RETURNING *`,
      [newFare, newCommission, leg.id]
    );
    updated.push(result.rows[0]);
  }
  return updated;
}

// Looks for an open, compatible group for a newly-opted-in trip and, if
// found, attaches to it. Must run inside the same transaction/client as the
// trip's own INSERT (the caller passes its `client`), so a lost race here
// never leaves the new trip half-configured — the caller falls through to
// making it its own anchor instead.
//
// "Open" means: still shared, not finished/cancelled/already in progress
// (in_progress means every current member is already onboard and the
// driver has moved on to drop-offs — joining mid-trip is a deliberate
// fast-follow, not this pass), created within the match window, and under
// capacity. Candidates are pre-filtered by pickup proximity + bearing
// similarity before anything takes a row lock.
async function attemptSharedMatch(client, newTrip, config) {
  const windowSeconds = config.shared_match_window_seconds || 120;
  const radiusKm = config.shared_match_radius_km || 1.5;
  const bearingDeg = config.shared_match_bearing_deg || 45;
  const maxPassengers = config.shared_max_passengers || 2;

  const candidates = await client.query(
    `SELECT t.* FROM trips t
     WHERE t.ride_type = 'shared' AND t.shared_group_id = t.id
       AND t.id != $1
       AND t.status NOT IN ('completed', 'cancelled', 'no_driver_found', 'in_progress')
       AND t.created_at > NOW() - ($2 || ' seconds')::interval
       AND (SELECT COUNT(*) FROM trips WHERE shared_group_id = t.id AND status != 'cancelled') < $3
     ORDER BY t.created_at ASC`,
    [newTrip.id, windowSeconds, maxPassengers]
  );

  const newBearing = bearing(newTrip.pickup_lat, newTrip.pickup_lng, newTrip.dropoff_lat, newTrip.dropoff_lng);

  for (const candidate of candidates.rows) {
    const pickupDist = getDistanceKm(newTrip.pickup_lat, newTrip.pickup_lng, candidate.pickup_lat, candidate.pickup_lng);
    if (pickupDist > radiusKm) continue;

    const candidateBearing = bearing(candidate.pickup_lat, candidate.pickup_lng, candidate.dropoff_lat, candidate.dropoff_lng);
    if (angleDiff(newBearing, candidateBearing) > bearingDeg) continue;

    // Passed the cheap prefilter — lock the anchor row to serialize against
    // any other trip trying to claim the same open seat at the same
    // moment, then re-check everything that could have changed since the
    // unlocked read above (same shape as the discount-code atomic claim
    // and acceptOffer's driver-row lock elsewhere in this codebase).
    const lockResult = await client.query('SELECT * FROM trips WHERE id = $1 FOR UPDATE', [candidate.id]);
    const anchor = lockResult.rows[0];
    if (!anchor) continue;
    if (['completed', 'cancelled', 'no_driver_found', 'in_progress'].includes(anchor.status)) continue;

    const countResult = await client.query(
      `SELECT COUNT(*) FROM trips WHERE shared_group_id = $1 AND status != 'cancelled'`,
      [anchor.id]
    );
    if (parseInt(countResult.rows[0].count, 10) >= maxPassengers) continue;

    let driverIdToNotify = null;
    if (anchor.driver_id) {
      // A driver is already assigned to this group and hasn't reached the
      // first pickup yet (status would be 'in_progress' otherwise, already
      // excluded above) — assign them directly, skip trip_offers/broadcast
      // entirely for this leg since there's no competition to resolve.
      await client.query(
        `UPDATE trips SET shared_group_id = $1, ride_type = 'shared', driver_id = $2, status = 'accepted', accepted_at = NOW()
         WHERE id = $3`,
        [anchor.id, anchor.driver_id, newTrip.id]
      );
      driverIdToNotify = anchor.driver_id;
    } else {
      // No driver yet — this leg just joins the group and rides along with
      // whatever dispatch outcome the anchor gets. acceptOffer propagates
      // the eventual driver assignment to every sibling leg still sitting
      // at 'requested'.
      await client.query(
        `UPDATE trips SET shared_group_id = $1, ride_type = 'shared' WHERE id = $2`,
        [anchor.id, newTrip.id]
      );
    }

    const updatedMembers = await recomputeGroupFares(client, anchor.id, config);
    const updatedNewTrip = updatedMembers.find((t) => t.id === newTrip.id);

    return {
      attached: true,
      trip: updatedNewTrip,
      driverIdToNotify,
      anchorPassengerId: anchor.passenger_id,
    };
  }

  return { attached: false };
}

// Called from arrivedAtPickup once a leg reaches 'arrived'. Only acts once
// the group actually has 2+ active members (a shared-opted-in trip that
// never matched anyone behaves exactly like a solo trip — this function is
// a no-op for it, and the normal explicit "Start Trip" tap still applies).
// Once every active member has reached 'arrived' or further, flips them
// all to 'in_progress' in one pass, applying each leg's own wait-penalty
// exactly like startTrip already does for a solo trip — this is "the trip
// starts the moment everyone's onboard," with no separate button for it.
async function tryAutoStartGroup(db, groupId) {
  const members = await db.query(
    `SELECT * FROM trips WHERE shared_group_id = $1 AND status != 'cancelled'`,
    [groupId]
  );
  if (members.rows.length < 2) return null;

  const allOnboard = members.rows.every((t) => ['arrived', 'in_progress', 'completed'].includes(t.status));
  if (!allOnboard) return null;

  const configResult = await db.query('SELECT key, value FROM config');
  const config = {};
  configResult.rows.forEach((row) => { config[row.key] = parseFloat(row.value); });

  const started = [];
  for (const leg of members.rows) {
    if (leg.status !== 'arrived') continue; // already in_progress/completed — idempotent re-entry guard

    let waitPenalty = 0;
    if (leg.arrived_at) {
      const waitSeconds = Math.floor((Date.now() - new Date(leg.arrived_at).getTime()) / 1000);
      const freeWaitSeconds = 300;
      if (waitSeconds > freeWaitSeconds) {
        waitPenalty = Math.floor((waitSeconds - freeWaitSeconds) / 120) * 1;
      }
    }
    const newFare = parseFloat(leg.fare) + waitPenalty;
    const newCommission = Math.round(newFare * config.commission_rate * 100) / 100;

    const result = await db.query(
      `UPDATE trips SET status = 'in_progress', fare = $1, commission = $2, wait_penalty = $3
       WHERE id = $4 AND status = 'arrived' RETURNING *`,
      [newFare, newCommission, waitPenalty, leg.id]
    );
    if (result.rows[0]) started.push(result.rows[0]);
  }
  return started;
}

// Public info about a trip's co-riders, for the passenger/driver status
// endpoints to layer onto their existing single-trip response. Returns []
// for a solo trip (no group) rather than null, so callers can always just
// spread/map it without a null check.
async function getGroupSiblings(db, trip) {
  if (!trip.shared_group_id) return [];
  const result = await db.query(
    `SELECT t.id, t.status, t.pickup_address, t.dropoff_address, u.first_name
     FROM trips t JOIN users u ON t.passenger_id = u.id
     WHERE t.shared_group_id = $1 AND t.id != $2 AND t.status != 'cancelled'`,
    [trip.shared_group_id, trip.id]
  );
  return result.rows;
}

// Full trip rows (with passenger name/phone) for every active leg in a
// group — what the driver app needs to render the multi-stop pickup/
// drop-off screens (map coordinates, fare, who to call), as opposed to
// getGroupSiblings' lighter public-info shape for the passenger side.
async function getFullGroup(db, groupId) {
  const result = await db.query(
    `SELECT t.*, u.first_name as passenger_first_name, u.last_name as passenger_last_name, u.phone_number as passenger_phone
     FROM trips t JOIN users u ON t.passenger_id = u.id
     WHERE t.shared_group_id = $1 AND t.status != 'cancelled'
     ORDER BY t.created_at ASC`,
    [groupId]
  );
  return result.rows;
}

module.exports = {
  getDistanceKm, bearing, angleDiff, isNightNow,
  recomputeGroupFares, attemptSharedMatch, tryAutoStartGroup, getGroupSiblings, getFullGroup,
};
