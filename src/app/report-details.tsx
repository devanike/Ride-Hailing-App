import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useTheme } from "@/hooks/useTheme";
import { db } from "@/services/firebaseConfig";
import { Collections } from "@/types/database";
import { Report, ReportCategory, ReportStatus } from "@/types/report";
import { Ride } from "@/types/ride";
import { router, useLocalSearchParams } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { ArrowLeft } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
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
  driver_misconduct: "Driver Misconduct",
  payment_dispute: "Payment Dispute",
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
  { label: string; bannerBg: string; bannerFg: string }
> = {
  open: { label: "Open", bannerBg: "#FEE2E2", bannerFg: "#EF4444" },
  under_review: {
    label: "Under Review",
    bannerBg: "#FEF3C7",
    bannerFg: "#F59E0B",
  },
  resolved: { label: "Resolved", bannerBg: "#D1FAE5", bannerFg: "#10B981" },
};

export default function ReportDetailsScreen(): React.JSX.Element {
  const { colors, spacing, typography, borderRadius, shadows } = useTheme();
  const { reportId } = useLocalSearchParams<{ reportId: string }>();

  const [report, setReport] = useState<Report | null>(null);
  const [ride, setRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(true);
  const [lightboxUri, setLightboxUri] = useState<string | null>(null);

  useEffect(() => {
    if (!reportId) return;
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, Collections.REPORTS, reportId));
        if (!snap.exists()) return;
        const data = { reportId: snap.id, ...snap.data() } as Report;
        setReport(data);
        if (data.rideId) {
          const rideSnap = await getDoc(
            doc(db, Collections.RIDES, data.rideId),
          );
          if (rideSnap.exists())
            setRide({ rideId: rideSnap.id, ...rideSnap.data() } as Ride);
        }
      } catch (err) {
        console.error("Error loading report:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [reportId]);

  if (loading) return <LoadingSpinner message="Loading report..." />;

  const statusCfg = report
    ? (STATUS_CONFIG[report.status] ?? STATUS_CONFIG.open)
    : STATUS_CONFIG.open;
  const catColors = report
    ? (CATEGORY_COLORS[report.category] ?? CATEGORY_COLORS.other)
    : CATEGORY_COLORS.other;

  const submittedStr = report?.createdAt?.toDate?.()
    ? report.createdAt
        .toDate()
        .toLocaleDateString("en-NG", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
    : "—";

  const resolvedStr = report?.reviewedAt?.toDate?.()
    ? report.reviewedAt
        .toDate()
        .toLocaleDateString("en-NG", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
    : "—";

  const rideStr = ride
    ? `${ride.pickupLocation.address} → ${ride.dropoffLocation.address}`
    : null;

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.backgroundAlt },
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
    statusBanner: {
      paddingVertical: spacing.md,
      alignItems: "center",
      justifyContent: "center",
    },
    statusBannerText: {
      fontSize: typography.sizes.base,
      fontFamily: typography.fonts.headingSemiBold,
    },
    scroll: { padding: spacing.screenPadding, paddingBottom: spacing.xxl },
    card: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.small,
    },
    cardTitle: {
      fontSize: typography.sizes.xs,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginBottom: spacing.sm,
    },
    infoRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      paddingVertical: spacing.xs,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    infoRowLast: { borderBottomWidth: 0 },
    infoLabel: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.textSecondary,
    },
    infoValue: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.textPrimary,
      flex: 1,
      textAlign: "right",
      marginLeft: spacing.md,
    },
    descriptionText: {
      fontSize: typography.sizes.base,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.textPrimary,
      lineHeight: typography.sizes.base * typography.lineHeights.relaxed,
    },
    photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
    photo: { width: 96, height: 96, borderRadius: borderRadius.md },
    resolutionText: {
      fontSize: typography.sizes.base,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.textPrimary,
      lineHeight: typography.sizes.base * typography.lineHeights.relaxed,
      marginBottom: spacing.sm,
    },
    resolvedDate: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.textMuted,
    },
    notFoundContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    notFoundText: {
      fontSize: typography.sizes.base,
      color: colors.textSecondary,
    },
    lightboxOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.92)",
      justifyContent: "center",
      alignItems: "center",
    },
    lightboxImage: {
      width: "92%",
      height: "70%",
      borderRadius: borderRadius.md,
    },
  });

  if (!report) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
            <ArrowLeft size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Report Details</Text>
        </View>
        <View style={styles.notFoundContainer}>
          <Text style={styles.notFoundText}>Report not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report Details</Text>
      </View>

      {/* Status banner */}
      <View
        style={[styles.statusBanner, { backgroundColor: statusCfg.bannerBg }]}
      >
        <Text style={[styles.statusBannerText, { color: statusCfg.bannerFg }]}>
          {statusCfg.label}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Info card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Details</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Category</Text>
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
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Date Submitted</Text>
            <Text style={styles.infoValue}>{submittedStr}</Text>
          </View>

          {rideStr && (
            <View style={[styles.infoRow, styles.infoRowLast]}>
              <Text style={styles.infoLabel}>Trip</Text>
              <Text style={styles.infoValue} numberOfLines={2}>
                {rideStr}
              </Text>
            </View>
          )}
          {!rideStr && <View style={{ height: 0 }} />}
        </View>

        {/* Description card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Description</Text>
          <Text style={styles.descriptionText}>
            {report.description || "No description provided."}
          </Text>
        </View>

        {/* Evidence photos */}
        {report.evidencePhotos && report.evidencePhotos.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Evidence Photos</Text>
            <View style={styles.photoGrid}>
              {report.evidencePhotos.map((uri, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => setLightboxUri(uri)}
                  activeOpacity={0.85}
                >
                  <Image source={{ uri }} style={styles.photo} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Resolution card — only if resolved */}
        {report.status === "resolved" && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Resolution</Text>
            <Text style={styles.resolutionText}>
              {report.resolution ||
                report.adminNotes ||
                "No resolution notes provided."}
            </Text>
            <Text style={styles.resolvedDate}>Resolved on {resolvedStr}</Text>
          </View>
        )}
      </ScrollView>

      {/* Lightbox */}
      <Modal
        visible={lightboxUri !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setLightboxUri(null)}
      >
        <Pressable
          style={styles.lightboxOverlay}
          onPress={() => setLightboxUri(null)}
        >
          {lightboxUri && (
            <Image
              source={{ uri: lightboxUri }}
              style={styles.lightboxImage}
              resizeMode="contain"
            />
          )}
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
