// The tiered day/night/distance fare calculation, shared by requestRide
// (ridesController.js) and the ride-sharing matching logic (sharedRides.js)
// so there is exactly one copy of this math. It has already caused two real
// pricing incidents in this project (a price-cliff from a mismatched
// base_fare/day_lower_flat, and a minimum_fare floor that silently
// undercut a deliberately-set low tier) — a duplicated copy is exactly how
// a future fix to one would quietly miss the other.
const MINIMUM_FARE_FALLBACK = 12;

const calculateFare = (distanceKm, config, isNight) => {
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

  // Hard floor, applied last regardless of which branch above produced
  // the number — a single misconfigured tier (e.g. day_lower_flat set too
  // low) can't silently undercut what's actually a fair minimum fare.
  const minimumFare = Number.isFinite(config.minimum_fare) ? config.minimum_fare : MINIMUM_FARE_FALLBACK;
  return Math.max(fare, minimumFare);
};

module.exports = { calculateFare };
