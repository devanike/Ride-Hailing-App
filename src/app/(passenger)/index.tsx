import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { DriverMarker } from "@/components/map/DriverMarker";
import { MapComponent, MapComponentRef } from "@/components/map/MapComponent";
import { useLocation } from "@/hooks/useLocation";
import { useTheme } from "@/hooks/useTheme";
import { auth, db } from "@/services/firebaseConfig";
import { Collections } from "@/types/database";
import { Ride, RideStatus } from "@/types/ride";
import BottomSheet from "@gorhom/bottom-sheet";
import { Href, router } from "expo-router";
import { onAuthStateChanged, User } from "firebase/auth";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { Navigation } from "lucide-react-native";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface DriverLocation {
  driverId: string;
  driverName?: string;
  latitude: number;
  longitude: number;
  isOnline: boolean;
}

const ACTIVE_RIDE_STATUSES: RideStatus[] = [
  "pending",
  "accepted",
  "in_progress",
];

const STATUS_LABELS: Record<RideStatus, string> = {
  pending: "Looking for a driver...",
  accepted: "Driver is on the way",
  in_progress: "Ride in progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

// NOTE: TypeScript will show an error on active-ride until (passenger)/active-ride.tsx is created.
const RIDE_SCREEN: Partial<Record<RideStatus, string>> = {
  pending: "/(passenger)/driver-offers",
  accepted: "/(passenger)/active-ride",
  in_progress: "/(passenger)/active-ride",
};

export default function PassengerHomeScreen(): React.JSX.Element {
  const { colors, spacing, typography, borderRadius, shadows } = useTheme();
  const mapRef = useRef<MapComponentRef>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);

  const { location, loading: locationLoading } = useLocation();

  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser);
  const [driverLocations, setDriverLocations] = useState<DriverLocation[]>([]);
  const [activeRide, setActiveRide] = useState<Ride | null>(null);

  const snapPoints = useMemo(() => ["22%", "40%"], []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (location) {
      mapRef.current?.animateToRegion(
        {
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        },
        300,
      );
    }
  }, [location]);

  useEffect(() => {
    const q = query(
      collection(db, Collections.DRIVER_LOCATIONS),
      where("isOnline", "==", true),
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const locations: DriverLocation[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        locations.push({
          driverId: doc.id,
          driverName: data.driverName,
          latitude: data.latitude,
          longitude: data.longitude,
          isOnline: data.isOnline,
        });
      });
      setDriverLocations(locations);
    });

    return unsub;
  }, []);

  useEffect(() => {
    if (!currentUser?.uid) return;

    const q = query(
      collection(db, Collections.RIDES),
      where("passengerId", "==", currentUser.uid),
      where("status", "in", ACTIVE_RIDE_STATUSES),
    );

    const unsub = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        setActiveRide({ rideId: doc.id, ...doc.data() } as Ride);
      } else {
        setActiveRide(null);
      }
    });

    return unsub;
  }, [currentUser?.uid]);

  const handleWhereAreYouGoing = useCallback((): void => {
    router.push("/(passenger)/location-selection" as Href);
  }, []);

  const handleActiveRidePress = useCallback((): void => {
    if (!activeRide) return;
    const screen = RIDE_SCREEN[activeRide.status];
    if (screen) {
      router.push(screen as Href);
    }
  }, [activeRide]);

  const handleCenterMap = useCallback((): void => {
    if (location) {
      mapRef.current?.animateToRegion(
        {
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        },
        300,
      );
    }
  }, [location]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    map: {
      flex: 1,
    },
    centerButton: {
      position: "absolute",
      bottom: "28%",
      right: spacing.screenPadding,
      width: 48,
      height: 48,
      borderRadius: borderRadius.full,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
      ...shadows.medium,
    },
    sheetBackground: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: borderRadius.xl,
      borderTopRightRadius: borderRadius.xl,
    },
    sheetContent: {
      paddingHorizontal: spacing.screenPadding,
      paddingTop: spacing.sm,
      paddingBottom: spacing.xl,
    },
    whereButton: {
      backgroundColor: colors.primary,
      borderRadius: borderRadius.md,
      paddingVertical: spacing.md + 2,
      alignItems: "center",
      justifyContent: "center",
    },
    whereButtonText: {
      fontSize: typography.sizes.base,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.textInverse,
    },
    activeRideCard: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
      marginBottom: spacing.md,
      ...shadows.small,
    },
    activeRideLabel: {
      fontSize: typography.sizes.xs,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginBottom: spacing.xs,
    },
    activeRideStatus: {
      fontSize: typography.sizes.base,
      fontFamily: typography.fonts.headingSemiBold,
      color: colors.primary,
      marginBottom: spacing.xs / 2,
    },
    activeRideHint: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.textSecondary,
    },
    indicator: {
      backgroundColor: colors.border,
    },
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <MapComponent
        ref={mapRef}
        style={styles.map}
        showUserLocation
        followUserLocation={false}
        showsMyLocationButton={false}
      >
        {driverLocations.map((driver) => (
          <DriverMarker
            key={driver.driverId}
            coordinate={{
              latitude: driver.latitude,
              longitude: driver.longitude,
            }}
            driverId={driver.driverId}
            driverName={driver.driverName}
            isOnline={driver.isOnline}
          />
        ))}
      </MapComponent>

      <TouchableOpacity
        style={styles.centerButton}
        onPress={handleCenterMap}
        disabled={!location}
        activeOpacity={0.8}
      >
        <Navigation
          size={22}
          color={location ? colors.primary : colors.textMuted}
        />
      </TouchableOpacity>

      <BottomSheet
        ref={bottomSheetRef}
        index={0}
        snapPoints={snapPoints}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.indicator}
        enablePanDownToClose={false}
      >
        <View style={styles.sheetContent}>
          {activeRide && (
            <TouchableOpacity
              style={styles.activeRideCard}
              onPress={handleActiveRidePress}
              activeOpacity={0.8}
            >
              <Text style={styles.activeRideLabel}>Active Ride</Text>
              <Text style={styles.activeRideStatus}>
                {STATUS_LABELS[activeRide.status]}
              </Text>
              <Text style={styles.activeRideHint}>
                Tap to view ride details
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.whereButton}
            onPress={handleWhereAreYouGoing}
            activeOpacity={0.85}
          >
            <Text style={styles.whereButtonText}>Where are you going?</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>

      {locationLoading && (
        <LoadingSpinner fullScreen message="Getting your location..." />
      )}
    </View>
  );
}
