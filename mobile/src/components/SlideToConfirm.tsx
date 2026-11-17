import React, { useRef, useState } from 'react';
import { View, Text, Animated, PanResponder, StyleSheet, Dimensions } from 'react-native';
import { Navigation } from 'lucide-react-native';
import { useThemeStore } from '../store/themeStore';
import { getColors, spacing, fontSizes, radius, navy, tintedShadow } from '../utils/theme';

const { width } = Dimensions.get('window');
// Fallback estimate used only until the track's real width is measured via
// onLayout — same reasoning as RideOfferScreen's own slider, which this
// component generalizes: a fixed guess left the thumb stopping short of the
// track's real right edge on some screen widths.
const FALLBACK_TRACK_WIDTH = width - spacing.lg * 2;
const THUMB_SIZE = 56;
const TRACK_PADDING = 4;

interface Props {
  label: string;
  onConfirm: () => void;
  icon?: React.ReactNode;
  disabled?: boolean;
}

// Every irreversible driver trip-state action (accept, arrived, start trip,
// complete trip) used to be a plain tap button — a single mis-tap during a
// bumpy ride could skip a step with no confirmation at all. This is the
// slide-to-confirm pattern ride-hailing apps use for exactly that reason,
// extracted from RideOfferScreen's own accept slider (the only place it
// existed before) so every other trip-state action gets the same guard
// instead of each screen reimplementing its own PanResponder.
export default function SlideToConfirm({ label, onConfirm, icon, disabled }: Props) {
  const { isDark } = useThemeStore();
  const colors = getColors(isDark);
  const styles = getStyles(colors, isDark);
  const slideX = useRef(new Animated.Value(0)).current;
  const [trackWidth, setTrackWidth] = useState(FALLBACK_TRACK_WIDTH);
  const maxSlide = Math.max(trackWidth - THUMB_SIZE - TRACK_PADDING * 2, 0);
  const maxSlideRef = useRef(maxSlide);
  maxSlideRef.current = maxSlide;
  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabledRef.current,
      onMoveShouldSetPanResponder: () => !disabledRef.current,
      onPanResponderMove: (_, gs) => {
        const newX = Math.max(0, Math.min(gs.dx, maxSlideRef.current));
        slideX.setValue(newX);
      },
      onPanResponderRelease: (_, gs) => {
        const max = maxSlideRef.current;
        if (gs.dx >= max * 0.85) {
          Animated.spring(slideX, {
            toValue: max,
            useNativeDriver: false,
          }).start(() => onConfirm());
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
    inputRange: [0, Math.max(maxSlide, 1)],
    outputRange: [colors.gray2, colors.success],
  });

  const textOpacity = slideX.interpolate({
    inputRange: [0, Math.max(maxSlide, 1) * 0.5],
    outputRange: [1, 0],
  });

  return (
    <View style={[styles.container, disabled && styles.containerDisabled]}>
      <Animated.View
        style={[styles.track, { backgroundColor: sliderColor }]}
        onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
      >
        <Animated.Text style={[styles.text, { opacity: textOpacity }]}>
          {label}
        </Animated.Text>
        <Animated.View
          style={[styles.thumb, { transform: [{ translateX: slideX }] }]}
          {...panResponder.panHandlers}
        >
          {icon ?? <Navigation size={24} color={colors.white} />}
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { width: '100%' },
  containerDisabled: { opacity: 0.6 },
  track: {
    height: THUMB_SIZE + 8,
    borderRadius: radius.full,
    justifyContent: 'center',
    paddingHorizontal: 4,
    overflow: 'hidden',
  },
  text: {
    position: 'absolute',
    width: '100%',
    textAlign: 'center',
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: colors.dark,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: radius.full,
    backgroundColor: colors.dark,
    justifyContent: 'center',
    alignItems: 'center',
    ...tintedShadow(navy, isDark ? 0 : 0.2),
  },
});
