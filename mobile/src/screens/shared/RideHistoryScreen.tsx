import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, FlatList, ActivityIndicator, StatusBar
} from 'react-native';
import { ArrowLeft, MapPin, Navigation, Clock, Star } from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { getColors, spacing, fontSizes, radius, shadows } from '../../utils/theme';
import { ridesAPI, driverAPI } from '../../services/api';

// Depends on the current theme's colors, so it's a function computed inside
// the component (like getStyles) rather than a module-scope constant —
// a plain object here would freeze on the colors captured at import time
// and never react to the dark-mode toggle.
const getStatusColors = (colors: any): any => ({
  completed: colors.success,
  cancelled: colors.error,
  no_driver_found: colors.textMuted,
  in_progress: colors.info,
  requested: colors.primary,
});

const STATUS_LABELS: any = {
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_driver_found: 'No Driver',
  in_progress: 'In Progress',
  requested: 'Searching',
};

export default function RideHistoryScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const { isDark } = useThemeStore();
  const colors = getColors(isDark);
  const styles = getStyles(colors);
  const STATUS_COLORS = getStatusColors(colors);
  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      let res;
      if (user?.role === 'driver') {
        res = await driverAPI.getHistory();
      } else {
        res = await ridesAPI.getHistory();
      }
      setRides(res.data);
    } catch (err) {
      console.log('History error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const renderRide = ({ item }: any) => (
    <View style={styles.rideCard}>
      <View style={styles.rideHeader}>
        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] + '20' }]}>
          <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[item.status] }]} />
          <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] }]}>
            {STATUS_LABELS[item.status]}
          </Text>
        </View>
        <Text style={styles.fareText}>GH₵{item.fare}</Text>
      </View>

      <View style={styles.routeSection}>
        <View style={styles.routeRow}>
          <View style={styles.dotGreen} />
          <View style={styles.routeInfo}>
            <Text style={styles.routeLabel}>From</Text>
            <Text style={styles.routeAddress} numberOfLines={1}>{item.pickup_address}</Text>
          </View>
        </View>
        <View style={styles.routeLine} />
        <View style={styles.routeRow}>
          <MapPin size={12} color={colors.dark} />
          <View style={styles.routeInfo}>
            <Text style={styles.routeLabel}>To</Text>
            <Text style={styles.routeAddress} numberOfLines={1}>{item.dropoff_address}</Text>
          </View>
        </View>
      </View>

      <View style={styles.rideFooter}>
        <View style={styles.footerRow}>
          <Clock size={12} color={colors.textMuted} />
          <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
        </View>
        {item.status === 'completed' && user?.role === 'passenger' && !item.rated_by_passenger && (
          <TouchableOpacity
            style={styles.rateBtn}
            onPress={() => navigation.navigate('RideRating', { trip: item })}
          >
            <Star size={12} color={colors.primary} />
            <Text style={styles.rateBtnText}>Rate</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={colors.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ride History</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ flex: 1 }} />
      ) : rides.length === 0 ? (
        <View style={styles.emptyState}>
          <Navigation size={48} color={colors.gray2} />
          <Text style={styles.emptyTitle}>No rides yet</Text>
          <Text style={styles.emptySubtitle}>Your ride history will appear here</Text>
        </View>
      ) : (
        <FlatList
          data={rides}
          renderItem={renderRide}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.offWhite },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray2,
  },
  backBtn: {
    width: 40, height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.gray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: colors.dark,
  },
  list: { padding: spacing.lg, gap: spacing.sm },
  rideCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  rideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  statusDot: {
    width: 6, height: 6,
    borderRadius: radius.full,
  },
  statusText: {
    fontSize: fontSizes.xs,
    fontWeight: '700',
  },
  fareText: {
    fontSize: fontSizes.lg,
    fontWeight: '800',
    color: colors.dark,
  },
  routeSection: {
    backgroundColor: colors.gray,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
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
  rideFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dateText: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
  },
  rateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFBF0',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  rateBtnText: {
    fontSize: fontSizes.xs,
    fontWeight: '700',
    // Brand yellow on the near-white pill background is ~1.7:1 — swap to navy.
    color: colors.dark,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: colors.dark,
  },
  emptySubtitle: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
  },
});