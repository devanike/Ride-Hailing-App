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
import { ArrowLeft, DollarSign } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type FilterTab = "today" | "week" | "month";

const TABS: { key: FilterTab; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
];

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

function EarningRow({ item }: { item: EnrichedEarning }) {
  const { colors, spacing, typography } = useTheme();
  const date = item.createdAt?.toDate?.();
  const dateStr = date
    ? date.toLocaleDateString("en-NG", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.screenPadding,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: typography.sizes.sm,
            fontFamily: typography.fonts.bodyMedium,
            color: colors.textPrimary,
            marginBottom: 2,
          }}
          numberOfLines={1}
        >
          {item.passengerName ?? "Passenger"}
        </Text>
        <Text
          style={{
            fontSize: typography.sizes.xs,
            fontFamily: typography.fonts.bodyRegular,
            color: colors.textMuted,
            marginBottom: spacing.xs,
          }}
        >
          {dateStr}
        </Text>
        <PaymentBadge method={item.paymentMethod} />
      </View>

      <Text
        style={{
          fontSize: typography.sizes.base,
          fontFamily: typography.fonts.heading,
          color: colors.primary,
          marginLeft: spacing.md,
        }}
      >
        NGN {item.amount?.toLocaleString()}
      </Text>
    </View>
  );
}

export default function EarningsDetailsScreen(): React.JSX.Element {
  const { colors, spacing, typography } = useTheme();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [earnings, setEarnings] = useState<EnrichedEarning[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>("today");

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

  const filtered = useMemo(() => {
    const now = new Date();

    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return earnings.filter((e) => {
      const d = e.createdAt?.toDate?.();
      if (!d) return false;
      if (activeTab === "today") return d >= startOfDay;
      if (activeTab === "week") return d >= startOfWeek;
      return d >= startOfMonth;
    });
  }, [earnings, activeTab]);

  const periodTotal = useMemo(
    () => filtered.reduce((sum, e) => sum + (e.amount ?? 0), 0),
    [filtered],
  );

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.screenPadding,
      paddingVertical: spacing.md,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: spacing.md,
    },
    title: {
      fontSize: typography.sizes["2xl"],
      fontFamily: typography.fonts.heading,
      color: colors.textPrimary,
    },
    tabRow: {
      flexDirection: "row",
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    tab: {
      flex: 1,
      paddingVertical: spacing.md,
      alignItems: "center",
      borderBottomWidth: 2,
      borderBottomColor: "transparent",
    },
    tabActive: {
      borderBottomColor: colors.primary,
    },
    tabText: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.textMuted,
    },
    tabTextActive: {
      color: colors.primary,
      fontFamily: typography.fonts.body,
    },
    totalRow: {
      paddingHorizontal: spacing.screenPadding,
      paddingVertical: spacing.md,
      backgroundColor: colors.backgroundAlt,
    },
    totalText: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.textSecondary,
    },
    totalAmount: {
      fontSize: typography.sizes.lg,
      fontFamily: typography.fonts.heading,
      color: colors.textPrimary,
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>All Earnings</Text>
      </View>

      {/* Filter tabs */}
      <View style={styles.tabRow}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab.key && styles.tabTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Period total */}
      <View style={styles.totalRow}>
        <Text style={styles.totalText}>Total for period</Text>
        <Text style={styles.totalAmount}>
          NGN {periodTotal.toLocaleString()}
        </Text>
      </View>

      {loading ? (
        <LoadingSpinner message="Loading earnings..." />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.earningId}
          renderItem={({ item }) => <EarningRow item={item} />}
          ListEmptyComponent={
            <EmptyState
              icon={<DollarSign size={48} color={colors.textMuted} />}
              title="No Earnings"
              message="No earnings found for this period."
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}
