import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Linking, StatusBar, Image, ActivityIndicator,
} from 'react-native';
import RNMapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { Phone, CheckCircle, Flag, Users } from 'lucide-react-native';
import socketService from '../../services/socket';
import { ridesAPI, driverAPI } from '../../services/api';
import { useThemeStore } from '../../store/themeStore';
import { getColors, spacing, fontSizes, radius, shadows, navy, bottomPadding, gradients, tintedShadow } from '../../utils/theme';
import { shouldRefreshRoute, haversineMeters } from '../../utils/geo';
import { useAnimatedRoute } from '../../hooks/useAnimatedRoute';

const MIN_HEADING_SPEED_MPS = 1;
const CAR_ICON = require('../../../assets/car-top.png');

interface Props {
  group: any[]; // every active leg; only 'in_progress' ones are still pending drop-off
  onDropoffConfirmed: (completedTrip: any) => void;
}

// Nearest-remaining-dropoff-first — for the v1 cap of 2 passengers this is
// one straight-line distance comparison, not a routing problem. Both
// pickups are already done by the time this screen ever renders (the
// parent only switches here once the whole group hits in_progress), so
// there's no pickup/dropoff interleaving to reason about.
export default function SharedDropoffScreen({ group, onDropoffConfirmed }: Props) {
  const { isDark } = useThemeStore();
  const colors = getColors(isDark);
  const styles = getStyles(colors, isDark);
  const [driverLocation, setDriverLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [driverHeading, setDriverHeading] = useState(0);
  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);
  const [completing, setCompleting] = useState(false);
  const animatedRouteCoords = useAnimatedRoute(routeCoords);
  const mapRef = useRef<RNMapView>(null);
  const routeRequestId = useRef(0);
  const lastRouteFetchAt = useRef<number | null>(null);
  const lastRouteFetchOrigin = useRef<{ latitude: number; longitude: number } | null>(null);

  const pending = group.filter((leg) => leg.status === 'in_progress');
  const nextStop = driverLocation
    ? pending.slice().sort((a, b) => {
        const da = haversineMeters(driverLocation.latitude, driverLocation.longitude, parseFloat(a.dropoff_lat), parseFloat(a.dropoff_lng));
        const db = haversineMeters(driverLocation.latitude, driverLocation.longitude, parseFloat(b.dropoff_lat), parseFloat(b.dropoff_lng));
        return da - db;
      })[0]
    : pending[0];

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
      // Broadcast to every pending leg's room so each passenger's own map
      // keeps following the driver regardless of which stop is "next."
      pending.forEach((leg) => socketService.sendLocation(leg.id, latitude, longitude, lastGoodHeading));
    };

    Location.getLastKnownPositionAsync({}).then((cached) => {
      if (cached) applyLocation(cached.coords);
    }).catch(() => {});

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
  }, [pending.length]);

  useEffect(() => {
    fetchRoute();
  }, [driverLocation, nextStop?.id]);

  async function fetchRoute() {
    if (!driverLocation || !nextStop) return;
    if (!shouldRefreshRoute(lastRouteFetchAt.current, lastRouteFetchOrigin.current, driverLocation)) return;
    lastRouteFetchAt.current = Date.now();
    lastRouteFetchOrigin.current = driverLocation;
    const requestId = ++routeRequestId.current;
    try {
      const res = await ridesAPI.getDirections(
        driverLocation.latitude, driverLocation.longitude,
        parseFloat(nextStop.dropoff_lat), parseFloat(nextStop.dropoff_lng)
      );
      if (requestId !== routeRequestId.current) return;
      if (res.data?.coordinates) {
        setRouteCoords(res.data.coordinates);
        socketService.sendRoute(nextStop.id, res.data.coordinates, res.data.duration_minutes ?? null, res.data.duration_text ?? null);
      }
    } catch (err) {
      console.log('Directions error:', err);
    }
  }

  const callPassenger = () => {
    if (nextStop?.passenger_phone) Linking.openURL(`tel:${nextStop.passenger_phone}`);
  };

  const completeStop = async () => {
    if (!nextStop || completing) return;
    setCompleting(true);
    try {
      const res = await driverAPI.completeTrip(nextStop.id);
      const completedTrip = res.data?.trip || res.data;
      onDropoffConfirmed(completedTrip || nextStop);
    } catch (err: any) {
      console.log('Complete trip error:', err.response?.data?.error);
      // Same forgiving pattern as the solo flow's completeTrip — don't
      // leave the driver stuck on a dead button over a flaky request.
      onDropoffConfirmed(nextStop);
    } finally {
      setCompleting(false);
    }
  };

  if (!nextStop) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <View style={styles.mapContainer}>
        <RNMapView
          ref={mapRef}
          style={StyleSheet.absoluteFillObject}
          provider={PROVIDER_GOOGLE}
          initialRegion={{
            latitude: driverLocation?.latitude || parseFloat(nextStop.dropoff_lat),
            longitude: driverLocation?.longitude || parseFloat(nextStop.dropoff_lng),
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
        >
          {driverLocation && (
            <Marker coordinate={driverLocation} anchor={{ x: 0.5, y: 0.5 }} rotation={driverHeading} flat tracksViewChanges={false}>
              <View style={styles.carMarkerBadge}>
                <Image source={CAR_ICON} style={styles.carIcon} resizeMode="contain" />
              </View>
            </Marker>
          )}
          <Marker
            coordinate={{ latitude: parseFloat(nextStop.dropoff_lat), longitude: parseFloat(nextStop.dropoff_lng) }}
            anchor={{ x: 0.5, y: 1 }}
            tracksViewChanges={false}
          >
            <View style={styles.dropoffMarker}>
              <Flag size={16} color={colors.white} />
            </View>
          </Marker>
          {routeCoords.length > 0 && (
            <Polyline coordinates={animatedRouteCoords} strokeColor={colors.primary} strokeWidth={4} />
          )}
        </RNMapView>

        {pending.length > 1 && (
          <View style={styles.groupBadge}>
            <Users size={13} color={navy} />
            <Text style={styles.groupBadgeText}>{pending.length} drop-offs remaining</Text>
          </View>
        )}
      </View>

      <View style={styles.bottomSheet}>
        <View style={styles.tripInfo}>
          <View style={styles.passengerRow}>
            <View style={styles.passengerAvatar}>
              <Text style={styles.passengerAvatarText}>{nextStop.passenger_first_name?.[0] || 'P'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.passengerName}>
                {nextStop.passenger_first_name} {nextStop.passenger_last_name}
              </Text>
              <Text style={styles.tripStatus}>Nearest drop-off</Text>
            </View>
            {nextStop.passenger_phone && (
              <TouchableOpacity style={styles.callBtn} onPress={callPassenger}>
                <Phone size={16} color={navy} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.destinationRow}>
            <Flag size={14} color={colors.primary} />
            <Text style={styles.destinationText} numberOfLines={1}>{nextStop.dropoff_address}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.completeBtnShadowWrap} onPress={completeStop} activeOpacity={0.88} disabled={completing}>
          <LinearGradient colors={gradients.primaryCta} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.completeBtn}>
            {completing ? (
              <ActivityIndicator color={navy} />
            ) : (
              <>
                <CheckCircle size={20} color={navy} />
                <Text style={styles.completeBtnText}>Complete — {nextStop.passenger_first_name}</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  mapContainer: { flex: 1 },
  carIcon: { width: 30, height: 30 },
  carMarkerBadge: {
    width: 44, height: 44, borderRadius: radius.full,
    backgroundColor: colors.white, borderWidth: 3, borderColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
    ...shadows.md,
  },
  dropoffMarker: {
    width: 32, height: 32, borderRadius: radius.full,
    backgroundColor: colors.error, justifyContent: 'center', alignItems: 'center',
    ...shadows.md,
  },
  groupBadge: {
    position: 'absolute', top: 60, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderRadius: radius.full, ...shadows.md,
  },
  groupBadgeText: { fontSize: fontSizes.xs, fontWeight: '700', color: navy },
  bottomSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: spacing.lg, paddingBottom: bottomPadding,
    ...tintedShadow(navy, isDark ? 0 : 0.2),
  },
  tripInfo: { marginBottom: spacing.lg },
  passengerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  passengerAvatar: {
    width: 44, height: 44, borderRadius: radius.full,
    backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center',
  },
  passengerAvatarText: { fontSize: fontSizes.md, fontWeight: '800', color: navy },
  passengerName: { fontSize: fontSizes.md, fontWeight: '700', color: colors.textDark },
  tripStatus: { fontSize: fontSizes.xs, color: colors.textMuted, marginTop: 2 },
  callBtn: {
    width: 36, height: 36, borderRadius: radius.md,
    backgroundColor: colors.offWhite, justifyContent: 'center', alignItems: 'center',
  },
  destinationRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: colors.offWhite, borderRadius: radius.md, padding: spacing.sm,
  },
  destinationText: { flex: 1, fontSize: fontSizes.sm, color: colors.textDark, fontWeight: '600' },
  completeBtnShadowWrap: { borderRadius: radius.lg, ...tintedShadow(colors.primaryDark, isDark ? 0 : 0.3) },
  completeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    height: 56, borderRadius: radius.lg,
  },
  completeBtnText: { fontSize: fontSizes.md, fontWeight: '700', color: navy },
});
