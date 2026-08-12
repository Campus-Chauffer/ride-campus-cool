import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

const dsn = Constants.expoConfig?.extra?.sentryDsn as string | undefined;

// No-op until a DSN is configured (see app.config.js / README) — lets local
// dev and any build made before Sentry is set up run exactly as before
// instead of crashing on a missing DSN.
export const sentryEnabled = Boolean(dsn) && !__DEV__;

export function initSentry() {
  if (!dsn) return;
  Sentry.init({
    dsn,
    enabled: sentryEnabled,
    tracesSampleRate: 0.2,
    // Ride-flow bugs are almost always about *what happened before* the
    // crash (which screen, which API call) more than the crash itself —
    // breadcrumbs capture that trail automatically.
    debug: false,
  });
}

export default Sentry;
