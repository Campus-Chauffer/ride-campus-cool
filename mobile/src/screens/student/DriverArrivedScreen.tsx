import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, Linking, Alert, Image
} from 'react-native';
import RNMapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { MapPin, Phone, Clock, AlertTriangle } from 'lucide-react-native';
import { driverAPI, ridesAPI } from '../../services/api';
import socketService from '../../services/socket';
import { useThemeStore } from '../../store/themeStore';
import { getColors, spacing, fontSizes, radius, shadows, bottomPadding, androidTopPadding, navy } from '../../utils/theme';
import { haversineMeters } from '../../utils/geo';

const CAR_ICON = require('../../../assets/car-top.png');
// This screen used to arrive at a fixed 1.5s glide because updates only
// ever came from an occasional GPS jitter — now that the driver's phone
// streams continuously (see ArrivedAtPickupScreen), the duration is
// measured from the actual gap since the last update instead, same as the
// driving legs.
const MIN_ANIMATION_MS = 400;
const MAX_ANIMATION_MS = 3000;
// If the driver's live position is further than this from the pickup
// point while "arrived," something's off — either they tapped the button
// prematurely or GPS is having a bad moment — and the passenger should see
// that plainly instead of just trusting an unqualified "arrived" screen.
// This is the trust gap a real test surfaced: a driver marked arrived
// while genuinely elsewhere, and the app had nothing to say about it.
const ARRIVAL_MISMATCH_THRESHOLD_M = 150;

interface Props {
  trip: any;
  onTripStarted: () => void;
  onCancelled: () => void;
}

