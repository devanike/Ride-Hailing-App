import { Button } from "@/components/common/Button";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { DropoffMarker } from "@/components/map/DropoffMarker";
import { MapComponent, MapComponentRef } from "@/components/map/MapComponent";
import { PickupMarker } from "@/components/map/PickupMarker";
import { useTheme } from "@/hooks/useTheme";
import { auth, db } from "@/services/firebaseConfig";
import { Collections, SubCollections } from "@/types/database";
import { Driver } from "@/types/driver";
import { Bid } from "@/types/ride";
import { showError } from "@/utils/toast";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { router, useLocalSearchParams } from "expo-router";
import {
  addDoc,
  collection,
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
  ActivityIndicator,
  Image,
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
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["35%", "70%"], []);

  const {
    pickupAddress,
    pickupLat,
    pickupLng,
    destinationAddress,
    destinationLat,
    destinationLng,
    proposedFare,
  } = useLocalSearchParams<{
    pickupAddress: string;
    pickupLat: string;
    pickupLng: string;
    destinationAddress: string;
    destinationLat: string;
    destinationLng: string;
    proposedFare: string;
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

  // Store params in refs so the one-time effect has no stale closure deps
  const paramsRef = useRef({
    pickupAddress: pickupAddress ?? "",
    pickupLat: parseFloat(pickupLat ?? "7.4453"),
    pickupLng: parseFloat(pickupLng ?? "3.8993"),
    destinationAddress: destinationAddress ?? "",
    destinationLat: parseFloat(destinationLat ?? "7.4453"),
    destinationLng: parseFloat(destinationLng ?? "3.8993"),
    proposedFare: parseFloat(proposedFare ?? "0"),
  });

  // Create ride request once on mount
  useEffect(() => {
    if (rideCreatedRef.current) return;
    rideCreatedRef.current = true;

    const passengerId = auth.currentUser?.uid;
    if (!passengerId) {
      showError("Not signed in", "Please sign in and try again.");
      router.back();
      return;
    }

    const p = paramsRef.current;

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
          paymentMethod: null,
          paymentStatus: "pending",
          paymentReference: null,
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

        // 2-minute timeout if no bids arrive
        timeoutRef.current = setTimeout(() => {
          setTimedOut(true);
        }, 120_000);
      } catch (err) {
        console.error("Failed to create ride request:", err);
        showError("Request failed", "Could not create ride request.");
        router.back();
      }
    };

    createRideRequest();

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []); // intentionally empty — runs once on mount, reads stable paramsRef

  // Listen to bids subcollection in real time
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

      // Sort lowest fare first
      enriched.sort((a, b) => a.amount - b.amount);
      setBids(enriched);

      // Bids arrived — cancel the timeout
      if (enriched.length > 0 && timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
        setTimedOut(false);
      }
    });

    return unsub;
  }, [rideId]);

  // Fit map once both markers are ready
  useEffect(() => {
    const timer = setTimeout(() => {
      mapRef.current?.fitToCoordinates([pickup, destination], {
        top: 120,
        right: 50,
        bottom: 320,
        left: 50,
      });
    }, 600);
    return () => clearTimeout(timer);
  }, [pickup, destination]);

  const cancelRide = useCallback(async (): Promise<void> => {
    if (rideId) {
      try {
        await updateDoc(doc(db, Collections.RIDES, rideId), {
          status: "cancelled",
          cancelledAt: serverTimestamp(),
          cancelledBy: auth.currentUser?.uid ?? null,
          cancellationReason: "Passenger cancelled before acceptance",
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        console.error("Failed to cancel ride:", err);
      }
    }
    router.replace("/(passenger)");
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
          message: "A passenger accepted your bid. Head to pickup.",
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

  const handleRetry = useCallback((): void => {
    setTimedOut(false);
    timeoutRef.current = setTimeout(() => {
      setTimedOut(true);
    }, 120_000);
  }, []);

  const hasBids = bids.length > 0;

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
    sheetContent: {
      flex: 1,
      paddingHorizontal: spacing.screenPadding,
    },
    sheetHeader: {
      flexDirection: "row",
      alignItems: "center",
      paddingTop: spacing.xs,
      paddingBottom: spacing.md,
      gap: spacing.sm,
    },
    sheetTitle: {
      fontSize: typography.sizes.lg,
      fontFamily: typography.fonts.headingSemiBold,
      color: colors.textPrimary,
    },
    emptyState: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: spacing.xxl,
    },
    timeoutText: {
      fontSize: typography.sizes.base,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.textSecondary,
      textAlign: "center",
      marginBottom: spacing.lg,
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

      {/* Top overlay bar */}
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
              <Text style={styles.topBarFare}>
                Proposed: NGN {proposedFare}
              </Text>
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

      {/* Bottom sheet */}
      <BottomSheet
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        index={0}
        backgroundStyle={{ backgroundColor: colors.surface }}
        handleIndicatorStyle={{ backgroundColor: colors.border }}
        enablePanDownToClose={false}
      >
        <View style={styles.sheetContent}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>
              {hasBids ? "Driver offers" : "Waiting for drivers"}
            </Text>
            {!hasBids && !timedOut && !creating && (
              <ActivityIndicator size="small" color={colors.primary} />
            )}
          </View>

          {creating && (
            <View style={styles.emptyState}>
              <LoadingSpinner message="Setting up your request..." />
            </View>
          )}

          {!creating && !hasBids && !timedOut && (
            <View style={styles.emptyState}>
              <LoadingSpinner message="Looking for nearby drivers..." />
            </View>
          )}

          {!creating && !hasBids && timedOut && (
            <View style={styles.emptyState}>
              <Text style={styles.timeoutText}>
                No drivers available right now
              </Text>
              <View style={styles.timeoutActions}>
                <Button
                  title="Try again"
                  onPress={handleRetry}
                  variant="primary"
                  fullWidth
                />
                <Button
                  title="Cancel"
                  onPress={cancelRide}
                  variant="outline"
                  fullWidth
                />
              </View>
            </View>
          )}

          {hasBids && (
            <BottomSheetScrollView showsVerticalScrollIndicator={false}>
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
                  </View>
                </View>
              ))}
            </BottomSheetScrollView>
          )}
        </View>
      </BottomSheet>
    </View>
  );
}
