import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import * as Font from 'expo-font';
import * as SplashScreenNative from 'expo-splash-screen';

// Prevent the native splash from auto-hiding until our fonts are ready —
// otherwise there's a flash of unstyled text before Dancing Script loads.
SplashScreenNative.preventAutoHideAsync();

// Geometry and timeline below are ported 1:1 from the motion reference
// (cc-splash-reference, "Headlights Meeting") — see splash-timeline.json
// and geometry.json for the source of truth. Every `bezier(...)` and
// ms value here is copied from that file, not retuned by eye.
const FRAME = 120; // each C/glow asset's own canvas size, in dp
const SPACING = 31.833; // center-to-center offset between the two C's
const DRIVE_OFFSET = 203.08; // off-canvas starting distance for the slide-in

const bezier = (x1: number, y1: number, x2: number, y2: number) =>
  Easing.bezier(x1, y1, x2, y2);

// Drives a single eased 0->1 progress value on its own timeline slot.
// Easing lives on the Animated.timing call (native driver computes the
// curve up front); any interpolate() below it is a plain linear remap of
// that already-eased progress into a from/to range, which preserves the
// curve's shape exactly — interpolate itself must stay linear-only.
function useProgress(delayMs: number, durationMs: number, curve: [number, number, number, number]) {
  const value = useRef(new Animated.Value(0)).current;
  return {
    value,
    animation: Animated.timing(value, {
      toValue: 1,
      duration: durationMs,
      delay: delayMs,
      easing: bezier(...curve),
      useNativeDriver: true,
    }),
  };
}

