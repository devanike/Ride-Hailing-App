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

SplashScreen.preventAutoHideAsync();

type AuthState =
  | "loading"
  | "unauthenticated"
  | "no-pin"
  | "new-device"
  | "needs-pin"
  | "authenticated";

type UserType = "passenger" | "driver" | "admin";

function RootLayoutInner() {
  const { colors } = useTheme();
  const router = useRouter();
  const segments = useSegments();
  const { authRefreshKey } = useAuthRefresh();
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [userType, setUserType] = useState<UserType>("passenger");

  /**
   * Resolve user type by checking role collections in order:
   * admins -> drivers -> passengers
   */
  const loadUserTypeAndComplete = useCallback(async (uid: string) => {
    try {
      const [adminSnap, driverSnap, passengerSnap] = await Promise.all([
        getDoc(doc(db, "admins", uid)),
        getDoc(doc(db, "drivers", uid)),
        getDoc(doc(db, "passengers", uid)),
      ]);

      if (adminSnap.exists()) {
        setUserType("admin");
      } else if (driverSnap.exists()) {
        setUserType("driver");
      } else if (passengerSnap.exists()) {
        setUserType("passenger");
      } else {
        setUserType("passenger");
      }

      setAuthState("authenticated");
    } catch (error) {
      console.error("Load user type error:", error);
      setUserType("passenger");
      setAuthState("authenticated");
    }
  }, []);

  const handleAuthStateChange = useCallback(
    async (user: User | null) => {
      if (!user) {
        setAuthState("unauthenticated");
        return;
      }

      try {
        const pinExists = await hasPIN();
        if (!pinExists) {
          setAuthState("no-pin");
          return;
        }

        const isNew = await isNewDevice();
        if (isNew) {
          setAuthState("new-device");
          return;
        }

        const biometric = await getBiometricCapability();
        const bioEnabled = await isBiometricEnabled();

        if (biometric.available && bioEnabled) {
          const authenticated = await authenticateWithBiometric();
          if (authenticated) {
            await loadUserTypeAndComplete(user.uid);
            return;
          }
        }

        setAuthState("needs-pin");
      } catch (error) {
        console.error("Auth state check error:", error);
        setAuthState("needs-pin");
      }
    },
    [loadUserTypeAndComplete],
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, handleAuthStateChange);
    return () => unsubscribe();
  }, [handleAuthStateChange, authRefreshKey]);

  useEffect(() => {
    if (authState !== "loading") {
      SplashScreen.hideAsync().catch((err) =>
        console.warn("Failed to hide splash screen:", err),
      );
    }
  }, [authState]);

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
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(passenger)" />
        <Stack.Screen name="(driver)" />
        <Stack.Screen name="(admin)" />
        <Stack.Screen
          name="location-selection"
          options={{ presentation: "modal", title: "Select Location" }}
        />
        <Stack.Screen
          name="report-incident"
          options={{ presentation: "modal", title: "Report Issue" }}
        />
        <Stack.Screen
          name="rating"
          options={{ presentation: "modal", title: "Rate Your Ride" }}
        />
        <Stack.Screen
          name="ride-details"
          options={{ presentation: "modal", title: "Ride Details" }}
        />
        <Stack.Screen
          name="my-reports"
          options={{ presentation: "modal", title: "My Reports" }}
        />
        <Stack.Screen
          name="report-details"
          options={{ presentation: "modal", title: "Report Details" }}
        />
        <Stack.Screen
          name="edit-profile"
          options={{ presentation: "modal", title: "Edit Profile" }}
        />
        <Stack.Screen
          name="security-settings"
          options={{ presentation: "modal", title: "Security Settings" }}
        />
        <Stack.Screen
          name="help"
          options={{ presentation: "modal", title: "Help & Support" }}
        />
      </Stack>

      <StatusBar style="auto" />
      <Toast config={toastConfig} />
    </ThemeProvider>
  );
}

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
