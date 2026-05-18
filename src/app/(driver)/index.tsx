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
import { showError, showSuccess } from "@/utils/toast";
import { router, useFocusEffect } from "expo-router";
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

  const { location, requestPermission, hasPermission } = useLocation(true);

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
  const driverRef = useRef(driver);
  const modalVisibleRef = useRef(false);
  const bidOnRidesRef = useRef<Set<string>>(new Set());
  // Track if we need to start listening once location arrives
  const pendingListenUidRef = useRef<string | null>(null);

  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  useEffect(() => {
    driverRef.current = driver;
  }, [driver]);

  useEffect(() => {
    modalVisibleRef.current = modalVisible;
  }, [modalVisible]);

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

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

  // Load today earnings summary
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

  // Start GPS writes
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
    if (rideUnsubRef.current) {
      rideUnsubRef.current();
      rideUnsubRef.current = null;
    }

    // If location isn't ready yet, defer
    if (!locationRef.current) {
      console.log("Location not ready, deferring listener start");
      pendingListenUidRef.current = uid;
      return;
    }

    console.log("=== Starting ride listener for uid:", uid, "===");

    const q = query(
      collection(db, Collections.RIDES),
      where("status", "==", "pending"),
    );

    rideUnsubRef.current = onSnapshot(
      q,
      (snapshot) => {
        console.log("Pending rides found:", snapshot.docs.length);

        const loc = locationRef.current;
        if (!loc) {
          console.log("No driver location in callback");
          return;
        }

        if (modalVisibleRef.current) {
          console.log("Modal already visible, skipping");
          return;
        }

        for (const docSnap of snapshot.docs) {
          const ride = { rideId: docSnap.id, ...docSnap.data() } as Ride;

          if (ride.declinedBy?.includes(uid)) continue;
          if (ride.driverId) continue;
          if (bidOnRidesRef.current.has(ride.rideId)) continue;

          if (
            ride.requiredVehicleType &&
            driverRef.current?.vehicleType !== ride.requiredVehicleType
          )
            continue;

          const dist = calculateDistance(
            { latitude: loc.latitude, longitude: loc.longitude },
            {
              latitude: ride.pickupLocation.latitude,
              longitude: ride.pickupLocation.longitude,
            },
          );

          console.log("Ride:", ride.rideId, "distance:", dist.toFixed(2), "km");

          if (dist <= NEARBY_RADIUS_KM) {
            console.log("✅ SHOWING ride request!");
            setPendingRide(ride);
            setModalVisible(true);
            return;
          }
        }

        console.log("No matching rides found");
      },
      (error) => {
        console.error("Ride listener error:", error);
      },
    );
  }, []);

  // If location arrives and we have a pending listen request, start it
  useEffect(() => {
    if (location && pendingListenUidRef.current) {
      const uid = pendingListenUidRef.current;
      pendingListenUidRef.current = null;
      console.log("Location arrived, starting deferred listener for:", uid);
      startListening(uid);
    }
  }, [location, startListening]);

  const stopListening = useCallback(() => {
    if (rideUnsubRef.current) {
      rideUnsubRef.current();
      rideUnsubRef.current = null;
    }
    pendingListenUidRef.current = null;
    setPendingRide(null);
    setModalVisible(false);
  }, []);

  // Toggle online / offline
  const handleToggleOnline = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid || toggling) return;

    if (!isOnline && !locationRef.current) {
      showError(
        "Location needed",
        "Waiting for your location. Please try again in a moment.",
      );
      return;
    }

    setToggling(true);
    try {
      const next = !isOnline;
      await updateDoc(doc(db, Collections.DRIVERS, uid), {
        isOnline: next,
        updatedAt: serverTimestamp(),
      });

      if (next) {
        bidOnRidesRef.current.clear();
        startGPS(uid);
        startListening(uid);
      } else {
        await stopGPS(uid);
        stopListening();
        bidOnRidesRef.current.clear();
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

  // Accept the passenger's proposed fare directly
  const handleAccept = useCallback(
    async (fare: number) => {
      const uid = auth.currentUser?.uid;
      if (!pendingRide || !uid) return;

      setModalVisible(false);
      setPendingRide(null);

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

        bidOnRidesRef.current.clear();

        router.push({
          pathname: "/(driver)/active-ride",
          params: { rideId: pendingRide.rideId },
        });
      } catch (err) {
        showError("Error", "Failed to accept ride");
        console.error("Accept ride error:", err);
      }
    },
    [pendingRide],
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

        bidOnRidesRef.current.add(pendingRide.rideId);
        setPendingRide(null);
        showSuccess(
          "Bid Sent",
          `Your counter-offer of ₦${amount.toLocaleString()} has been sent.`,
        );
      } catch (err) {
        showError("Error", "Failed to submit bid");
        console.error("Submit bid error:", err);
      }
    },
    [pendingRide],
  );

  // Decline the ride request
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

    startListening(uid);
  }, [pendingRide, startListening]);

  // Check for existing active ride on mount
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const q = query(
      collection(db, Collections.RIDES),
      where("driverId", "==", uid),
      where("status", "in", ["accepted", "arrived", "in_progress"]),
    );

    const unsub = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const activeRides = snapshot.docs
          .map((d) => ({ rideId: d.id, ...d.data() }) as Ride)
          .filter((r) => {
            if (r.paymentStatus === "completed") return false;
            if (r.completedAt) return false;
            if (r.cancelledAt) return false;
            return true;
          });

        if (activeRides.length > 0) {
          router.push({
            pathname: "/(driver)/active-ride",
            params: { rideId: activeRides[0].rideId },
          });
        }
      }
    });

    return unsub;
  }, []);

  // Restart ride listener when screen regains focus and driver is online
  useFocusEffect(
    useCallback(() => {
      const uid = auth.currentUser?.uid;
      if (!uid || !isOnline) return;

      bidOnRidesRef.current.clear();
      console.log("Screen focused, clearing bid history");

      // Start listening — if location isn't ready, startListening will defer
      startListening(uid);
    }, [isOnline, startListening]),
  );

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

      {driver?.status === "suspended" && (
        <View
          style={{
            marginHorizontal: spacing.md,
            marginTop: spacing.sm,
            backgroundColor: colors.error,
            borderRadius: borderRadius.md,
            padding: spacing.md,
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
