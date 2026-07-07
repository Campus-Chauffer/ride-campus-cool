import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  TouchableOpacity, Alert, Animated, StatusBar
} from 'react-native';
import { X, MapPin, Navigation } from 'lucide-react-native';
import { ridesAPI } from '../../services/api';
import { useRideStore } from '../../store/rideStore';
import socketService from '../../services/socket';
import DriverFoundScreen from './DriverFoundScreen';
import ActiveRideScreen from './ActiveRideScreen';
import DriverArrivedScreen from './DriverArrivedScreen';
import { colors, spacing, fontSizes, radius, shadows } from '../../utils/theme';

type Phase = 'searching' | 'driver_found' | 'driver_arrived' | 'in_progress' | 'completed';

export default function RideMatchingScreen({ route, navigation }: any) {
  const { trip } = route.params;
  const { clearRide } = useRideStore();
  const [phase, setPhase] = useState<Phase>('searching');
  const [currentTrip, setCurrentTrip] = useState(trip);
  const phaseRef = useRef<Phase>('searching');
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim2 = useRef(new Animated.Value(1)).current;
  const pulseAnim3 = useRef(new Animated.Value(1)).current;
  const pollInterval = useRef<any>(null);

  const updatePhase = (newPhase: Phase) => {
    phaseRef.current = newPhase;
    setPhase(newPhase);
  };

  useEffect(() => {
    startPulse();
    socketService.connect();
    socketService.joinRide(trip.id);
    startPolling();
    return () => clearInterval(pollInterval.current);
  }, []);

  const startPulse = () => {
    const pulse = (anim: Animated.Value, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 2.5, duration: 1500, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 1, duration: 0, useNativeDriver: true }),
        ])
      ).start();
    };
    pulse(pulseAnim, 0);
    pulse(pulseAnim2, 500);
    pulse(pulseAnim3, 1000);
  };

  const startPolling = () => {
    pollInterval.current = setInterval(async () => {
      try {
        const res = await ridesAPI.getHistory();
        const updated = res.data.find((r: any) => r.id === trip.id);
        if (!updated) return;
        setCurrentTrip(updated);

        const currentPhase = phaseRef.current;

        if (updated.status === 'accepted' && currentPhase === 'searching') {
          updatePhase('driver_found');
        } else if (updated.status === 'arrived' && (currentPhase === 'searching' || currentPhase === 'driver_found')) {
          updatePhase('driver_arrived');
        } else if (updated.status === 'in_progress' && (currentPhase === 'driver_found' || currentPhase === 'driver_arrived')) {
          updatePhase('in_progress');
        } else if (updated.status === 'completed') {
          clearInterval(pollInterval.current);
          updatePhase('completed');
          navigation.replace('RideRating', { trip: updated });
        } else if (updated.status === 'no_driver_found' || updated.status === 'cancelled') {
          clearInterval(pollInterval.current);
          Alert.alert(
            'No drivers available',
            'Sorry, no drivers are available right now. Please try again.',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
        }
      } catch (err) {
        console.log('Poll error:', err);
      }
    }, 3000);
  };

  const cancelRide = async () => {
    Alert.alert('Cancel Ride', 'Are you sure?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, cancel', style: 'destructive', onPress: async () => {
          try {
            await ridesAPI.cancelRide(trip.id);
            clearRide();
            navigation.goBack();
          } catch (err) {
            Alert.alert('Error', 'Could not cancel ride');
          }
        }
      }
    ]);
  };

  return (
    <View style={styles.container}>
      {phase === 'searching' && (
        <SafeAreaView style={styles.searchContainer}>
          <StatusBar barStyle="light-content" />
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeBtn} onPress={cancelRide}>
              <X size={20} color={colors.white} />
            </TouchableOpacity>
          </View>

          <View style={styles.pulseContainer}>
            <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulseAnim3 }], opacity: pulseAnim3.interpolate({ inputRange: [1, 2.5], outputRange: [0.15, 0] }) }]} />
            <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulseAnim2 }], opacity: pulseAnim2.interpolate({ inputRange: [1, 2.5], outputRange: [0.25, 0] }) }]} />
            <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulseAnim }], opacity: pulseAnim.interpolate({ inputRange: [1, 2.5], outputRange: [0.35, 0] }) }]} />
            <View style={styles.pulseCenter}>
              <Navigation size={28} color={colors.white} />
            </View>
          </View>

          <Text style={styles.title}>Finding your driver</Text>
          <Text style={styles.subtitle}>Looking for nearby drivers...</Text>

          <View style={styles.tripCard}>
            <View style={styles.tripRow}>
              <View style={styles.dotGreen} />
              <View style={styles.tripInfo}>
                <Text style={styles.tripLabel}>Pickup</Text>
                <Text style={styles.tripAddress}>{trip.pickup_address}</Text>
              </View>
            </View>
            <View style={styles.tripLine} />
            <View style={styles.tripRow}>
              <MapPin size={14} color={colors.white} />
              <View style={styles.tripInfo}>
                <Text style={styles.tripLabel}>Destination</Text>
                <Text style={styles.tripAddress}>{trip.dropoff_address}</Text>
              </View>
            </View>
          </View>

          <View style={styles.fareRow}>
            <Text style={styles.fareLabel}>Estimated fare</Text>
            <Text style={styles.fareValue}>GH₵{Math.round(parseFloat(trip.fare))}</Text>
          </View>

          <TouchableOpacity style={styles.cancelBtn} onPress={cancelRide}>
            <Text style={styles.cancelText}>Cancel Ride</Text>
          </TouchableOpacity>
        </SafeAreaView>
      )}

      {phase === 'driver_found' && (
        <DriverFoundScreen
          trip={currentTrip}
          onRideStarted={() => updatePhase('in_progress')}
          onCancelled={() => navigation.goBack()}
        />
      )}

      {phase === 'driver_arrived' && (
        <DriverArrivedScreen
          trip={currentTrip}
          onTripStarted={() => updatePhase('in_progress')}
          onCancelled={() => navigation.goBack()}
        />
      )}

      {phase === 'in_progress' && (
        <ActiveRideScreen
          trip={currentTrip}
          onTripComplete={() => navigation.replace('RideRating', { trip: currentTrip })}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchContainer: { flex: 1, backgroundColor: colors.dark },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    alignItems: 'flex-end',
  },
  closeBtn: {
    width: 40, height: 40,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
    marginTop: spacing.xl,
  },
  pulseRing: {
    position: 'absolute',
    width: 120, height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary,
  },
  pulseCenter: {
    width: 72, height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.lg,
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: '800',
    color: colors.white,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSizes.sm,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  tripCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  tripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  dotGreen: {
    width: 10, height: 10,
    borderRadius: radius.full,
    backgroundColor: colors.success,
  },
  tripLine: {
    width: 1, height: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginLeft: 4,
    marginVertical: 2,
  },
  tripInfo: { flex: 1 },
  tripLabel: {
    fontSize: fontSizes.xs,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '500',
  },
  tripAddress: {
    fontSize: fontSizes.sm,
    color: colors.white,
    fontWeight: '600',
  },
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    backgroundColor: 'rgba(255,184,0,0.1)',
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,184,0,0.2)',
  },
  fareLabel: {
    fontSize: fontSizes.sm,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
  },
  fareValue: {
    fontSize: fontSizes.lg,
    fontWeight: '800',
    color: colors.primary,
  },
  cancelBtn: {
    marginHorizontal: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  cancelText: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },
});