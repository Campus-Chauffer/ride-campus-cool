import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, Alert, Image, Linking
} from 'react-native';
import RNMapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { MapPin, X, Phone } from 'lucide-react-native';
import { ridesAPI } from '../../services/api';
import socketService from '../../services/socket';
import { useThemeStore } from '../../store/themeStore';
import { getColors, spacing, fontSizes, radius, shadows, bottomPadding, navy, white } from '../../utils/theme';
import { getBearing } from '../../utils/geo';

const CAR_ICON = require('../../../assets/car-top.png');
// Driver location updates arrive roughly every 4s (the driver's own share
// interval) — animating the marker over most of that window makes it glide
// continuously instead of snapping in place, without lagging behind the
// next update.
const MARKER_ANIMATION_MS = 2500;

interface Props {
  trip: any;
  onCancelled: () => void;
}

export default function DriverFoundScreen({ trip, onCancelled }: Props) {
  const { isDark } = useThemeStore();
  const colors = getColors(isDark);
  const styles = getStyles(colors);
  const mapRef = useRef<any>(null);
  const carMarkerRef = useRef<any>(null);
  const userLocationRef = useRef<any>(null);
  const [userLocation, setUserLocation] = useState<any>(null);
  const initialDriverLocation = trip.driver_lat && trip.driver_lng
    ? { lat: parseFloat(trip.driver_lat), lng: parseFloat(trip.driver_lng) }
    : null;
  const [driverLocation, setDriverLocation] = useState<any>(initialDriverLocation);
  // Mirrors driverLocation but read inside a mount-only effect's closure, so
  // it always reflects the latest value instead of the one captured when
  // the effect first ran (state would be frozen at its initial value there).
  const driverLocationRef = useRef<any>(initialDriverLocation);
  // Tracks the last position seen via the DB-polling fallback specifically
  // (separate from driverLocationRef, which the socket path also writes to)
  // so the bearing-from-consecutive-points heading calculation below always
  // compares against a same-source previous point.
  const fallbackLocationRef = useRef<any>(initialDriverLocation);
  const [driverHeading, setDriverHeading] = useState(0);
  const [routeCoords, setRouteCoords] = useState<any[]>([]);
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);
  const [etaText, setEtaText] = useState<string | null>(null);
  const [trackCarMarker, setTrackCarMarker] = useState(true);
  const directionsRequestId = useRef(0);

  // Glides the car icon to its new position instead of letting the
  // coordinate prop change snap it there instantly. Falls back to a plain
  // state update (instant placement) the first time, since there's nothing
  // to animate from yet.
  const moveDriverMarker = (lat: number, lng: number) => {
    if (carMarkerRef.current && driverLocationRef.current) {
      carMarkerRef.current.animateMarkerToCoordinate({ latitude: lat, longitude: lng }, MARKER_ANIMATION_MS);
    }
    driverLocationRef.current = { lat, lng };
  };

  useEffect(() => {
    getUserLocation();

    socketService.onDriverLocation((data) => {
      const { latitude, longitude, heading } = data;
      moveDriverMarker(latitude, longitude);
      setDriverLocation({ lat: latitude, lng: longitude });
      setDriverHeading(heading || 0);
      if (userLocationRef.current) {
        getDirections(latitude, longitude, userLocationRef.current.lat, userLocationRef.current.lng);
        mapRef.current?.fitToCoordinates(
          [
            { latitude, longitude },
            { latitude: userLocationRef.current.lat, longitude: userLocationRef.current.lng },
          ],
          { edgePadding: { top: 120, right: 80, bottom: 320, left: 80 }, animated: true }
        );
      }
    });

    return () => {
      socketService.offDriverLocation();
    };
  }, []);

  // Fallback driver-location source for whenever the socket hasn't delivered
  // an update yet — piggybacks on the trip prop, which the parent
  // (RideMatchingScreen) already refreshes every 3s via its own status poll,
  // instead of running a second independent poll of the same data here. This
  // screen used to run its own 3s getHistory() poll in parallel with the
  // parent's, doubling request load right when a driver is en route — the
  // worst possible time to double up on a weak connection, and the parent's
  // poll is also the only place that ever checks for the 'arrived' status,
  // so the duplicate poll here was pure waste, not redundancy.
  useEffect(() => {
    if (trip.driver_lat && trip.driver_lng) {
      const dLat = parseFloat(trip.driver_lat);
      const dLng = parseFloat(trip.driver_lng);
      const prev = fallbackLocationRef.current;
      // Only the socket payload carries the driver's own reported heading —
      // this DB fallback only has lat/lng, so derive a heading from the
      // bearing between consecutive fallback points instead of leaving the
      // icon frozen at whatever rotation it last had (0 if the socket never
      // connected at all), which is what "stuck facing one direction" was.
      if (prev && (Math.abs(prev.lat - dLat) > 0.00001 || Math.abs(prev.lng - dLng) > 0.00001)) {
        setDriverHeading(getBearing(prev.lat, prev.lng, dLat, dLng));
      }
      fallbackLocationRef.current = { lat: dLat, lng: dLng };
      moveDriverMarker(dLat, dLng);
      setDriverLocation({ lat: dLat, lng: dLng });
      if (userLocationRef.current) {
        getDirections(dLat, dLng, userLocationRef.current.lat, userLocationRef.current.lng);
      }
    }
  }, [trip.driver_lat, trip.driver_lng]);

  useEffect(() => {
    if (userLocation && driverLocation) {
      userLocationRef.current = userLocation;
      getDirections(driverLocation.lat, driverLocation.lng, userLocation.lat, userLocation.lng);
      mapRef.current?.fitToCoordinates(
        [
          { latitude: driverLocation.lat, longitude: driverLocation.lng },
          { latitude: userLocation.lat, longitude: userLocation.lng },
        ],
        { edgePadding: { top: 120, right: 80, bottom: 320, left: 80 }, animated: true }
      );
    }
  }, [userLocation]);

  const getUserLocation = async () => {
    // Race a cached fix (near-instant) against a fresh one (accurate but can
    // take a few seconds on a cold GPS lock) so the map/route/marker can
    // paint immediately instead of staying blank until the fresh fix lands.
    Location.getLastKnownPositionAsync({}).then((cached) => {
      if (!cached || userLocationRef.current) return;
      const location = { lat: cached.coords.latitude, lng: cached.coords.longitude };
      setUserLocation(location);
      userLocationRef.current = location;
    }).catch(() => {});

    try {
      const loc = await Location.getCurrentPositionAsync({});
      const location = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      setUserLocation(location);
      userLocationRef.current = location;
    } catch (err) {
      console.log('Location error:', err);
    }
  };

  const getDirections = async (fromLat: number, fromLng: number, toLat: number, toLng: number) => {
    // Requests fire from three places (socket updates, the trip-prop fallback
    // effect, and the userLocation effect) and can resolve out of order on a
    // slow network — guard against an older response clobbering a newer one's
    // route/ETA.
    const requestId = ++directionsRequestId.current;
    try {
      const res = await ridesAPI.getDirections(fromLat, fromLng, toLat, toLng);
      if (requestId !== directionsRequestId.current) return;
      if (res.data?.coordinates?.length > 0) {
        setRouteCoords(res.data.coordinates);
        if (res.data.duration_minutes != null) {
          setEtaMinutes(res.data.duration_minutes);
          setEtaText(res.data.duration_text);
        }
      }
    } catch (err) {
      console.log('Directions error:', err);
    }
  };

  // react-native-maps re-rasterizes a custom marker's view on every render
  // while tracksViewChanges is true, which is expensive and the main source
  // of map jank. The car icon only visually changes when heading or the ETA
  // badge text changes, so track briefly around those changes and otherwise
  // leave it off.
  useEffect(() => {
    setTrackCarMarker(true);
    const t = setTimeout(() => setTrackCarMarker(false), 250);
    return () => clearTimeout(t);
  }, [driverHeading, etaMinutes]);

  const cancelRide = () => {
    Alert.alert('Cancel Ride', 'Are you sure you want to cancel?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, cancel', style: 'destructive', onPress: async () => {
          try {
            await ridesAPI.cancelRide(trip.id);
            onCancelled();
          } catch (err) {
            Alert.alert('Error', 'Could not cancel ride');
          }
        }
      },
    ]);
  };

  const callDriver = () => {
    if (trip.driver_phone) Linking.openURL(`tel:${trip.driver_phone}`);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <RNMapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        showsUserLocation
        showsMyLocationButton={false}
        initialRegion={{
          latitude: parseFloat(trip.pickup_lat) || 5.6502,
          longitude: parseFloat(trip.pickup_lng) || -0.1870,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
      >
        {driverLocation && (
          <Marker
            ref={carMarkerRef}
            coordinate={{ latitude: driverLocation.lat, longitude: driverLocation.lng }}
            title="Driver"
            anchor={{ x: 0.5, y: 0.5 }}
            rotation={driverHeading}
            flat
            tracksViewChanges={trackCarMarker}
          >
            {/* ETA badge on the car icon like Bolt */}
            <View style={styles.carMarkerContainer}>
              {etaMinutes !== null && (
                <View style={styles.etaMapBadge}>
                  <Text style={styles.etaMapNumber}>{etaMinutes}</Text>
                  <Text style={styles.etaMapUnit}>min</Text>
                </View>
              )}
              <Image source={CAR_ICON} style={styles.carIcon} resizeMode="contain" />
            </View>
          </Marker>
        )}

        <Marker
          coordinate={{
            latitude: parseFloat(trip.pickup_lat) || 5.6502,
            longitude: parseFloat(trip.pickup_lng) || -0.1870,
          }}
          title="Your pickup"
          anchor={{ x: 0.5, y: 1 }}
          tracksViewChanges={false}
        >
          <View style={styles.pickupMarker}>
            <MapPin size={16} color={colors.white} />
          </View>
        </Marker>

        {routeCoords.length > 0 && (
          <Polyline coordinates={routeCoords} strokeColor={colors.primary} strokeWidth={4} />
        )}
      </RNMapView>

      <View style={styles.bottomCard}>
        {/* Bolt-style: "Arriving in X min" as main heading */}
        <Text style={styles.arrivingText}>
          {etaMinutes !== null ? `Arriving in ${etaMinutes} min` : 'Driver is on the way'}
        </Text>

        {/* Vehicle info row like Bolt */}
        <View style={styles.vehicleRow}>
          <Text style={styles.vehicleText}>
            {trip.vehicle_make} {trip.vehicle_model}, {trip.vehicle_color}
          </Text>
          <View style={styles.platePill}>
            <Text style={styles.plateText}>{trip.plate_number}</Text>
          </View>
        </View>

        {/* Driver row */}
        <View style={styles.driverRow}>
          {/* Driver photo or initial */}
          <View style={styles.driverPhotoContainer}>
            {trip.driver_photo ? (
              <Image source={{ uri: trip.driver_photo }} style={styles.driverPhoto} />
            ) : (
              <View style={styles.driverAvatar}>
                <Text style={styles.driverAvatarText}>{trip.driver_first_name?.[0] || 'D'}</Text>
              </View>
            )}
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedTick}>✓</Text>
            </View>
          </View>

          <View style={styles.driverMeta}>
            <Text style={styles.driverName}>{trip.driver_first_name} {trip.driver_last_name}</Text>
          </View>

          {/* Call button */}
          {trip.driver_phone && (
            <TouchableOpacity style={styles.callBtn} onPress={callDriver}>
              <Phone size={18} color={navy} />
            </TouchableOpacity>
          )}

          <Text style={styles.fareText}>GH₵{Math.round(parseFloat(trip.fare))}</Text>
        </View>

        {/* Cancel */}
        <TouchableOpacity style={styles.cancelBtn} onPress={cancelRide}>
          <X size={16} color={colors.error} />
          <Text style={styles.cancelBtnText}>Cancel Ride</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  carMarkerContainer: { alignItems: 'center' },
  etaMapBadge: {
    backgroundColor: colors.success,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
    marginBottom: 2,
    minWidth: 44,
    ...shadows.sm,
  },
  // etaMapBadge's background is the fixed success green in both themes, so
  // its text is pinned to white rather than colors.white, which would
  // invert to navy in dark mode.
  etaMapNumber: { fontSize: 14, fontWeight: '800', color: white, lineHeight: 16 },
  etaMapUnit: { fontSize: 9, fontWeight: '600', color: white, lineHeight: 10 },
  carIcon: { width: 44, height: 44 },
  pickupMarker: {
    width: 30, height: 30,
    borderRadius: radius.full,
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  bottomCard: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    paddingBottom: bottomPadding,
    ...shadows.lg,
  },
  arrivingText: {
    fontSize: fontSizes.xl,
    fontWeight: '800',
    color: colors.dark,
    marginBottom: spacing.xs,
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  vehicleText: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    fontWeight: '500',
    flex: 1,
  },
  platePill: {
    borderWidth: 1.5,
    borderColor: colors.dark,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  plateText: {
    fontSize: fontSizes.sm,
    fontWeight: '800',
    color: colors.dark,
    letterSpacing: 1,
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray2,
    marginBottom: spacing.md,
  },
  driverPhotoContainer: { position: 'relative' },
  driverPhoto: {
    width: 52, height: 52,
    borderRadius: radius.full,
    backgroundColor: colors.gray2,
  },
  driverAvatar: {
    width: 52, height: 52,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverAvatarText: { fontSize: fontSizes.lg, fontWeight: '800', color: navy },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0, right: 0,
    width: 18, height: 18,
    borderRadius: radius.full,
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  verifiedTick: { fontSize: 9, fontWeight: '800', color: white },
  driverMeta: { flex: 1 },
  driverName: { fontSize: fontSizes.md, fontWeight: '700', color: colors.dark },
  callBtn: {
    width: 44, height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  fareText: { fontSize: fontSizes.lg, fontWeight: '800', color: colors.dark },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.error,
  },
  cancelBtnText: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.error },
});