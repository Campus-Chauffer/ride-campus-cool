import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Linking, StatusBar
} from 'react-native';
import RNMapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Phone, MapPin, Flag } from 'lucide-react-native';
import socketService from '../../services/socket';
import { ridesAPI } from '../../services/api';
import { colors, spacing, fontSizes, radius, shadows } from '../../utils/theme';

interface Props {
  trip: any;
}

export default function ActiveRideScreen({ trip }: Props) {
  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);
  const [driverLocation, setDriverLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const mapRef = useRef<RNMapView>(null);
  const routeRequestId = useRef(0);

  // Subscribe to the driver's live location once, on mount
  useEffect(() => {
    socketService.joinRide(trip.id);
    socketService.onDriverLocation((data) => {
      setDriverLocation({ latitude: data.latitude, longitude: data.longitude });
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
              <Phone size={16} color={colors.dark} />
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  mapContainer: { flex: 1 },
  driverMarker: {
    width: 36, height: 36, borderRadius: radius.full,
    backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center',
    ...shadows.md,
  },
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
  driverAvatarText: { fontSize: fontSizes.lg, fontWeight: '800', color: colors.dark },
  driverName: { fontSize: fontSizes.md, fontWeight: '700', color: colors.dark },
  tripStatus: { fontSize: fontSizes.xs, color: colors.textMuted, marginTop: 2 },
  callBtn: { width: 40, height: 40, borderRadius: radius.full, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  destinationRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.gray, padding: spacing.md, borderRadius: radius.lg },
  destinationText: { flex: 1, fontSize: fontSizes.sm, color: colors.dark },
});