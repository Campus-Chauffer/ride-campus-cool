import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin } from 'lucide-react-native';
import { driverAPI } from '../../services/api';
import { useRideStore } from '../../store/rideStore';
import { useThemeStore } from '../../store/themeStore';
import { getColors, spacing, fontSizes, radius, navy, white, androidTopPadding, gradients, tintedShadow } from '../../utils/theme';
import SlideToConfirm from '../../components/SlideToConfirm';

interface Props {
  trip: any;
  onAccepted: () => void;
  onDeclined: () => void;
  timer: number;
}

export default function RideOfferScreen({ trip, onAccepted, onDeclined, timer }: Props) {
  const { isDark } = useThemeStore();
  const colors = getColors(isDark);
  // This screen re-renders once a second for its countdown timer — without
  // memoizing, getStyles(colors) reruns StyleSheet.create on every one of
  // those ticks for no reason, since colors itself hasn't changed.
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);
  const [accepted, setAccepted] = useState(false);

  const handleAccept = () => {
    setAccepted(true);
    onAccepted();
  };

  const timerColor = timer <= 5 ? colors.error : timer <= 10 ? '#FF9800' : colors.primary;

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

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

      {/* Fare — the one hero moment on this screen, so it gets the gradient
          card treatment rather than the flat gray fill the route card
          below still uses. */}
      <LinearGradient
        colors={isDark ? gradients.navyCardDark : gradients.navyCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.fareRow}
      >
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
      </LinearGradient>

      {trip.discount_code && (
        <View style={styles.promoBadge}>
          <Text style={styles.promoBadgeText}>Promo ride — your earnings aren't affected</Text>
        </View>
      )}

      {/* Slide to accept */}
      <View style={styles.sliderContainer}>
        <SlideToConfirm label="Slide to accept →" onConfirm={handleAccept} disabled={accepted} />
      </View>

      {/* Decline */}
      <Text style={styles.declineText} onPress={onDeclined}>
        Decline
      </Text>
    </View>
  );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
    padding: spacing.lg,
    paddingTop: androidTopPadding || spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
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
    backgroundColor: colors.white,
    ...tintedShadow(navy, isDark ? 0 : 0.12),
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
    backgroundColor: colors.offWhite,
    borderRadius: radius.xl,
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
    borderRadius: radius.xl,
    padding: spacing.md + 2,
    marginBottom: spacing.xl,
    ...tintedShadow(navy, isDark ? 0 : 0.25),
  },
  fareItem: {
    flex: 1,
    alignItems: 'center',
  },
  fareDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  fareLabel: {
    fontSize: fontSizes.xs,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
    marginBottom: 4,
  },
  fareValue: {
    fontSize: fontSizes.lg,
    fontWeight: '800',
    color: white,
  },
  promoBadge: {
    backgroundColor: colors.primary + '18',
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
    width: '100%',
    alignItems: 'center',
  },
  promoBadgeText: {
    fontSize: fontSizes.xs,
    fontWeight: '600',
    color: colors.dark,
  },
  sliderContainer: {
    width: '100%',
    marginBottom: spacing.lg,
  },
  declineText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.textMuted,
    padding: spacing.md,
  },
});