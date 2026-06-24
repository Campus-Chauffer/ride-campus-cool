import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, StatusBar,
  Animated, PanResponder, Dimensions, ScrollView,
  Keyboard
} from 'react-native';
import * as Location from 'expo-location';
import RNMapView, { Marker, Polyline, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { MapPin, Navigation, Menu, X, Crosshair, LocateFixed } from 'lucide-react-native';
import Constants from 'expo-constants';
import SideMenu from '../../components/SideMenu';
import { ridesAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useRideStore } from '../../store/rideStore';
import { colors, spacing, fontSizes, radius, shadows } from '../../utils/theme';

const { height } = Dimensions.get('window');
const COLLAPSED_HEIGHT = height * 0.32;
const EXPANDED_HEIGHT = height * 0.78;

const GOOGLE_MAPS_KEY = Constants.manifest2?.extra?.expoClient?.extra?.googleMapsApiKey
  || Constants.expoConfig?.extra?.googleMapsApiKey
  || (Constants as any).manifest?.extra?.googleMapsApiKey
  || '';

// Pricing logic mirrors backend
const calculateFare = (distanceKm: number, isNight: boolean): number => {
  const SHORT_DIST = 0.7;
  const LONG_DIST = 4.0;
  const BASE_FARE = 8;
  const PER_KM = 3;
  const DAY_SHORT = 10, NIGHT_SHORT = 13;
  const DAY_LONG = 19, NIGHT_LONG = 20;

  if (distanceKm <= SHORT_DIST) return isNight ? NIGHT_SHORT : DAY_SHORT;
  if (distanceKm >= LONG_DIST) return isNight ? NIGHT_LONG : DAY_LONG;
  const fare = BASE_FARE + distanceKm * PER_KM;
  const min = isNight ? NIGHT_SHORT : DAY_SHORT;
  const max = isNight ? NIGHT_LONG : DAY_LONG;
  return Math.round(Math.min(Math.max(fare, min), max));
};

const getDistanceKm = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export default function StudentHomeScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const { setActiveRide } = useRideStore();
  const mapRef = useRef<RNMapView>(null);

  const [userLocation, setUserLocation] = useState<any>(null);
  const [userLocationName, setUserLocationName] = useState<string>('My Location');
  const [selectedPickup, setSelectedPickup] = useState<any>(null);
  const [selectedDest, setSelectedDest] = useState<any>(null);
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [routeCoords, setRouteCoords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchingPickup, setSearchingPickup] = useState(false);
  const [pickupSearchResults, setPickupSearchResults] = useState<any[]>([]);
  const [activeSearchField, setActiveSearchField] = useState<'pickup' | 'dropoff' | null>(null);
  const [pinMode, setPinMode] = useState(false);
  const [pinTarget, setPinTarget] = useState<'pickup' | 'dropoff'>('dropoff');
  const [pinRegion, setPinRegion] = useState<Region | null>(null);
  const [reverseGeoLoading, setReverseGeoLoading] = useState(false);
  const [estimatedFare, setEstimatedFare] = useState<number | null>(null);
  const searchTimeout = useRef<any>(null);
  const pickupSearchTimeout = useRef<any>(null);

  const sheetY = useRef(new Animated.Value(height - COLLAPSED_HEIGHT)).current;
  const lastY = useRef(height - COLLAPSED_HEIGHT);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 8 && Math.abs(gs.dy) > Math.abs(gs.dx),
      onPanResponderMove: (_, gs) => {
        const newY = lastY.current + gs.dy;
        const minY = height - EXPANDED_HEIGHT;
        const maxY = height - COLLAPSED_HEIGHT;
        if (newY >= minY && newY <= maxY) sheetY.setValue(newY);
      },
      onPanResponderRelease: (_, gs) => {
        const threshold = (EXPANDED_HEIGHT - COLLAPSED_HEIGHT) / 2;
        if (gs.dy < -threshold || gs.vy < -0.5) expandSheet();
        else if (gs.dy > threshold || gs.vy > 0.5) collapseSheet();
        else if (isExpanded) expandSheet(); else collapseSheet();
      },
    })
  ).current;

  const expandSheet = () => {
    const targetY = height - EXPANDED_HEIGHT;
    Animated.spring(sheetY, { toValue: targetY, useNativeDriver: false, bounciness: 4 }).start();
    lastY.current = targetY;
    setIsExpanded(true);
  };

  const collapseSheet = () => {
    const targetY = height - COLLAPSED_HEIGHT;
    Animated.spring(sheetY, { toValue: targetY, useNativeDriver: false, bounciness: 4 }).start();
    lastY.current = targetY;
    setIsExpanded(false);
    setSearchResults([]);
    setPickupSearchResults([]);
    Keyboard.dismiss();
  };

  const isNight = (() => {
    const hour = new Date().getHours();
    return hour >= 23 || hour < 5;
  })();

  useEffect(() => {
    const origin = selectedPickup || userLocation;
    if (origin && selectedDest) {
      const dist = getDistanceKm(origin.lat, origin.lng, selectedDest.lat, selectedDest.lng);
      setEstimatedFare(calculateFare(dist, isNight));
    } else {
      setEstimatedFare(null);
    }
  }, [selectedPickup, selectedDest, userLocation]);

  useEffect(() => {
    getUserLocation();
  }, []);

  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = loc.coords;
      setUserLocation({ lat: latitude, lng: longitude });
      mapRef.current?.animateToRegion({ latitude, longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 });
      // Reverse geocode to get actual location name — issue 9
      const name = await reverseGeocode(latitude, longitude);
      setUserLocationName(name);
    } catch (err) {
      console.log('Location error:', err);
    }
  };

  const recenterMap = () => {
    if (userLocation) {
      mapRef.current?.animateToRegion({
        latitude: userLocation.lat,
        longitude: userLocation.lng,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      });
    } else {
      getUserLocation();
    }
  };

  const enterPinMode = (target: 'pickup' | 'dropoff') => {
    setPinTarget(target);
    setPinMode(true);
    setPinRegion(null);
    Keyboard.dismiss();
    collapseSheet();
  };

  const exitPinMode = () => {
    setPinMode(false);
    setPinRegion(null);
  };

  const confirmPin = async () => {
    if (!pinRegion) return;
    setReverseGeoLoading(true);
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${pinRegion.latitude},${pinRegion.longitude}&key=${GOOGLE_MAPS_KEY}`;
      const res = await fetch(url);
      const data = await res.json();
      const address = data.results?.[0]?.formatted_address || `${pinRegion.latitude.toFixed(5)}, ${pinRegion.longitude.toFixed(5)}`;
      const shortAddress = data.results?.[0]?.address_components?.slice(0, 2)?.map((c: any) => c.long_name).join(', ') || address;
      if (!isWithinCampus(pinRegion.latitude, pinRegion.longitude)) {
        Alert.alert(
        'Outside Campus',
        'Campus Chauffeur only operates within University of Ghana, Legon. Please set a location within campus.',
        [{ text: 'OK' }]
      );
      setReverseGeoLoading(false);
      return;
    }
    const location = { name: shortAddress, lat: pinRegion.latitude, lng: pinRegion.longitude };

    if (pinTarget === 'pickup') {
        setSelectedPickup(location);
        setPickup(shortAddress);
        if (selectedDest) getDirections(selectedDest, location);
      } else {
        setSelectedDest(location);
        setDropoff(shortAddress);
        const origin = selectedPickup || userLocation;
        if (origin) getDirections(location, origin);
      }
      exitPinMode();
    } catch (err) {
      console.log('Reverse geocode error:', err);
    } finally {
      setReverseGeoLoading(false);
    }
  };

  const searchPlaces = async (query: string, forPickup = false) => {
    if (!query || query.length < 3) {
      forPickup ? setPickupSearchResults([]) : setSearchResults([]);
      return;
    }
    const loc = userLocation;
    if (!loc) return;
    forPickup ? setSearchingPickup(true) : setSearching(true);
    try {
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&location=${loc.lat},${loc.lng}&radius=5000&key=${GOOGLE_MAPS_KEY}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.predictions) {
        forPickup
          ? setPickupSearchResults(data.predictions.slice(0, 5))
          : setSearchResults(data.predictions.slice(0, 5));
      }
    } catch (err) {
      console.log('Search error:', err);
    } finally {
      forPickup ? setSearchingPickup(false) : setSearching(false);
    }
  };

  const handlePickupInput = (text: string) => {
    setPickup(text);
    setSelectedPickup(null);
    clearTimeout(pickupSearchTimeout.current);
    pickupSearchTimeout.current = setTimeout(() => searchPlaces(text, true), 400);
  };

  const handleSearchInput = (text: string) => {
    setDropoff(text);
    setSelectedDest(null);
    setRouteCoords([]);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => searchPlaces(text, false), 400);
  };

  const selectPlaceResult = async (place: any, forPickup = false) => {
    Keyboard.dismiss();
    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=geometry,name,formatted_address&key=${GOOGLE_MAPS_KEY}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.result?.geometry?.location) {
        const { lat, lng } = data.result.geometry.location;
        if (!isWithinCampus(lat, lng)) {
          Alert.alert(
            'Outside Campus',
            'Campus Chauffeur only operates within University of Ghana, Legon. Please select a location within campus.',
            [{ text: 'OK' }]
          );
          return;
        }
        const loc = { name: data.result.name || place.structured_formatting?.main_text, lat, lng };
        if (forPickup) {
          setSelectedPickup(loc);
          setPickup(loc.name);
          setPickupSearchResults([]);
          setActiveSearchField(null);
          mapRef.current?.animateToRegion({ latitude: lat, longitude: lng, latitudeDelta: 0.01, longitudeDelta: 0.01 });
          if (selectedDest) getDirections(selectedDest, loc);
        } else {
          setSelectedDest(loc);
          setDropoff(loc.name);
          setSearchResults([]);
          setActiveSearchField(null);
          const origin = selectedPickup || userLocation;
          if (origin) getDirections(loc, origin);
          collapseSheet();
          mapRef.current?.animateToRegion({ latitude: lat, longitude: lng, latitudeDelta: 0.01, longitudeDelta: 0.01 });
        }
      }
    } catch (err) {
      console.log('Place details error:', err);
    }
  };

  const getDirections = async (dest: any, origin: any) => {
    try {
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.lat},${origin.lng}&destination=${dest.lat},${dest.lng}&key=${GOOGLE_MAPS_KEY}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.routes?.length > 0) {
        const points = decodePolyline(data.routes[0].overview_polyline.points);
        setRouteCoords(points);
        mapRef.current?.fitToCoordinates(
          [{ latitude: origin.lat, longitude: origin.lng }, { latitude: dest.lat, longitude: dest.lng }],
          { edgePadding: { top: 80, right: 80, bottom: 350, left: 80 }, animated: true }
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

  const selectDestination = (dest: any) => {
    setSelectedDest(dest);
    setDropoff(dest.name);
    setSearchResults([]);
    const origin = selectedPickup || userLocation;
    if (origin) getDirections(dest, origin);
    collapseSheet();
  };

  const clearPickup = () => {
    setSelectedPickup(null);
    setPickup('');
    setPickupSearchResults([]);
    if (selectedDest && userLocation) getDirections(selectedDest, userLocation);
  };

  const clearDestination = () => {
    setSelectedDest(null);
    setDropoff('');
    setRouteCoords([]);
    setSearchResults([]);
    setEstimatedFare(null);
  };

  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_KEY}`;
      const res = await fetch(url);
      const data = await res.json();
      return data.results?.[0]?.address_components?.slice(0, 2)?.map((c: any) => c.long_name).join(', ')
        || data.results?.[0]?.formatted_address
        || 'My Location';
    } catch {
      return 'My Location';
    }
  };

  const UG_LAT = 5.6502;
  const UG_LNG = -0.1870;
  const CAMPUS_RADIUS_KM = 5;

  const isWithinCampus = (lat: number, lng: number): boolean => {
    const dist = getDistanceKm(lat, lng, UG_LAT, UG_LNG);
    return dist <= CAMPUS_RADIUS_KM;
  };
  const requestRide = async () => {
    if (!selectedDest) return Alert.alert('Select destination', 'Please select a destination');
    const pickupLoc = selectedPickup || userLocation;
    if (!pickupLoc) return Alert.alert('Location needed', 'Getting your location...');
    setLoading(true);
    try {
      const res = await ridesAPI.requestRide({
        pickup_lat: pickupLoc.lat,
        pickup_lng: pickupLoc.lng,
        dropoff_lat: selectedDest.lat,
        dropoff_lng: selectedDest.lng,
        pickup_address: selectedPickup ? selectedPickup.name : userLocationName,
        dropoff_address: selectedDest.name,
      });
      setActiveRide(res.data);
      navigation.navigate('RideMatching', { trip: res.data });
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Could not request ride');
    } finally {
      setLoading(false);
    }
  };

  const activeSearchResults = activeSearchField === 'pickup' ? pickupSearchResults : searchResults;
  const hasActiveSearch = activeSearchResults.length > 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <RNMapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          latitude: userLocation?.lat || 5.6502,
          longitude: userLocation?.lng || -0.1870,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
        showsUserLocation
        showsMyLocationButton={false}
        onRegionChange={(region) => { if (pinMode) setPinRegion(region); }}
      >
        {selectedPickup && (
          <Marker coordinate={{ latitude: selectedPickup.lat, longitude: selectedPickup.lng }} title="Pickup">
            <View style={styles.pickupMarker}>
              <View style={styles.pickupDot} />
            </View>
          </Marker>
        )}
        {selectedDest && (
          <Marker coordinate={{ latitude: selectedDest.lat, longitude: selectedDest.lng }} pinColor={colors.primary} title={selectedDest.name} />
        )}
        {routeCoords.length > 0 && (
          <Polyline coordinates={routeCoords} strokeColor={colors.dark} strokeWidth={4} />
        )}
      </RNMapView>

      <TouchableOpacity style={styles.menuBtn} onPress={() => setMenuOpen(true)}>
        <Menu size={20} color={colors.dark} />
      </TouchableOpacity>

      {!pinMode && (
        <TouchableOpacity style={styles.recenterBtn} onPress={recenterMap}>
          <LocateFixed size={20} color={colors.dark} />
        </TouchableOpacity>
      )}

      {/* Pin mode overlay */}
      {pinMode && (
        <>
          <View style={styles.centerPin} pointerEvents="none">
            <MapPin size={36} color={pinTarget === 'pickup' ? colors.success : colors.primary} />
            <View style={styles.centerPinShadow} />
          </View>
          <View style={styles.pinBanner}>
            <Text style={styles.pinBannerText}>
              Drag map to set {pinTarget === 'pickup' ? 'pickup' : 'dropoff'} location
            </Text>
            <TouchableOpacity onPress={exitPinMode}>
              <X size={18} color={colors.dark} />
            </TouchableOpacity>
          </View>
          <View style={styles.pinConfirmContainer}>
            <TouchableOpacity style={styles.pinConfirmBtn} onPress={confirmPin} disabled={reverseGeoLoading}>
              {reverseGeoLoading
                ? <ActivityIndicator color={colors.dark} size="small" />
                : <Text style={styles.pinConfirmText}>Set as {pinTarget === 'pickup' ? 'Pickup' : 'Dropoff'}</Text>
              }
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Bottom sheet */}
      {!pinMode && (
        <Animated.View style={[styles.sheet, { top: sheetY }]} {...panResponder.panHandlers}>
          <View style={styles.handleArea}>
            <View style={styles.handle} />
          </View>

          {/* Greeting — no fare badge (issue 8) */}
          <View style={styles.greetingRow}>
            <Text style={styles.greetingText}>
              Good {isNight ? 'evening' : 'morning'}, {user?.first_name}
            </Text>
          </View>

          {/* Location card */}
          <View style={styles.whereCard}>
            <View style={styles.whereRow}>
              <View style={styles.dotGreen} />
              {selectedPickup ? (
                <>
                  <Text style={[styles.whereLabel, { flex: 1 }]} numberOfLines={1}>{selectedPickup.name}</Text>
                  <TouchableOpacity onPress={clearPickup}>
                    <X size={14} color={colors.gray3} />
                  </TouchableOpacity>
                </>
              ) : (
                <TextInput
                  style={styles.whereInput}
                  placeholder={userLocationName}
                  placeholderTextColor={colors.dark}
                  value={pickup}
                  onChangeText={handlePickupInput}
                  onFocus={() => { setActiveSearchField('pickup'); expandSheet(); }}
                  returnKeyType="done"
                  onSubmitEditing={() => Keyboard.dismiss()}
                />
              )}
              <TouchableOpacity onPress={() => enterPinMode('pickup')} style={styles.pinIconBtn}>
                <Crosshair size={14} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.whereDivider} />

            <View style={styles.whereRow}>
              <MapPin size={14} color={colors.dark} />
              <TextInput
                style={styles.whereInput}
                placeholder="Where to?"
                placeholderTextColor={colors.gray3}
                value={dropoff}
                onChangeText={handleSearchInput}
                onFocus={() => { setActiveSearchField('dropoff'); expandSheet(); }}
                returnKeyType="done"
                onSubmitEditing={() => Keyboard.dismiss()}
              />
              {(searching || searchingPickup) && <ActivityIndicator size="small" color={colors.gray3} />}
              {dropoff.length > 0 && !searching && (
                <TouchableOpacity onPress={clearDestination}>
                  <X size={16} color={colors.gray3} />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => enterPinMode('dropoff')} style={styles.pinIconBtn}>
                <Crosshair size={14} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Search results */}
          {hasActiveSearch && (
            <View style={styles.searchResults}>
              {activeSearchResults.map((place) => (
                <TouchableOpacity
                  key={place.place_id}
                  style={styles.searchResultItem}
                  onPress={() => selectPlaceResult(place, activeSearchField === 'pickup')}
                  activeOpacity={0.7}
                >
                  <View style={styles.searchResultIcon}>
                    <MapPin size={14} color={colors.textMuted} />
                  </View>
                  <View style={styles.searchResultText}>
                    <Text style={styles.searchResultMain} numberOfLines={1}>
                      {place.structured_formatting?.main_text || place.description}
                    </Text>
                    <Text style={styles.searchResultSub} numberOfLines={1}>
                      {place.structured_formatting?.secondary_text || ''}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Content — no shortcuts (issue 7) */}
          {!hasActiveSearch && (
            <ScrollView
              contentContainerStyle={styles.sheetContent}
              showsVerticalScrollIndicator={false}
              scrollEnabled={isExpanded}
              keyboardShouldPersistTaps="handled"
            >
              {selectedDest ? (
                <View style={styles.requestSection}>
                  {/* Fare estimate — rounded, no day/night label (issue 8, 12) */}
                  {estimatedFare !== null && (
                    <View style={styles.fareEstimate}>
                      <Text style={styles.fareEstimateLabel}>Estimated fare</Text>
                      <Text style={styles.fareEstimateValue}>GH₵{estimatedFare}</Text>
                    </View>
                  )}

                  <TouchableOpacity
                    style={[styles.requestBtn, loading && styles.requestBtnDisabled]}
                    onPress={requestRide}
                    disabled={loading}
                    activeOpacity={0.9}
                  >
                    {loading
                      ? <ActivityIndicator color={colors.dark} />
                      : <Text style={styles.requestBtnText}>
                          Request Ride{estimatedFare ? ` · GH₵${estimatedFare}` : ''}
                        </Text>
                    }
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.hintBox}>
                  <Navigation size={16} color={colors.textMuted} />
                  <Text style={styles.hintText}>Type your destination above to get started</Text>
                </View>
              )}
            </ScrollView>
          )}
        </Animated.View>
      )}

      <SideMenu visible={menuOpen} onClose={() => setMenuOpen(false)} navigation={navigation} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  menuBtn: {
    position: 'absolute',
    top: 60,
    left: spacing.lg,
    width: 44, height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
  },
  recenterBtn: {
    position: 'absolute',
    top: 60,
    right: spacing.lg,
    width: 44, height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
  },
  pinIconBtn: { padding: 4, marginLeft: 4 },
  centerPin: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -18,
    marginTop: -36,
    alignItems: 'center',
  },
  centerPinShadow: {
    width: 8, height: 8,
    borderRadius: radius.full,
    backgroundColor: 'rgba(0,0,0,0.2)',
    marginTop: -4,
  },
  pinBanner: {
    position: 'absolute',
    top: 120,
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadows.md,
  },
  pinBannerText: { fontSize: fontSizes.sm, fontWeight: '600', color: colors.dark },
  pinConfirmContainer: {
    position: 'absolute',
    bottom: spacing.xxl,
    left: spacing.lg,
    right: spacing.lg,
  },
  pinConfirmBtn: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: radius.full,
    alignItems: 'center',
    ...shadows.md,
  },
  pinConfirmText: { fontSize: fontSizes.md, fontWeight: '700', color: colors.dark },
  pickupMarker: {
    width: 20, height: 20,
    borderRadius: radius.full,
    backgroundColor: colors.white,
    borderWidth: 3,
    borderColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickupDot: { width: 8, height: 8, borderRadius: radius.full, backgroundColor: colors.success },
  sheet: {
    position: 'absolute',
    left: 0, right: 0,
    height: EXPANDED_HEIGHT,
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    ...shadows.lg,
  },
  handleArea: { alignItems: 'center', paddingVertical: spacing.sm },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.gray2 },
  greetingRow: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  greetingText: { fontSize: fontSizes.lg, fontWeight: '800', color: colors.dark },
  whereCard: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.lg,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.gray2,
    ...shadows.sm,
  },
  whereRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  dotGreen: { width: 10, height: 10, borderRadius: radius.full, backgroundColor: colors.success },
  whereLabel: { fontSize: fontSizes.md, color: colors.dark, fontWeight: '500' },
  whereDivider: { height: 1, backgroundColor: colors.gray2, marginVertical: spacing.xs, marginLeft: spacing.lg },
  whereInput: { flex: 1, fontSize: fontSizes.md, color: colors.dark, padding: 0 },
  searchResults: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.gray2,
    overflow: 'hidden',
    ...shadows.md,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray2,
    gap: spacing.sm,
  },
  searchResultIcon: {
    width: 32, height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.gray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchResultText: { flex: 1 },
  searchResultMain: { fontSize: fontSizes.sm, fontWeight: '600', color: colors.dark },
  searchResultSub: { fontSize: fontSizes.xs, color: colors.textMuted, marginTop: 2 },
  sheetContent: { padding: spacing.lg, paddingBottom: spacing.xxl },
  requestSection: { gap: spacing.sm },
  fareEstimate: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFBF0',
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,184,0,0.3)',
  },
  fareEstimateLabel: { fontSize: fontSizes.sm, color: colors.textMuted, fontWeight: '500' },
  fareEstimateValue: { fontSize: fontSizes.xl, fontWeight: '800', color: colors.dark },

  requestBtn: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: radius.full,
    alignItems: 'center',
    ...shadows.md,
  },
  requestBtnDisabled: { opacity: 0.5 },
  requestBtnText: { fontSize: fontSizes.md, fontWeight: '700', color: colors.dark, letterSpacing: 0.3 },
  hintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  hintText: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    textAlign: 'center',
  },
});