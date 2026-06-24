import React from 'react';
import { StyleSheet, View } from 'react-native';
import RNMapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { colors } from '../utils/theme';

interface Props {
  pickupLat?: number;
  pickupLng?: number;
  dropoffLat?: number;
  dropoffLng?: number;
  driverLat?: number;
  driverLng?: number;
  showDriver?: boolean;
  style?: any;
}

export default function MapView({
  pickupLat, pickupLng,
  dropoffLat, dropoffLng,
  driverLat, driverLng,
  showDriver = false,
  style,
}: Props) {
  const UG_LAT = 5.6502;
  const UG_LNG = -0.1870;

  const initialRegion = {
    latitude: pickupLat || UG_LAT,
    longitude: pickupLng || UG_LNG,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  };

  return (
    <View style={[styles.container, style]}>
      <RNMapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {/* Pickup marker */}
        {pickupLat && pickupLng && (
          <Marker
            coordinate={{ latitude: pickupLat, longitude: pickupLng }}
            pinColor={colors.success}
            title="Pickup"
          />
        )}

        {/* Dropoff marker */}
        {dropoffLat && dropoffLng && (
          <Marker
            coordinate={{ latitude: dropoffLat, longitude: dropoffLng }}
            pinColor={colors.error}
            title="Destination"
          />
        )}

        {/* Driver marker */}
        {showDriver && driverLat && driverLng && (
          <Marker
            coordinate={{ latitude: driverLat, longitude: driverLng }}
            title="Driver"
          >
            <View style={styles.driverMarker}>
              <View style={styles.driverMarkerInner}>
                <View style={styles.driverDot} />
              </View>
            </View>
          </Marker>
        )}

        {/* Route line from driver to pickup */}
        {showDriver && driverLat && driverLng && pickupLat && pickupLng && (
          <Polyline
            coordinates={[
              { latitude: driverLat, longitude: driverLng },
              { latitude: pickupLat, longitude: pickupLng },
            ]}
            strokeColor={colors.primary}
            strokeWidth={3}
            lineDashPattern={[5, 5]}
          />
        )}

        {/* Route line from pickup to dropoff */}
        {pickupLat && pickupLng && dropoffLat && dropoffLng && (
          <Polyline
            coordinates={[
              { latitude: pickupLat, longitude: pickupLng },
              { latitude: dropoffLat, longitude: dropoffLng },
            ]}
            strokeColor={colors.dark}
            strokeWidth={3}
          />
        )}
      </RNMapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  driverMarker: {
    width: 40, height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,184,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverMarkerInner: {
    width: 28, height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverDot: {
    width: 10, height: 10,
    borderRadius: 5,
    backgroundColor: colors.dark,
  },
});