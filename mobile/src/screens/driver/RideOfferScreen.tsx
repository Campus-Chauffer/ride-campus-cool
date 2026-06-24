import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Animated, PanResponder,
  Dimensions, Alert, StatusBar
} from 'react-native';
import { MapPin, Navigation, Clock } from 'lucide-react-native';
import { driverAPI } from '../../services/api';
import { useRideStore } from '../../store/rideStore';
import { colors, spacing, fontSizes, radius, shadows } from '../../utils/theme';

const { width } = Dimensions.get('window');
const SLIDER_WIDTH = width - spacing.lg * 2 - 32;
const THUMB_SIZE = 56;
const MAX_SLIDE = SLIDER_WIDTH - THUMB_SIZE;

interface Props {
  trip: any;
  onAccepted: () => void;
  onDeclined: () => void;
  timer: number;
}

export default function RideOfferScreen({ trip, onAccepted, onDeclined, timer }: Props) {
  const slideX = useRef(new Animated.Value(0)).current;
  const [accepted, setAccepted] = useState(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gs) => {
        const newX = Math.max(0, Math.min(gs.dx, MAX_SLIDE));
        slideX.setValue(newX);
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dx >= MAX_SLIDE * 0.85) {
          Animated.spring(slideX, {
            toValue: MAX_SLIDE,
            useNativeDriver: false,
          }).start(() => {
            setAccepted(true);
            onAccepted();
          });
        } else {
          Animated.spring(slideX, {
            toValue: 0,
            useNativeDriver: false,
            bounciness: 8,
          }).start();
        }
      },
    })
  ).current;

  const sliderColor = slideX.interpolate({
    inputRange: [0, MAX_SLIDE],
    outputRange: [colors.gray2, colors.success],
  });

  const textOpacity = slideX.interpolate({
    inputRange: [0, MAX_SLIDE * 0.5],
    outputRange: [1, 0],
  });

  const timerColor = timer <= 5 ? colors.error : timer <= 10 ? '#FF9800' : colors.primary;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Timer */}
      <View style={styles.timerContainer}>
        <View style={[styles.timerCircle, { borderColor: timerColor }]}>
          <Text style={[styles.timerText, { color: timerColor }]}>{timer}</Text>
          <Text style={styles.timerLabel}>sec</Text>
        </View>
      </View>

      {/* Title */}
      <Text style={styles.title}>New Ride Request</Text>
      <Text style={styles.subtitle}>Slide to accept before time runs out</Text>

      {/* Route card */}
      <View style={styles.routeCard}>
        <View style={styles.routeRow}>
          <View style={styles.dotGreen} />
          <View style={styles.routeInfo}>
            <Text style={styles.routeLabel}>Pickup</Text>
            <Text style={styles.routeAddress}>{trip.pickup_address}</Text>
          </View>
        </View>
        <View style={styles.routeLine} />
        <View style={styles.routeRow}>
          <MapPin size={14} color={colors.dark} />
          <View style={styles.routeInfo}>
            <Text style={styles.routeLabel}>Destination</Text>
            <Text style={styles.routeAddress}>{trip.dropoff_address}</Text>
          </View>
        </View>
      </View>

      {/* Fare */}
      <View style={styles.fareRow}>
        <View style={styles.fareItem}>
          <Text style={styles.fareLabel}>Fare</Text>
          <Text style={styles.fareValue}>GH₵{trip.fare}</Text>
        </View>
        <View style={styles.fareDivider} />
        <View style={styles.fareItem}>
          <Text style={styles.fareLabel}>Commission</Text>
          <Text style={[styles.fareValue, { color: colors.error }]}>
            GH₵{trip.commission}
          </Text>
        </View>
        <View style={styles.fareDivider} />
        <View style={styles.fareItem}>
          <Text style={styles.fareLabel}>You earn</Text>
          <Text style={[styles.fareValue, { color: colors.success }]}>
            GH₵{(parseFloat(trip.fare) - parseFloat(trip.commission)).toFixed(2)}
          </Text>
        </View>
      </View>

      {/* Slide to accept */}
      <View style={styles.sliderContainer}>
        <Animated.View style={[styles.sliderTrack, { backgroundColor: sliderColor }]}>
          <Animated.Text style={[styles.sliderText, { opacity: textOpacity }]}>
            Slide to accept →
          </Animated.Text>
          <Animated.View
            style={[styles.sliderThumb, { transform: [{ translateX: slideX }] }]}
            {...panResponder.panHandlers}
          >
            <Navigation size={24} color={colors.white} />
          </Animated.View>
        </Animated.View>
      </View>

      {/* Decline */}
      <Text style={styles.declineText} onPress={onDeclined}>
        Decline
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
    padding: spacing.lg,
    alignItems: 'center',
  },
  timerContainer: {
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  timerCircle: {
    width: 80, height: 80,
    borderRadius: 40,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerText: {
    fontSize: fontSizes.xxl,
    fontWeight: '800',
  },
  timerLabel: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginTop: -4,
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: '800',
    color: colors.dark,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  routeCard: {
    width: '100%',
    backgroundColor: colors.gray,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dotGreen: {
    width: 10, height: 10,
    borderRadius: radius.full,
    backgroundColor: colors.success,
  },
  routeLine: {
    width: 1, height: 16,
    backgroundColor: colors.gray2,
    marginLeft: 4,
    marginVertical: 2,
  },
  routeInfo: { flex: 1 },
  routeLabel: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    fontWeight: '500',
  },
  routeAddress: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.dark,
  },
  fareRow: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: colors.gray,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  fareItem: {
    flex: 1,
    alignItems: 'center',
  },
  fareDivider: {
    width: 1,
    backgroundColor: colors.gray2,
  },
  fareLabel: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginBottom: 4,
  },
  fareValue: {
    fontSize: fontSizes.lg,
    fontWeight: '800',
    color: colors.dark,
  },
  sliderContainer: {
    width: '100%',
    marginBottom: spacing.lg,
  },
  sliderTrack: {
    height: THUMB_SIZE + 8,
    borderRadius: radius.full,
    justifyContent: 'center',
    paddingHorizontal: 4,
    overflow: 'hidden',
  },
  sliderText: {
    position: 'absolute',
    width: '100%',
    textAlign: 'center',
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: colors.dark,
  },
  sliderThumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: radius.full,
    backgroundColor: colors.dark,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
  },
  declineText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.textMuted,
    padding: spacing.md,
  },
});