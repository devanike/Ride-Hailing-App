import { Button } from "@/components/common/Button";
import { RideRequestModal } from "@/components/driver/RideRequestModal";
import { MapComponent, MapComponentRef } from "@/components/map/MapComponent";
import { UserMarker } from "@/components/map/UserMarker";
import { useLocation } from "@/hooks/useLocation";
import { useTheme } from "@/hooks/useTheme";
import { auth, db } from "@/services/firebaseConfig";
import { calculateDistance } from "@/services/locationService";
import { Collections, SubCollections } from "@/types/database";
import { Driver } from "@/types/driver";
import { Ride } from "@/types/ride";
import { showError } from "@/utils/toast";
import { router } from "expo-router";
import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const GPS_INTERVAL_MS = 5000;
const NEARBY_RADIUS_KM = 5;

export default function DriverHomeScreen(): React.JSX.Element {
  const { colors, spacing, typography, borderRadius, shadows } = useTheme();
  const mapRef = useRef<MapComponentRef>(null);
  const { location } = useLocation();

  const [driver, setDriver] = useState<Driver | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [todayTrips, setTodayTrips] = useState(0);
  const [todayEarnings, setTodayEarnings] = useState(0);

  const [pendingRide, setPendingRide] = useState<Ride | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const gpsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rideUnsubRef = useRef<(() => void) | null>(null);
  const locationRef = useRef(location);

  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  // Load driver document
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const unsub = onSnapshot(doc(db, Collections.DRIVERS, uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as Driver;
        setDriver(data);
        setIsOnline(data.isOnline ?? false);
      }
    });

    return unsub;
  }, []);

  // Load today's earnings summary
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const q = query(
      collection(db, Collections.EARNINGS),
      where("driverId", "==", uid),
    );

    const unsub = onSnapshot(q, (snapshot) => {
      let trips = 0;
      let earnings = 0;
      snapshot.forEach((d) => {
        const data = d.data();
        const created = data.createdAt?.toDate?.();
        if (created && created >= startOfDay) {
          trips++;
          earnings += data.amount ?? 0;
        }
      });
      setTodayTrips(trips);
      setTodayEarnings(earnings);
    });

    return unsub;
  }, []);

  // Start GPS writes to driverLocations
  const startGPS = useCallback((uid: string) => {
    if (gpsIntervalRef.current) clearInterval(gpsIntervalRef.current);

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
  }, []);

  const stopGPS = useCallback(async (uid: string) => {
    if (gpsIntervalRef.current) {
      clearInterval(gpsIntervalRef.current);
      gpsIntervalRef.current = null;
    }
    try {
      await setDoc(
        doc(db, Collections.DRIVER_LOCATIONS, uid),
        { isOnline: false, updatedAt: serverTimestamp() },
        { merge: true },
      );
    } catch (err) {
      console.error("GPS stop error:", err);
    }
  }, []);

  // Listen for nearby pending ride requests
  const startListening = useCallback((uid: string) => {
    if (rideUnsubRef.current) rideUnsubRef.current();

    const q = query(
      collection(db, Collections.RIDES),
      where("status", "==", "pending"),
    );

    rideUnsubRef.current = onSnapshot(q, (snapshot) => {
      const loc = locationRef.current;
      if (!loc) return;

      // Find first eligible ride
      for (const docSnap of snapshot.docs) {
        const ride = { rideId: docSnap.id, ...docSnap.data() } as Ride;

        // Skip if driver already declined
        if (ride.declinedBy?.includes(uid)) continue;

        // Skip if ride already assigned
        if (ride.driverId) continue;

        const dist = calculateDistance(
          { latitude: loc.latitude, longitude: loc.longitude },
          {
            latitude: ride.pickupLocation.latitude,
            longitude: ride.pickupLocation.longitude,
          },
        );

        if (dist <= NEARBY_RADIUS_KM) {
          setPendingRide(ride);
          setModalVisible(true);
          return;
        }
      }
    });
  }, []);

  const stopListening = useCallback(() => {
    if (rideUnsubRef.current) {
      rideUnsubRef.current();
      rideUnsubRef.current = null;
    }
    setPendingRide(null);
    setModalVisible(false);
  }, []);

  // Toggle online/offline
  const handleToggleOnline = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid || toggling) return;

    setToggling(true);
    try {
      const next = !isOnline;
      await updateDoc(doc(db, Collections.DRIVERS, uid), {
        isOnline: next,
        updatedAt: serverTimestamp(),
      });

      if (next) {
        startGPS(uid);
        startListening(uid);
      } else {
        await stopGPS(uid);
        stopListening();
      }

      setIsOnline(next);
    } catch (err) {
      showError("Error", "Failed to update online status");
      console.error("Toggle online error:", err);
    } finally {
      setToggling(false);
    }
  }, [isOnline, toggling, startGPS, stopGPS, startListening, stopListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (gpsIntervalRef.current) clearInterval(gpsIntervalRef.current);
      if (rideUnsubRef.current) rideUnsubRef.current();
    };
  }, []);

  // Center map on location
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

  // Ride request handlers
  const handleAccept = useCallback(
    async (fare: number) => {
      const uid = auth.currentUser?.uid;
      if (!pendingRide || !uid) return;

      setModalVisible(false);
      stopListening();

      try {
        await updateDoc(doc(db, Collections.RIDES, pendingRide.rideId), {
          status: "accepted",
          driverId: uid,
          agreedFare: fare,
          acceptedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        await addDoc(collection(db, Collections.NOTIFICATIONS), {
          userId: pendingRide.passengerId,
          type: "driver_on_way",
          title: "Driver On The Way",
          body: "Your driver accepted and is heading to you",
          rideId: pendingRide.rideId,
          reportId: null,
          isRead: false,
          createdAt: serverTimestamp(),
        });

        router.push({
          pathname: "/(driver)/active-ride",
          params: { rideId: pendingRide.rideId },
        });
      } catch (err) {
        showError("Error", "Failed to accept ride");
        console.error("Accept ride error:", err);
        if (uid) startListening(uid);
      }
    },
    [pendingRide, stopListening, startListening],
  );

  const handleBid = useCallback(
    async (amount: number) => {
      const uid = auth.currentUser?.uid;
      if (!pendingRide || !uid) return;

      setModalVisible(false);

      try {
        const bidRef = collection(
          db,
          Collections.RIDES,
          pendingRide.rideId,
          SubCollections.BIDS,
        );

        await addDoc(bidRef, {
          rideId: pendingRide.rideId,
          driverId: uid,
          amount,
          estimatedArrival: 5,
          createdAt: serverTimestamp(),
          expiresAt: serverTimestamp(),
        });

        await addDoc(collection(db, Collections.NOTIFICATIONS), {
          userId: pendingRide.passengerId,
          type: "new_offer",
          title: "New Offer",
          body: "A driver made you a counter-offer",
          rideId: pendingRide.rideId,
          reportId: null,
          isRead: false,
          createdAt: serverTimestamp(),
        });

        setPendingRide(null);
        // Keep listening for other requests
      } catch (err) {
        showError("Error", "Failed to submit bid");
        console.error("Submit bid error:", err);
      }
    },
    [pendingRide],
  );

  const handleDecline = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!pendingRide || !uid) return;

    setModalVisible(false);
    setPendingRide(null);

    try {
      await updateDoc(doc(db, Collections.RIDES, pendingRide.rideId), {
        declinedBy: arrayUnion(uid),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Decline ride error:", err);
    }
  }, [pendingRide]);

  const isActive = driver?.status === "active";

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    map: {
      flex: 1,
    },
    topBarWrapper: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10,
    },
    safeArea: {
      backgroundColor: "transparent",
    },
    topBar: {
      marginHorizontal: spacing.md,
      marginTop: spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      ...shadows.medium,
    },
    toggleButton: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
      borderRadius: borderRadius.full,
      minWidth: 110,
      alignItems: "center",
      justifyContent: "center",
    },
    toggleOnline: {
      backgroundColor: colors.success,
    },
    toggleOffline: {
      backgroundColor: colors.textMuted,
    },
    toggleText: {
      fontSize: typography.sizes.base,
      fontFamily: typography.fonts.headingSemiBold,
      color: colors.textInverse,
    },
    summaryGroup: {
      alignItems: "flex-end",
      gap: 2,
    },
    summaryText: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.textSecondary,
    },
    summaryValue: {
      fontSize: typography.sizes.md,
      fontFamily: typography.fonts.headingSemiBold,
      color: colors.textPrimary,
    },
    banner: {
      marginHorizontal: spacing.md,
      marginTop: spacing.sm,
      backgroundColor: colors.warningBackground,
      borderRadius: borderRadius.md,
      padding: spacing.md,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      ...shadows.small,
    },
    bannerText: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.warning,
      flex: 1,
      marginRight: spacing.sm,
    },
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <MapComponent
        ref={mapRef}
        style={styles.map}
        showUserLocation={false}
        showsMyLocationButton={false}
      >
        {location && (
          <UserMarker
            coordinate={{
              latitude: location.latitude,
              longitude: location.longitude,
            }}
          />
        )}
      </MapComponent>

      {/* Top overlay */}
      <View style={styles.topBarWrapper}>
        <SafeAreaView style={styles.safeArea} edges={["top"]}>
          <View style={styles.topBar}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                isOnline ? styles.toggleOnline : styles.toggleOffline,
              ]}
              onPress={handleToggleOnline}
              disabled={toggling || !isActive}
              activeOpacity={0.85}
            >
              {toggling ? (
                <ActivityIndicator color={colors.textInverse} size="small" />
              ) : (
                <Text style={styles.toggleText}>
                  {isOnline ? "Online" : "Offline"}
                </Text>
              )}
            </TouchableOpacity>

            <View style={styles.summaryGroup}>
              <Text style={styles.summaryText}>
                {todayTrips} {todayTrips === 1 ? "trip" : "trips"} today
              </Text>
              <Text style={styles.summaryValue}>
                NGN {todayEarnings.toLocaleString()}
              </Text>
            </View>
          </View>

          {/* Incomplete registration banner */}
          {!isActive && (
            <View style={styles.banner}>
              <Text style={styles.bannerText}>
                Complete your registration to go online
              </Text>
              <Button
                title="Register"
                onPress={() => router.push("/(auth)/driver-registration")}
                variant="primary"
                size="small"
              />
            </View>
          )}
        </SafeAreaView>
      </View>

      {/* Ride request modal */}
      {pendingRide && (
        <RideRequestModal
          ride={pendingRide}
          distanceToPickup={
            location && pendingRide.pickupLocation
              ? calculateDistance(
                  {
                    latitude: location.latitude,
                    longitude: location.longitude,
                  },
                  {
                    latitude: pendingRide.pickupLocation.latitude,
                    longitude: pendingRide.pickupLocation.longitude,
                  },
                )
              : 0
          }
          onAccept={handleAccept}
          onBid={handleBid}
          onDecline={handleDecline}
          visible={modalVisible}
        />
      )}
    </View>
  );
}
