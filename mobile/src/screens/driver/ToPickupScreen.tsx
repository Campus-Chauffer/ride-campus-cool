import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, Linking, Alert, Image
} from 'react-native';
import RNMapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { CheckCircle, MapPin, Phone } from 'lucide-react-native';
import socketService from '../../services/socket';
import { ridesAPI } from '../../services/api';
import { useThemeStore } from '../../store/themeStore';
import { getColors, spacing, fontSizes, radius, shadows, bottomPadding, navy } from '../../utils/theme';
import { shouldRefreshRoute, haversineMeters } from '../../utils/geo';

// Below this, GPS-derived heading is a known-unreliable reading (it's
// largely Doppler-derived and gets noisy near-stationary) rather than
// something worth smoothing after the fact — better to just not transmit
// it and let the passenger's marker keep its last real heading.
const MIN_HEADING_SPEED_MPS = 1;

// A driver tapping "I've Arrived" while genuinely far from the pickup point
// (whether an honest mis-tap or not) previously went straight through with
// no check at all, and the passenger's app had no way to tell the
// difference — this is the trust gap that surfaced from an actual test.
// 150m is generous enough for GPS drift and a building's real entrance
// being set back from its pin, while still catching "nowhere near."
const ARRIVAL_DISTANCE_THRESHOLD_M = 150;

const CAR_ICON = require('../../../assets/car-top.png');

interface Props {
  trip: any;
  onArrived: () => void;
  onCancelled: () => void;
}

