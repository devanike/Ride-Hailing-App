import { Button } from "@/components/common/Button";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { DropoffMarker } from "@/components/map/DropoffMarker";
import { MapComponent, MapComponentRef } from "@/components/map/MapComponent";
import { PickupMarker } from "@/components/map/PickupMarker";
import { useTheme } from "@/hooks/useTheme";
import { auth, db } from "@/services/firebaseConfig";
import { Collections, SubCollections } from "@/types/database";
import { Driver, VehicleType } from "@/types/driver";
import { Bid } from "@/types/ride";
import { showError, showSuccess } from "@/utils/toast";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { Star, X } from "lucide-react-native";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface BidWithDriver extends Bid {
  driver: Driver | null;
}

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

export default function DriverOffersScreen(): React.JSX.Element {
  const { colors, spacing, typography, borderRadius, shadows } = useTheme();
  const mapRef = useRef<MapComponentRef>(null);

  const {
    pickupAddress,
    pickupLat,
    pickupLng,
    destinationAddress,
    destinationLat,
    destinationLng,
    proposedFare,
    vehicleType,
    passengerCount,
    rideId: existingRideId,
    existingRide,
  } = useLocalSearchParams<{
    pickupAddress: string;
    pickupLat: string;
    pickupLng: string;
    destinationAddress: string;
    destinationLat: string;
    destinationLng: string;
    proposedFare: string;
    vehicleType: string;
    passengerCount: string;
    rideId?: string;
    existingRide?: string;
  }>();

  const pickup = useMemo(
    () => ({
      latitude: parseFloat(pickupLat ?? "7.4453"),
      longitude: parseFloat(pickupLng ?? "3.8993"),
    }),
    [pickupLat, pickupLng],
  );

  const destination = useMemo(
    () => ({
      latitude: parseFloat(destinationLat ?? "7.4453"),
      longitude: parseFloat(destinationLng ?? "3.8993"),
    }),
    [destinationLat, destinationLng],
  );

  const [rideId, setRideId] = useState<string | null>(null);
  const [bids, setBids] = useState<BidWithDriver[]>([]);
  const [creating, setCreating] = useState(true);
  const [timedOut, setTimedOut] = useState(false);
  const [acceptingBidId, setAcceptingBidId] = useState<string | null>(null);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rideCreatedRef = useRef(false);
  const currentParamsRef = useRef("");

  const paramsRef = useRef({
    pickupAddress: pickupAddress ?? "",
    pickupLat: parseFloat(pickupLat ?? "7.4453"),
    pickupLng: parseFloat(pickupLng ?? "3.8993"),
    destinationAddress: destinationAddress ?? "",
    destinationLat: parseFloat(destinationLat ?? "7.4453"),
    destinationLng: parseFloat(destinationLng ?? "3.8993"),
    proposedFare: parseFloat(proposedFare ?? "0"),
    requiredVehicleType: (vehicleType as VehicleType) || null,
    passengerCount: parseInt(passengerCount ?? "1", 10) || 1,
    existingRide: existingRide ?? "",
    existingRideId: existingRideId ?? "",
  });

  // Keep paramsRef in sync
  useEffect(() => {
    paramsRef.current = {
      pickupAddress: pickupAddress ?? "",
      pickupLat: parseFloat(pickupLat ?? "7.4453"),
      pickupLng: parseFloat(pickupLng ?? "3.8993"),
      destinationAddress: destinationAddress ?? "",
      destinationLat: parseFloat(destinationLat ?? "7.4453"),
      destinationLng: parseFloat(destinationLng ?? "3.8993"),
      proposedFare: parseFloat(proposedFare ?? "0"),
      requiredVehicleType: (vehicleType as VehicleType) || null,
      passengerCount: parseInt(passengerCount ?? "1", 10) || 1,
      existingRide: existingRide ?? "",
      existingRideId: existingRideId ?? "",
    };
  }, [
    pickupAddress,
    pickupLat,
    pickupLng,
    destinationAddress,
    destinationLat,
    destinationLng,
    proposedFare,
    vehicleType,
    passengerCount,
    existingRide,
    existingRideId,
  ]);

  // Reset when screen regains focus with new params
  useFocusEffect(
    useCallback(() => {
      const paramsKey = `${pickupLat}_${pickupLng}_${destinationLat}_${destinationLng}_${proposedFare}_${existingRideId}`;

      if (
        currentParamsRef.current !== "" &&
        currentParamsRef.current !== paramsKey
      ) {
        // Only reset if params ACTUALLY changed (not first mount)
        currentParamsRef.current = paramsKey;
        rideCreatedRef.current = false;
        setBids([]);
        setCreating(true);
        setTimedOut(false);
        setAcceptingBidId(null);
        setRideId(null);

        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      } else if (currentParamsRef.current === "") {
        // First mount - just record the params key
        currentParamsRef.current = paramsKey;
      }
    }, [
      pickupLat,
      pickupLng,
      destinationLat,
      destinationLng,
      proposedFare,
      existingRideId,
    ]),
  );

  // Create ride request (or resume existing)
  useEffect(() => {
    if (rideCreatedRef.current) return;
    rideCreatedRef.current = true;

    const p = paramsRef.current;

    if (p.existingRide === "true" && p.existingRideId) {
      setRideId(p.existingRideId);
      setCreating(false);

      timeoutRef.current = setTimeout(() => {
        setTimedOut(true);
      }, 30_000);
      return;
    }

    const passengerId = auth.currentUser?.uid;
    if (!passengerId) {
      showError("Not signed in", "Please sign in and try again.");
      router.replace("/(passenger)");
      return;
    }

    const createRideRequest = async (): Promise<void> => {
      try {
        const ref = await addDoc(collection(db, Collections.RIDES), {
          passengerId,
          driverId: null,
          status: "pending",
          pickupLocation: {
            address: p.pickupAddress,
            latitude: p.pickupLat,
            longitude: p.pickupLng,
          },
          dropoffLocation: {
            address: p.destinationAddress,
            latitude: p.destinationLat,
            longitude: p.destinationLng,
          },
          agreedFare: null,
          proposedFare: p.proposedFare,
          requiredVehicleType: p.requiredVehicleType,
          passengerCount: p.passengerCount,
          paymentMethod: null,
          paymentStatus: "pending",
          paymentReference: null,
          declinedBy: [],
          requestedAt: serverTimestamp(),
          acceptedAt: null,
          startedAt: null,
          completedAt: null,
          cancelledAt: null,
          paidAt: null,
          cancelledBy: null,
          cancellationReason: null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        setRideId(ref.id);
        setCreating(false);

        timeoutRef.current = setTimeout(() => {
          setTimedOut(true);
        }, 30_000);
      } catch (err) {
        console.error("Failed to create ride request:", err);
        showError("Request failed", "Could not create ride request.");
        router.replace("/(passenger)");
      }
    };

    createRideRequest();

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []); // Empty dependency - only runs once per mount

  // Listen to ride document for status changes
  useEffect(() => {
    if (!rideId) {
      console.log("No rideId yet, skipping ride doc listener");
      return;
    }

    console.log("Setting up ride doc listener for rideId:", rideId);

    const unsub = onSnapshot(
      doc(db, Collections.RIDES, rideId),
      (snap) => {
        if (!snap.exists()) {
          console.log("Ride document does not exist");
          return;
        }

        const data = snap.data();
        const status = data.status;
        const driverId = data.driverId;

        console.log("Ride status update:", status, "driverId:", driverId);

        // Ride accepted by driver
        if ((status === "accepted" || status === "arrived") && driverId) {
          console.log(
            "Ride accepted/arrived, navigating to booking-confirmation",
          );
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          showSuccess("Ride Accepted", "A driver accepted your ride!");

          // Use setTimeout to ensure state updates complete before navigation
          setTimeout(() => {
            router.replace({
              pathname: "/(passenger)/booking-confirmation",
              params: { rideId },
            } as any);
          }, 100);
          return;
        }

        // Ride already in progress (missed accepted state)
        if (status === "in_progress" && driverId) {
          console.log("Ride in progress, navigating to active-ride");
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }

          setTimeout(() => {
            router.replace({
              pathname: "/(passenger)/active-ride",
              params: { rideId },
            } as any);
          }, 100);
          return;
        }

        // Ride completed (missed earlier states)
        if (status === "completed") {
          console.log("Ride completed, navigating to payment");
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }

          setTimeout(() => {
            router.replace({
              pathname: "/(passenger)/payment",
              params: { rideId },
            } as any);
          }, 100);
          return;
        }

        // Ride cancelled by other party
        if (status === "cancelled") {
          const cancelledBy = data.cancelledBy;
          if (cancelledBy !== auth.currentUser?.uid) {
            console.log("Ride cancelled by other party");
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
              timeoutRef.current = null;
            }
            showError("Ride Cancelled", "This ride has been cancelled.");

            setTimeout(() => {
              router.replace("/(passenger)" as any);
            }, 100);
          }
          return;
        }
      },
      (error) => {
        console.error("Ride doc listener error:", error);
      },
    );

    return () => {
      console.log("Cleaning up ride doc listener");
      unsub();
    };
  }, [rideId]);

  // Listen to bids subcollection
  useEffect(() => {
    if (!rideId) return;

    const bidsRef = collection(
      db,
      Collections.RIDES,
      rideId,
      SubCollections.BIDS,
    );

    const unsub = onSnapshot(query(bidsRef), async (snapshot) => {
      const rawBids = snapshot.docs.map((d) => ({
        bidId: d.id,
        ...d.data(),
      })) as Bid[];

      const enriched: BidWithDriver[] = await Promise.all(
        rawBids.map(async (bid) => {
          try {
            const driverSnap = await getDoc(
              doc(db, Collections.DRIVERS, bid.driverId),
            );
            return {
              ...bid,
              driver: driverSnap.exists()
                ? (driverSnap.data() as Driver)
                : null,
            };
          } catch {
            return { ...bid, driver: null };
          }
        }),
      );

      enriched.sort((a, b) => a.amount - b.amount);
      setBids(enriched);

      if (enriched.length > 0 && timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
        setTimedOut(false);
      }
    });

    return unsub;
  }, [rideId]);

  // Fit map
  useEffect(() => {
    const timer = setTimeout(() => {
      mapRef.current?.fitToCoordinates([pickup, destination], {
        top: 120,
        right: 50,
        bottom: 350,
        left: 50,
      });
    }, 600);
    return () => clearTimeout(timer);
  }, [pickup, destination]);

  const cancelRide = useCallback((): void => {
    Alert.alert(
      "Cancel Ride?",
      "Are you sure you want to cancel this ride request?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            if (rideId) {
              try {
                await updateDoc(doc(db, Collections.RIDES, rideId), {
                  status: "cancelled",
                  cancelledAt: serverTimestamp(),
                  cancelledBy: auth.currentUser?.uid ?? null,
                  cancellationReason: "Passenger cancelled before acceptance",
                  updatedAt: serverTimestamp(),
                });

                // Notify all drivers who submitted bids
                for (const bid of bids) {
                  try {
                    await addDoc(collection(db, Collections.NOTIFICATIONS), {
                      userId: bid.driverId,
                      type: "ride_cancelled",
                      title: "Ride Cancelled",
                      body: "The passenger cancelled this ride request.",
                      rideId,
                      reportId: null,
                      isRead: false,
                      createdAt: serverTimestamp(),
                    });
                  } catch (notifErr) {
                    console.error("Failed to notify driver:", notifErr);
                  }
                }
              } catch (err) {
                console.error("Failed to cancel ride:", err);
              }
            }
            router.replace("/(passenger)");
          },
        },
      ],
    );
  }, [rideId, bids]);

  const handleChangeLocation = useCallback(async (): Promise<void> => {
    if (rideId) {
      try {
        await updateDoc(doc(db, Collections.RIDES, rideId), {
          status: "cancelled",
          cancelledAt: serverTimestamp(),
          cancelledBy: auth.currentUser?.uid ?? null,
          cancellationReason: "Passenger changed location",
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        console.error("Failed to cancel ride:", err);
      }
    }
    router.replace("/(passenger)/location-selection");
  }, [rideId]);

  const acceptBid = useCallback(
    async (bid: BidWithDriver): Promise<void> => {
      if (!rideId || !auth.currentUser) return;
      setAcceptingBidId(bid.bidId);

      try {
        await updateDoc(doc(db, Collections.RIDES, rideId), {
          status: "accepted",
          driverId: bid.driverId,
          agreedFare: bid.amount,
          acceptedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        await addDoc(collection(db, Collections.NOTIFICATIONS), {
          userId: bid.driverId,
          type: "ride_accepted",
          title: "Ride Accepted",
          body: "A passenger accepted your bid. Head to pickup.",
          rideId,
          reportId: null,
          isRead: false,
          createdAt: serverTimestamp(),
        });

        router.replace({
          pathname: "/(passenger)/booking-confirmation",
          params: { rideId },
        });
      } catch (err) {
        console.error("Failed to accept bid:", err);
        showError("Failed to accept", "Please try again.");
        setAcceptingBidId(null);
      }
    },
    [rideId],
  );

  const rejectBid = useCallback(
    async (bid: BidWithDriver): Promise<void> => {
      if (!rideId) return;

      try {
        // Delete bid from Firestore
        await deleteDoc(
          doc(db, Collections.RIDES, rideId, SubCollections.BIDS, bid.bidId),
        );

        // Add driver to declinedBy so they don't see this ride again
        await updateDoc(doc(db, Collections.RIDES, rideId), {
          declinedBy: arrayUnion(bid.driverId),
          updatedAt: serverTimestamp(),
        });

        // Remove from local state
        setBids((prev) => prev.filter((b) => b.bidId !== bid.bidId));

        // Notify the driver
        await addDoc(collection(db, Collections.NOTIFICATIONS), {
          userId: bid.driverId,
          type: "bid_rejected",
          title: "Bid Rejected",
          body: "The passenger declined your counter-offer.",
          rideId,
          reportId: null,
          isRead: false,
          createdAt: serverTimestamp(),
        });

        showSuccess("Bid Rejected", "The driver has been notified.");
      } catch (err) {
        console.error("Failed to reject bid:", err);
        showError("Error", "Could not reject this bid.");
      }
    },
    [rideId],
  );

  const handleRetry = useCallback((): void => {
    setTimedOut(false);
    timeoutRef.current = setTimeout(() => {
      setTimedOut(true);
    }, 30_000);
  }, []);

  const hasBids = bids.length > 0;
  const selectedVehicleType = vehicleType || null;

  const styles = StyleSheet.create({
    container: {
      flex: 1,
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
    topBar: {
      marginHorizontal: spacing.md,
      marginTop: spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      ...shadows.medium,
    },
    topBarRow: {
      flexDirection: "row",
      alignItems: "flex-start",
    },
    topBarText: {
      flex: 1,
    },
    topBarLabel: {
      fontSize: typography.sizes.xs,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.textMuted,
      marginBottom: 2,
    },
    topBarAddress: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.textPrimary,
      marginBottom: spacing.xs,
    },
    topBarDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: spacing.xs,
    },
    topBarFare: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.headingSemiBold,
      color: colors.primary,
      marginTop: spacing.xs,
    },
    cancelButton: {
      width: 32,
      height: 32,
      borderRadius: borderRadius.full,
      backgroundColor: colors.backgroundAlt,
      alignItems: "center",
      justifyContent: "center",
      marginLeft: spacing.sm,
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
    panelHeader: {
      paddingTop: spacing.xs,
      paddingBottom: spacing.md,
    },
    panelTitle: {
      fontSize: typography.sizes.lg,
      fontFamily: typography.fonts.headingSemiBold,
      color: colors.textPrimary,
    },
    emptyState: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: spacing.xl,
    },
    timeoutText: {
      fontSize: typography.sizes.base,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.textSecondary,
      textAlign: "center",
      marginBottom: spacing.xs,
    },
    timeoutHint: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.textMuted,
      textAlign: "center",
      marginBottom: spacing.lg,
      paddingHorizontal: spacing.md,
    },
    timeoutActions: {
      width: "100%",
      gap: spacing.sm,
    },
    bidCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
      marginBottom: spacing.sm,
    },
    driverPhoto: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.backgroundAlt,
    },
    driverPhotoPlaceholder: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.backgroundAlt,
      alignItems: "center",
      justifyContent: "center",
    },
    driverInitial: {
      fontSize: typography.sizes.lg,
      fontFamily: typography.fonts.headingSemiBold,
      color: colors.textMuted,
    },
    bidInfo: {
      flex: 1,
      marginLeft: spacing.sm,
    },
    driverName: {
      fontSize: typography.sizes.base,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.textPrimary,
    },
    ratingRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      marginTop: 2,
    },
    ratingText: {
      fontSize: typography.sizes.xs,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.textSecondary,
    },
    vehicleText: {
      fontSize: typography.sizes.xs,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.textMuted,
      marginTop: 3,
    },
    bidRight: {
      alignItems: "flex-end",
      gap: spacing.sm,
      marginLeft: spacing.sm,
    },
    bidAmountRow: {
      alignItems: "flex-end",
    },
    bidCurrency: {
      fontSize: typography.sizes.xs,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.textMuted,
    },
    bidAmount: {
      fontSize: typography.sizes["2xl"],
      fontFamily: typography.fonts.heading,
      color: colors.textPrimary,
      lineHeight: typography.sizes["2xl"] * 1.1,
    },
  });

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
        initialRegion={{
          latitude: pickup.latitude,
          longitude: pickup.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
      >
        <PickupMarker coordinate={pickup} address={pickupAddress} />
        <DropoffMarker coordinate={destination} address={destinationAddress} />
      </MapComponent>

      {/* Top overlay */}
      <SafeAreaView edges={["top"]} style={styles.topBarWrapper}>
        <View style={styles.topBar}>
          <View style={styles.topBarRow}>
            <View style={styles.topBarText}>
              <Text style={styles.topBarLabel}>From</Text>
              <Text style={styles.topBarAddress} numberOfLines={1}>
                {pickupAddress}
              </Text>
              <View style={styles.topBarDivider} />
              <Text style={styles.topBarLabel}>To</Text>
              <Text style={styles.topBarAddress} numberOfLines={1}>
                {destinationAddress}
              </Text>
              <Text style={styles.topBarFare}>Proposed: ₦{proposedFare}</Text>
            </View>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={cancelRide}
              activeOpacity={0.7}
            >
              <X size={16} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {/* Bottom panel */}
      <View style={styles.bottomPanel}>
        <View style={styles.handleBar} />
        <View style={styles.panelContent}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>
              {hasBids ? "Driver offers" : "Waiting for drivers"}
            </Text>
          </View>

          {creating ? (
            <View style={styles.emptyState}>
              <LoadingSpinner message="Setting up your request..." />
            </View>
          ) : !hasBids && !timedOut ? (
            <View style={styles.emptyState}>
              <LoadingSpinner message="Looking for nearby drivers..." />
            </View>
          ) : !hasBids && timedOut ? (
            <View style={styles.emptyState}>
              <Text style={styles.timeoutText}>
                No drivers available nearby
              </Text>
              <Text style={styles.timeoutHint}>
                {selectedVehicleType
                  ? `Try removing the "${selectedVehicleType}" filter, or pick a closer location.`
                  : "Try picking a closer pickup location, or try again shortly."}
              </Text>
              <View style={styles.timeoutActions}>
                <Button
                  title="Try Again"
                  onPress={handleRetry}
                  variant="primary"
                  fullWidth
                />
                <Button
                  title="Change Location"
                  onPress={handleChangeLocation}
                  variant="outline"
                  fullWidth
                />
                <Button
                  title="Cancel Ride"
                  onPress={cancelRide}
                  variant="danger"
                  fullWidth
                />
              </View>
            </View>
          ) : null}

          {hasBids && (
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 250 }}
            >
              {bids.map((bid) => (
                <View key={bid.bidId} style={styles.bidCard}>
                  {bid.driver?.profilePhoto ? (
                    <Image
                      source={{ uri: bid.driver.profilePhoto }}
                      style={styles.driverPhoto}
                    />
                  ) : (
                    <View style={styles.driverPhotoPlaceholder}>
                      <Text style={styles.driverInitial}>
                        {bid.driver?.name?.charAt(0).toUpperCase() ?? "?"}
                      </Text>
                    </View>
                  )}

                  <View style={styles.bidInfo}>
                    <Text style={styles.driverName} numberOfLines={1}>
                      {bid.driver?.name ?? "Unknown driver"}
                    </Text>
                    <View style={styles.ratingRow}>
                      <Star
                        size={12}
                        color={colors.warning}
                        fill={colors.warning}
                      />
                      <Text style={styles.ratingText}>
                        {bid.driver?.rating?.toFixed(1) ?? "—"}
                      </Text>
                    </View>
                    {bid.driver && (
                      <Text style={styles.vehicleText} numberOfLines={1}>
                        {getVehicleLabel(bid.driver)}
                      </Text>
                    )}
                  </View>

                  <View style={styles.bidRight}>
                    <View style={styles.bidAmountRow}>
                      <Text style={styles.bidCurrency}>NGN</Text>
                      <Text style={styles.bidAmount}>
                        {bid.amount.toLocaleString()}
                      </Text>
                    </View>
                    <Button
                      title="Accept"
                      onPress={() => acceptBid(bid)}
                      variant="primary"
                      size="small"
                      loading={acceptingBidId === bid.bidId}
                      disabled={acceptingBidId !== null}
                    />
                    <Button
                      title="Reject"
                      onPress={() => rejectBid(bid)}
                      variant="danger"
                      size="small"
                      disabled={acceptingBidId !== null}
                    />
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </View>
  );
}
