import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Linking, StatusBar, Image,
} from 'react-native';
import RNMapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Phone, Users } from 'lucide-react-native';
import socketService from '../../services/socket';
import { useThemeStore } from '../../store/themeStore';
import { getColors, spacing, fontSizes, radius, navy, white, bottomPadding, tintedShadow } from '../../utils/theme';

const CAR_ICON = require('../../../assets/car-top.png');

interface Props {
  trip: any; // this passenger's own leg — already picked up (status 'arrived')
}

// Shown only to the passenger who's already onboard, for the moment
// between "you're confirmed picked up" and "the trip actually starts" —
// exactly the gap that doesn't exist in a solo ride, where those two
// things happen together. A short-lived screen (one more stop, typically
// nearby by construction — the match's own proximity filter already
// guaranteed that), so it deliberately skips the main ActiveRideScreen's
// glide-animation/route-staleness machinery for a simpler live marker.
export default function PickingUpPartnerScreen({ trip }: Props) {
  const { isDark } = useThemeStore();
  const colors = getColors(isDark);
  const styles = getStyles(colors, isDark);
  const [driverLocation, setDriverLocation] = useState<{ latitude: number; longitude: number } | null>(
    trip.driver_lat && trip.driver_lng ? { latitude: parseFloat(trip.driver_lat), longitude: parseFloat(trip.driver_lng) } : null
  );
  const [driverHeading, setDriverHeading] = useState(0);

  useEffect(() => {
    socketService.joinRide(trip.id);
    socketService.onDriverLocation((data) => {
      setDriverLocation({ latitude: data.latitude, longitude: data.longitude });
      setDriverHeading(data.heading || 0);
    });
    return () => socketService.offDriverLocation();
  }, [trip.id]);

  // Falls back to whatever the parent's own 3s status poll already carries
  // on the trip object, same pattern every other ride-tracking screen in
  // this app uses once the socket feed goes quiet.
  useEffect(() => {
    if (trip.driver_lat && trip.driver_lng) {
      setDriverLocation((prev) => prev ?? { latitude: parseFloat(trip.driver_lat), longitude: parseFloat(trip.driver_lng) });
    }
  }, [trip.driver_lat, trip.driver_lng]);

  const partnerName = trip.co_riders?.[0]?.first_name || 'your ride partner';

  const callDriver = () => {
    if (trip.driver_phone) Linking.openURL(`tel:${trip.driver_phone}`);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <View style={styles.mapContainer}>
        <RNMapView
          style={StyleSheet.absoluteFillObject}
          provider={PROVIDER_GOOGLE}
          initialRegion={{
            latitude: driverLocation?.latitude || parseFloat(trip.pickup_lat),
            longitude: driverLocation?.longitude || parseFloat(trip.pickup_lng),
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          region={driverLocation ? { ...driverLocation, latitudeDelta: 0.01, longitudeDelta: 0.01 } : undefined}
        >
          {driverLocation && (
            <Marker coordinate={driverLocation} anchor={{ x: 0.5, y: 0.5 }} rotation={driverHeading} flat tracksViewChanges={false}>
              <View style={styles.carMarkerBadge}>
                <Image source={CAR_ICON} style={styles.carIcon} resizeMode="contain" />
              </View>
            </Marker>
          )}
        </RNMapView>
      </View>

      <View style={styles.bottomSheet}>
        <View style={styles.headerRow}>
          <View style={styles.headerIcon}>
            <Users size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>You're on board!</Text>
            <Text style={styles.subtitle}>Picking up {partnerName} — then you're both on your way.</Text>
          </View>
        </View>

        <View style={styles.fareNote}>
          <Text style={styles.fareNoteText}>
            Sharing with {partnerName} — your fare is GH₵{parseFloat(trip.fare).toFixed(2)}.
          </Text>
        </View>

        {trip.driver_phone && (
          <TouchableOpacity style={styles.callBtn} onPress={callDriver}>
            <Phone size={18} color={colors.dark} />
            <Text style={styles.callBtnText}>Call Driver</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  mapContainer: { flex: 1 },
  carIcon: { width: 30, height: 30 },
  carMarkerBadge: {
    width: 44, height: 44, borderRadius: radius.full,
    backgroundColor: colors.white, borderWidth: 3, borderColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  bottomSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: spacing.lg, paddingBottom: bottomPadding,
    ...tintedShadow(navy, isDark ? 0 : 0.2),
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  headerIcon: {
    width: 40, height: 40, borderRadius: radius.md,
    backgroundColor: colors.primary + '18', justifyContent: 'center', alignItems: 'center',
  },
  title: { fontSize: fontSizes.md, fontWeight: '800', color: colors.textDark },
  subtitle: { fontSize: fontSizes.sm, color: colors.textMuted, marginTop: 2 },
  fareNote: {
    backgroundColor: colors.offWhite, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md,
  },
  fareNoteText: { fontSize: fontSizes.sm, fontWeight: '600', color: colors.textDark },
  callBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    height: 48, borderRadius: radius.lg, backgroundColor: colors.offWhite,
  },
  callBtnText: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.dark },
});
