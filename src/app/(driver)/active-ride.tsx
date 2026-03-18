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
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
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
import { Flag, MapPin } from "lucide-react-native";
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

const GPS_INTERVAL_MS = 5000;

interface Passenger {
  uid: string;
  name: string;
  phone: string;
  profilePhoto: string | null;
}

export default function DriverActiveRideScreen(): React.JSX.Element {
  const { colors, spacing, typography } = useTheme();
  const { rideId } = useLocalSearchParams<{ rideId: string }>();
  const { location } = useLocation();
  const mapRef = useRef<MapComponentRef>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);
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
    } catch (err) {
      showError("Error", "Could not update status");
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  }, [rideId]);

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

  const snapPoints = useMemo(() => ["35%", "55%"], []);

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

  const styles = StyleSheet.create({
    container: { flex: 1 },
    map: { flex: 1 },
    sheetContent: {
      flex: 1,
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
    indicator: {
      backgroundColor: colors.border,
    },
  });

  if (!ride) return <View style={styles.container} />;

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

      <BottomSheet
        ref={bottomSheetRef}
        index={0}
        snapPoints={snapPoints}
        backgroundStyle={{ backgroundColor: colors.surface }}
        handleIndicatorStyle={styles.indicator}
        enablePanDownToClose={false}
      >
        <BottomSheetScrollView
          contentContainerStyle={styles.sheetContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Status label */}
          {rideStatus === "accepted" && (
            <Text style={[styles.statusLabel, { color: colors.primary }]}>
              Heading to Pickup
            </Text>
          )}
          {rideStatus === "arrived" && (
            <Text style={[styles.statusLabel, { color: colors.warning }]}>
              Waiting for Passenger
            </Text>
          )}
          {rideStatus === "in_progress" && (
            <Text style={[styles.statusLabel, { color: colors.success }]}>
              Trip in Progress
            </Text>
          )}

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

          {/* Pickup — shown before in_progress */}
          {rideStatus !== "in_progress" && (
            <View style={styles.locationRow}>
              <MapPin size={16} color={colors.primary} />
              <Text style={styles.locationText} numberOfLines={2}>
                {ride.pickupLocation.address}
              </Text>
            </View>
          )}

          {/* Destination — always shown */}
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
              NGN {ride.agreedFare?.toLocaleString() ?? "—"}
            </Text>
          </View>

          {/* Actions */}
          <View style={styles.buttons}>
            <Button
              title="Call Passenger"
              onPress={handleCallPassenger}
              variant="outline"
              fullWidth
              disabled={!passenger?.phone}
            />

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
          </View>
        </BottomSheetScrollView>
      </BottomSheet>
    </View>
  );
}
