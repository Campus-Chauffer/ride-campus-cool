import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Linking, StatusBar
} from 'react-native';
import RNMapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Phone, MapPin, CheckCircle, Flag } from 'lucide-react-native';
import { colors, spacing, fontSizes, radius, shadows } from '../../utils/theme';

interface Props {
  trip: any;
  driverLocation: { latitude: number; longitude: number } | null;
  routeCoords: { latitude: number; longitude: number }[];
  onCompleteTrip: () => void;
}

export default function ActiveRideDriverScreen({ trip, driverLocation, routeCoords, onCompleteTrip }: Props) {
  const callPassenger = () => {
    if (trip.passenger_phone) {
      Linking.openURL(`tel:${trip.passenger_phone}`);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.mapContainer}>
        <RNMapView
          style={StyleSheet.absoluteFillObject}
          provider={PROVIDER_GOOGLE}
          initialRegion={{
            latitude: driverLocation?.latitude || parseFloat(trip.dropoff_lat),
            longitude: driverLocation?.longitude || parseFloat(trip.dropoff_lng),
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
        >
          {driverLocation && (
            <Marker coordinate={driverLocation} anchor={{ x: 0.5, y: 0.5 }}>
              <View style={styles.driverMarker}>
                <MapPin size={16} color={colors.dark} />
              </View>
            </Marker>
          )}

          <Marker
            coordinate={{
              latitude: parseFloat(trip.dropoff_lat),
              longitude: parseFloat(trip.dropoff_lng),
            }}
            anchor={{ x: 0.5, y: 1 }}
          >
            <View style={styles.dropoffMarker}>
              <Flag size={16} color={colors.white} />
            </View>
          </Marker>

          {routeCoords.length > 0 && (
            <Polyline
              coordinates={routeCoords}
              strokeColor={colors.primary}
              strokeWidth={4}
            />
          )}
        </RNMapView>
      </View>

      <View style={styles.bottomSheet}>
        <View style={styles.tripInfo}>
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
              <Text style={styles.tripStatus}>En route to destination</Text>
            </View>
            {trip.passenger_phone && (
              <TouchableOpacity style={styles.callBtn} onPress={callPassenger}>
                <Phone size={16} color={colors.dark} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.destinationRow}>
            <Flag size={14} color={colors.primary} />
            <Text style={styles.destinationText} numberOfLines={1}>
              {trip.dropoff_address}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.completeBtn} onPress={onCompleteTrip}>
          <CheckCircle size={20} color={colors.dark} />
          <Text style={styles.completeBtnText}>Complete Trip</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  mapContainer: { flex: 1 },
  driverMarker: {
    width: 36, height: 36, borderRadius: radius.full,
    backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center',
    ...shadows.md,
  },
  dropoffMarker: {
    width: 32, height: 32, borderRadius: radius.full,
    backgroundColor: colors.dark, justifyContent: 'center', alignItems: 'center',
    ...shadows.md,
  },
  bottomSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    ...shadows.lg,
  },
  tripInfo: { marginBottom: spacing.md },
  passengerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  passengerAvatar: { width: 44, height: 44, borderRadius: radius.full, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  passengerAvatarText: { fontSize: fontSizes.lg, fontWeight: '800', color: colors.dark },
  passengerName: { fontSize: fontSizes.md, fontWeight: '700', color: colors.dark },
  tripStatus: { fontSize: fontSizes.xs, color: colors.textMuted, marginTop: 2 },
  callBtn: { width: 40, height: 40, borderRadius: radius.full, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  destinationRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.gray, padding: spacing.md, borderRadius: radius.lg },
  destinationText: { flex: 1, fontSize: fontSizes.sm, color: colors.dark },
  completeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.primary, padding: spacing.md, borderRadius: radius.full, ...shadows.md },
  completeBtnText: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.dark },
});