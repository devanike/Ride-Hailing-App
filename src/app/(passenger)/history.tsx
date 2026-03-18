import { EmptyState } from "@/components/common/EmptyState";
import { useTheme } from "@/hooks/useTheme";
import { auth, db } from "@/services/firebaseConfig";
import { Collections } from "@/types/database";
import { Ride } from "@/types/ride";
import { format } from "date-fns";
import { router } from "expo-router";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { Clock } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  FlatList,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function PaymentBadge({
  method,
  colors,
  typography,
  spacing,
  borderRadius,
}: {
  method: string | null;
  colors: ReturnType<typeof useTheme>["colors"];
  typography: ReturnType<typeof useTheme>["typography"];
  spacing: ReturnType<typeof useTheme>["spacing"];
  borderRadius: ReturnType<typeof useTheme>["borderRadius"];
}) {
  if (!method) return null;
  const label =
    method === "card" ? "Card" : method === "cash" ? "Cash" : "Transfer";
  return (
    <View
      style={{
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        backgroundColor: colors.infoBackground,
        borderRadius: borderRadius.sm,
      }}
    >
      <Text
        style={{
          fontSize: typography.sizes.xs,
          fontFamily: typography.fonts.bodyMedium,
          color: colors.info,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

interface RideCardProps {
  ride: Ride;
  onPress: () => void;
}

function RideCard({ ride, onPress }: RideCardProps) {
  const { colors, spacing, typography, borderRadius, shadows } = useTheme();

  const dateLabel = ride.createdAt
    ? format(ride.createdAt.toDate(), "d MMM yyyy, h:mm a")
    : "—";

  const styles = StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      marginBottom: spacing.sm,
      ...shadows.small,
    },
    topRow: {
      flexDirection: "row",
      justifyContent: "flex-end",
      marginBottom: spacing.sm,
    },
    dateText: {
      fontSize: typography.sizes.xs,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.textMuted,
    },
    locationRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: 2,
    },
    dotContainer: {
      width: 16,
      alignItems: "center",
      paddingTop: 3,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    connector: {
      width: 1,
      height: 12,
      backgroundColor: colors.border,
      marginTop: 2,
    },
    locationText: {
      flex: 1,
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.textPrimary,
      marginLeft: spacing.xs,
    },
    bottomRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: spacing.sm,
      paddingTop: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    fareText: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.headingSemiBold,
      color: colors.primary,
    },
    badgeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
    },
  });

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.topRow}>
        <Text style={styles.dateText}>{dateLabel}</Text>
      </View>

      <View style={styles.locationRow}>
        <View style={styles.dotContainer}>
          <View style={[styles.dot, { backgroundColor: colors.success }]} />
          <View style={styles.connector} />
        </View>
        <Text style={styles.locationText} numberOfLines={1}>
          {ride.pickupLocation.address}
        </Text>
      </View>

      <View style={styles.locationRow}>
        <View style={styles.dotContainer}>
          <View style={[styles.dot, { backgroundColor: colors.error }]} />
        </View>
        <Text style={styles.locationText} numberOfLines={1}>
          {ride.dropoffLocation.address}
        </Text>
      </View>

      <View style={styles.bottomRow}>
        <Text style={styles.fareText}>
          NGN {ride.agreedFare?.toLocaleString() ?? "—"}
        </Text>
        <View style={styles.badgeRow}>
          <PaymentBadge
            method={ride.paymentMethod}
            colors={colors}
            typography={typography}
            spacing={spacing}
            borderRadius={borderRadius}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function HistoryScreen(): React.JSX.Element {
  const { colors, spacing, typography } = useTheme();
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!currentUser?.uid) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, Collections.RIDES),
      where("passengerId", "==", currentUser.uid),
      where("status", "in", ["completed", "cancelled"]),
      orderBy("createdAt", "desc"),
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((d) => ({
        rideId: d.id,
        ...d.data(),
      })) as Ride[];
      setRides(data);
      setLoading(false);
    });

    return unsub;
  }, [currentUser?.uid]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: spacing.screenPadding,
      paddingVertical: spacing.lg,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: {
      fontSize: typography.sizes["2xl"],
      fontFamily: typography.fonts.heading,
      color: colors.textPrimary,
    },
    list: {
      padding: spacing.screenPadding,
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <Text style={styles.title}>Ride History</Text>
      </View>

      {!loading && rides.length === 0 ? (
        <EmptyState
          icon={<Clock size={64} color={colors.textMuted} />}
          title="No Rides Yet"
          message="Your ride history will appear here once you complete your first trip."
        />
      ) : (
        <FlatList
          data={rides}
          keyExtractor={(item) => item.rideId}
          renderItem={({ item }) => (
            <RideCard
              ride={item}
              onPress={() =>
                router.push({
                  pathname: "/ride-details",
                  params: { rideId: item.rideId },
                })
              }
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}
