import { Button } from "@/components/common/Button";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { DriverMarker } from "@/components/map/DriverMarker";
import { DropoffMarker } from "@/components/map/DropoffMarker";
import { MapComponent, MapComponentRef } from "@/components/map/MapComponent";
import { PickupMarker } from "@/components/map/PickupMarker";
import { useTheme } from "@/hooks/useTheme";
import { auth, db } from "@/services/firebaseConfig";
import { Collections } from "@/types/database";
import { Driver } from "@/types/driver";
import { Ride } from "@/types/ride";
import { showError } from "@/utils/toast";
import BottomSheet from "@gorhom/bottom-sheet";
import { router, useLocalSearchParams } from "expo-router";
import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { Phone, Star } from "lucide-react-native";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Image,
  Linking,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";

const CANCEL_WINDOW_MS = 2 * 60 * 1000; // 2 minutes

function getVehicleLabel(driver: Driver): string {
  if (driver.vehicleType === "car") {
    return [
      driver.vehicleMake,
      driver.vehicleModel,
      driver.vehicleColor,
      driver.plateNumber,
    ]
      .filter(Boolean)
      .join(", ");
  }
  const type = driver.vehicleType === "tricycle" ? "Tricycle" : "Bus";
  return `${type}, ${driver.vehicleColor}, ${driver.plateNumber}`;
}

interface DriverLocation {
  latitude: number;
  longitude: number;
  isOnline: boolean;
}

