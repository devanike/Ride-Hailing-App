import { AuthProvider, useAuthRefresh } from "@/contexts/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { auth, db } from "@/services/firebaseConfig";
import {
  authenticateWithBiometric,
  getBiometricCapability,
  hasPIN,
  isBiometricEnabled,
  isNewDevice,
} from "@/services/securityService";
import { toastConfig } from "@/utils/toastConfig";
import { DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import "react-native-reanimated";
import Toast from "react-native-toast-message";

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

type AuthState =
  | "loading"
  | "unauthenticated"
  | "no-pin"
  | "new-device"
  | "needs-pin"
  | "driver-incomplete"
  | "authenticated";

type UserType = "passenger" | "driver" | "admin";

/**
 * Inner layout component that uses auth context
 */
function RootLayoutInner() {
  const { colors } = useTheme();
  const router = useRouter();
  const segments = useSegments();
  const { authRefreshKey } = useAuthRefresh();
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [userType, setUserType] = useState<UserType>("passenger");

  /**
   * Load user type and check driver registration status
   */
  const loadUserTypeAndComplete = useCallback(async (uid: string) => {
    try {
      const userDoc = await getDoc(doc(db, "users", uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const type = userData.userType || "passenger";
        setUserType(type);

        // If driver, check registration status
        if (type === "driver") {
          const driverDoc = await getDoc(doc(db, "drivers", uid));
          if (driverDoc.exists()) {
            const driverData = driverDoc.data();

            // Check if driver registration is incomplete
            if (driverData.status === "incomplete") {
              setAuthState("driver-incomplete");
              return;
            }
          }
        }
      }
      setAuthState("authenticated");
    } catch (error) {
      console.error("Load user type error:", error);
      setUserType("passenger");
      setAuthState("authenticated");
    }
  }, []);

  /**
   * Handle Firebase auth state changes
   */
  const handleAuthStateChange = useCallback(
    async (user: User | null) => {
      if (!user) {
        setAuthState("unauthenticated");
        return;
      }

      try {
        // Check if PIN exists
        const pinExists = await hasPIN();
        if (!pinExists) {
          setAuthState("no-pin");
          return;
        }

        // Check if device is new
        const isNew = await isNewDevice();
        if (isNew) {
          setAuthState("new-device");
          return;
        }

        // Try biometric authentication if available
        const biometric = await getBiometricCapability();
        const bioEnabled = await isBiometricEnabled();

        if (biometric.available && bioEnabled) {
          const authenticated = await authenticateWithBiometric();
          if (authenticated) {
            await loadUserTypeAndComplete(user.uid);
            return;
          }
        }

        // Require PIN authentication
        setAuthState("needs-pin");
      } catch (error) {
        console.error("Auth state check error:", error);
        setAuthState("needs-pin");
      }
    },
    [loadUserTypeAndComplete],
  );

  // Listen to auth state changes AND auth refresh key
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, handleAuthStateChange);
    return () => unsubscribe();
  }, [handleAuthStateChange, authRefreshKey]); // Re-run when authRefreshKey changes

  // Hide splash screen once auth state is determined
  useEffect(() => {
    if (authState !== "loading") {
      SplashScreen.hideAsync().catch((err) =>
        console.warn("Failed to hide splash screen:", err),
      );
    }
  }, [authState]);

  // Handle navigation based on auth state
  useEffect(() => {
    if (authState === "loading") return;

    const inAuthGroup = segments[0] === "(auth)";
    let targetRoute: string | null = null;

    switch (authState) {
      case "unauthenticated":
        if (!inAuthGroup) {
          targetRoute = "/(auth)/welcome";
        }
        break;

      case "no-pin":
        targetRoute = "/(auth)/pin-setup";
        break;

      case "new-device":
      case "needs-pin":
        if (!inAuthGroup) {
          targetRoute = "/(auth)/login";
        }
        break;

      case "driver-incomplete":
        targetRoute = "/(driver)/driver-registration";
        break;

      case "authenticated":
        if (inAuthGroup) {
          const routes: Record<UserType, string> = {
            admin: "/(admin)",
            driver: "/(driver)",
            passenger: "/(passenger)",
          };
          targetRoute = routes[userType];
        }
        break;
    }

    if (targetRoute && segments.join("/") !== targetRoute.replace(/^\//, "")) {
      router.replace(targetRoute as any);
    }
  }, [authState, userType, segments, router]);

  // Show loading screen while checking auth state
  if (authState === "loading") {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ThemeProvider value={DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        {/* Auth flow routes */}
        <Stack.Screen name="(auth)" />

        {/* Main app routes */}
        <Stack.Screen name="(passenger)" />
        <Stack.Screen name="(driver)" />
        <Stack.Screen name="(admin)" />

        {/* Shared modal screens */}
        <Stack.Screen
          name="location-selection"
          options={{
            presentation: "modal",
            title: "Select Location",
          }}
        />
        <Stack.Screen
          name="report-incident"
          options={{
            presentation: "modal",
            title: "Report Issue",
          }}
        />
        <Stack.Screen
          name="rating"
          options={{
            presentation: "modal",
            title: "Rate Your Ride",
          }}
        />
        <Stack.Screen
          name="ride-details"
          options={{
            presentation: "modal",
            title: "Ride Details",
          }}
        />
        <Stack.Screen
          name="my-reports"
          options={{
            presentation: "modal",
            title: "My Reports",
          }}
        />
        <Stack.Screen
          name="report-details"
          options={{
            presentation: "modal",
            title: "Report Details",
          }}
        />
        <Stack.Screen
          name="edit-profile"
          options={{
            presentation: "modal",
            title: "Edit Profile",
          }}
        />
        <Stack.Screen
          name="security-settings"
          options={{
            presentation: "modal",
            title: "Security Settings",
          }}
        />
        <Stack.Screen
          name="help"
          options={{
            presentation: "modal",
            title: "Help & Support",
          }}
        />
      </Stack>

      <StatusBar style="auto" />
      <Toast config={toastConfig} />
    </ThemeProvider>
  );
}

/**
 * Root layout with AuthProvider
 */
export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutInner />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
