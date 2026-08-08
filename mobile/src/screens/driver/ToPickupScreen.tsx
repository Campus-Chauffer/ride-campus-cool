import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, Linking, Alert
} from 'react-native';
import RNMapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { CheckCircle, MapPin, Phone } from 'lucide-react-native';
import socketService from '../../services/socket';
import { ridesAPI } from '../../services/api';
import { colors, spacing, fontSizes, radius, shadows, bottomPadding } from '../../utils/theme';

const LOCATION_SHARE_INTERVAL_MS = 4000;

const CAR_ICON = require('../../../assets/car-top.png');

interface Props {
  trip: any;
  onArrived: () => void;
  onCancelled: () => void;
}

export default function ToPickupScreen({ trip, onArrived, onCancelled }: Props) {
  const [driverLocation, setDriverLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);
  const mapRef = useRef<RNMapView>(null);
  const routeRequestId = useRef(0);

  // Track our own GPS position and broadcast it over the socket so the
  // passenger's map can follow us live on the way to pickup — this screen
  // is the location source for this leg of the trip, not a listener.
  useEffect(() => {
    let cancelled = false;

    const applyLocation = (coords: { latitude: number; longitude: number; heading?: number | null }) => {
      if (cancelled) return;
      const { latitude, longitude, heading } = coords;
      setDriverLocation({ latitude, longitude });
      socketService.sendLocation(trip.id, latitude, longitude, heading || 0);
    };

    const shareLocation = async () => {
      try {
        const loc = await Location.getCurrentPositionAsync({});
        applyLocation(loc.coords);
      } catch (err) {
        console.log('Location share error:', err);
      }
    };

    // A cold GPS fix can take a few seconds — race a cached fix in parallel
    // so the map/marker/route can appear immediately instead of sitting
    // blank until the first accurate reading resolves.
    Location.getLastKnownPositionAsync({}).then((cached) => {
      if (cached) applyLocation(cached.coords);
    }).catch(() => {});

    shareLocation();
    const interval = setInterval(shareLocation, LOCATION_SHARE_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    fetchRoute();
  }, [driverLocation]);

  async function fetchRoute() {
    if (!driverLocation) return; // wait until we have a real starting point
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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

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
            <Marker coordinate={driverLocation} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
              <View style={styles.driverMarker}>
                <MapPin size={16} color={colors.dark} />
              </View>
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
          <TouchableOpacity style={styles.arrivedBtn} onPress={onArrived}>
            <CheckCircle size={20} color={colors.dark} />
            <Text style={styles.arrivedBtnText}>I've Arrived at Pickup</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  mapContainer: { flex: 1 },
  driverMarker: {
    width: 36, height: 36, borderRadius: radius.full,
    backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center',
    ...shadows.md,
  },
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
  passengerAvatarText: { fontSize: fontSizes.lg, fontWeight: '800', color: colors.dark },
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
  arrivedBtnText: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.dark },
});