import { useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';

interface Coordinate {
  latitude: number;
  longitude: number;
}

const DRAW_DURATION_MS = 700;

// Progressively reveals a route polyline the first time it appears, instead
// of it popping onto the map instantly. react-native-maps' Polyline has no
// native support for animating a partial stroke, so this fakes it by
// animating how many of the route's points are included on each frame -
// coordinates are data, not a style/transform prop, so this can't use the
// native driver; it recomputes the sliced array on the JS thread via an
// Animated.Value listener instead.
//
// Only the empty -> populated transition animates. Screens that re-fetch
// or re-broadcast the same route periodically during an active trip (see
// DriverFoundScreen/ActiveRideScreen's onDriverRoute socket listener) pass
// a fresh array reference each time even when the route hasn't materially
// changed - replaying the draw-in on every one of those would look like
// the route flickering mid-trip, not a reveal. Later updates snap in
// directly instead.
export function useAnimatedRoute(routeCoords: Coordinate[]): Coordinate[] {
  const [visibleCoords, setVisibleCoords] = useState<Coordinate[]>(routeCoords);
  const progress = useRef(new Animated.Value(0)).current;
  const hasAnimatedRef = useRef(false);
  const prevLengthRef = useRef(routeCoords.length);

  useEffect(() => {
    const isFirstAppearance = prevLengthRef.current === 0 && routeCoords.length > 0;
    prevLengthRef.current = routeCoords.length;

    if (routeCoords.length === 0) {
      setVisibleCoords([]);
      hasAnimatedRef.current = false;
      return;
    }

    if (!isFirstAppearance || hasAnimatedRef.current) {
      setVisibleCoords(routeCoords);
      return;
    }

    hasAnimatedRef.current = true;
    progress.setValue(0);
    const listenerId = progress.addListener(({ value }) => {
      const count = Math.max(2, Math.ceil(value * routeCoords.length));
      setVisibleCoords(routeCoords.slice(0, count));
    });

    Animated.timing(progress, {
      toValue: 1,
      duration: DRAW_DURATION_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(() => {
      progress.removeListener(listenerId);
    });

    return () => {
      progress.removeListener(listenerId);
    };
  }, [routeCoords]);

  return visibleCoords;
}
