import { EmptyState } from "@/components/common/EmptyState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useTheme } from "@/hooks/useTheme";
import { db } from "@/services/firebaseConfig";
import { Collections } from "@/types/database";
import { Report, ReportCategory, ReportStatus } from "@/types/report";
import { router } from "expo-router";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { ShieldAlert } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  ScrollView,
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

function CategoryBadge({ category }: { category: ReportCategory }) {
  const { typography, borderRadius, spacing } = useTheme();
  const colors = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.other;
  return (
    <View
      style={{
        backgroundColor: colors.bg,
        borderRadius: borderRadius.sm,
        paddingHorizontal: spacing.sm,
        paddingVertical: 3,
        alignSelf: "flex-start",
      }}
    >
      <Text
        style={{
          fontSize: typography.sizes.xs,
          fontFamily: typography.fonts.bodyMedium,
          color: colors.fg,
        }}
      >
        {CATEGORY_LABELS[category] ?? "Other"}
      </Text>
    </View>
  );
}

function StatusBadge({ status }: { status: ReportStatus }) {
  const { typography, borderRadius, spacing } = useTheme();
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.open;
  return (
    <View
      style={{
        backgroundColor: cfg.bg,
        borderRadius: borderRadius.sm,
        paddingHorizontal: spacing.sm,
        paddingVertical: 3,
        alignSelf: "flex-start",
      }}
    >
      <Text
        style={{
          fontSize: typography.sizes.xs,
          fontFamily: typography.fonts.bodyMedium,
          color: cfg.fg,
        }}
      >
        {cfg.label}
      </Text>
    </View>
  );
}

interface EnrichedReport extends Report {
  reporterName?: string;
  reportedName?: string;
}

function ReportCard({
  report,
  onPress,
}: {
  report: EnrichedReport;
  onPress: () => void;
}) {
  const { colors, spacing, typography, borderRadius, shadows } = useTheme();

  const date = report.createdAt?.toDate?.();
  const dateStr = date
    ? date.toLocaleDateString("en-NG", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

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
        <CategoryBadge category={report.category} />
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
          fontFamily: typography.fonts.bodyMedium,
          color: colors.textPrimary,
          marginBottom: spacing.xs,
        }}
      >
        {report.reporterName ?? "Unknown"}{" "}
        <Text
          style={{
            fontFamily: typography.fonts.bodyRegular,
            color: colors.textSecondary,
          }}
        >
          reported
        </Text>{" "}
        {report.reportedName ?? "Unknown user"}
      </Text>

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
        <StatusBadge status={report.status} />
      </View>
    </TouchableOpacity>
  );
}

export default function AdminReportsScreen(): React.JSX.Element {
  const { colors, spacing, typography, borderRadius } = useTheme();

  const [reports, setReports] = useState<EnrichedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterValue>("all");

  useEffect(() => {
    const q = query(
      collection(db, Collections.REPORTS),
      orderBy("createdAt", "desc"),
    );

    const unsub = onSnapshot(q, async (snap) => {
      const raw = snap.docs.map((d) => ({
        reportId: d.id,
        ...d.data(),
      })) as Report[];

      const {
        getDocs,
        collection: col,
        query: q2,
        where,
      } = await import("firebase/firestore");
      const { db: firestoreDb } = await import("@/services/firebaseConfig");

      const allUids = new Set<string>();
      raw.forEach((r) => {
        if (r.reporterId) allUids.add(r.reporterId);
        if (r.reportedUserId) allUids.add(r.reportedUserId);
      });

      const nameMap: Record<string, string> = {};

      if (allUids.size > 0) {
        const uids = Array.from(allUids);

        const fetchNames = async (collectionName: string, idField: string) => {
          // Firestore 'in' max 30 per query
          for (let i = 0; i < uids.length; i += 30) {
            const batch = uids.slice(i, i + 30);
            try {
              const snap2 = await getDocs(
                q2(
                  col(firestoreDb, collectionName),
                  where(idField, "in", batch),
                ),
              );
              snap2.forEach((d) => {
                const data = d.data();
                nameMap[d.id] = data.name ?? "Unknown";
              });
            } catch {
              // ignore
            }
          }
        };

        await Promise.all([
          fetchNames(Collections.PASSENGERS, "uid"),
          fetchNames(Collections.DRIVERS, "uid"),
        ]);
      }

      const enriched: EnrichedReport[] = raw.map((r) => ({
        ...r,
        reporterName: nameMap[r.reporterId] ?? "Unknown",
        reportedName: r.reportedUserId
          ? (nameMap[r.reportedUserId] ?? "Unknown")
          : "N/A",
      }));

      setReports(enriched);
      setLoading(false);
    });

    return unsub;
  }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return reports;
    return reports.filter((r) => r.status === filter);
  }, [reports, filter]);

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      paddingHorizontal: spacing.screenPadding,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
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
    filterRow: {
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
    list: {
      padding: spacing.screenPadding,
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <Text style={styles.title}>Incident Reports</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterRow}
          contentContainerStyle={{ gap: spacing.sm }}
        >
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
        </ScrollView>
      </View>

      {loading ? (
        <LoadingSpinner message="Loading reports..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<ShieldAlert size={56} color={colors.textMuted} />}
          title="No Reports"
          message={
            filter === "all"
              ? "No incident reports yet."
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
                  pathname: "/(admin)/report-review",
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