export default function ToPickupScreen({ trip, onArrived, onCancelled }: Props) {
  const { isDark } = useThemeStore();
  const colors = getColors(isDark);
  const styles = getStyles(colors);
  const [driverLocation, setDriverLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [driverHeading, setDriverHeading] = useState(0);
  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);
  const mapRef = useRef<RNMapView>(null);
  const routeRequestId = useRef(0);
  const lastRouteFetchAt = useRef<number | null>(null);
  const lastRouteFetchOrigin = useRef<{ latitude: number; longitude: number } | null>(null);

  // Track our own GPS position and broadcast it over the socket so the
  // passenger's map can follow us live on the way to pickup — this screen
  // is the location source for this leg of the trip, not a listener.
  useEffect(() => {
    let cancelled = false;
    let subscription: Location.LocationSubscription | null = null;
    let lastGoodHeading = 0;

    const applyLocation = (coords: { latitude: number; longitude: number; heading?: number | null; speed?: number | null }) => {
      if (cancelled) return;
      const { latitude, longitude, heading, speed } = coords;
      const headingReliable = heading != null && heading >= 0 && (speed == null || speed >= MIN_HEADING_SPEED_MPS);
      if (headingReliable) lastGoodHeading = heading as number;
      setDriverLocation({ latitude, longitude });
      setDriverHeading(lastGoodHeading);
      socketService.sendLocation(trip.id, latitude, longitude, lastGoodHeading);
    };

    // A cold GPS fix can take a few seconds — race a cached fix in parallel
    // so the map/marker/route can appear immediately instead of sitting
    // blank until the first accurate reading resolves.
    Location.getLastKnownPositionAsync({}).then((cached) => {
      if (cached) applyLocation(cached.coords);
    }).catch(() => {});

    // A continuous GPS stream instead of polling getCurrentPositionAsync on
    // a timer — the OS pushes a fresh fix roughly every 2s (or every 5m
    // moved, whichever comes first) instead of every reading paying the
    // latency of a fresh cold fix, which is both smoother for the
    // passenger's marker and more power-efficient than repeated one-shot
    // requests.
    Location.watchPositionAsync(
      { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 2000, distanceInterval: 5 },
      (loc) => applyLocation(loc.coords)
    ).then((sub) => {
      if (cancelled) { sub.remove(); return; }
      subscription = sub;
    }).catch((err) => console.log('Location watch error:', err));

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, []);

  useEffect(() => {
    fetchRoute();
  }, [driverLocation]);

  async function fetchRoute() {
    if (!driverLocation) return; // wait until we have a real starting point
    // Location updates now arrive continuously rather than every 4s, but a
    // route recalculation is a paid Directions API call — only actually
    // refetch on a time/distance cadence, independent of how often raw
    // location pings come in.
    if (!shouldRefreshRoute(lastRouteFetchAt.current, lastRouteFetchOrigin.current, driverLocation)) return;
    lastRouteFetchAt.current = Date.now();
    lastRouteFetchOrigin.current = driverLocation;
    // Guard against an older, slower response overwriting a newer route.
    const requestId = ++routeRequestId.current;
    try {
      const res = await ridesAPI.getDirections(
        driverLocation.latitude,
        driverLocation.longitude,
        parseFloat(trip.pickup_lat),
        parseFloat(trip.pickup_lng)
      );
      if (requestId !== routeRequestId.current) return;
      if (res.data?.coordinates) {
        setRouteCoords(res.data.coordinates);
      }
    } catch (err) {
      console.log('Directions error:', err);
    }
  }

  const callPassenger = () => {
    if (trip.passenger_phone) {
      Linking.openURL(`tel:${trip.passenger_phone}`);
    }
  };

  // Confirms the driver is actually near the pickup point before letting
  // "I've Arrived" go through — a plain tap used to fire instantly
  // regardless of where the driver's GPS actually put them, which is
  // exactly what let a mis-tap during testing show the passenger a driver
  // "at" the pickup point who wasn't there at all.
  const confirmArrival = () => {
    if (driverLocation) {
      const distance = haversineMeters(
        driverLocation.latitude, driverLocation.longitude,
        parseFloat(trip.pickup_lat), parseFloat(trip.pickup_lng)
      );
      if (distance > ARRIVAL_DISTANCE_THRESHOLD_M) {
        return Alert.alert(
          "You're not at the pickup point yet",
          `You appear to be about ${Math.round(distance)}m from ${trip.pickup_address}. Are you sure you've arrived?`,
          [
            { text: 'Not yet', style: 'cancel' },
            { text: "Yes, I've arrived", style: 'destructive', onPress: onArrived },
          ]
        );
      }
    }
    onArrived();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <View style={styles.mapContainer}>
        <RNMapView
          ref={mapRef}
          style={StyleSheet.absoluteFillObject}
          provider={PROVIDER_GOOGLE}
          initialRegion={{
            latitude: driverLocation?.latitude || parseFloat(trip.pickup_lat),
            longitude: driverLocation?.longitude || parseFloat(trip.pickup_lng),
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
        >
          {driverLocation && (
            <Marker
              coordinate={driverLocation}
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
            anchor={{ x: 0.5, y: 1 }}
            tracksViewChanges={false}
          >
            <View style={styles.pickupMarker}>
              <MapPin size={16} color={colors.white} />
            </View>
          </Marker>

          {routeCoords.length > 0 && (
            <Polyline
              coordinates={routeCoords}
              strokeColor={colors.primary}
              strokeWidth={4}
            />
          )}
        </RNMapView>
      </View>

      <View style={styles.bottomSheet}>
        <View style={styles.headerRow}>
          <View style={styles.headerIcon}>
            <MapPin size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Head to Pickup</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>{trip.pickup_address}</Text>
          </View>
        </View>

        <View style={styles.passengerCard}>
          <View style={styles.passengerRow}>
            <View style={styles.passengerAvatar}>
              <Text style={styles.passengerAvatarText}>
                {trip.passenger_first_name?.[0] || 'P'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.passengerName}>
                {trip.passenger_first_name} {trip.passenger_last_name}
              </Text>
              {trip.passenger_phone && (
                <Text style={styles.passengerPhone}>{trip.passenger_phone}</Text>
              )}
            </View>
            <Text style={styles.fareText}>GH₵{parseFloat(trip.fare).toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          {trip.passenger_phone && (
            <TouchableOpacity style={styles.callBtn} onPress={callPassenger}>
              <Phone size={18} color={colors.dark} />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.arrivedBtn} onPress={confirmArrival}>
            <CheckCircle size={20} color={navy} />
            <Text style={styles.arrivedBtnText}>I've Arrived at Pickup</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  mapContainer: { flex: 1 },
  carIcon: { width: 44, height: 44 },
  pickupMarker: {
    width: 32, height: 32, borderRadius: radius.full,
    backgroundColor: colors.dark, justifyContent: 'center', alignItems: 'center',
    ...shadows.md,
  },
  bottomSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    paddingBottom: bottomPadding,
    ...shadows.lg,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  headerIcon: {
    width: 44, height: 44, borderRadius: radius.full,
    backgroundColor: 'rgba(255,184,0,0.1)', justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: fontSizes.md, fontWeight: '800', color: colors.dark },
  headerSubtitle: { fontSize: fontSizes.xs, color: colors.textMuted, marginTop: 2 },
  passengerCard: {
    backgroundColor: colors.gray,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  passengerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  passengerAvatar: { width: 44, height: 44, borderRadius: radius.full, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  passengerAvatarText: { fontSize: fontSizes.lg, fontWeight: '800', color: navy },
  passengerName: { fontSize: fontSizes.md, fontWeight: '700', color: colors.dark },
  passengerPhone: { fontSize: fontSizes.xs, color: colors.textMuted, marginTop: 2 },
  fareText: { fontSize: fontSizes.lg, fontWeight: '800', color: colors.dark },
  actionRow: { flexDirection: 'row', gap: spacing.sm },
  callBtn: {
    width: 52, height: 52, borderRadius: radius.full,
    backgroundColor: colors.gray, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: colors.gray2,
  },
  arrivedBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, backgroundColor: colors.primary, padding: spacing.md,
    borderRadius: radius.full, ...shadows.md,
  },
  arrivedBtnText: { fontSize: fontSizes.sm, fontWeight: '700', color: navy },
});