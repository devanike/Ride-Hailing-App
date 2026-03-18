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
import BottomSheet from "@gorhom/bottom-sheet";
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
  const { colors, spacing, typography } = useTheme();
  const mapRef = useRef<MapComponentRef>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["30%", "55%"], []);

  const { rideId } = useLocalSearchParams<{ rideId: string }>();

  const [ride, setRide] = useState<Ride | null>(null);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  const driverFetchedRef = useRef(false);

  // Listen to ride status
  useEffect(() => {
    if (!rideId) return;

    const unsub = onSnapshot(
      doc(db, Collections.RIDES, rideId),
      async (snap) => {
        if (!snap.exists()) return;
        const rideData = snap.data() as Ride;
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
            pathname: "/payment",
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

  // Listen to driver location
  useEffect(() => {
    if (!ride?.driverId) return;

    const unsub = onSnapshot(
      doc(db, Collections.DRIVER_LOCATIONS, ride.driverId),
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        const loc: DriverLocation = {
          latitude: data.latitude,
          longitude: data.longitude,
          isOnline: data.isOnline ?? true,
        };
        setDriverLocation(loc);
      },
    );

    return unsub;
  }, [ride?.driverId]);

  // Pan map to driver as they move
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

  // Route polyline: driver → dropoff
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
    sheetContent: {
      flex: 1,
      paddingHorizontal: spacing.screenPadding,
      paddingBottom: spacing.xl,
    },
    statusLabel: {
      fontSize: typography.sizes.xs,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.primary,
      textTransform: "uppercase",
      letterSpacing: 1,
      paddingTop: spacing.xs,
      paddingBottom: spacing.md,
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

      <BottomSheet
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        index={0}
        backgroundStyle={{ backgroundColor: colors.surface }}
        handleIndicatorStyle={{ backgroundColor: colors.border }}
        enablePanDownToClose={false}
      >
        <View style={styles.sheetContent}>
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
            <Text style={styles.driverName}>
              {driver?.name ?? "Your driver"}
            </Text>
          </View>

          <View style={styles.divider} />

          <Text style={styles.label}>Destination</Text>
          <Text style={styles.address} numberOfLines={2}>
            {ride?.dropoffLocation?.address ?? "—"}
          </Text>

          <View style={styles.fareRow}>
            <Text style={styles.fareLabel}>Agreed fare</Text>
            <Text style={styles.fareAmount}>
              NGN {ride?.agreedFare?.toLocaleString() ?? "—"}
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
      </BottomSheet>
    </View>
  );
}
