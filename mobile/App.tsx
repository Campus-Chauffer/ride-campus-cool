import React, { useState, useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import Sentry from './src/utils/sentry';
import AppNavigator from './src/navigation/AppNavigator';
import SplashScreen from './src/components/SplashScreen';
import CrashFallbackScreen from './src/components/CrashFallbackScreen';
import UpdateModal from './src/components/UpdateModal';
import './src/utils/backgroundLocation'; // register background task on app start
import { fetchRemoteBackendConfig } from './src/utils/remoteConfig';
import { applyRemoteApiBaseUrl } from './src/services/api';
import socketService from './src/services/socket';

// Fired at module-evaluation time, not inside a React effect, so it starts
// as early as physically possible — well before the 3s splash screen below
// even finishes, giving it the best chance of resolving before any screen
// could fire a real request. Fails silently and changes nothing if the
// fetch doesn't come back in time; see utils/remoteConfig.ts for why this
// exists — it's what lets already-installed apps recover from an outage
// on whatever's currently hosting the backend without an app store update.
fetchRemoteBackendConfig().then((config) => {
  if (config?.apiBaseUrl) applyRemoteApiBaseUrl(config.apiBaseUrl);
  if (config?.socketUrl) socketService.setBaseUrl(config.socketUrl);
});

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
      <UpdateModal />
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