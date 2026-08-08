import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, Linking, Alert, Image
} from 'react-native';
import RNMapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { MapPin, Phone, Clock, AlertTriangle } from 'lucide-react-native';
import { driverAPI, ridesAPI } from '../../services/api';
import socketService from '../../services/socket';
import { useThemeStore } from '../../store/themeStore';
import { getColors, spacing, fontSizes, radius, shadows, bottomPadding, androidTopPadding } from '../../utils/theme';

const CAR_ICON = require('../../../assets/car-top.png');

interface Props {
  trip: any;
  onTripStarted: () => void;
  onCancelled: () => void;
}

export default function DriverArrivedScreen({ trip, onTripStarted, onCancelled }: Props) {
  const { isDark } = useThemeStore();
  const colors = getColors(isDark);
  const styles = getStyles(colors);
  const [waitSeconds, setWaitSeconds] = useState(0);
  const [currentFare, setCurrentFare] = useState(parseFloat(trip.fare));
  const [waitPenalty, setWaitPenalty] = useState(0);
  const [driverLocation, setDriverLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const mapRef = useRef<RNMapView>(null);
  const timerRef = useRef<any>(null);
  const fareRef = useRef<any>(null);

  const FREE_WAIT = 300;

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
      setDriverLocation({ latitude: data.latitude, longitude: data.longitude });
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
              coordinate={driverLocation}
              title="Your driver"
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges={false}
            >
              <Image source={CAR_ICON} style={{ width: 36, height: 36 }} resizeMode="contain" />
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
              <MapPin size={16} color={colors.dark} />
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
                <Phone size={16} color={colors.dark} />
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
  driverAvatarText: { fontSize: fontSizes.lg, fontWeight: '800', color: colors.dark },
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
});