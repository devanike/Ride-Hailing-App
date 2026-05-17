import { Button } from "@/components/common/Button";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { DriverMarker } from "@/components/map/DriverMarker";
import { DropoffMarker } from "@/components/map/DropoffMarker";
import { MapComponent, MapComponentRef } from "@/components/map/MapComponent";
import { useTheme } from "@/hooks/useTheme";
import { db } from "@/services/firebaseConfig";
import { Collections } from "@/types/database";
import { Driver } from "@/types/driver";
import { Ride } from "@/types/ride";
import { router, useLocalSearchParams } from "expo-router";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { Phone } from "lucide-react-native";
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

interface DriverLocation {
  latitude: number;
  longitude: number;
  isOnline: boolean;
}

export default function ActiveRideScreen(): React.JSX.Element {
  const { colors, spacing, typography, borderRadius, shadows } = useTheme();
  const mapRef = useRef<MapComponentRef>(null);

  const { rideId } = useLocalSearchParams<{ rideId: string }>();

  const [ride, setRide] = useState<Ride | null>(null);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  const driverFetchedRef = useRef(false);

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

        setLoading(false);

        if (rideData.status === "completed") {
          router.replace({
            pathname: "/(passenger)/payment",
            params: { rideId },
          });
        }

        if (rideData.status === "cancelled") {
          router.replace("/(passenger)");
        }
      },
    );

    return unsub;
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

  const mapInitialRegion = useMemo(() => {
    if (ride?.dropoffLocation) {
      return {
        latitude: ride.dropoffLocation.latitude,
        longitude: ride.dropoffLocation.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      };
    }
    return undefined;
  }, [ride?.dropoffLocation]);

  const routeCoordinates = useMemo(() => {
    if (!driverLocation || !ride?.dropoffLocation) return [];
    return [
      {
        latitude: driverLocation.latitude,
        longitude: driverLocation.longitude,
      },
      {
        latitude: ride.dropoffLocation.latitude,
        longitude: ride.dropoffLocation.longitude,
      },
    ];
  }, [driverLocation, ride?.dropoffLocation]);

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

    // Bottom panel
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

    statusLabel: {
      fontSize: typography.sizes.xs,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.primary,
      textTransform: "uppercase",
      letterSpacing: 1,
      marginBottom: spacing.md,
    },
    driverRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: spacing.md,
    },
    driverPhoto: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.backgroundAlt,
    },
    driverPhotoPlaceholder: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.backgroundAlt,
      alignItems: "center",
      justifyContent: "center",
    },
    driverInitial: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.headingSemiBold,
      color: colors.textMuted,
    },
    driverName: {
      fontSize: typography.sizes.base,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.textPrimary,
      marginLeft: spacing.sm,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginBottom: spacing.md,
    },
    label: {
      fontSize: typography.sizes.xs,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.textMuted,
      marginBottom: 2,
    },
    address: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.textPrimary,
      marginBottom: spacing.md,
    },
    fareRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: spacing.lg,
    },
    fareLabel: {
      fontSize: typography.sizes.base,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.textSecondary,
    },
    fareAmount: {
      fontSize: typography.sizes.base,
      fontFamily: typography.fonts.headingSemiBold,
      color: colors.textPrimary,
    },
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" />
        <LoadingSpinner message="Loading trip details..." />
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
        routeCoordinates={routeCoordinates}
      >
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

      {/* Bottom panel */}
      <View style={styles.bottomPanel}>
        <View style={styles.handleBar} />

        <Text style={styles.statusLabel}>Trip in Progress</Text>

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
          <Text style={styles.driverName}>{driver?.name ?? "Your driver"}</Text>
        </View>

        <View style={styles.divider} />

        <Text style={styles.label}>Destination</Text>
        <Text style={styles.address} numberOfLines={2}>
          {ride?.dropoffLocation?.address ?? "—"}
        </Text>

        <View style={styles.fareRow}>
          <Text style={styles.fareLabel}>Agreed fare</Text>
          <Text style={styles.fareAmount}>
            ₦{ride?.agreedFare?.toLocaleString() ?? "—"}
          </Text>
        </View>

        <Button
          title="Call Driver"
          onPress={handleCallDriver}
          variant="outline"
          fullWidth
          icon={<Phone size={18} color={colors.primary} />}
        />
      </View>
    </View>
  );
}
