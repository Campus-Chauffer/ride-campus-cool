import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, StatusBar, Image
} from 'react-native';
import RNMapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { MapPin } from 'lucide-react-native';
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
  onTripComplete: () => void;
}

export default function ActiveRideScreen({ trip, onTripComplete }: Props) {
  const mapRef = useRef<any>(null);
  const [driverLocation, setDriverLocation] = useState<any>(null);
  const [driverHeading, setDriverHeading] = useState(0);
  const [routeCoords, setRouteCoords] = useState<any[]>([]);
  const pollInterval = useRef<any>(null);

  useEffect(() => {
    socketService.onDriverLocation((data) => {
      const { latitude, longitude, heading } = data;
      setDriverLocation({ lat: latitude, lng: longitude });
      setDriverHeading(heading || 0);
      getDirections(latitude, longitude);
    });

    pollTripStatus();

    return () => {
      clearInterval(pollInterval.current);
      socketService.offDriverLocation();
    };
  }, []);

  const pollTripStatus = () => {
    pollInterval.current = setInterval(async () => {
      try {
        const res = await ridesAPI.getHistory();
        const currentTrip = res.data.find((t: any) => t.id === trip.id);
        if (!currentTrip) return;

        if (currentTrip.status === 'completed') {
          clearInterval(pollInterval.current);
          onTripComplete();
          return;
        }

        if (currentTrip.driver_lat && currentTrip.driver_lng) {
          const dLat = parseFloat(currentTrip.driver_lat);
          const dLng = parseFloat(currentTrip.driver_lng);
          setDriverLocation({ lat: dLat, lng: dLng });
          getDirections(dLat, dLng);
        }
      } catch (err) {
        console.log('Poll error:', err);
      }
    }, 5000);
  };

  const getDirections = async (fromLat: number, fromLng: number) => {
    try {
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${fromLat},${fromLng}&destination=${trip.dropoff_lat},${trip.dropoff_lng}&key=${GOOGLE_MAPS_KEY}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.routes?.length > 0) {
        const points = decodePolyline(data.routes[0].overview_polyline.points);
        setRouteCoords(points);
        mapRef.current?.fitToCoordinates(
          [
            { latitude: fromLat, longitude: fromLng },
            { latitude: parseFloat(trip.dropoff_lat), longitude: parseFloat(trip.dropoff_lng) },
          ],
          { edgePadding: { top: 80, right: 80, bottom: 280, left: 80 }, animated: true }
        );
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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <RNMapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        showsUserLocation={false}
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
            title="Your ride"
            anchor={{ x: 0.5, y: 0.5 }}
            rotation={driverHeading}
            flat
          >
            <Image source={CAR_ICON} style={styles.carIcon} resizeMode="contain" />
          </Marker>
        )}

        <Marker
          coordinate={{
            latitude: parseFloat(trip.dropoff_lat),
            longitude: parseFloat(trip.dropoff_lng),
          }}
          title="Destination"
          anchor={{ x: 0.5, y: 1 }}
        >
          <View style={styles.dropoffMarker}>
            <MapPin size={16} color={colors.white} />
          </View>
        </Marker>

        {routeCoords.length > 0 && (
          <Polyline coordinates={routeCoords} strokeColor={colors.primary} strokeWidth={4} />
        )}
      </RNMapView>

      <View style={styles.bottomCard}>
        <View style={styles.statusRow}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>On the way to your destination</Text>
        </View>

        <View style={styles.tripInfo}>
          <View style={styles.tripRow}>
            <View style={styles.dotGreen} />
            <Text style={styles.tripAddress} numberOfLines={1}>{trip.pickup_address}</Text>
          </View>
          <View style={styles.tripDivider} />
          <View style={styles.tripRow}>
            <MapPin size={12} color={colors.dark} />
            <Text style={styles.tripAddress} numberOfLines={1}>{trip.dropoff_address}</Text>
          </View>
        </View>

        <View style={styles.fareRow}>
          <Text style={styles.fareLabel}>Fare</Text>
          <Text style={styles.fareValue}>GH₵{trip.fare}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  carIcon: { width: 48, height: 48 },
  dropoffMarker: { width: 36, height: 36, borderRadius: radius.full, backgroundColor: colors.error, justifyContent: 'center', alignItems: 'center', ...shadows.sm },
  bottomCard: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.lg, paddingBottom: bottomPadding, ...shadows.lg },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  statusDot: { width: 10, height: 10, borderRadius: radius.full, backgroundColor: colors.primary },
  statusText: { fontSize: fontSizes.md, fontWeight: '700', color: colors.dark },
  tripInfo: { backgroundColor: colors.gray, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md },
  tripRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dotGreen: { width: 10, height: 10, borderRadius: radius.full, backgroundColor: colors.success },
  tripDivider: { width: 1, height: 16, backgroundColor: colors.gray2, marginLeft: 4, marginVertical: 2 },
  tripAddress: { flex: 1, fontSize: fontSizes.sm, fontWeight: '600', color: colors.dark },
  fareRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fareLabel: { fontSize: fontSizes.sm, color: colors.textMuted, fontWeight: '500' },
  fareValue: { fontSize: fontSizes.xl, fontWeight: '800', color: colors.dark },
});