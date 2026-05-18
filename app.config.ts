import { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "UI-Ride-App",
  slug: "UI-Ride-App",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "uirideapp",
  userInterfaceStyle: "light",
  newArchEnabled: true,
  runtimeVersion: "1.0.0",
  updates: {
    url: "https://u.expo.dev/8cb5721f-8bf8-42ee-ab7d-3f3218186f23",
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.graceolabode.uirideapp",
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        "UI-Ride needs your location to show nearby drivers and enable ride tracking.",
      NSCameraUsageDescription:
        "We need camera access to upload profile photos and vehicle documents.",
      NSPhotoLibraryUsageDescription:
        "We need photo library access to upload images.",
      NSLocationAlwaysAndWhenInUseUsageDescription:
        "UI-Ride needs your location to track your ride even when the app is in the background.",
      NSLocationAlwaysUsageDescription:
        "UI-Ride needs your location to track your ride even when the app is in the background.",
    },
    config: {
      googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
    },
  },
  android: {
    package: "com.graceolabode.uirideapp",
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/images/icon.png",
    },
    permissions: [
      "INTERNET",
      "ACCESS_COARSE_LOCATION",
      "ACCESS_FINE_LOCATION",
      "CAMERA",
      "READ_EXTERNAL_STORAGE",
      "WRITE_EXTERNAL_STORAGE",
      "ACCESS_BACKGROUND_LOCATION",
      "FOREGROUND_SERVICE",
      "FOREGROUND_SERVICE_LOCATION",
    ],
    config: {
      googleMaps: {
        apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
      },
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: "static",
    favicon: "./assets/images/icon.png",
  },
  plugins: [
    "expo-router",
    "expo-web-browser",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
        dark: {
          backgroundColor: "#000000",
        },
      },
    ],
    "expo-font",
    [
      "expo-location",
      {
        locationAlwaysAndWhenInUsePermission:
          "Allow UI Campus Cab to use your location for ride services.",
        isAndroidBackgroundLocationEnabled: true,
        isAndroidForegroundServiceEnabled: true,
      },
    ],
    [
      "expo-image-picker",
      {
        photosPermission:
          "The app needs access to your photos to upload profile and vehicle images.",
      },
    ],
  ],
  extra: {
    eas: {
      projectId: "8cb5721f-8bf8-42ee-ab7d-3f3218186f23",
    },
  },
});
