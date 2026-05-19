import { Button } from "@/components/common/Button";
import { DropoffMarker } from "@/components/map/DropoffMarker";
import { MapComponent, MapComponentRef } from "@/components/map/MapComponent";
import { PickupMarker } from "@/components/map/PickupMarker";
import { UserMarker } from "@/components/map/UserMarker";
import { useLocation } from "@/hooks/useLocation";
import { useTheme } from "@/hooks/useTheme";
import { auth, db } from "@/services/firebaseConfig";
import { Collections } from "@/types/database";
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
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { Flag, MapPin, Phone } from "lucide-react-native";
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
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";

const GPS_INTERVAL_MS = 5000;

interface Passenger {
  uid: string;
  name: string;
  phone: string;
  profilePhoto: string | null;
}

export default function DriverActiveRideScreen(): React.JSX.Element {
  const { colors, spacing, typography, borderRadius, shadows } = useTheme();
  const { rideId } = useLocalSearchParams<{ rideId: string }>();
  const { location } = useLocation(true);
  const mapRef = useRef<MapComponentRef>(null);
  const gpsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const locationRef = useRef(location);
  const passengerFetchedRef = useRef(false);

  const [ride, setRide] = useState<Ride | null>(null);
  const [passenger, setPassenger] = useState<Passenger | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  // GPS writes
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const writeLocation = async () => {
      const loc = locationRef.current;
      if (!loc) return;
      try {
        await setDoc(
          doc(db, Collections.DRIVER_LOCATIONS, uid),
          {
            driverId: uid,
            latitude: loc.latitude,
            longitude: loc.longitude,
            isOnline: true,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
      } catch (err) {
        console.error("GPS write error:", err);
      }
    };

    writeLocation();
    gpsIntervalRef.current = setInterval(writeLocation, GPS_INTERVAL_MS);

    return () => {
      if (gpsIntervalRef.current) clearInterval(gpsIntervalRef.current);
    };
  }, []);

  // Listen to ride document
  useEffect(() => {
    if (!rideId) return;

    const unsub = onSnapshot(doc(db, Collections.RIDES, rideId), (snap) => {
      if (!snap.exists()) return;
      const data = { rideId: snap.id, ...snap.data() } as Ride;
      setRide(data);

      // If ride was cancelled by passenger, go back
      if (
        data.status === "cancelled" &&
        data.cancelledBy !== auth.currentUser?.uid
      ) {
        showError("Ride Cancelled", "The passenger cancelled this ride.");
        router.replace("/(driver)");
      }
    });

    return unsub;
  }, [rideId]);

  // Fetch passenger once ride loads
  useEffect(() => {
    if (!ride?.passengerId || passengerFetchedRef.current) return;
    passengerFetchedRef.current = true;

    getDoc(doc(db, Collections.PASSENGERS, ride.passengerId))
      .then((snap) => {
        if (snap.exists()) setPassenger(snap.data() as Passenger);
      })
      .catch((err) => console.error("Failed to fetch passenger:", err));
  }, [ride?.passengerId]);

  // Center map on driver location
  useEffect(() => {
    if (location) {
      mapRef.current?.animateToRegion(
        {
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        },
        300,
      );
    }
  }, [location]);

  const handleCallPassenger = useCallback(() => {
    if (!passenger?.phone) return;
    Linking.openURL(`tel:${passenger.phone}`);
  }, [passenger]);

  const handleArrivedAtPickup = useCallback(async () => {
    if (!rideId) return;
    setActionLoading(true);
    try {
      await updateDoc(doc(db, Collections.RIDES, rideId), {
        status: "arrived",
        updatedAt: serverTimestamp(),
      });

      if (ride?.passengerId) {
        await addDoc(collection(db, Collections.NOTIFICATIONS), {
          userId: ride.passengerId,
          type: "driver_arrived",
          title: "Driver Arrived",
          body: "Your driver has arrived at the pickup point.",
          rideId,
          reportId: null,
          isRead: false,
          createdAt: serverTimestamp(),
        });
      }
    } catch (err) {
      showError("Error", "Could not update status");
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  }, [rideId, ride?.passengerId]);

  const handleStartTrip = useCallback(async () => {
    if (!rideId) return;
    setActionLoading(true);
    try {
      await updateDoc(doc(db, Collections.RIDES, rideId), {
        status: "in_progress",
        startedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      showError("Error", "Could not start trip");
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  }, [rideId]);

  const handleCompleteTrip = useCallback(async () => {
    if (!rideId || !ride) return;
    setActionLoading(true);
    try {
      await updateDoc(doc(db, Collections.RIDES, rideId), {
        status: "completed",
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await addDoc(collection(db, Collections.NOTIFICATIONS), {
        userId: ride.passengerId,
        type: "trip_complete",
        title: "Trip Complete",
        body: "Your trip has ended. Please proceed to payment.",
        rideId,
        reportId: null,
        isRead: false,
        createdAt: serverTimestamp(),
      });

      router.replace({
        pathname: "/(driver)/payment-collection",
        params: { rideId },
      });
    } catch (err) {
      showError("Error", "Could not complete trip");
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  }, [rideId, ride]);

  const handleCancelRide = useCallback(async () => {
    if (!rideId || !ride) return;
    setActionLoading(true);
    try {
      await updateDoc(doc(db, Collections.RIDES, rideId), {
        status: "cancelled",
        // driverId: null,
        // agreedFare: null,
        cancelledAt: serverTimestamp(),
        cancelledBy: auth.currentUser?.uid ?? null,
        cancellationReason: "Driver cancelled the ride",
        updatedAt: serverTimestamp(),
      });

      await addDoc(collection(db, Collections.NOTIFICATIONS), {
        userId: ride.passengerId,
        type: "ride_cancelled",
        title: "Ride Cancelled",
        body: "Your driver has cancelled the ride.",
        rideId,
        reportId: null,
        isRead: false,
        createdAt: serverTimestamp(),
      });

      router.replace("/(driver)");
    } catch (err) {
      showError("Error", "Could not cancel ride");
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  }, [rideId, ride]);

  const rideStatus = ride?.status ?? "accepted";

  const routeCoordinates = useMemo(() => {
    if (!location || !ride) return [];
    if (rideStatus === "accepted" || rideStatus === "arrived") {
      return [
        { latitude: location.latitude, longitude: location.longitude },
        {
          latitude: ride.pickupLocation.latitude,
          longitude: ride.pickupLocation.longitude,
        },
      ];
    }
    if (rideStatus === "in_progress") {
      return [
        { latitude: location.latitude, longitude: location.longitude },
        {
          latitude: ride.dropoffLocation.latitude,
          longitude: ride.dropoffLocation.longitude,
        },
      ];
    }
    return [];
  }, [location, ride, rideStatus]);

  const getStatusLabel = (): { text: string; color: string } => {
    switch (rideStatus) {
      case "accepted":
        return { text: "Heading to Pickup", color: colors.primary };
      case "arrived":
        return { text: "Waiting for Passenger", color: colors.warning };
      case "in_progress":
        return { text: "Trip in Progress", color: colors.success };
      default:
        return { text: "Active Ride", color: colors.primary };
    }
  };

  const statusInfo = getStatusLabel();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    map: {
      flex: 1,
    },
    emptyContainer: {
      flex: 1,
      backgroundColor: colors.background,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyText: {
      fontSize: typography.sizes.base,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.textSecondary,
    },
    bottomPanel: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: colors.surface,
      borderTopLeftRadius: borderRadius.xl,
      borderTopRightRadius: borderRadius.xl,
      maxHeight: "50%",
      ...shadows.large,
    },
    handleBar: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: "center",
      marginTop: spacing.sm,
      marginBottom: spacing.xs,
    },
    panelContent: {
      paddingHorizontal: spacing.screenPadding,
      paddingBottom: spacing.xl,
    },
    statusLabel: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyMedium,
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginBottom: spacing.sm,
      marginTop: spacing.xs,
    },
    passengerRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: spacing.md,
      gap: spacing.md,
    },
    photo: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.backgroundAlt,
    },
    photoPlaceholder: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.backgroundAlt,
      alignItems: "center",
      justifyContent: "center",
    },
    photoInitial: {
      fontSize: typography.sizes.base,
      fontFamily: typography.fonts.headingSemiBold,
      color: colors.textMuted,
    },
    passengerName: {
      fontSize: typography.sizes.base,
      fontFamily: typography.fonts.headingSemiBold,
      color: colors.textPrimary,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: spacing.sm,
    },
    locationRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    locationText: {
      flex: 1,
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.textSecondary,
    },
    fareRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      marginTop: spacing.sm,
      marginBottom: spacing.md,
    },
    fareLabel: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.textSecondary,
    },
    fareAmount: {
      fontSize: typography.sizes.lg,
      fontFamily: typography.fonts.heading,
      color: colors.textPrimary,
    },
    buttons: {
      gap: spacing.sm,
    },
  });

  if (!ride) {
    return (
      <View style={styles.emptyContainer}>
        <StatusBar barStyle="dark-content" />
        <Text style={styles.emptyText}>Loading ride...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <MapComponent
        ref={mapRef}
        style={styles.map}
        showUserLocation={false}
        showsMyLocationButton={false}
        routeCoordinates={routeCoordinates}
      >
        {location && (
          <UserMarker
            coordinate={{
              latitude: location.latitude,
              longitude: location.longitude,
            }}
          />
        )}
        <PickupMarker
          coordinate={{
            latitude: ride.pickupLocation.latitude,
            longitude: ride.pickupLocation.longitude,
          }}
          address={ride.pickupLocation.address}
        />
        <DropoffMarker
          coordinate={{
            latitude: ride.dropoffLocation.latitude,
            longitude: ride.dropoffLocation.longitude,
          }}
          address={ride.dropoffLocation.address}
        />
      </MapComponent>

      {/* Bottom panel */}
      <View style={styles.bottomPanel}>
        <View style={styles.handleBar} />
        <ScrollView
          contentContainerStyle={styles.panelContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Status */}
          <Text style={[styles.statusLabel, { color: statusInfo.color }]}>
            {statusInfo.text}
          </Text>

          {/* Passenger info */}
          <View style={styles.passengerRow}>
            {passenger?.profilePhoto ? (
              <Image
                source={{ uri: passenger.profilePhoto }}
                style={styles.photo}
              />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Text style={styles.photoInitial}>
                  {passenger?.name?.charAt(0).toUpperCase() ?? "?"}
                </Text>
              </View>
            )}
            <Text style={styles.passengerName}>
              {passenger?.name ?? "Passenger"}
            </Text>
          </View>

          <View style={styles.divider} />

          {/* Pickup — shown before in_progress */}
          {rideStatus !== "in_progress" && (
            <View style={styles.locationRow}>
              <MapPin size={16} color={colors.primary} />
              <Text style={styles.locationText} numberOfLines={2}>
                {ride.pickupLocation.address}
              </Text>
            </View>
          )}

          {/* Destination */}
          <View style={styles.locationRow}>
            <Flag size={16} color={colors.error} />
            <Text style={styles.locationText} numberOfLines={2}>
              {ride.dropoffLocation.address}
            </Text>
          </View>

          {/* Fare */}
          <View style={styles.fareRow}>
            <Text style={styles.fareLabel}>Agreed fare</Text>
            <Text style={styles.fareAmount}>
              ₦{ride.agreedFare?.toLocaleString() ?? "—"}
            </Text>
          </View>

          {/* Action buttons */}
          <View style={styles.buttons}>
            {rideStatus !== "in_progress" && (
              <Button
                title="Call Passenger"
                onPress={handleCallPassenger}
                variant="outline"
                fullWidth
                disabled={!passenger?.phone}
                icon={<Phone size={18} color={colors.primary} />}
              />
            )}

            {rideStatus === "accepted" && (
              <Button
                title="Arrived at Pickup"
                onPress={handleArrivedAtPickup}
                variant="primary"
                fullWidth
                loading={actionLoading}
              />
            )}

            {rideStatus === "arrived" && (
              <Button
                title="Start Trip"
                onPress={handleStartTrip}
                variant="primary"
                fullWidth
                loading={actionLoading}
              />
            )}

            {rideStatus === "in_progress" && (
              <Button
                title="Complete Trip"
                onPress={handleCompleteTrip}
                variant="primary"
                fullWidth
                loading={actionLoading}
              />
            )}

            {/* Cancel — only before trip starts */}
            {(rideStatus === "accepted" || rideStatus === "arrived") && (
              <Button
                title="Cancel Ride"
                onPress={handleCancelRide}
                variant="danger"
                fullWidth
                loading={actionLoading}
              />
            )}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}