export default function BookingConfirmationScreen(): React.JSX.Element {
  const { colors, spacing, typography } = useTheme();
  const mapRef = useRef<MapComponentRef>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["40%", "65%"], []);

  const { rideId } = useLocalSearchParams<{ rideId: string }>();

  const [ride, setRide] = useState<Ride | null>(null);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(
    null,
  );
  const [eta, setEta] = useState<number | null>(null);
  const [canCancel, setCanCancel] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [loading, setLoading] = useState(true);

  const driverFetchedRef = useRef(false);
  const cancelWindowRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const acceptedAtRef = useRef<number | null>(null);

  // Fetch ride doc once, then set up listener for status changes
  useEffect(() => {
    if (!rideId) return;

    const unsub = onSnapshot(
      doc(db, Collections.RIDES, rideId),
      async (snap) => {
        if (!snap.exists()) return;
        const rideData = snap.data() as Ride;
        setRide(rideData);

        // Fetch driver once we have the driverId
        if (rideData.driverId && !driverFetchedRef.current) {
          driverFetchedRef.current = true;
          try {
            const driverSnap = await getDoc(
              doc(db, Collections.DRIVERS, rideData.driverId),
            );
            if (driverSnap.exists()) {
              setDriver(driverSnap.data() as Driver);
            }
          } catch (err) {
            console.error("Failed to fetch driver:", err);
          }
        }

        // Start cancel window from acceptedAt
        if (rideData.acceptedAt && !acceptedAtRef.current) {
          const acceptedMs = rideData.acceptedAt.toMillis();
          acceptedAtRef.current = acceptedMs;
          const elapsed = Date.now() - acceptedMs;
          const remaining = CANCEL_WINDOW_MS - elapsed;

          if (remaining > 0) {
            cancelWindowRef.current = setTimeout(() => {
              setCanCancel(false);
            }, remaining);
          } else {
            setCanCancel(false);
          }
        }

        setLoading(false);

        // Navigate to active-ride when driver starts the trip
        if (rideData.status === "in_progress") {
          router.replace({
            pathname: "/(passenger)/active-ride",
            params: { rideId },
          });
        }

        if (rideData.status === "cancelled") {
          router.replace("/(passenger)");
        }
      },
    );

    return () => {
      unsub();
      if (cancelWindowRef.current) clearTimeout(cancelWindowRef.current);
    };
  }, [rideId]);

  // Listen to driver location in real time
  useEffect(() => {
    if (!ride?.driverId) return;

    const unsub = onSnapshot(
      doc(db, Collections.DRIVER_LOCATIONS, ride.driverId),
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        setDriverLocation({
          latitude: data.latitude,
          longitude: data.longitude,
          isOnline: data.isOnline ?? true,
        });
      },
    );

    return unsub;
  }, [ride?.driverId]);

  // Recalculate ETA whenever driver location changes
  useEffect(() => {
    if (!driverLocation || !ride?.pickupLocation) return;

    const R = 6371;
    const toRad = (v: number) => (v * Math.PI) / 180;
    const dLat = toRad(ride.pickupLocation.latitude - driverLocation.latitude);
    const dLng = toRad(
      ride.pickupLocation.longitude - driverLocation.longitude,
    );
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(driverLocation.latitude)) *
        Math.cos(toRad(ride.pickupLocation.latitude)) *
        Math.sin(dLng / 2) ** 2;
    const distKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    // Assume 20 km/h average campus speed → minutes
    const minutes = Math.max(1, Math.round((distKm / 20) * 60));
    setEta(minutes);
  }, [driverLocation, ride?.pickupLocation]);

  // Pan map to driver position when it moves
  useEffect(() => {
    if (!driverLocation) return;
    mapRef.current?.animateToRegion(
      {
        latitude: driverLocation.latitude,
        longitude: driverLocation.longitude,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      },
      300,
    );
  }, [driverLocation]);

  const handleCallDriver = useCallback((): void => {
    if (!driver?.phone) return;
    Linking.openURL(`tel:${driver.phone}`);
  }, [driver]);

  const handleCancelRide = useCallback(async (): Promise<void> => {
    if (!rideId || !canCancel) return;
    setCancelling(true);
    try {
      await updateDoc(doc(db, Collections.RIDES, rideId), {
        status: "cancelled",
        cancelledAt: serverTimestamp(),
        cancelledBy: auth.currentUser?.uid ?? null,
        cancellationReason: "Passenger cancelled after acceptance",
        updatedAt: serverTimestamp(),
      });
      router.replace("/(passenger)");
    } catch (err) {
      console.error("Failed to cancel ride:", err);
      showError("Failed to cancel", "Please try again.");
      setCancelling(false);
    }
  }, [rideId, canCancel]);

  const mapInitialRegion = useMemo(() => {
    if (ride?.pickupLocation) {
      return {
        latitude: ride.pickupLocation.latitude,
        longitude: ride.pickupLocation.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      };
    }
    return undefined;
  }, [ride?.pickupLocation]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    map: {
      flex: 1,
    },
    loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.background,
      alignItems: "center",
      justifyContent: "center",
    },
    sheetContent: {
      flex: 1,
      paddingHorizontal: spacing.screenPadding,
      paddingBottom: spacing.xl,
    },

    // Driver header
    driverRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingTop: spacing.xs,
      paddingBottom: spacing.md,
    },
    driverPhoto: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.backgroundAlt,
    },
    driverPhotoPlaceholder: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.backgroundAlt,
      alignItems: "center",
      justifyContent: "center",
    },
    driverInitial: {
      fontSize: typography.sizes.xl,
      fontFamily: typography.fonts.headingSemiBold,
      color: colors.textMuted,
    },
    driverMeta: {
      flex: 1,
      marginLeft: spacing.md,
    },
    driverName: {
      fontSize: typography.sizes.lg,
      fontFamily: typography.fonts.headingSemiBold,
      color: colors.textPrimary,
    },
    ratingRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginTop: 3,
    },
    ratingText: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.textSecondary,
    },

    // Vehicle row
    vehicleText: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.textMuted,
      paddingBottom: spacing.md,
    },

    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginBottom: spacing.md,
    },

    // Fare / ETA rows
    infoRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: spacing.md,
    },
    infoLabel: {
      fontSize: typography.sizes.base,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.textSecondary,
    },
    infoValue: {
      fontSize: typography.sizes.base,
      fontFamily: typography.fonts.headingSemiBold,
      color: colors.textPrimary,
    },

    // Action buttons
    actions: {
      gap: spacing.sm,
      marginTop: spacing.xs,
    },
  });

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.loadingOverlay}>
          <LoadingSpinner message="Loading booking details..." />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        translucent
        backgroundColor="transparent"
      />

      <MapComponent
        ref={mapRef}
        style={styles.map}
        showUserLocation={false}
        showsMyLocationButton={false}
        initialRegion={mapInitialRegion}
      >
        {ride?.pickupLocation && (
          <PickupMarker
            coordinate={{
              latitude: ride.pickupLocation.latitude,
              longitude: ride.pickupLocation.longitude,
            }}
            address={ride.pickupLocation.address}
          />
        )}
        {ride?.dropoffLocation && (
          <DropoffMarker
            coordinate={{
              latitude: ride.dropoffLocation.latitude,
              longitude: ride.dropoffLocation.longitude,
            }}
            address={ride.dropoffLocation.address}
          />
        )}
        {driverLocation && ride?.driverId && (
          <DriverMarker
            coordinate={{
              latitude: driverLocation.latitude,
              longitude: driverLocation.longitude,
            }}
            driverId={ride.driverId}
            driverName={driver?.name}
            isOnline={driverLocation.isOnline}
          />
        )}
      </MapComponent>

      <BottomSheet
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        index={0}
        backgroundStyle={{ backgroundColor: colors.surface }}
        handleIndicatorStyle={{ backgroundColor: colors.border }}
        enablePanDownToClose={false}
      >
        <View style={styles.sheetContent}>
          {/* Driver photo, name, rating */}
          <View style={styles.driverRow}>
            {driver?.profilePhoto ? (
              <Image
                source={{ uri: driver.profilePhoto }}
                style={styles.driverPhoto}
              />
            ) : (
              <View style={styles.driverPhotoPlaceholder}>
                <Text style={styles.driverInitial}>
                  {driver?.name?.charAt(0).toUpperCase() ?? "?"}
                </Text>
              </View>
            )}
            <View style={styles.driverMeta}>
              <Text style={styles.driverName}>
                {driver?.name ?? "Your driver"}
              </Text>
              <View style={styles.ratingRow}>
                <Star size={14} color={colors.warning} fill={colors.warning} />
                <Text style={styles.ratingText}>
                  {driver?.rating?.toFixed(1) ?? "—"}
                </Text>
              </View>
            </View>
          </View>

          {/* Vehicle info */}
          {driver && (
            <Text style={styles.vehicleText}>{getVehicleLabel(driver)}</Text>
          )}

          <View style={styles.divider} />

          {/* Agreed fare */}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Agreed fare</Text>
            <Text style={styles.infoValue}>
              NGN {ride?.agreedFare?.toLocaleString() ?? "—"}
            </Text>
          </View>

          {/* ETA */}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>ETA</Text>
            <Text style={styles.infoValue}>
              {eta !== null ? `${eta} min` : "Calculating..."}
            </Text>
          </View>

          <View style={styles.divider} />

          {/* Actions */}
          <View style={styles.actions}>
            <Button
              title="Call Driver"
              onPress={handleCallDriver}
              variant="outline"
              fullWidth
              icon={<Phone size={18} color={colors.primary} />}
            />
            {canCancel && (
              <Button
                title="Cancel Ride"
                onPress={handleCancelRide}
                variant="danger"
                fullWidth
                loading={cancelling}
              />
            )}
          </View>
        </View>
      </BottomSheet>
    </View>
  );
}
