import { EmptyState } from "@/components/common/EmptyState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useTheme } from "@/hooks/useTheme";
import { auth } from "@/services/firebaseConfig";
import { getMyReports } from "@/services/reportService";
import { Report, ReportCategory, ReportStatus } from "@/types/report";
import { router } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { ArrowLeft, FileText } from "lucide-react-native";
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

const CATEGORY_LABELS: Record<ReportCategory, string> = {
  safety: "Safety",
  lost_item: "Lost Item",
  driver_misconduct: "Misconduct",
  payment_dispute: "Payment",
  other: "Other",
};

const CATEGORY_COLORS: Record<ReportCategory, { bg: string; fg: string }> = {
  safety: { bg: "#FEE2E2", fg: "#EF4444" },
  lost_item: { bg: "#DBEAFE", fg: "#3B82F6" },
  driver_misconduct: { bg: "#FEF3C7", fg: "#F59E0B" },
  payment_dispute: { bg: "#D1FAE5", fg: "#10B981" },
  other: { bg: "#F3F4F6", fg: "#6B7280" },
};

const STATUS_CONFIG: Record<
  ReportStatus,
  { label: string; bg: string; fg: string }
> = {
  open: { label: "Open", bg: "#FEE2E2", fg: "#EF4444" },
  under_review: { label: "Under Review", bg: "#FEF3C7", fg: "#F59E0B" },
  resolved: { label: "Resolved", bg: "#D1FAE5", fg: "#10B981" },
};

type FilterValue = "all" | ReportStatus;

const FILTERS: { label: string; value: FilterValue }[] = [
  { label: "All", value: "all" },
  { label: "Open", value: "open" },
  { label: "Under Review", value: "under_review" },
  { label: "Resolved", value: "resolved" },
];

function ReportCard({
  report,
  onPress,
}: {
  report: Report;
  onPress: () => void;
}) {
  const { colors, spacing, typography, borderRadius, shadows } = useTheme();
  const dateStr = report.createdAt?.toDate?.()
    ? report.createdAt.toDate().toLocaleDateString("en-NG", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";
  const catColors = CATEGORY_COLORS[report.category] ?? CATEGORY_COLORS.other;
  const statusCfg = STATUS_CONFIG[report.status] ?? STATUS_CONFIG.open;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
        ...shadows.medium,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: spacing.sm,
        }}
      >
        <View
          style={{
            backgroundColor: catColors.bg,
            borderRadius: borderRadius.sm,
            paddingHorizontal: spacing.sm,
            paddingVertical: 3,
          }}
        >
          <Text
            style={{
              fontSize: typography.sizes.xs,
              fontFamily: typography.fonts.bodyMedium,
              color: catColors.fg,
            }}
          >
            {CATEGORY_LABELS[report.category] ?? "Other"}
          </Text>
        </View>
        <Text
          style={{
            fontSize: typography.sizes.xs,
            fontFamily: typography.fonts.bodyRegular,
            color: colors.textMuted,
          }}
        >
          {dateStr}
        </Text>
      </View>

      <Text
        style={{
          fontSize: typography.sizes.sm,
          fontFamily: typography.fonts.bodyRegular,
          color: colors.textSecondary,
          marginBottom: spacing.sm,
        }}
        numberOfLines={2}
      >
        {report.description || report.title || "No description provided."}
      </Text>

      <View style={{ alignItems: "flex-end" }}>
        <View
          style={{
            backgroundColor: statusCfg.bg,
            borderRadius: borderRadius.sm,
            paddingHorizontal: spacing.sm,
            paddingVertical: 3,
          }}
        >
          <Text
            style={{
              fontSize: typography.sizes.xs,
              fontFamily: typography.fonts.bodyMedium,
              color: statusCfg.fg,
            }}
          >
            {statusCfg.label}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function MyReportsScreen(): React.JSX.Element {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterValue>("all");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const data = await getMyReports(user.uid);
        data.sort(
          (a, b) =>
            (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0),
        );
        setReports(data);
      } catch {
        // silent — empty list shown
      } finally {
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  const filtered = useMemo(
    () =>
      filter === "all" ? reports : reports.filter((r) => r.status === filter),
    [reports, filter],
  );

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingHorizontal: spacing.screenPadding,
      paddingVertical: spacing.md,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      fontSize: typography.sizes["2xl"],
      fontFamily: typography.fonts.heading,
      color: colors.textPrimary,
    },
    filterRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
      paddingHorizontal: spacing.screenPadding,
      paddingVertical: spacing.md,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
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
    pillTextActive: { color: colors.textInverse },
    list: { padding: spacing.screenPadding },
  });

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Reports</Text>
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[styles.pill, filter === f.value && styles.pillActive]}
            onPress={() => setFilter(f.value)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.pillText,
                filter === f.value && styles.pillTextActive,
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <LoadingSpinner message="Loading reports..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<FileText size={56} color={colors.textMuted} />}
          title="No Reports"
          message={
            filter === "all"
              ? "You have not submitted any reports."
              : `No ${STATUS_CONFIG[filter as ReportStatus]?.label ?? filter} reports.`
          }
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.reportId}
          renderItem={({ item }) => (
            <ReportCard
              report={item}
              onPress={() =>
                router.push({
                  pathname: "/report-details",
                  params: { reportId: item.reportId },
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
