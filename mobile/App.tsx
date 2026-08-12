import React, { useState, useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import Sentry from './src/utils/sentry';
import AppNavigator from './src/navigation/AppNavigator';
import SplashScreen from './src/components/SplashScreen';
import CrashFallbackScreen from './src/components/CrashFallbackScreen';
import './src/utils/backgroundLocation'; // register background task on app start

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const splashOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(splashOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => setShowSplash(false));
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Sentry.ErrorBoundary
      fallback={({ resetError }) => <CrashFallbackScreen onReset={resetError} />}
    >
      <AppNavigator />
      {showSplash && (
        <Animated.View
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            opacity: splashOpacity,
          }}
        >
          <SplashScreen />
        </Animated.View>
      )}
    </Sentry.ErrorBoundary>
  );
}