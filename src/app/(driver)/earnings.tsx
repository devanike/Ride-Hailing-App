import { Button } from "@/components/common/Button";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useTheme } from "@/hooks/useTheme";
import { auth, db } from "@/services/firebaseConfig";
import { Collections } from "@/types/database";
import { Earning } from "@/types/earning";
import { router } from "expo-router";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { DollarSign } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import { FlatList, StatusBar, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface EnrichedEarning extends Earning {
  passengerName?: string;
}

function PaymentBadge({ method }: { method: string | null | undefined }) {
  const { colors, typography, spacing, borderRadius } = useTheme();
  const label = method === "card" ? "Card" : "Cash";
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
        alignSelf: "flex-end",
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

function SummaryCard({ amount, label }: { amount: number; label: string }) {
  const { colors, spacing, typography, borderRadius, shadows } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        alignItems: "center",
        ...shadows.medium,
      }}
    >
      <Text
        style={{
          fontSize: typography.sizes.lg,
          fontFamily: typography.fonts.heading,
          color: colors.textPrimary,
        }}
      >
        {amount.toLocaleString()}
      </Text>
      <Text
        style={{
          fontSize: typography.sizes.xs,
          fontFamily: typography.fonts.bodyRegular,
          color: colors.textMuted,
          marginTop: 2,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function EarningRow({ item }: { item: EnrichedEarning }) {
  const { colors, spacing, typography } = useTheme();
  const date = item.createdAt?.toDate?.();
  const dateStr = date
    ? date.toLocaleDateString("en-NG", { day: "numeric", month: "short" })
    : "—";

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <Text
        style={{
          width: 52,
          fontSize: typography.sizes.xs,
          fontFamily: typography.fonts.bodyRegular,
          color: colors.textMuted,
        }}
      >
        {dateStr}
      </Text>

      <Text
        style={{
          flex: 1,
          fontSize: typography.sizes.sm,
          fontFamily: typography.fonts.bodyMedium,
          color: colors.textPrimary,
          marginHorizontal: spacing.sm,
        }}
        numberOfLines={1}
      >
        {item.passengerName ?? "Passenger"}
      </Text>

      <View style={{ alignItems: "flex-end", gap: 4 }}>
        <Text
          style={{
            fontSize: typography.sizes.sm,
            fontFamily: typography.fonts.heading,
            color: colors.primary,
          }}
        >
          NGN {item.amount?.toLocaleString()}
        </Text>
        <PaymentBadge method={item.paymentMethod} />
      </View>
    </View>
  );
}

export default function EarningsScreen(): React.JSX.Element {
  const { colors, spacing, typography } = useTheme();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [earnings, setEarnings] = useState<EnrichedEarning[]>([]);
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
      collection(db, Collections.EARNINGS),
      where("driverId", "==", currentUser.uid),
      orderBy("createdAt", "desc"),
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({
        earningId: d.id,
        ...d.data(),
      })) as EnrichedEarning[];
      setEarnings(data);
      setLoading(false);
    });

    return unsub;
  }, [currentUser?.uid]);

  const todayTotal = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return earnings
      .filter((e) => {
        const d = e.createdAt?.toDate?.();
        return d && d >= start;
      })
      .reduce((sum, e) => sum + (e.amount ?? 0), 0);
  }, [earnings]);

  const weekTotal = useMemo(() => {
    const start = new Date();
    start.setDate(start.getDate() - start.getDay());
    start.setHours(0, 0, 0, 0);
    return earnings
      .filter((e) => {
        const d = e.createdAt?.toDate?.();
        return d && d >= start;
      })
      .reduce((sum, e) => sum + (e.amount ?? 0), 0);
  }, [earnings]);

  const monthTotal = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return earnings
      .filter((e) => {
        const d = e.createdAt?.toDate?.();
        return d && d >= start;
      })
      .reduce((sum, e) => sum + (e.amount ?? 0), 0);
  }, [earnings]);

  const todayTrips = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return earnings.filter((e) => {
      const d = e.createdAt?.toDate?.();
      return d && d >= start;
    }).length;
  }, [earnings]);

  const pendingPayout = useMemo(
    () =>
      earnings
        .filter((e) => e.payoutStatus === "pending")
        .reduce((sum, e) => sum + (e.amount ?? 0), 0),
    [earnings],
  );

  const recent = useMemo(() => earnings.slice(0, 5), [earnings]);

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
    body: {
      flex: 1,
      padding: spacing.screenPadding,
    },
    cardsRow: {
      flexDirection: "row",
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    statsRow: {
      flexDirection: "row",
      gap: spacing.sm,
      marginBottom: spacing.lg,
    },
    statPill: {
      flex: 1,
      backgroundColor: colors.backgroundAlt,
      borderRadius: 999,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      alignItems: "center",
    },
    statValue: {
      fontSize: typography.sizes.base,
      fontFamily: typography.fonts.heading,
      color: colors.textPrimary,
    },
    statLabel: {
      fontSize: typography.sizes.xs,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.textMuted,
    },
    sectionTitle: {
      fontSize: typography.sizes.base,
      fontFamily: typography.fonts.headingSemiBold,
      color: colors.textPrimary,
      marginBottom: spacing.sm,
    },
    viewAllWrapper: {
      alignItems: "center",
      marginTop: spacing.lg,
    },
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <Text style={styles.title}>Earnings</Text>
        </View>
        <LoadingSpinner message="Loading earnings..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <Text style={styles.title}>Earnings</Text>
      </View>

      <FlatList
        data={recent}
        keyExtractor={(item) => item.earningId}
        renderItem={({ item }) => <EarningRow item={item} />}
        ListEmptyComponent={
          <EmptyState
            icon={<DollarSign size={48} color={colors.textMuted} />}
            title="No Earnings Yet"
            message="Your earnings will appear here after completing trips."
          />
        }
        ListHeaderComponent={
          <View style={styles.body}>
            {/* Summary cards */}
            <View style={styles.cardsRow}>
              <SummaryCard amount={todayTotal} label="Today" />
              <SummaryCard amount={weekTotal} label="This Week" />
              <SummaryCard amount={monthTotal} label="This Month" />
            </View>

            {/* Stats row */}
            <View style={styles.statsRow}>
              <View style={styles.statPill}>
                <Text style={styles.statValue}>{todayTrips}</Text>
                <Text style={styles.statLabel}>Trips Today</Text>
              </View>
              <View style={styles.statPill}>
                <Text style={styles.statValue}>
                  NGN {pendingPayout.toLocaleString()}
                </Text>
                <Text style={styles.statLabel}>Pending Payout</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Recent Earnings</Text>
          </View>
        }
        ListFooterComponent={
          earnings.length > 0 ? (
            <View style={{ paddingHorizontal: spacing.screenPadding }}>
              <View style={styles.viewAllWrapper}>
                <Button
                  title="View All"
                  onPress={() => router.push("/(driver)/earnings-details")}
                  variant="outline"
                />
              </View>
            </View>
          ) : null
        }
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}
