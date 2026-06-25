import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, ActivityIndicator, Image, Linking, Alert
} from 'react-native';
import RNMapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { CheckCircle, MapPin, Navigation, Phone } from 'lucide-react-native';
import Constants from 'expo-constants';
import { driverAPI } from '../../services/api';
import socketService from '../../services/socket';
import { colors, spacing, fontSizes, radius, shadows, bottomPadding } from '../../utils/theme';


const GOOGLE_MAPS_KEY = Constants.manifest2?.extra?.expoClient?.extra?.googleMapsApiKey
  || Constants.expoConfig?.extra?.googleMapsApiKey
  || (Constants as any).manifest?.extra?.googleMapsApiKey
  || '';

const CAR_ICON = require('../../../assets/car-top.png');

interface Props {
  trip: any;
  onStartTrip: () => void;
  onCancelled: () => void;
}

export default function ToPickupScreen({ trip, onStartTrip, onCancelled }: Props) {
  const mapRef = useRef<RNMapView>(null);
  const [driverLocation, setDriverLocation] = useState<any>(null);
  const [routeCoords, setRouteCoords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [heading, setHeading] = useState(0);
  const locationInterval = useRef<any>(null);
  const headingSubscription = useRef<any>(null);
  const cancelPollInterval = useRef<any>(null);

  useEffect(() => {
    socketService.connect();
    socketService.joinRide(trip.id);
    getLocationAndRoute();
    locationInterval.current = setInterval(updateLocation, 5000);
    // Poll for passenger cancellation
  cancelPollInterval.current = setInterval(async () => {
    try {
      const res = await driverAPI.getTripStatus(trip.id);
      if (res.data?.status === 'cancelled') {
        clearInterval(cancelPollInterval.current);
        clearInterval(locationInterval.current);
        Alert.alert(
          'Ride Cancelled',
          'The passenger has cancelled the ride.',
          [{ text: 'OK', onPress: onCancelled }]
        );
      }
    } catch (err) {
      console.log('Cancel poll error:', err);
    }
  }, 5000);

    return () => {
      clearInterval(locationInterval.current);
      clearInterval(cancelPollInterval.current);
      headingSubscription.current?.remove();
    };
  }, []);

  useEffect(() => {
    if (driverLocation) {
      getDirections(driverLocation.lat, driverLocation.lng);
    }
  }, [driverLocation]);

  const getLocationAndRoute = async () => {
    try {
      const loc = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = loc.coords;
      setDriverLocation({ lat: latitude, lng: longitude });
      mapRef.current?.fitToCoordinates(
        [
          { latitude, longitude },
          { latitude: parseFloat(trip.pickup_lat), longitude: parseFloat(trip.pickup_lng) },
        ],
        { edgePadding: { top: 80, right: 80, bottom: 280, left: 80 }, animated: true }
      );
      headingSubscription.current = await Location.watchHeadingAsync((h) => {
        setHeading(h.trueHeading || h.magHeading || 0);
      });
    } catch (err) {
      console.log('Location error:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateLocation = async () => {
    try {
      const loc = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = loc.coords;
      setDriverLocation({ lat: latitude, lng: longitude });
      await driverAPI.updateLocation(latitude, longitude);
      socketService.sendLocation(trip.id, latitude, longitude, heading);
    } catch (err) {
      console.log('Update error:', err);
    }
  };

  const getDirections = async (fromLat: number, fromLng: number) => {
    try {
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${fromLat},${fromLng}&destination=${trip.pickup_lat},${trip.pickup_lng}&key=${GOOGLE_MAPS_KEY}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.routes?.length > 0) {
        const points = decodePolyline(data.routes[0].overview_polyline.points);
        setRouteCoords(points);
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

  const callPassenger = () => {
    if (trip.passenger_phone) {
      Linking.openURL(`tel:${trip.passenger_phone}`);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.loadingText}>Getting directions...</Text>
        </View>
      ) : (
        <>
          <RNMapView
            ref={mapRef}
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            showsUserLocation={false}
            showsMyLocationButton={false}
            initialRegion={{
              latitude: driverLocation?.lat || parseFloat(trip.pickup_lat),
              longitude: driverLocation?.lng || parseFloat(trip.pickup_lng),
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            }}
          >
            {driverLocation && (
              <Marker
                coordinate={{ latitude: driverLocation.lat, longitude: driverLocation.lng }}
                title="You"
                anchor={{ x: 0.5, y: 0.5 }}
                rotation={heading}
                flat
              >
                <Image source={CAR_ICON} style={styles.carIcon} resizeMode="contain" />
              </Marker>
            )}
            <Marker
              coordinate={{ latitude: parseFloat(trip.pickup_lat), longitude: parseFloat(trip.pickup_lng) }}
              title="Pickup"
              anchor={{ x: 0.5, y: 1 }}
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
            <View style={styles.cardHeader}>
              <View style={styles.headerIcon}>
                <Navigation size={20} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.cardTitle}>Head to Pickup</Text>
                <Text style={styles.cardSubtitle}>{trip.pickup_address}</Text>
              </View>
            </View>

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
                  <TouchableOpacity onPress={callPassenger} style={styles.phoneRow}>
                    <Phone size={12} color={colors.primary} />
                    <Text style={styles.phoneText}>{trip.passenger_phone}</Text>
                  </TouchableOpacity>
                )}
              </View>
              <Text style={styles.fareText}>GH₵{trip.fare}</Text>
            </View>

            <TouchableOpacity style={styles.arrivedBtn} onPress={onStartTrip}>
              <CheckCircle size={20} color={colors.dark} />
              <Text style={styles.arrivedBtnText}>Passenger Onboard — Start Trip</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md, backgroundColor: colors.white },
  loadingText: { fontSize: fontSizes.sm, color: colors.textMuted },
  map: { flex: 1 },
  carIcon: { width: 30, height: 30 },
  pickupMarker: { width: 32, height: 32, borderRadius: radius.full, backgroundColor: colors.success, justifyContent: 'center', alignItems: 'center', ...shadows.md },
  bottomCard: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.lg, paddingBottom: bottomPadding, ...shadows.lg },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  headerIcon: { width: 44, height: 44, borderRadius: radius.full, backgroundColor: 'rgba(255,184,0,0.1)', justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: fontSizes.lg, fontWeight: '800', color: colors.dark },
  cardSubtitle: { fontSize: fontSizes.sm, color: colors.textMuted },
  passengerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.gray, padding: spacing.md, borderRadius: radius.lg, marginBottom: spacing.md },
  passengerAvatar: { width: 44, height: 44, borderRadius: radius.full, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  passengerAvatarText: { fontSize: fontSizes.lg, fontWeight: '800', color: colors.dark },
  passengerName: { fontSize: fontSizes.md, fontWeight: '700', color: colors.dark },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  phoneText: { fontSize: fontSizes.xs, color: colors.primary, fontWeight: '600' },
  fareText: { fontSize: fontSizes.lg, fontWeight: '800', color: colors.dark },
  arrivedBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.primary, padding: spacing.md, borderRadius: radius.full, ...shadows.md },
  arrivedBtnText: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.dark },
});