export default function SplashScreen() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  // sideLeft / sideRight: translateX, single "drive" curve, mirrored
  const drive = useProgress(0, 1100, [0.8, 0, 0.3, 1]);
  const leftTranslateX = drive.value.interpolate({ inputRange: [0, 1], outputRange: [-DRIVE_OFFSET, 0] });
  const rightTranslateX = drive.value.interpolate({ inputRange: [0, 1], outputRange: [DRIVE_OFFSET, 0] });

  // glowSoft: opacity is two multiplied segments (fade up, then hand off)
  const glowSoftIn = useProgress(0, 650, [0.33, 0, 0.67, 1]);
  const glowSoftOut = useProgress(760, 220, [0.42, 0, 0.58, 1]);
  const glowSoftOpacity = Animated.multiply(
    glowSoftIn.value.interpolate({ inputRange: [0, 1], outputRange: [0.08, 1] }),
    glowSoftOut.value.interpolate({ inputRange: [0, 1], outputRange: [1, 0] })
  );
  const glowSoftScaleProgress = useProgress(700, 300, [0.42, 0, 0.58, 1]);
  const glowSoftScale = glowSoftScaleProgress.value.interpolate({ inputRange: [0, 1], outputRange: [1, 0.82] });

  // glowMid: the blurred C, opacity is also two multiplied segments
  const glowMidIn = useProgress(700, 150, [0.22, 1, 0.36, 1]);
  const glowMidOut = useProgress(950, 150, [0.42, 0, 0.58, 1]);
  const glowMidOpacity = Animated.multiply(
    glowMidIn.value.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
    glowMidOut.value.interpolate({ inputRange: [0, 1], outputRange: [1, 0] })
  );

  // cSharp: the crisp C lands on top; gapR's opacity follows it exactly
  const cSharpProgress = useProgress(850, 220, [0.42, 0, 0.58, 1]);
  const cSharpOpacity = cSharpProgress.value.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  // mark: 1.0 -> 1.05 overshoot -> settle back to 1.0, two added segments
  const markOvershoot = useProgress(950, 150, [0.33, 0, 0.2, 1]);
  const markSettle = useProgress(1100, 200, [0.45, 0, 0.4, 1]);
  const markScale = Animated.add(
    new Animated.Value(1),
    Animated.add(
      markOvershoot.value.interpolate({ inputRange: [0, 1], outputRange: [0, 0.05] }),
      markSettle.value.interpolate({ inputRange: [0, 1], outputRange: [0, -0.05] })
    )
  );

  // wordmark: fades in while sliding up
  const wordmarkOpacityProgress = useProgress(1300, 500, [0.25, 0.1, 0.25, 1]);
  const wordmarkOpacity = wordmarkOpacityProgress.value.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const wordmarkTranslateProgress = useProgress(1300, 500, [0.16, 1, 0.3, 1]);
  const wordmarkTranslateY = wordmarkTranslateProgress.value.interpolate({ inputRange: [0, 1], outputRange: [12, 0] });

  // tribute: opacity only, the quiet signature
  const tributeProgress = useProgress(1800, 400, [0.42, 0, 0.58, 1]);
  const tributeOpacity = tributeProgress.value.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  useEffect(() => {
    async function loadFonts() {
      await Font.loadAsync({
        'DancingScript-Regular': require('../../assets/fonts/DancingScript-Regular.ttf'),
      });
      setFontsLoaded(true);
      await SplashScreenNative.hideAsync();
    }
    loadFonts();
  }, []);

  useEffect(() => {
    if (!fontsLoaded) return;
    Animated.parallel([
      drive.animation,
      glowSoftIn.animation,
      glowSoftOut.animation,
      glowSoftScaleProgress.animation,
      glowMidIn.animation,
      glowMidOut.animation,
      cSharpProgress.animation,
      markOvershoot.animation,
      markSettle.animation,
      wordmarkOpacityProgress.animation,
      wordmarkTranslateProgress.animation,
      tributeProgress.animation,
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    // Plain navy view while the font loads — matches the native splash's
    // own background exactly, so there's no black-to-navy flash at handoff.
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.stage, { transform: [{ scale: markScale }] }]}>
        <Animated.View style={[styles.side, { left: 0, transform: [{ translateX: leftTranslateX }] }]}>
          <Animated.Image
            source={require('../../assets/splash/glow-soft-left.png')}
            style={[styles.layer, { opacity: glowSoftOpacity, transform: [{ scale: glowSoftScale }] }]}
          />
          <Animated.Image
            source={require('../../assets/splash/glow-mid-left.png')}
            style={[styles.layer, { opacity: glowMidOpacity }]}
          />
          <Animated.Image
            source={require('../../assets/splash/c-left.png')}
            style={[styles.layer, { opacity: cSharpOpacity }]}
          />
        </Animated.View>

        <Animated.View style={[styles.side, { left: SPACING, transform: [{ translateX: rightTranslateX }] }]}>
          <Animated.Image
            source={require('../../assets/splash/gap-right.png')}
            style={[styles.layer, { opacity: cSharpOpacity }]}
          />
          <Animated.Image
            source={require('../../assets/splash/glow-soft-right.png')}
            style={[styles.layer, { opacity: glowSoftOpacity, transform: [{ scale: glowSoftScale }] }]}
          />
          <Animated.Image
            source={require('../../assets/splash/glow-mid-right.png')}
            style={[styles.layer, { opacity: glowMidOpacity }]}
          />
          <Animated.Image
            source={require('../../assets/splash/c-right.png')}
            style={[styles.layer, { opacity: cSharpOpacity }]}
          />
        </Animated.View>
      </Animated.View>

      <Animated.Text
        style={[styles.brandName, { opacity: wordmarkOpacity, transform: [{ translateY: wordmarkTranslateY }] }]}
      >
        Campus Chauffeur
      </Animated.Text>

      <Animated.Text style={[styles.tribute, { opacity: tributeOpacity }]}>
        For Yos
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stage: {
    width: FRAME + SPACING,
    height: FRAME,
  },
  side: {
    position: 'absolute',
    top: 0,
    width: FRAME,
    height: FRAME,
  },
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: FRAME,
    height: FRAME,
  },
  brandName: {
    marginTop: 16,
    fontSize: 22.5,
    fontWeight: '700',
    color: '#FBBF24',
    letterSpacing: 0.8,
  },
  tribute: {
    position: 'absolute',
    bottom: 60,
    fontFamily: 'DancingScript-Regular',
    fontSize: 26,
    letterSpacing: 0.5,
    color: '#FBBF24',
  },
});
