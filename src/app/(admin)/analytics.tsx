import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useTheme } from "@/hooks/useTheme";
import { db } from "@/services/firebaseConfig";
import { Collections } from "@/types/database";
import {
  collection,
  getDocs,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import React, { useCallback, useEffect, useState } from "react";
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Period = "today" | "week" | "month" | "year";

const PERIODS: { label: string; value: Period }[] = [
  { label: "Today", value: "today" },
  { label: "This Week", value: "week" },
  { label: "This Month", value: "month" },
  { label: "This Year", value: "year" },
];

interface AnalyticsData {
  totalRides: number;
  completedRides: number;
  cancelledRides: number;
  totalEarnings: number;
  totalReports: number;
  openReports: number;
  resolvedReports: number;
  totalPassengers: number;
  totalDrivers: number;
  cashPayments: number;
  cardPayments: number;
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  const { colors, spacing, typography, borderRadius, shadows } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        minWidth: "45%",
        ...shadows.small,
      }}
    >
      <Text
        style={{
          fontSize: typography.sizes["2xl"] ?? 24,
          fontFamily: typography.fonts.heading,
          color: color ?? colors.textPrimary,
          marginBottom: 2,
        }}
      >
        {typeof value === "number" ? value.toLocaleString() : value}
      </Text>
      <Text
        style={{
          fontSize: typography.sizes.xs,
          fontFamily: typography.fonts.bodyRegular,
          color: colors.textMuted,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function SectionTitle({ text }: { text: string }) {
  const { colors, spacing, typography } = useTheme();
  return (
    <Text
      style={{
        fontSize: typography.sizes.base,
        fontFamily: typography.fonts.headingSemiBold,
        color: colors.textPrimary,
        marginBottom: spacing.sm,
        marginTop: spacing.lg,
      }}
    >
      {text}
    </Text>
  );
}

export default function AnalyticsScreen(): React.JSX.Element {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const [period, setPeriod] = useState<Period>("today");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData>({
    totalRides: 0,
    completedRides: 0,
    cancelledRides: 0,
    totalEarnings: 0,
    totalReports: 0,
    openReports: 0,
    resolvedReports: 0,
    totalPassengers: 0,
    totalDrivers: 0,
    cashPayments: 0,
    cardPayments: 0,
  });

  const getStartDate = useCallback((p: Period): Date => {
    const now = new Date();
    switch (p) {
      case "today":
        now.setHours(0, 0, 0, 0);
        return now;
      case "week":
        now.setDate(now.getDate() - now.getDay());
        now.setHours(0, 0, 0, 0);
        return now;
      case "month":
        return new Date(now.getFullYear(), now.getMonth(), 1);
      case "year":
        return new Date(now.getFullYear(), 0, 1);
    }
  }, []);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    const startDate = getStartDate(period);
    const startTimestamp = Timestamp.fromDate(startDate);

    try {
      // Fetch rides for the period
      const ridesSnap = await getDocs(
        query(
          collection(db, Collections.RIDES),
          where("createdAt", ">=", startTimestamp),
        ),
      );

      let completedRides = 0;
      let cancelledRides = 0;
      let cashPayments = 0;
      let cardPayments = 0;

      ridesSnap.forEach((d) => {
        const ride = d.data();
        if (ride.status === "completed") {
          completedRides++;
          if (ride.paymentMethod === "cash") cashPayments++;
          if (ride.paymentMethod === "card") cardPayments++;
        }
        if (ride.status === "cancelled") cancelledRides++;
      });

      // Fetch earnings for the period
      const earningsSnap = await getDocs(
        query(
          collection(db, Collections.EARNINGS),
          where("createdAt", ">=", startTimestamp),
        ),
      );

      let totalEarnings = 0;
      earningsSnap.forEach((d) => {
        totalEarnings += d.data().amount ?? 0;
      });

      // Fetch reports for the period
      const reportsSnap = await getDocs(
        query(
          collection(db, Collections.REPORTS),
          where("createdAt", ">=", startTimestamp),
        ),
      );

      let openReports = 0;
      let resolvedReports = 0;
      reportsSnap.forEach((d) => {
        const report = d.data();
        if (report.status === "open" || report.status === "under_review")
          openReports++;
        if (report.status === "resolved") resolvedReports++;
      });

      // Fetch total users (not period-filtered — total counts)
      const passengersSnap = await getDocs(
        collection(db, Collections.PASSENGERS),
      );
      const driversSnap = await getDocs(collection(db, Collections.DRIVERS));

      setData({
        totalRides: ridesSnap.size,
        completedRides,
        cancelledRides,
        totalEarnings,
        totalReports: reportsSnap.size,
        openReports,
        resolvedReports,
        totalPassengers: passengersSnap.size,
        totalDrivers: driversSnap.size,
        cashPayments,
        cardPayments,
      });
    } catch (err) {
      console.error("Error fetching analytics:", err);
    } finally {
      setLoading(false);
    }
  }, [period, getStartDate]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

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
      marginBottom: spacing.md,
    },
    periodRow: {
      flexDirection: "row",
      gap: spacing.sm,
    },
    pill: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.full,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    pillActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    pillText: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.textSecondary,
    },
    pillTextActive: {
      color: colors.textInverse,
    },
    scrollContent: {
      padding: spacing.screenPadding,
      paddingBottom: spacing.xxl + 40,
    },
    row: {
      flexDirection: "row",
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <Text style={styles.title}>Analytics</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.periodRow}
        >
          {PERIODS.map((p) => (
            <TouchableOpacity
              key={p.value}
              style={[styles.pill, period === p.value && styles.pillActive]}
              onPress={() => setPeriod(p.value)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.pillText,
                  period === p.value && styles.pillTextActive,
                ]}
              >
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <LoadingSpinner message="Loading analytics..." />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <SectionTitle text="Rides" />
          <View style={styles.row}>
            <StatCard label="Total Rides" value={data.totalRides} />
            <StatCard
              label="Completed"
              value={data.completedRides}
              color={colors.success}
            />
          </View>
          <View style={styles.row}>
            <StatCard
              label="Cancelled"
              value={data.cancelledRides}
              color={colors.error}
            />
            <StatCard
              label="Completion Rate"
              value={
                data.totalRides > 0
                  ? `${Math.round((data.completedRides / data.totalRides) * 100)}%`
                  : "0%"
              }
            />
          </View>

          <SectionTitle text="Revenue" />
          <View style={styles.row}>
            <StatCard
              label="Total Earnings"
              value={`₦${data.totalEarnings.toLocaleString()}`}
              color={colors.primary}
            />
          </View>
          <View style={styles.row}>
            <StatCard label="Cash Payments" value={data.cashPayments} />
            <StatCard label="Card Payments" value={data.cardPayments} />
          </View>

          <SectionTitle text="Reports" />
          <View style={styles.row}>
            <StatCard label="Total Reports" value={data.totalReports} />
            <StatCard
              label="Open"
              value={data.openReports}
              color={colors.warning}
            />
          </View>
          <View style={styles.row}>
            <StatCard
              label="Resolved"
              value={data.resolvedReports}
              color={colors.success}
            />
            <StatCard
              label="Resolution Rate"
              value={
                data.totalReports > 0
                  ? `${Math.round((data.resolvedReports / data.totalReports) * 100)}%`
                  : "0%"
              }
            />
          </View>

          <SectionTitle text="Users" />
          <View style={styles.row}>
            <StatCard label="Total Passengers" value={data.totalPassengers} />
            <StatCard label="Total Drivers" value={data.totalDrivers} />
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
