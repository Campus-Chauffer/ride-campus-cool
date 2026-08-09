import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Linking, StatusBar, Image
} from 'react-native';
import RNMapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Phone, Flag } from 'lucide-react-native';
import socketService from '../../services/socket';
import { ridesAPI } from '../../services/api';
import { useThemeStore } from '../../store/themeStore';
import { getColors, spacing, fontSizes, radius, shadows, navy } from '../../utils/theme';

const CAR_ICON = require('../../../assets/car-top.png');
// Driver location updates arrive roughly every 4s (the driver's own share
// interval) — animating the marker over most of that window makes it glide
// continuously instead of snapping in place, without lagging behind the
// next update.
const MARKER_ANIMATION_MS = 2500;

interface Props {
  trip: any;
}

export default function ActiveRideScreen({ trip }: Props) {
  const { isDark } = useThemeStore();
  const colors = getColors(isDark);
  const styles = getStyles(colors);
  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);
  const [driverLocation, setDriverLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  // Mirrors driverLocation but read inside a mount-only effect's closure, so
  // it always reflects the latest value instead of the one captured when
  // the effect first ran (state would be frozen at null there).
  const driverLocationRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const [driverHeading, setDriverHeading] = useState(0);
  const [trackCarMarker, setTrackCarMarker] = useState(true);
  const mapRef = useRef<RNMapView>(null);
  const carMarkerRef = useRef<any>(null);
  const routeRequestId = useRef(0);

  // Subscribe to the driver's live location once, on mount
  useEffect(() => {
    socketService.joinRide(trip.id);
    socketService.onDriverLocation((data) => {
      const coord = { latitude: data.latitude, longitude: data.longitude };
      // Glide the car icon to its new position instead of letting the
      // coordinate prop change snap it there instantly.
      if (carMarkerRef.current && driverLocationRef.current) {
        carMarkerRef.current.animateMarkerToCoordinate(coord, MARKER_ANIMATION_MS);
      }
      driverLocationRef.current = coord;
      setDriverLocation(coord);
      setDriverHeading(data.heading || 0);
      mapRef.current?.animateToRegion({
        latitude: data.latitude,
        longitude: data.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 500);
    });

    return () => {
      socketService.offDriverLocation();
    };
  }, []);

  // Same jank-avoidance as DriverFoundScreen: the car icon only visually
  // changes when heading updates, so only track view changes briefly
  // around that instead of leaving it on permanently.
  useEffect(() => {
    setTrackCarMarker(true);
    const t = setTimeout(() => setTrackCarMarker(false), 250);
    return () => clearTimeout(t);
  }, [driverHeading]);

  // Re-fetch the route whenever driverLocation changes, so the line
  // follows the driver's actual position instead of staying fixed
  // to the original pickup point
  useEffect(() => {
    fetchRoute();
  }, [driverLocation]);

  async function fetchRoute() {
    if (!driverLocation) return; // wait until we have a real starting point
    // Guard against an older, slower response overwriting a newer route
    // when requests fire faster than the network can resolve them.
    const requestId = ++routeRequestId.current;
    try {
      const res = await ridesAPI.getDirections(
        driverLocation.latitude,
        driverLocation.longitude,
        parseFloat(trip.dropoff_lat),
        parseFloat(trip.dropoff_lng)
      );
      if (requestId !== routeRequestId.current) return;
      if (res.data?.coordinates) {
        setRouteCoords(res.data.coordinates);
      }
    } catch (err) {
      console.log('Directions error:', err);
    }
  }

  const callDriver = () => {
    if (trip.driver_phone) {
      Linking.openURL(`tel:${trip.driver_phone}`);
    }
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
              ref={carMarkerRef}
              coordinate={driverLocation}
              anchor={{ x: 0.5, y: 0.5 }}
              rotation={driverHeading}
              flat
              tracksViewChanges={trackCarMarker}
            >
              <Image source={CAR_ICON} style={styles.carIcon} resizeMode="contain" />
            </Marker>
          )}

          <Marker
            coordinate={{
              latitude: parseFloat(trip.dropoff_lat),
              longitude: parseFloat(trip.dropoff_lng),
            }}
            anchor={{ x: 0.5, y: 1 }}
            tracksViewChanges={false}
          >
            <View style={styles.dropoffMarker}>
              <Flag size={16} color={colors.white} />
            </View>
          </Marker>

          {routeCoords.length > 0 && (
            <Polyline coordinates={routeCoords} strokeColor={colors.primary} strokeWidth={4} />
          )}
        </RNMapView>
      </View>

      <View style={styles.bottomSheet}>
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
            <Text style={styles.tripStatus}>En route to your destination</Text>
          </View>
          {trip.driver_phone && (
            <TouchableOpacity style={styles.callBtn} onPress={callDriver}>
              <Phone size={16} color={navy} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.destinationRow}>
          <Flag size={14} color={colors.primary} />
          <Text style={styles.destinationText} numberOfLines={1}>
            {trip.dropoff_address}
          </Text>
        </View>
      </View>
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  mapContainer: { flex: 1 },
  carIcon: { width: 40, height: 40 },
  dropoffMarker: {
    width: 32, height: 32, borderRadius: radius.full,
    backgroundColor: colors.dark, justifyContent: 'center', alignItems: 'center',
    ...shadows.md,
  },
  bottomSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    ...shadows.lg,
  },
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  driverAvatar: { width: 44, height: 44, borderRadius: radius.full, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  driverAvatarText: { fontSize: fontSizes.lg, fontWeight: '800', color: navy },
  driverName: { fontSize: fontSizes.md, fontWeight: '700', color: colors.dark },
  tripStatus: { fontSize: fontSizes.xs, color: colors.textMuted, marginTop: 2 },
  callBtn: { width: 40, height: 40, borderRadius: radius.full, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  destinationRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.gray, padding: spacing.md, borderRadius: radius.lg },
  destinationText: { flex: 1, fontSize: fontSizes.sm, color: colors.dark },
});