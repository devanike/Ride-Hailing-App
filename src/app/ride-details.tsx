import { Button } from "@/components/common/Button";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { DropoffMarker } from "@/components/map/DropoffMarker";
import { MapComponent } from "@/components/map/MapComponent";
import { PickupMarker } from "@/components/map/PickupMarker";
import { useTheme } from "@/hooks/useTheme";
import { auth, db } from "@/services/firebaseConfig";
import { Collections } from "@/types/database";
import { Driver } from "@/types/driver";
import { Rating } from "@/types/rating";
import { Ride } from "@/types/ride";
import { format } from "date-fns";
import { router, useLocalSearchParams } from "expo-router";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { ArrowLeft, Star } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function RideDetailsScreen(): React.JSX.Element {
  const { colors, spacing, typography, borderRadius, shadows } = useTheme();
  const { rideId } = useLocalSearchParams<{ rideId: string }>();

  const [ride, setRide] = useState<Ride | null>(null);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [rating, setRating] = useState<Rating | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!rideId) return;

    const load = async (): Promise<void> => {
      try {
        const rideSnap = await getDoc(doc(db, Collections.RIDES, rideId));
        if (!rideSnap.exists()) return;
        const rideData = { rideId: rideSnap.id, ...rideSnap.data() } as Ride;
        setRide(rideData);

        if (rideData.driverId) {
          const driverSnap = await getDoc(
            doc(db, Collections.DRIVERS, rideData.driverId),
          );
          if (driverSnap.exists()) setDriver(driverSnap.data() as Driver);
        }

        const passengerId = auth.currentUser?.uid;
        if (passengerId) {
          const ratingsQ = query(
            collection(db, Collections.RATINGS),
            where("rideId", "==", rideId),
            where("passengerId", "==", passengerId),
          );
          const ratingsSnap = await getDocs(ratingsQ);
          if (!ratingsSnap.empty) {
            setRating(ratingsSnap.docs[0].data() as Rating);
          }
        }
      } catch (err) {
        console.error("Failed to load ride details:", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [rideId]);

  const dateLabel = ride?.createdAt
    ? format(ride.createdAt.toDate(), "EEEE, d MMMM yyyy • h:mm a")
    : "—";

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.screenPadding,
      paddingVertical: spacing.md,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      padding: spacing.xs,
      marginRight: spacing.sm,
    },
    headerTitle: {
      fontSize: typography.sizes.lg,
      fontFamily: typography.fonts.headingSemiBold,
      color: colors.textPrimary,
    },
    map: {
      height: 200,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: spacing.screenPadding,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      ...shadows.small,
      marginBottom: spacing.lg,
    },
    dateText: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.textSecondary,
      marginBottom: spacing.md,
    },
    label: {
      fontSize: typography.sizes.xs,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.textMuted,
      marginBottom: 2,
    },
    value: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.textPrimary,
      marginBottom: spacing.md,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: spacing.md,
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
    infoRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: spacing.sm,
    },
    infoLabel: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.textSecondary,
    },
    infoValue: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.headingSemiBold,
      color: colors.textPrimary,
    },
    ratingRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
    },
    ratingLabel: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.textSecondary,
    },
  });

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <StatusBar barStyle="dark-content" />
        <LoadingSpinner message="Loading trip details..." />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trip Details</Text>
      </View>

      {ride?.pickupLocation && ride?.dropoffLocation && (
        <MapComponent
          style={styles.map}
          showUserLocation={false}
          showsMyLocationButton={false}
          scrollEnabled={false}
          zoomEnabled={false}
          rotateEnabled={false}
          initialRegion={{
            latitude:
              (ride.pickupLocation.latitude + ride.dropoffLocation.latitude) /
              2,
            longitude:
              (ride.pickupLocation.longitude + ride.dropoffLocation.longitude) /
              2,
            latitudeDelta:
              Math.abs(
                ride.pickupLocation.latitude - ride.dropoffLocation.latitude,
              ) *
                2.5 +
              0.01,
            longitudeDelta:
              Math.abs(
                ride.pickupLocation.longitude - ride.dropoffLocation.longitude,
              ) *
                2.5 +
              0.01,
          }}
        >
          <PickupMarker
            coordinate={{
              latitude: ride.pickupLocation.latitude,
              longitude: ride.pickupLocation.longitude,
            }}
          />
          <DropoffMarker
            coordinate={{
              latitude: ride.dropoffLocation.latitude,
              longitude: ride.dropoffLocation.longitude,
            }}
          />
        </MapComponent>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.card}>
          <Text style={styles.dateText}>{dateLabel}</Text>

          <Text style={styles.label}>From</Text>
          <Text style={styles.value} numberOfLines={2}>
            {ride?.pickupLocation?.address ?? "—"}
          </Text>

          <Text style={styles.label}>To</Text>
          <Text style={styles.value} numberOfLines={2}>
            {ride?.dropoffLocation?.address ?? "—"}
          </Text>

          <View style={styles.divider} />

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
              {driver?.name ?? "Unknown driver"}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Fare</Text>
            <Text style={styles.infoValue}>
              NGN {ride?.agreedFare?.toLocaleString() ?? "—"}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Payment</Text>
            <Text style={styles.infoValue}>{ride?.paymentMethod ?? "—"}</Text>
          </View>

          {rating && (
            <>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Text style={styles.ratingLabel}>Your rating</Text>
                <View style={styles.ratingRow}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      size={14}
                      color={
                        s <= rating.rating ? colors.warning : colors.border
                      }
                      fill={s <= rating.rating ? colors.warning : "transparent"}
                    />
                  ))}
                </View>
              </View>
            </>
          )}
        </View>

        <Button
          title="Report an Issue"
          onPress={() =>
            router.push({
              pathname: "/report-incident",
              params: { rideId: rideId ?? "" },
            })
          }
          variant="outline"
          fullWidth
          style={{ borderColor: colors.error }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
