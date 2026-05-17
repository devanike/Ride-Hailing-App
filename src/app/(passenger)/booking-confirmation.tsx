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
import { router, useLocalSearchParams } from "expo-router";
import {
  addDoc,
  collection,
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

const CANCEL_WINDOW_MS = 2 * 60 * 1000;

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
  const { colors, spacing, typography, borderRadius, shadows } = useTheme();
  const mapRef = useRef<MapComponentRef>(null);

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

  useEffect(() => {
    if (!rideId) return;

    const unsub = onSnapshot(
      doc(db, Collections.RIDES, rideId),
      async (snap) => {
        if (!snap.exists()) return;
        const rideData = { rideId: snap.id, ...snap.data() } as Ride;
        setRide(rideData);

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
    const minutes = Math.max(1, Math.round((distKm / 20) * 60));
    setEta(minutes);
  }, [driverLocation, ride?.pickupLocation]);

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

      // Notify the driver
      if (ride?.driverId) {
        await addDoc(collection(db, Collections.NOTIFICATIONS), {
          userId: ride.driverId,
          type: "ride_cancelled",
          title: "Ride Cancelled",
          body: "The passenger has cancelled the ride.",
          rideId,
          reportId: null,
          isRead: false,
          createdAt: serverTimestamp(),
        });
      }

      router.replace("/(passenger)");
    } catch (err) {
      console.error("Failed to cancel ride:", err);
      showError("Failed to cancel", "Please try again.");
      setCancelling(false);
    }
  }, [rideId, canCancel, ride?.driverId]);

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
    loadingContainer: {
      flex: 1,
      backgroundColor: colors.background,
      alignItems: "center",
      justifyContent: "center",
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
      paddingBottom: spacing.xl,
      ...shadows.large,
    },
    handleBar: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: "center",
      marginBottom: spacing.md,
    },
    driverRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: spacing.md,
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
    vehicleText: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.textMuted,
      marginBottom: spacing.md,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginBottom: spacing.md,
    },
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
    actions: {
      gap: spacing.sm,
      marginTop: spacing.xs,
    },
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" />
        <LoadingSpinner message="Loading booking details..." />
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

      <View style={styles.bottomPanel}>
        <View style={styles.handleBar} />

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

        {driver && (
          <Text style={styles.vehicleText}>{getVehicleLabel(driver)}</Text>
        )}

        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Agreed fare</Text>
          <Text style={styles.infoValue}>
            ₦{ride?.agreedFare?.toLocaleString() ?? "—"}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>ETA</Text>
          <Text style={styles.infoValue}>
            {eta !== null ? `${eta} min` : "Calculating..."}
          </Text>
        </View>

        <View style={styles.divider} />

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
    </View>
  );
}
