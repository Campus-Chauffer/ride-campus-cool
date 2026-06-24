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
        "android.permission.ACCESS_FINE_LOCATION"
      ]
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    plugins: [
      "expo-secure-store",
      "expo-notifications",
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission: "Campus Chauffeur needs your location to find nearby drivers.",
          locationWhenInUsePermission: "Campus Chauffeur needs your location to find nearby drivers."
        }
      ],
      [
        "expo-build-properties",
        {
          android: { newArchEnabled: false },
          ios: { newArchEnabled: false }
        }
      ]
    ],
    extra: {
      googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
      eas: {
        projectId: "3b913f57-d8c6-403a-8928-ed3c917d4c61"
      }
    }
  }
};