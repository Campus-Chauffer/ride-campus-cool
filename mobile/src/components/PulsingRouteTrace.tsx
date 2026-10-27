import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { Marker } from 'react-native-maps';

interface Coordinate {
  latitude: number;
  longitude: number;
}

interface Props {
  routeCoords: Coordinate[];
  // Gate this true only once the route's own draw-in reveal has finished -
  // starting the pulse mid-reveal would have it racing/overlapping with
  // that animation instead of reading as a clean follow-up.
  active: boolean;
  color?: string;
}

const DOT_COUNT = 10;
const DOT_RADIUS = 5;
// One dot's own grow-then-fade. Short relative to the stagger below so at
// most one or two dots are ever mid-pulse at once, not the whole chain.
const PULSE_DURATION_MS = 550;
// Delay between consecutive dots starting their pulse - this is what
// makes it read as "one after another," and is long enough that the
// sweep from pickup to destination feels unhurried rather than a blur.
const STAGGER_MS = 280;
// Pause after the last dot finishes before the whole chain restarts, so
// looping doesn't feel like it's immediately snapping back to the start.
const LOOP_PAUSE_MS = 900;

// A calm, one-dot-after-another pulse tracing pickup -> destination, as a
// follow-up to the route's one-time draw-in reveal. Deliberately NOT used
// on the three active-trip screens (ToPickup/ActiveRide, both sides) -
// react-native-maps has to keep re-rasterizing a Marker's children for as
// long as it's actively animating (tracksViewChanges), so a never-ending
// loop running for a whole trip's duration is a real, ongoing cost. Scoped
// to the two screens where a passenger is just previewing a route for a
// bounded moment (HomeScreen, DriverFoundScreen) keeps that cost bounded
// too, and only one or two of the sampled dots are ever mid-pulse (hence
// tracksViewChanges) at the same instant, not all of them simultaneously.
export default function PulsingRouteTrace({ routeCoords, active, color = '#000000' }: Props) {
  const dotCoords = useMemo(() => {
    if (routeCoords.length < 2) return [];
    const count = Math.min(DOT_COUNT, routeCoords.length);
    return Array.from({ length: count }, (_, i) => {
      const index = Math.round((i / (count - 1)) * (routeCoords.length - 1));
      return routeCoords[index];
    });
  }, [routeCoords]);

  if (!active || dotCoords.length === 0) return null;

  return (
    <>
      {dotCoords.map((coord, i) => (
        <PulseDot key={i} coordinate={coord} delay={i * STAGGER_MS} color={color} />
      ))}
    </>
  );
}

function PulseDot({ coordinate, delay, color }: { coordinate: Coordinate; delay: number; color: string }) {
  const anim = useRef(new Animated.Value(0)).current;
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const totalDots = DOT_COUNT;
    const cycleDuration = totalDots * STAGGER_MS + LOOP_PAUSE_MS;

    const runPulse = () => {
      if (cancelled) return;
      setAnimating(true);
      anim.setValue(0);
      Animated.timing(anim, {
        toValue: 1,
        duration: PULSE_DURATION_MS,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start(() => {
        if (!cancelled) setAnimating(false);
      });
    };

    const initialTimeout = setTimeout(runPulse, delay);
    const interval = setInterval(() => {
      if (!cancelled) setTimeout(runPulse, delay);
    }, cycleDuration);

    return () => {
      cancelled = true;
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [delay]);

  return (
    <Marker coordinate={coordinate} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={animating}>
      <Animated.View
        style={[
          styles.dot,
          {
            backgroundColor: color,
            opacity: anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 0] }),
            transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.4] }) }],
          },
        ]}
      />
    </Marker>
  );
}

const styles = StyleSheet.create({
  dot: {
    width: DOT_RADIUS * 2,
    height: DOT_RADIUS * 2,
    borderRadius: DOT_RADIUS,
  },
});
