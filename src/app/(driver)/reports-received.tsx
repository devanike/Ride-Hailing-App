import { EmptyState } from "@/components/common/EmptyState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useTheme } from "@/hooks/useTheme";
import { auth, db } from "@/services/firebaseConfig";
import { Collections } from "@/types/database";
import { Report, ReportCategory, ReportStatus } from "@/types/report";
import { router } from "expo-router";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { ArrowLeft, ShieldAlert } from "lucide-react-native";
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

function CategoryBadge({ category }: { category: ReportCategory }) {
  const { typography, borderRadius, spacing } = useTheme();
  const { bg, fg } = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.other;
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
        {CATEGORY_LABELS[category] ?? "Other"}
      </Text>
    </View>
  );
}

function StatusBadge({ status }: { status: ReportStatus }) {
  const { typography, borderRadius, spacing } = useTheme();
  const { label, bg, fg } = STATUS_CONFIG[status] ?? STATUS_CONFIG.open;
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

function ReportCard({
  report,
  onPress,
}: {
  report: Report;
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
        ...shadows.medium,
      }}
    >
      {/* Top row: category badge + date */}
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

      {/* Description preview */}
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

      <StatusBadge status={report.status} />
    </TouchableOpacity>
  );
}

export default function ReportsReceivedScreen(): React.JSX.Element {
  const { colors, spacing, typography } = useTheme();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
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
      collection(db, Collections.REPORTS),
      where("reportedUserId", "==", currentUser.uid),
      orderBy("createdAt", "desc"),
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({
        reportId: d.id,
        ...d.data(),
      })) as Report[];
      setReports(data);
      setLoading(false);
    });

    return unsub;
  }, [currentUser?.uid]);

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
    list: {
      padding: spacing.screenPadding,
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Reports Against Me</Text>
      </View>

      {loading ? (
        <LoadingSpinner message="Loading reports..." />
      ) : reports.length === 0 ? (
        <EmptyState
          icon={<ShieldAlert size={64} color={colors.textMuted} />}
          title="No Reports"
          message="No reports filed against you."
        />
      ) : (
        <FlatList
          data={reports}
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
