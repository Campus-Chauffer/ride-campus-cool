import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, Alert, Image, Linking
} from 'react-native';
import RNMapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { MapPin, X, Phone } from 'lucide-react-native';
import Constants from 'expo-constants';
import { ridesAPI } from '../../services/api';
import socketService from '../../services/socket';
import { colors, spacing, fontSizes, radius, shadows, bottomPadding } from '../../utils/theme';

const GOOGLE_MAPS_KEY = Constants.manifest2?.extra?.expoClient?.extra?.googleMapsApiKey
  || Constants.expoConfig?.extra?.googleMapsApiKey
  || (Constants as any).manifest?.extra?.googleMapsApiKey
  || '';

const CAR_ICON = require('../../../assets/car-top.png');

interface Props {
  trip: any;
  onRideStarted: () => void;
  onCancelled: () => void;
}

export default function DriverFoundScreen({ trip, onRideStarted, onCancelled }: Props) {
  const mapRef = useRef<any>(null);
  const userLocationRef = useRef<any>(null);
  const [userLocation, setUserLocation] = useState<any>(null);
  const [driverLocation, setDriverLocation] = useState<any>(
    trip.driver_lat && trip.driver_lng
      ? { lat: parseFloat(trip.driver_lat), lng: parseFloat(trip.driver_lng) }
      : null
  );
  const [driverHeading, setDriverHeading] = useState(0);
  const [routeCoords, setRouteCoords] = useState<any[]>([]);
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);
  const [etaText, setEtaText] = useState<string | null>(null);
  const [trackCarMarker, setTrackCarMarker] = useState(true);
  const pollInterval = useRef<any>(null);
  const directionsRequestId = useRef(0);

  useEffect(() => {
    getUserLocation();
    pollTripStatus();

    socketService.onDriverLocation((data) => {
      const { latitude, longitude, heading } = data;
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
      clearInterval(pollInterval.current);
      socketService.offDriverLocation();
    };
  }, []);

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

  const pollTripStatus = () => {
    pollInterval.current = setInterval(async () => {
      try {
        const res = await ridesAPI.getHistory();
        const currentTrip = res.data.find((t: any) => t.id === trip.id);
        if (!currentTrip) return;

        if (currentTrip.status === 'in_progress') {
          clearInterval(pollInterval.current);
          onRideStarted();
          return;
        }

        if (currentTrip.driver_lat && currentTrip.driver_lng) {
          const dLat = parseFloat(currentTrip.driver_lat);
          const dLng = parseFloat(currentTrip.driver_lng);
          setDriverLocation({ lat: dLat, lng: dLng });
          if (userLocationRef.current) {
            getDirections(dLat, dLng, userLocationRef.current.lat, userLocationRef.current.lng);
          }
        }
      } catch (err) {
        console.log('Poll error:', err);
      }
    }, 3000);
  };

  const getDirections = async (fromLat: number, fromLng: number, toLat: number, toLng: number) => {
    // Requests fire from three places (socket updates, the 3s poll, and the
    // userLocation effect) and can resolve out of order on a slow network —
    // guard against an older response clobbering a newer one's route/ETA.
    const requestId = ++directionsRequestId.current;
    try {
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${fromLat},${fromLng}&destination=${toLat},${toLng}&key=${GOOGLE_MAPS_KEY}`;
      const res = await fetch(url);
      const data = await res.json();
      if (requestId !== directionsRequestId.current) return;
      if (data.routes?.length > 0) {
        const points = decodePolyline(data.routes[0].overview_polyline.points);
        setRouteCoords(points);
        const leg = data.routes[0].legs?.[0];
        if (leg?.duration) {
          const mins = Math.ceil(leg.duration.value / 60);
          setEtaMinutes(mins);
          setEtaText(leg.duration.text);
        }
      }
    } catch (err) {
      console.log('Directions error:', err);
    }
  };

  const decodePolyline = (encoded: string) => {
    const points: any[] = [];
    let index = 0, lat = 0, lng = 0;
    while (index < encoded.length) {
      let b, shift = 0, result = 0;
      do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
      lat += result & 1 ? ~(result >> 1) : result >> 1;
      shift = 0; result = 0;
      do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
      lng += result & 1 ? ~(result >> 1) : result >> 1;
      points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
    }
    return points;
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
      <StatusBar barStyle="dark-content" />

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
              <Phone size={18} color={colors.dark} />
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

const styles = StyleSheet.create({
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
  etaMapNumber: { fontSize: 14, fontWeight: '800', color: colors.white, lineHeight: 16 },
  etaMapUnit: { fontSize: 9, fontWeight: '600', color: colors.white, lineHeight: 10 },
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
  driverAvatarText: { fontSize: fontSizes.lg, fontWeight: '800', color: colors.dark },
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
  verifiedTick: { fontSize: 9, fontWeight: '800', color: colors.white },
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