export default function DriverArrivedScreen({ trip, onTripStarted, onCancelled }: Props) {
  const { isDark } = useThemeStore();
  const colors = getColors(isDark);
  // This screen re-renders every second for its wait timer plus every few
  // seconds for live GPS updates — without memoizing, getStyles reruns
  // StyleSheet.create on every one of those ticks for no reason.
  const styles = useMemo(() => getStyles(colors), [colors]);
  const [waitSeconds, setWaitSeconds] = useState(0);
  const [currentFare, setCurrentFare] = useState(parseFloat(trip.fare));
  const [waitPenalty, setWaitPenalty] = useState(0);
  const initialDriverLocation = trip.driver_lat && trip.driver_lng
    ? { latitude: parseFloat(trip.driver_lat), longitude: parseFloat(trip.driver_lng) }
    : null;
  const [driverLocation, setDriverLocation] = useState<{ latitude: number; longitude: number } | null>(initialDriverLocation);
  const [driverHeading, setDriverHeading] = useState(0);
  // Mirrors driverLocation but read inside a mount-only effect's closure, so
  // it always reflects the latest value instead of the one captured when
  // the effect first ran (state would be frozen at its initial value there).
  const driverLocationRef = useRef<{ latitude: number; longitude: number } | null>(initialDriverLocation);
  const lastMarkerUpdateAtRef = useRef<number>(Date.now());
  const mapRef = useRef<RNMapView>(null);
  const carMarkerRef = useRef<any>(null);
  const timerRef = useRef<any>(null);
  const fareRef = useRef<any>(null);

  const FREE_WAIT = 300;

  // Glides the car icon to its new position, animating over however long
  // it's actually been since the last update (clamped) rather than a fixed
  // duration.
  const moveDriverMarker = (lat: number, lng: number) => {
    const coord = { latitude: lat, longitude: lng };
    if (carMarkerRef.current && driverLocationRef.current) {
      const now = Date.now();
      const duration = Math.max(MIN_ANIMATION_MS, Math.min(MAX_ANIMATION_MS, now - lastMarkerUpdateAtRef.current));
      carMarkerRef.current.animateMarkerToCoordinate(coord, duration);
      lastMarkerUpdateAtRef.current = now;
    }
    driverLocationRef.current = coord;
    return coord;
  };

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setWaitSeconds(prev => prev + 1);
    }, 1000);

    // Poll live fare from backend
    fareRef.current = setInterval(async () => {
      try {
        const res = await driverAPI.getWaitFare(trip.id);
        setCurrentFare(res.data.current_fare);
        setWaitPenalty(res.data.wait_penalty);
        setWaitSeconds(res.data.wait_seconds);
      } catch (err) {
        console.log('Wait fare poll error:', err);
      }
    }, 10000);

    // Subscribe to live driver location — same mechanism as ToPickupScreen,
    // since the driver hasn't left the trip, just changed phase to "arrived"
    socketService.joinRide(trip.id);
    socketService.onDriverLocation((data) => {
      const coord = moveDriverMarker(data.latitude, data.longitude);
      setDriverLocation(coord);
      setDriverHeading(data.heading || 0);
      mapRef.current?.animateToRegion({
        latitude: data.latitude,
        longitude: data.longitude,
        latitudeDelta: 0.006,
        longitudeDelta: 0.006,
      }, 500);
    });

    return () => {
      clearInterval(timerRef.current);
      clearInterval(fareRef.current);
      socketService.offDriverLocation();
    };
  }, []);

  // DB-polling fallback for whenever the socket hasn't delivered an update
  // yet, same pattern as the driving-leg screens — the parent
  // (RideMatchingScreen) keeps refreshing the trip prop regardless of phase.
  useEffect(() => {
    if (trip.driver_lat && trip.driver_lng) {
      const coord = moveDriverMarker(parseFloat(trip.driver_lat), parseFloat(trip.driver_lng));
      setDriverLocation(coord);
    }
  }, [trip.driver_lat, trip.driver_lng]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const timeRemaining = Math.max(FREE_WAIT - waitSeconds, 0);
  const isInPenalty = waitSeconds > FREE_WAIT;

  const callDriver = () => {
    if (trip.driver_phone) {
      Linking.openURL(`tel:${trip.driver_phone}`);
    }
  };

  const cancelRide = async () => {
    Alert.alert('Cancel Ride', 'Your driver has already arrived. Are you sure you want to cancel?', [
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
      }
    ]);
  };

  // Fall back to pickup location only until the first real location event arrives —
  // avoids a blank/uncentered map for the brief window before the driver's phone
  // emits its first position, without ever showing it as a stale "driver position"
  const mapCenter = driverLocation ?? {
    latitude: parseFloat(trip.pickup_lat),
    longitude: parseFloat(trip.pickup_lng),
  };

  // Surfaces the exact mismatch a real test caught: a driver marked
  // "arrived" while their live position says otherwise. Only flagged once
  // an actual GPS fix has come in — never inferred from the absence of one.
  const distanceFromPickup = driverLocation
    ? haversineMeters(
        driverLocation.latitude, driverLocation.longitude,
        parseFloat(trip.pickup_lat), parseFloat(trip.pickup_lng)
      )
    : null;
  const arrivalMismatch = distanceFromPickup !== null && distanceFromPickup > ARRIVAL_MISMATCH_THRESHOLD_M;

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Map showing driver's live location */}
      <View style={styles.mapContainer}>
        <RNMapView
          ref={mapRef}
          style={StyleSheet.absoluteFillObject}
          provider={PROVIDER_GOOGLE}
          initialRegion={{
            latitude: mapCenter.latitude,
            longitude: mapCenter.longitude,
            latitudeDelta: 0.008,
            longitudeDelta: 0.008,
          }}
        >
          {driverLocation && (
            <Marker
              ref={carMarkerRef}
              coordinate={driverLocation}
              title="Your driver"
              anchor={{ x: 0.5, y: 0.5 }}
              rotation={driverHeading}
              flat
              tracksViewChanges={false}
            >
              <Image source={CAR_ICON} style={styles.carIcon} resizeMode="contain" />
            </Marker>
          )}
          <Marker
            coordinate={{
              latitude: parseFloat(trip.pickup_lat),
              longitude: parseFloat(trip.pickup_lng),
            }}
            title="Pickup point"
            anchor={{ x: 0.5, y: 1 }}
            tracksViewChanges={false}
          >
            <View style={styles.pickupMarker}>
              <MapPin size={16} color={navy} />
            </View>
          </Marker>
        </RNMapView>
      </View>

      {/* Bottom sheet */}
      <View style={styles.bottomSheet}>

        {/* Arrived header */}
        <View style={styles.arrivedHeader}>
          <View style={styles.arrivedIconContainer}>
            <MapPin size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.arrivedTitle}>Your driver has arrived!</Text>
            <Text style={styles.arrivedSubtitle}>Waiting at {trip.pickup_address}</Text>
          </View>
        </View>

        {/* Flags the exact scenario a real test caught: the driver marked
            arrived from somewhere that isn't actually the pickup point. */}
        {arrivalMismatch && (
          <View style={styles.mismatchBanner}>
            <AlertTriangle size={16} color="#FF4444" />
            <Text style={styles.mismatchText}>
              Your driver's live location is about {Math.round(distanceFromPickup!)}m from the pickup point — they may still be on the way.
            </Text>
          </View>
        )}

        {/* Timer */}
        <View style={[styles.timerCard, isInPenalty && styles.timerCardPenalty]}>
          <Clock size={16} color={isInPenalty ? '#FF4444' : colors.primary} />
          {!isInPenalty ? (
            <View style={{ flex: 1 }}>
              <Text style={styles.timerText}>
                <Text style={styles.timerBold}>{formatTime(timeRemaining)}</Text> free wait remaining
              </Text>
              <Text style={styles.timerWarning}>After this, GH₵1 is added every 2 minutes</Text>
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              <Text style={[styles.timerText, { color: '#FF4444' }]}>
                Wait fee: <Text style={styles.timerBold}>+GH₵{waitPenalty.toFixed(2)}</Text>
              </Text>
              <Text style={styles.timerWarning}>Waited {formatTime(waitSeconds)} • GH₵1 per 2 min</Text>
            </View>
          )}
        </View>

        {/* Driver info */}
        <View style={styles.driverCard}>
          <View style={styles.driverRow}>
            <View style={styles.driverAvatar}>
              <Text style={styles.driverAvatarText}>
                {trip.driver_first_name?.[0] || 'D'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.driverName}>
                {trip.driver_first_name} {trip.driver_last_name}
              </Text>
              <Text style={styles.driverVehicle}>
                {trip.vehicle_color} {trip.vehicle_make} {trip.vehicle_model}
              </Text>
              <Text style={styles.driverPlate}>{trip.plate_number}</Text>
            </View>
            {trip.driver_phone && (
              <TouchableOpacity style={styles.callBtn} onPress={callDriver}>
                <Phone size={16} color={navy} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Fare */}
        <View style={styles.fareRow}>
          <Text style={styles.fareLabel}>
            {waitPenalty > 0 ? 'Updated fare' : 'Estimated fare'}
          </Text>
          <Text style={[styles.fareValue, isInPenalty && { color: '#FF4444' }]}>
            GH₵{currentFare.toFixed(2)}
          </Text>
        </View>

        {/* Cancel */}
        <TouchableOpacity style={styles.cancelBtn} onPress={cancelRide}>
          <Text style={styles.cancelText}>Cancel Ride</Text>
        </TouchableOpacity>

      </View>
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  mapContainer: { flex: 1 },
  bottomSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    paddingBottom: bottomPadding,
    ...shadows.lg,
  },
  arrivedHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  arrivedIconContainer: {
    width: 44, height: 44,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,184,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrivedTitle: { fontSize: fontSizes.md, fontWeight: '800', color: colors.dark },
  arrivedSubtitle: { fontSize: fontSizes.xs, color: colors.textMuted, marginTop: 2 },
  timerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(255,184,0,0.08)',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,184,0,0.25)',
  },
  timerCardPenalty: {
    backgroundColor: 'rgba(255,68,68,0.08)',
    borderColor: 'rgba(255,68,68,0.25)',
  },
  timerText: { fontSize: fontSizes.sm, color: colors.dark },
  timerBold: { fontWeight: '800' },
  timerWarning: { fontSize: fontSizes.xs, color: colors.textMuted, marginTop: 2 },
  driverCard: {
    backgroundColor: colors.gray,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  driverAvatar: { width: 48, height: 48, borderRadius: radius.full, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  driverAvatarText: { fontSize: fontSizes.lg, fontWeight: '800', color: navy },
  driverName: { fontSize: fontSizes.md, fontWeight: '700', color: colors.dark },
  driverVehicle: { fontSize: fontSizes.xs, color: colors.textMuted, marginTop: 2 },
  // Card background is light gray — brand yellow text there is ~1.9:1
  // contrast, so use navy instead.
  driverPlate: { fontSize: fontSizes.xs, color: colors.dark, fontWeight: '600', marginTop: 2 },
  callBtn: { width: 40, height: 40, borderRadius: radius.full, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  fareRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  fareLabel: { fontSize: fontSizes.sm, color: colors.textMuted },
  fareValue: { fontSize: fontSizes.lg, fontWeight: '800', color: colors.dark },
  cancelBtn: { padding: spacing.md, borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.gray2, alignItems: 'center' },
  cancelText: { fontSize: fontSizes.sm, color: colors.textMuted, fontWeight: '600' },
  pickupMarker: { width: 32, height: 32, borderRadius: radius.full, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', ...shadows.md },
  carIcon: { width: 36, height: 36 },
  mismatchBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(255,68,68,0.08)',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,68,68,0.25)',
  },
  mismatchText: { flex: 1, fontSize: fontSizes.xs, color: colors.dark, lineHeight: 18 },
});