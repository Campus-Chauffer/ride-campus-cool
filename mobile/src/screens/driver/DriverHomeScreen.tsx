import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, Alert, ActivityIndicator,
  StatusBar, Switch, Image
} from 'react-native';
import * as Location from 'expo-location';
import RNMapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Menu, AlertCircle } from 'lucide-react-native';
import SideMenu from '../../components/SideMenu';
import RideOfferScreen from './RideOfferScreen';
import ToPickupScreen from './ToPickupScreen';
import ActiveRideDriverScreen from './ActiveRideDriverScreen';
import TripCompleteScreen from './TripCompleteScreen';
import { driverAPI, ratingsAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useRideStore } from '../../store/rideStore';
import { colors, spacing, fontSizes, radius, shadows, bottomPadding, androidTopPadding } from '../../utils/theme';
import socketService from '../../services/socket';
import { AppState } from 'react-native';

const CAR_ICON = require('../../../assets/car-top.png');

export default function DriverHomeScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const { pendingOffer, setPendingOffer, clearRide } = useRideStore();

  const [isOnline, setIsOnline] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tripPhase, setTripPhase] = useState<'idle' | 'offer' | 'topickup' | 'inprogress' | 'complete'>('idle');
  const [activeTrip, setActiveTrip] = useState<any>(null);
  const [offerTimer, setOfferTimer] = useState(15);
  const [driverLocation, setDriverLocation] = useState<any>(null);
  const [heading, setHeading] = useState(0);
  const mapRef = useRef<RNMapView>(null);
  const locationInterval = useRef<any>(null);
  const offerInterval = useRef<any>(null);
  const timerInterval = useRef<any>(null);
  const headingSubscription = useRef<any>(null);
  const tripPhaseRef = useRef<string>('idle');
  const activeTripRef = useRef<any>(null);
  const isCompleting = useRef(false);
  const cancelPollInterval = useRef<any>(null);

  const setTripPhaseSync = (phase: string) => {
    tripPhaseRef.current = phase;
    setTripPhase(phase as any);
  };

  const setActiveTripSync = (trip: any) => {
    activeTripRef.current = trip;
    setActiveTrip(trip);
  };

  useEffect(() => {
    getInitialLocation();
    return () => {
      clearInterval(locationInterval.current);
      clearInterval(offerInterval.current);
      clearInterval(timerInterval.current);
      clearInterval(cancelPollInterval.current);
      headingSubscription.current?.remove();
    };
  }, []);

  useEffect(() => {
  const subscription = AppState.addEventListener('change', (nextAppState) => {
    if (nextAppState === 'active' && isOnline) {
      if (driverLocation) {
        setDriverLocation({ ...driverLocation });
      }
    }
  });
  return () => subscription.remove();
}, [isOnline, driverLocation]);

  const getInitialLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = loc.coords;
      setDriverLocation({ lat: latitude, lng: longitude });
      mapRef.current?.animateToRegion({ latitude, longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 });
      headingSubscription.current = await Location.watchHeadingAsync((h) => {
        setHeading(h.trueHeading || h.magHeading || 0);
      });
    } catch (err) {
      console.log('Initial location error:', err);
    }
  };

  const startOfferPolling = () => {
    clearInterval(offerInterval.current);
    offerInterval.current = setInterval(async () => {
      try {
        const res = await driverAPI.checkOffers();
        if (res.data.offer) {
          clearInterval(offerInterval.current);
          setPendingOffer(res.data.offer);
          setTripPhaseSync('offer');
          setOfferTimer(15);
          timerInterval.current = setInterval(() => {
            setOfferTimer((prev: number) => {
              if (prev <= 1) {
                clearInterval(timerInterval.current);
                setPendingOffer(null);
                setTripPhaseSync('idle');
                startOfferPolling();
                return 15;
              }
              return prev - 1;
            });
          }, 1000);
        }
      } catch (err) {
        console.log('Offer poll error:', err);
      }
    }, 5000);
  };

  const startCancelPoll = (tripId: number) => {
    clearInterval(cancelPollInterval.current);
    cancelPollInterval.current = setInterval(async () => {
      try {
        const phase = tripPhaseRef.current;
        if (phase === 'topickup' || phase === 'inprogress') {
          const tripRes = await driverAPI.getTripStatus(tripId);
          if (tripRes.data?.status === 'cancelled') {
            clearInterval(cancelPollInterval.current);
            Alert.alert('Ride Cancelled', 'The passenger has cancelled the ride.', [
              {
                text: 'OK', onPress: () => {
                  setActiveTripSync(null);
                  setTripPhaseSync('idle');
                  startOfferPolling();
                }
              }
            ]);
          }
        }
      } catch (err) {
        console.log('Cancel poll error:', err);
      }
    }, 5000);
  };

  const goOnline = async () => {
    setLoading(true);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          return Alert.alert('Permission denied', 'Location access is needed');
        }
        let loc = await Location.getLastKnownPositionAsync({});
        if (!loc) loc = await Location.getCurrentPositionAsync({});

        // Try to go online — ignore error if already online in DB, but block if wallet locked
        try {
          await driverAPI.goOnline(loc.coords.latitude, loc.coords.longitude);
        } catch (err: any) {
          const errorMsg = err.response?.data?.error || '';
          if (err.response?.status === 403 && errorMsg.toLowerCase().includes('locked')) {
            Alert.alert(
              'Account Locked',
              'You have outstanding commission. Please clear your balance to go online.',
              [{ text: 'OK' }]
            );
            return; // stop here — don't set online
          }
          // Any other error (e.g. already online in DB) — ignore and continue
          console.log('goOnline error (may already be online):', errorMsg);
        }

      setIsOnline(true);
      socketService.connect();
      startOfferPolling();

      clearInterval(locationInterval.current);
      locationInterval.current = setInterval(async () => {
        try {
          const loc = await Location.getCurrentPositionAsync({});
          const { latitude, longitude } = loc.coords;
          setDriverLocation({ lat: latitude, lng: longitude });
          await driverAPI.updateLocation(latitude, longitude);
          if (activeTripRef.current?.id) {
            socketService.sendLocation(activeTripRef.current.id, latitude, longitude, heading);
          }
        } catch (err) {
          console.log('Location update error:', err);
        }
      }, 5000);

    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Could not go online');
    } finally {
      setLoading(false);
    }
  };

  const goOffline = async () => {
    clearInterval(locationInterval.current);
    clearInterval(offerInterval.current);
    clearInterval(timerInterval.current);
    clearInterval(cancelPollInterval.current);
    await driverAPI.goOffline();
    setIsOnline(false);
    setTripPhaseSync('idle');
  };

  const toggleOnline = () => {
    if (isOnline) goOffline();
    else goOnline();
  };

  const acceptOffer = async () => {
    if (!pendingOffer) return;
    clearInterval(timerInterval.current);
    try {
      const res = await driverAPI.acceptOffer(pendingOffer.id);
      setActiveTripSync(res.data);
      setPendingOffer(null);
      setTripPhaseSync('topickup');
      startCancelPoll(res.data.id);
    } catch (err) {
      Alert.alert('Error', 'Could not accept offer');
    }
  };

  const declineOffer = () => {
    clearInterval(timerInterval.current);
    setPendingOffer(null);
    setTripPhaseSync('idle');
    startOfferPolling();
  };

  const startTrip = async () => {
    if (!activeTripRef.current) return;
    try {
      await driverAPI.startTrip(activeTripRef.current.id);
      setTripPhaseSync('inprogress');
    } catch (err) {
      Alert.alert('Error', 'Could not start trip');
    }
  };

  const completeTrip = async () => {
    if (!activeTripRef.current) return;
    if (isCompleting.current) return;
    isCompleting.current = true;
    clearInterval(cancelPollInterval.current);
    // Fire API in background
    driverAPI.completeTrip(activeTripRef.current.id).then((res) => {
      const completedTrip = res.data?.trip || res.data;
      if (completedTrip?.id) setActiveTripSync(completedTrip);
    }).catch((err: any) => {
      console.log('Complete trip error (ignored):', err.response?.data?.error);
    }).finally(() => {
      isCompleting.current = false;
    });
    // Transition after 1 second regardless of API response
    setTimeout(() => setTripPhaseSync('complete'), 1000);
  };

  const handleRate = async (rating: number, comment: string) => {
    try {
      await ratingsAPI.ratePassenger(activeTripRef.current.id, rating, comment);
    } catch (err) {
      console.log('Rating error:', err);
    }
  };

  const handleReport = () => {
    Alert.alert('Report Passenger', 'Are you sure you want to report this passenger?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Report', style: 'destructive', onPress: () => {} },
    ]);
  };

  const handleDone = () => {
    clearRide();
    setActiveTripSync(null);
    setTripPhaseSync('idle');
    startOfferPolling();
    // Re-center map after returning to idle
    setTimeout(() => {
      if (driverLocation) {
        mapRef.current?.animateToRegion({
          latitude: driverLocation.lat,
          longitude: driverLocation.lng,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        });
      }
    }, 300);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hi, {user?.first_name}</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, isOnline && styles.statusDotOnline]} />
            <Text style={styles.statusText}>{isOnline ? 'Online' : 'Offline'}</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.toggleContainer}>
            <Switch
              value={isOnline}
              onValueChange={toggleOnline}
              trackColor={{ false: 'rgba(255,255,255,0.2)', true: colors.primary }}
              thumbColor={colors.white}
              disabled={loading}
            />
          </View>
          <TouchableOpacity style={styles.menuBtn} onPress={() => setMenuOpen(true)}>
            <Menu size={18} color='rgba(255,255,255,0.6)' />
          </TouchableOpacity>
        </View>
      </View>

      {tripPhase === 'idle' && (
        <View style={styles.mapContainer}>
          <RNMapView
            ref={mapRef}
            style={StyleSheet.absoluteFillObject}
            provider={PROVIDER_GOOGLE}
            showsUserLocation={false}
            showsMyLocationButton={false}
            initialRegion={{
              latitude: driverLocation?.lat || 5.6502,
              longitude: driverLocation?.lng || -0.1870,
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
          </RNMapView>

          <View style={styles.statusOverlay}>
            {isOnline ? (
              <View style={styles.onlineCard}>
                <ActivityIndicator color={colors.primary} size="small" />
                <View style={styles.onlineCardText}>
                  <Text style={styles.onlineTitle}>Waiting for rides</Text>
                  <Text style={styles.onlineSubtitle}>You'll be notified when a ride is nearby</Text>
                </View>
              </View>
            ) : (
              <View style={styles.offlineCard}>
                <AlertCircle size={24} color={colors.gray3} />
                <View style={styles.onlineCardText}>
                  <Text style={styles.offlineTitle}>You're offline</Text>
                  <Text style={styles.onlineSubtitle}>Toggle the switch above to go online</Text>
                </View>
              </View>
            )}
          </View>
        </View>
      )}

      {tripPhase === 'offer' && pendingOffer && (
        <View style={StyleSheet.absoluteFillObject}>
          <RideOfferScreen trip={pendingOffer} timer={offerTimer} onAccepted={acceptOffer} onDeclined={declineOffer} />
        </View>
      )}

      {tripPhase === 'topickup' && activeTrip && (
        <View style={StyleSheet.absoluteFillObject}>
          <ToPickupScreen
            trip={activeTrip}
            onStartTrip={startTrip}
            onCancelled={() => {
              setActiveTripSync(null);
              setTripPhaseSync('idle');
              startOfferPolling();
            }}
          />
        </View>
      )}

      {tripPhase === 'inprogress' && activeTrip && (
        <View style={StyleSheet.absoluteFillObject}>
          <ActiveRideDriverScreen trip={activeTrip} onCompleteTrip={completeTrip} />
        </View>
      )}

      {tripPhase === 'complete' && activeTrip && (
        <View style={StyleSheet.absoluteFillObject}>
          <TripCompleteScreen trip={activeTrip} onDone={handleDone} onRate={handleRate} onReport={handleReport} />
        </View>
      )}

      <SideMenu visible={menuOpen} onClose={() => setMenuOpen(false)} navigation={navigation} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark, paddingTop: androidTopPadding },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    zIndex: 10,
  },
  greeting: { fontSize: fontSizes.lg, fontWeight: '800', color: colors.white, letterSpacing: -0.5 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 2 },
  statusDot: { width: 6, height: 6, borderRadius: radius.full, backgroundColor: colors.gray3 },
  statusDotOnline: { backgroundColor: colors.success },
  statusText: { fontSize: fontSizes.xs, color: 'rgba(255,255,255,0.5)', fontWeight: '500' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  toggleContainer: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: radius.full, padding: 4 },
  menuBtn: { width: 36, height: 36, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center' },
  mapContainer: { flex: 1, position: 'relative' },
  carIcon: { width: 36, height: 36 },
  statusOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: spacing.lg, paddingBottom: spacing.xxl },
  onlineCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.dark, borderRadius: radius.xl, padding: spacing.md, borderWidth: 1, borderColor: 'rgba(255,184,0,0.3)', ...shadows.lg },
  offlineCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.dark, borderRadius: radius.xl, padding: spacing.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', ...shadows.lg },
  onlineCardText: { flex: 1 },
  onlineTitle: { fontSize: fontSizes.md, fontWeight: '700', color: colors.white },
  offlineTitle: { fontSize: fontSizes.md, fontWeight: '700', color: colors.gray3 },
  onlineSubtitle: { fontSize: fontSizes.xs, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
});