import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { DriverMarker } from "@/components/map/DriverMarker";
import { MapComponent, MapComponentRef } from "@/components/map/MapComponent";
import { useLocation } from "@/hooks/useLocation";
import { useTheme } from "@/hooks/useTheme";
import { auth, db } from "@/services/firebaseConfig";
import { Collections } from "@/types/database";
import { Passenger } from "@/types/passenger";
import { Ride, RideStatus } from "@/types/ride";
import { Href, router } from "expo-router";
import { onAuthStateChanged, User } from "firebase/auth";
import { collection, doc, onSnapshot, query, where } from "firebase/firestore";
import { Navigation } from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
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
  arrived: "Driver has arrived",
  in_progress: "Ride in progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default function PassengerHomeScreen(): React.JSX.Element {
  const { colors, spacing, typography, borderRadius, shadows } = useTheme();
  const mapRef = useRef<MapComponentRef>(null);

  const {
    location,
    loading: locationLoading,
    requestPermission,
    hasPermission,
  } = useLocation(true);

  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser);
  const [driverLocations, setDriverLocations] = useState<DriverLocation[]>([]);
  const [activeRide, setActiveRide] = useState<Ride | null>(null);
  const [isSuspended, setIsSuspended] = useState(false);

  // Check suspension status
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const unsub = onSnapshot(doc(db, Collections.PASSENGERS, uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as Passenger;
        setIsSuspended(data.status === "suspended");
      }
    });

    return unsub;
  }, []);

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

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
    const unsub = onSnapshot(
      collection(db, Collections.DRIVER_LOCATIONS),
      (snapshot) => {
        const locations: DriverLocation[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data.isOnline === true) {
            locations.push({
              driverId: doc.id,
              driverName: data.name ?? undefined,
              latitude: data.latitude,
              longitude: data.longitude,
              isOnline: true,
            });
          }
        });
        setDriverLocations(locations);
      },
    );
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
        // const now = Date.now();
        // const thirtyMinMs = 30 * 60 * 1000;

        const activeRides = snapshot.docs
          .map((d) => ({ rideId: d.id, ...d.data() }) as Ride)
          .filter((r) => {
            // Only show rides created in the last 30 minutes that are truly active
            if (r.paymentStatus === "completed") return false;
            if (r.completedAt) return false;
            if (r.cancelledAt) return false;
            if (r.status === "cancelled") return false;

            const createdAt = r.createdAt?.toMillis?.() ?? 0;
            const now = Date.now();
            const thirtyMinMs = 30 * 60 * 1000;

            // Stale pending rides
            if (r.status === "pending" && now - createdAt > thirtyMinMs)
              return false;

            return true;
          })
          .sort((a, b) => {
            const aTime = a.createdAt?.toMillis?.() ?? 0;
            const bTime = b.createdAt?.toMillis?.() ?? 0;
            return bTime - aTime;
          });

        setActiveRide(activeRides.length > 0 ? activeRides[0] : null);
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

    if (activeRide.status === "pending") {
      router.push({
        pathname: "/(passenger)/driver-offers" as Href,
        params: {
          rideId: activeRide.rideId,
          pickupAddress: activeRide.pickupLocation.address,
          pickupLat: activeRide.pickupLocation.latitude.toString(),
          pickupLng: activeRide.pickupLocation.longitude.toString(),
          destinationAddress: activeRide.dropoffLocation.address,
          destinationLat: activeRide.dropoffLocation.latitude.toString(),
          destinationLng: activeRide.dropoffLocation.longitude.toString(),
          proposedFare: activeRide.proposedFare.toString(),
          vehicleType: activeRide.requiredVehicleType ?? "",
          passengerCount: (activeRide.passengerCount ?? 1).toString(),
          existingRide: "true",
        },
      } as any);
      return;
    }

    if (activeRide.status === "accepted") {
      router.push({
        pathname: "/(passenger)/booking-confirmation",
        params: { rideId: activeRide.rideId },
      } as any);
      return;
    }

    if (activeRide.status === "in_progress") {
      router.push({
        pathname: "/(passenger)/active-ride",
        params: { rideId: activeRide.rideId },
      } as any);
      return;
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
      bottom: 220,
      right: spacing.screenPadding,
      width: 48,
      height: 48,
      borderRadius: borderRadius.full,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
      ...shadows.medium,
    },
    bottomPanel: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: colors.surface,
      borderTopLeftRadius: borderRadius.xl,
      borderTopRightRadius: borderRadius.xl,
      paddingHorizontal: spacing.screenPadding,
      paddingTop: spacing.md,
      paddingBottom: spacing.md,
      ...shadows.medium,
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

      {isSuspended && (
        <View
          style={{
            position: "absolute",
            top: 60,
            left: spacing.screenPadding,
            right: spacing.screenPadding,
            backgroundColor: colors.error,
            borderRadius: borderRadius.md,
            padding: spacing.md,
            zIndex: 20,
          }}
        >
          <Text
            style={{
              fontSize: typography.sizes.sm,
              fontFamily: typography.fonts.bodyMedium,
              color: colors.textInverse,
              textAlign: "center",
            }}
          >
            Your account has been suspended. Contact support for assistance.
          </Text>
        </View>
      )}

      <View style={styles.bottomPanel}>
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
            <Text style={styles.activeRideHint}>Tap to view ride details</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            styles.whereButton,
            isSuspended && { opacity: 0.4, backgroundColor: colors.textMuted },
          ]}
          onPress={isSuspended ? undefined : handleWhereAreYouGoing}
          activeOpacity={0.85}
          disabled={isSuspended}
        >
          <Text style={styles.whereButtonText}>
            {isSuspended ? "Account Suspended" : "Where are you going?"}
          </Text>
        </TouchableOpacity>
      </View>

      {locationLoading && !location && (
        <LoadingSpinner fullScreen message="Getting your location..." />
      )}
    </View>
  );
}
