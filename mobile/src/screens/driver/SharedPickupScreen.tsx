import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, Linking, Alert, Image, ActivityIndicator,
} from 'react-native';
import RNMapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircle, MapPin, Phone, Users } from 'lucide-react-native';
import socketService from '../../services/socket';
import { ridesAPI, driverAPI } from '../../services/api';
import { useThemeStore } from '../../store/themeStore';
import { getColors, spacing, fontSizes, radius, shadows, bottomPadding, navy, gradients, tintedShadow } from '../../utils/theme';
import { shouldRefreshRoute, haversineMeters } from '../../utils/geo';
import { useAnimatedRoute } from '../../hooks/useAnimatedRoute';

// Same threshold as the solo ToPickupScreen's own arrival check — a driver
// confirming a pickup while genuinely far from that passenger's point is
// exactly the trust gap that threshold was added to catch there, and a
// shared trip's pickups deserve the same protection.
const ARRIVAL_DISTANCE_THRESHOLD_M = 150;

const CAR_ICON = require('../../../assets/car-top.png');

interface Props {
  group: any[]; // every active leg in the shared trip, any order
  onPickupConfirmed: () => void; // parent refetches the group / advances phase
}

// Always shows the *next unconfirmed* pickup — whichever active leg hasn't
// reached 'arrived' yet — in commitment order (the driver's originally
// accepted passenger first, then whoever matched in after). One button per
// stop; confirming the last one triggers the backend's auto-start cascade
// for the whole group, which the parent detects on its next refetch.
export default function SharedPickupScreen({ group, onPickupConfirmed }: Props) {
  const { isDark } = useThemeStore();
  const colors = getColors(isDark);
  const styles = getStyles(colors, isDark);
  const [driverLocation, setDriverLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [driverHeading, setDriverHeading] = useState(0);
  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);
  const [confirming, setConfirming] = useState(false);
  const animatedRouteCoords = useAnimatedRoute(routeCoords);
  const mapRef = useRef<RNMapView>(null);
  const routeRequestId = useRef(0);
  const lastRouteFetchAt = useRef<number | null>(null);
  const lastRouteFetchOrigin = useRef<{ latitude: number; longitude: number } | null>(null);

  const nextStop = group.find((leg) => leg.status === 'requested' || leg.status === 'offered' || leg.status === 'accepted');
  const remainingAfter = group.filter((leg) => leg.status === 'requested' || leg.status === 'offered' || leg.status === 'accepted').length - 1;

  useEffect(() => {
    let cancelled = false;
    let subscription: Location.LocationSubscription | null = null;
    let lastGoodHeading = 0;
    const MIN_HEADING_SPEED_MPS = 1;

    const applyLocation = (coords: { latitude: number; longitude: number; heading?: number | null; speed?: number | null }) => {
      if (cancelled) return;
      const { latitude, longitude, heading, speed } = coords;
      const headingReliable = heading != null && heading >= 0 && (speed == null || speed >= MIN_HEADING_SPEED_MPS);
      if (headingReliable) lastGoodHeading = heading as number;
      setDriverLocation({ latitude, longitude });
      setDriverHeading(lastGoodHeading);
      if (nextStop) socketService.sendLocation(nextStop.id, latitude, longitude, lastGoodHeading);
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
    // Re-subscribe when the target stop changes so location broadcasts go
    // to the right trip's socket room.
  }, [nextStop?.id]);

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
        parseFloat(nextStop.pickup_lat), parseFloat(nextStop.pickup_lng)
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

  const doConfirm = async () => {
    if (!nextStop || confirming) return;
    setConfirming(true);
    try {
      await driverAPI.arrivedAtPickup(nextStop.id);
      onPickupConfirmed();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Could not confirm pickup');
    } finally {
      setConfirming(false);
    }
  };

  const confirmPickup = () => {
    if (!nextStop) return;
    if (driverLocation) {
      const distance = haversineMeters(
        driverLocation.latitude, driverLocation.longitude,
        parseFloat(nextStop.pickup_lat), parseFloat(nextStop.pickup_lng)
      );
      if (distance > ARRIVAL_DISTANCE_THRESHOLD_M) {
        return Alert.alert(
          "You're not at this pickup point yet",
          `You appear to be about ${Math.round(distance)}m from ${nextStop.pickup_address}. Are you sure?`,
          [
            { text: 'Not yet', style: 'cancel' },
            { text: 'Yes, confirm pickup', style: 'destructive', onPress: doConfirm },
          ]
        );
      }
    }
    doConfirm();
  };

  if (!nextStop) {
    // Shouldn't normally render (the parent switches phase once every leg
    // is confirmed), but avoid a blank/crashing screen during the brief
    // window right after the last confirm.
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
            latitude: driverLocation?.latitude || parseFloat(nextStop.pickup_lat),
            longitude: driverLocation?.longitude || parseFloat(nextStop.pickup_lng),
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
            coordinate={{ latitude: parseFloat(nextStop.pickup_lat), longitude: parseFloat(nextStop.pickup_lng) }}
            anchor={{ x: 0.5, y: 1 }}
            tracksViewChanges={false}
          >
            <View style={styles.pickupMarker}>
              <MapPin size={16} color={colors.white} />
            </View>
          </Marker>
          {routeCoords.length > 0 && (
            <Polyline coordinates={animatedRouteCoords} strokeColor={colors.primary} strokeWidth={4} />
          )}
        </RNMapView>

        <View style={styles.groupBadge}>
          <Users size={13} color={navy} />
          <Text style={styles.groupBadgeText}>Shared trip · {group.length} riders</Text>
        </View>
      </View>

      <View style={styles.bottomSheet}>
        <View style={styles.headerRow}>
          <View style={styles.headerIcon}>
            <MapPin size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>
              {remainingAfter > 0 ? 'Head to Next Pickup' : 'Head to Pickup'}
            </Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>{nextStop.pickup_address}</Text>
          </View>
        </View>

        <View style={styles.passengerCard}>
          <View style={styles.passengerRow}>
            <View style={styles.passengerAvatar}>
              <Text style={styles.passengerAvatarText}>{nextStop.passenger_first_name?.[0] || 'P'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.passengerName}>
                {nextStop.passenger_first_name} {nextStop.passenger_last_name}
              </Text>
              {nextStop.passenger_phone && <Text style={styles.passengerPhone}>{nextStop.passenger_phone}</Text>}
            </View>
            <Text style={styles.fareText}>GH₵{parseFloat(nextStop.fare).toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          {nextStop.passenger_phone && (
            <TouchableOpacity style={styles.callBtn} onPress={callPassenger}>
              <Phone size={18} color={colors.dark} />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.arrivedBtnShadowWrap} onPress={confirmPickup} activeOpacity={0.88} disabled={confirming}>
            <LinearGradient colors={gradients.primaryCta} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.arrivedBtn}>
              {confirming ? (
                <ActivityIndicator color={navy} />
              ) : (
                <>
                  <CheckCircle size={20} color={navy} />
                  <Text style={styles.arrivedBtnText}>
                    Confirm Pickup — {nextStop.passenger_first_name}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
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
  pickupMarker: {
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    paddingBottom: bottomPadding,
    ...tintedShadow(navy, isDark ? 0 : 0.2),
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  headerIcon: {
    width: 40, height: 40, borderRadius: radius.md,
    backgroundColor: colors.primary + '18', justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: fontSizes.md, fontWeight: '700', color: colors.textDark },
  headerSubtitle: { fontSize: fontSizes.sm, color: colors.textMuted, marginTop: 2 },
  passengerCard: {
    backgroundColor: colors.offWhite, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md,
  },
  passengerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  passengerAvatar: {
    width: 40, height: 40, borderRadius: radius.full,
    backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center',
  },
  passengerAvatarText: { fontSize: fontSizes.md, fontWeight: '800', color: navy },
  passengerName: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.textDark },
  passengerPhone: { fontSize: fontSizes.xs, color: colors.textMuted, marginTop: 2 },
  fareText: { fontSize: fontSizes.md, fontWeight: '800', color: colors.textDark },
  actionRow: { flexDirection: 'row', gap: spacing.sm },
  callBtn: {
    width: 52, height: 52, borderRadius: radius.lg,
    backgroundColor: colors.offWhite, justifyContent: 'center', alignItems: 'center',
  },
  arrivedBtnShadowWrap: { flex: 1, borderRadius: radius.lg, ...tintedShadow(colors.primaryDark, isDark ? 0 : 0.3) },
  arrivedBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    height: 52, borderRadius: radius.lg,
  },
  arrivedBtnText: { fontSize: fontSizes.sm, fontWeight: '700', color: navy },
});
