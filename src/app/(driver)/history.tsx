import { EmptyState } from "@/components/common/EmptyState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useTheme } from "@/hooks/useTheme";
import { auth, db } from "@/services/firebaseConfig";
import { Collections } from "@/types/database";
import { Ride } from "@/types/ride";
import { router } from "expo-router";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { Clock, Flag, MapPin } from "lucide-react-native";
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

function PaymentBadge({ method }: { method: string | null | undefined }) {
  const { colors, typography, spacing, borderRadius } = useTheme();
  if (!method) return null;
  const label =
    method === "card" ? "Card" : method === "cash" ? "Cash" : method;
  const bg =
    method === "card" ? colors.infoBackground : colors.successBackground;
  const fg = method === "card" ? colors.info : colors.success;
  return (
    <View
      style={{
        backgroundColor: bg,
        borderRadius: borderRadius.sm,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        alignSelf: "flex-start",
      }}
    >
      <Text
        style={{
          fontSize: typography.sizes.xs,
          fontFamily: typography.fonts.bodyMedium,
          color: fg,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function RideCard({
  ride,
  onPress,
}: {
  ride: Ride & { passengerName?: string };
  onPress: () => void;
}) {
  const { colors, spacing, typography, borderRadius, shadows } = useTheme();
  const date = ride.createdAt?.toDate?.();
  const dateStr = date
    ? date.toLocaleDateString("en-NG", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";
  const timeStr = date
    ? date.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.md,
        ...shadows.medium,
      }}
    >
      {/* Date/time row */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: spacing.sm,
        }}
      >
        <Text
          style={{
            fontSize: typography.sizes.xs,
            fontFamily: typography.fonts.bodyRegular,
            color: colors.textMuted,
          }}
        >
          {dateStr} {timeStr}
        </Text>
        <Text
          style={{
            fontSize: typography.sizes.base,
            fontFamily: typography.fonts.heading,
            color: colors.primary,
          }}
        >
          NGN {ride.agreedFare?.toLocaleString() ?? "—"}
        </Text>
      </View>

      {/* Passenger name */}
      <Text
        style={{
          fontSize: typography.sizes.sm,
          fontFamily: typography.fonts.bodyMedium,
          color: colors.textPrimary,
          marginBottom: spacing.sm,
        }}
      >
        {ride.passengerName ?? "Passenger"}
      </Text>

      {/* Pickup */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          gap: spacing.xs,
          marginBottom: spacing.xs,
        }}
      >
        <MapPin size={14} color={colors.primary} style={{ marginTop: 1 }} />
        <Text
          style={{
            flex: 1,
            fontSize: typography.sizes.xs,
            fontFamily: typography.fonts.bodyRegular,
            color: colors.textSecondary,
          }}
          numberOfLines={1}
        >
          {ride.pickupLocation?.address ?? "—"}
        </Text>
      </View>

      {/* Dropoff */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          gap: spacing.xs,
          marginBottom: spacing.sm,
        }}
      >
        <Flag size={14} color={colors.error} style={{ marginTop: 1 }} />
        <Text
          style={{
            flex: 1,
            fontSize: typography.sizes.xs,
            fontFamily: typography.fonts.bodyRegular,
            color: colors.textSecondary,
          }}
          numberOfLines={1}
        >
          {ride.dropoffLocation?.address ?? "—"}
        </Text>
      </View>

      <PaymentBadge method={ride.paymentMethod} />
    </TouchableOpacity>
  );
}

export default function DriverHistoryScreen(): React.JSX.Element {
  const { colors, spacing, typography } = useTheme();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setCurrentUser(u));
    return unsub;
  }, []);

  useEffect(() => {
    if (!currentUser?.uid) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, Collections.RIDES),
      where("driverId", "==", currentUser.uid),
      where("status", "in", ["completed", "cancelled"]),
      orderBy("createdAt", "desc"),
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({
        rideId: d.id,
        ...d.data(),
      })) as Ride[];
      setRides(data);
      setLoading(false);
    });

    return unsub;
  }, [currentUser?.uid]);

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
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

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <Text style={styles.title}>Trip History</Text>
        </View>
        <LoadingSpinner message="Loading trips..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <Text style={styles.title}>Trip History</Text>
      </View>

      {rides.length === 0 ? (
        <EmptyState
          icon={<Clock size={64} color={colors.textMuted} />}
          title="No Trips Yet"
          message="Your completed trips will appear here."
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
