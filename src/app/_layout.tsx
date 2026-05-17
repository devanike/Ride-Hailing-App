import { AuthProvider, useAuthRefresh } from "@/contexts/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { auth, db } from "@/services/firebaseConfig";
import {
  checkOnboardingStatus,
  hasPIN,
  isNewDevice,
  setHasSeenOnboarding,
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
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { PaystackProvider } from "react-native-paystack-webview";
import "react-native-reanimated";
import Toast from "react-native-toast-message";

SplashScreen.preventAutoHideAsync();

type AuthState =
  | "loading"
  | "onboarding"
  | "unauthenticated"
  | "profile-incomplete"
  | "driver-registration-incomplete"
  | "no-pin"
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

  const loadUserType = useCallback(
    async (uid: string): Promise<UserType | null> => {
      console.log("loadUserType called for uid:", uid);

      try {
        // Check each collection separately for better error handling
        let adminExists = false;
        let driverExists = false;
        let passengerExists = false;

        try {
          const adminSnap = await getDoc(doc(db, "admins", uid));
          adminExists = adminSnap.exists();
          console.log("Admin check:", adminExists);
        } catch (e) {
          console.log(
            "Admin check error (expected if no admins collection):",
            e,
          );
        }

        try {
          const driverSnap = await getDoc(doc(db, "drivers", uid));
          driverExists = driverSnap.exists();
          console.log("Driver check:", driverExists);
        } catch (e) {
          console.log("Driver check error:", e);
        }

        try {
          const passengerSnap = await getDoc(doc(db, "passengers", uid));
          passengerExists = passengerSnap.exists();
          console.log("Passenger check:", passengerExists);
        } catch (e) {
          console.log("Passenger check error:", e);
        }

        console.log("User type results:", {
          adminExists,
          driverExists,
          passengerExists,
        });

        if (adminExists) {
          console.log("Setting userType to admin");
          setUserType("admin");
          return "admin";
        } else if (driverExists) {
          console.log("Setting userType to driver");
          setUserType("driver");
          return "driver";
        } else if (passengerExists) {
          console.log("Setting userType to passenger");
          setUserType("passenger");
          return "passenger";
        }

        console.log("No user document found, returning null");
        return null;
      } catch (error) {
        console.error("Load user type error:", error);
        return null;
      }
    },
    [],
  );

  const isDriverRegistrationComplete = useCallback(
    async (uid: string): Promise<boolean> => {
      try {
        const driverDoc = await getDoc(doc(db, "drivers", uid));
        if (!driverDoc.exists()) return false;

        const data = driverDoc.data();
        const isComplete = !!(
          data?.vehicleType &&
          data?.plateNumber &&
          data?.licenseNumber
        );
        console.log("Driver registration complete:", isComplete);
        return isComplete;
      } catch (error) {
        console.error("Check driver registration error:", error);
        return false;
      }
    },
    [],
  );

  const handleAuthStateChange = useCallback(
    async (user: User | null) => {
      console.log("=== handleAuthStateChange ===");
      console.log("User:", user?.uid ?? "null");

      // IMPORTANT: Set loading immediately to prevent stale state navigation
      setAuthState("loading");
      // IMPORTANT: Reset userType to safe default
      setUserType("passenger");

      if (!user) {
        console.log("No user, checking onboarding...");
        const seenOnboarding = await checkOnboardingStatus();
        console.log("Seen onboarding:", seenOnboarding);
        setAuthState(seenOnboarding ? "unauthenticated" : "onboarding");
        return;
      }

      await setHasSeenOnboarding();

      try {
        console.log("Checking user type...");
        const detectedUserType = await loadUserType(user.uid);
        console.log("Detected user type:", detectedUserType);

        if (!detectedUserType) {
          console.log("No profile found, setting profile-incomplete");
          setAuthState("profile-incomplete");
          return;
        }

        if (detectedUserType === "driver") {
          console.log("User is driver, checking registration...");
          const registrationComplete = await isDriverRegistrationComplete(
            user.uid,
          );
          if (!registrationComplete) {
            console.log("Driver registration incomplete");
            setAuthState("driver-registration-incomplete");
            return;
          }
        }

        console.log("Checking PIN...");
        const pinExists = await hasPIN();
        console.log("PIN exists:", pinExists);

        if (!pinExists) {
          console.log("No PIN, setting no-pin");
          setAuthState("no-pin");
          return;
        }

        console.log("Checking device...");
        const isNew = await isNewDevice();
        console.log("Is new device:", isNew);

        if (isNew) {
          console.log("New device, setting needs-pin");
          setAuthState("needs-pin");
          return;
        }

        console.log("All checks passed, setting authenticated");
        setAuthState("authenticated");
      } catch (error) {
        console.error("Auth state check error:", error);
        setAuthState("needs-pin");
      }
    },
    [loadUserType, isDriverRegistrationComplete],
  );

  useEffect(() => {
    console.log("Setting up auth listener, refreshKey:", authRefreshKey);
    const unsubscribe = onAuthStateChanged(auth, handleAuthStateChange);
    return () => {
      console.log("Cleaning up auth listener");
      unsubscribe();
    };
  }, [handleAuthStateChange, authRefreshKey]);

  useEffect(() => {
    if (authState !== "loading") {
      SplashScreen.hideAsync().catch((err) =>
        console.warn("Failed to hide splash screen:", err),
      );
    }
  }, [authState]);

  useEffect(() => {
    console.log(
      "Navigation effect - authState:",
      authState,
      "userType:",
      userType,
      "segments:",
      segments,
    );

    if (authState === "loading") {
      console.log("Still loading, skipping navigation");
      return;
    }

    const inAuthGroup = segments[0] === "(auth)";
    let targetRoute: string | null = null;

    switch (authState) {
      case "onboarding":
        targetRoute = "/(auth)/onboarding";
        break;

      case "unauthenticated":
        if (!inAuthGroup || segments[1] === "onboarding") {
          targetRoute = "/(auth)/welcome";
        }
        break;

      case "profile-incomplete":
        if (segments[1] !== "profile-setup") {
          targetRoute = "/(auth)/profile-setup";
        }
        break;

      case "driver-registration-incomplete":
        if (segments[1] !== "driver-registration") {
          targetRoute = "/(auth)/driver-registration";
        }
        break;

      case "no-pin":
        if (segments[1] !== "pin-setup") {
          targetRoute = "/(auth)/pin-setup";
        }
        break;

      case "needs-pin":
        if (segments[1] !== "login") {
          targetRoute = "/(auth)/login";
        }
        break;

      case "authenticated":
        const routes: Record<UserType, string> = {
          admin: "/(admin)",
          driver: "/(driver)",
          passenger: "/(passenger)",
        };

        if (inAuthGroup) {
          // Coming from auth flow, route to correct home
          targetRoute = routes[userType];
          console.log("Authenticated from auth, routing to:", targetRoute);
        } else {
          // Already on a main screen - check if it's the WRONG user type's screen
          const currentGroup = segments[0] as string;
          const correctGroup = `(${userType})`;

          if (
            currentGroup &&
            ["(admin)", "(driver)", "(passenger)"].includes(currentGroup) &&
            currentGroup !== correctGroup
          ) {
            console.log(
              "User on wrong screen:",
              currentGroup,
              "should be:",
              correctGroup,
            );
            targetRoute = routes[userType];
          }
        }
        break;
    }

    if (targetRoute) {
      const currentPath = segments.join("/");
      const targetPath = targetRoute.replace(/^\//, "");
      console.log("Current path:", currentPath, "Target path:", targetPath);

      if (currentPath !== targetPath) {
        console.log("Navigating to:", targetRoute);
        router.replace(targetRoute as any);
      }
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
        {/* <Stack.Screen
          name="location-selection"
          options={{ presentation: "modal", title: "Select Location" }}
        /> */}
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PaystackProvider
        publicKey={process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY ?? ""}
      >
        <AuthProvider>
          <RootLayoutInner />
        </AuthProvider>
      </PaystackProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
