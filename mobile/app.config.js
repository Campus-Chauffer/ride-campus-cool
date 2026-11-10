import 'dotenv/config';

export default {
  expo: {
    name: "Campus Chauffeur",
    slug: "campus-chauffeur",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: false,
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#1A1A2E"
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: "com.campuschauffeur.app",
      config: {
        googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY
      },
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#1A1A2E"
      },
      package: "com.campuschauffeur.app",
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY
        }
      },
      permissions: [
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_BACKGROUND_LOCATION",
        "android.permission.FOREGROUND_SERVICE",
        "android.permission.FOREGROUND_SERVICE_LOCATION"
      ],
      // expo-audio's own AndroidManifest.xml unconditionally declares
      // RECORD_AUDIO and FOREGROUND_SERVICE_MEDIA_PLAYBACK (for its mic-
      // recording and background-media-session features) regardless of
      // this app's permissions list above — that list only governs Expo's
      // own generated manifest, not permissions merged in from a native
      // module's manifest. We only ever call .play() on a short local
      // sound while the app is in the foreground (the ride-offer alert) —
      // never recording, never a background-continuing media session — so
      // blocking both here keeps the final manifest honest about what the
      // app actually does, instead of declaring unused capabilities to
      // Google Play.
      blockedPermissions: [
        "android.permission.RECORD_AUDIO",
        "android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK"
      ]
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    plugins: [
      "expo-secure-store",
      "expo-web-browser",
      "expo-audio",
      [
        "expo-notifications",
        {
          "sounds": ["./assets/sounds/car_horn.wav"]
        }
      ],
      "expo-font",
      [
        "expo-location",
        {
          NSLocationWhenInUseUsageDescription: "Campus Chauffeur needs your location to find nearby drivers.",
          NSLocationAlwaysAndWhenInUseUsageDescription: "Campus Chauffeur needs your location to find nearby drivers and update your position while online.",
          NSLocationAlwaysUsageDescription: "Campus Chauffeur needs background location to keep you online and receive ride requests.",
          locationAlwaysAndWhenInUsePermission: "Campus Chauffeur needs your location to find nearby drivers and update your position while online.",
          locationWhenInUsePermission: "Campus Chauffeur needs your location to find nearby drivers.",
          locationAlwaysPermission: "Campus Chauffeur needs background location to keep you online and receive ride requests.",
          isAndroidBackgroundLocationEnabled: true,
          isAndroidForegroundServiceEnabled: true
        }
      ],
      "expo-task-manager",
      "expo-video",
      [
        "expo-build-properties",
        {
          android: { newArchEnabled: false },
          ios: { newArchEnabled: false }
        }
      ]
    ],
    extra: {
      eas: {
        projectId: "3b913f57-d8c6-403a-8928-ed3c917d4c61"
      },
      sentryDsn: process.env.SENTRY_DSN || null
    }
  }
};