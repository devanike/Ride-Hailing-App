import { Button } from "@/components/common/Button";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useTheme } from "@/hooks/useTheme";
import { db } from "@/services/firebaseConfig";
import { Collections } from "@/types/database";
import { Driver } from "@/types/driver";
import { Passenger } from "@/types/passenger";
import { Report, ReportCategory, ReportStatus } from "@/types/report";
import { Ride } from "@/types/ride";
import { showError, showSuccess } from "@/utils/toast";
import { router, useLocalSearchParams } from "expo-router";
import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { ArrowLeft } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const CATEGORY_LABELS: Record<ReportCategory, string> = {
  safety: "Safety",
  lost_item: "Lost Item",
  driver_misconduct: "Misconduct",
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
  { label: string; bg: string; fg: string }
> = {
  open: { label: "Open", bg: "#FEE2E2", fg: "#EF4444" },
  under_review: { label: "Under Review", bg: "#FEF3C7", fg: "#F59E0B" },
  resolved: { label: "Resolved", bg: "#D1FAE5", fg: "#10B981" },
};

const STATUS_OPTIONS: ReportStatus[] = ["open", "under_review", "resolved"];

type UserProfile = (Passenger | Driver) & { userType: "passenger" | "driver" };

function SectionCard({ children }: { children: React.ReactNode }) {
  const { colors, spacing, borderRadius, shadows } = useTheme();
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
        ...shadows.small,
      }}
    >
      {children}
    </View>
  );
}

function SectionTitle({ text }: { text: string }) {
  const { colors, typography, spacing } = useTheme();
  return (
    <Text
      style={{
        fontSize: typography.sizes.xs,
        fontFamily: typography.fonts.bodyMedium,
        color: colors.textMuted,
        textTransform: "uppercase",
        letterSpacing: 0.8,
        marginBottom: spacing.sm,
      }}
    >
      {text}
    </Text>
  );
}

function UserRow({ user }: { user: UserProfile }) {
  const { colors, typography, spacing, borderRadius } = useTheme();
  return (
    <View
      style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}
    >
      {user.profilePhoto ? (
        <Image
          source={{ uri: user.profilePhoto }}
          style={{ width: 44, height: 44, borderRadius: 22 }}
        />
      ) : (
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: colors.backgroundAlt,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              fontSize: typography.sizes.lg,
              fontFamily: typography.fonts.heading,
              color: colors.textMuted,
            }}
          >
            {(user.name ?? "?")[0].toUpperCase()}
          </Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: typography.sizes.base,
            fontFamily: typography.fonts.bodyMedium,
            color: colors.textPrimary,
          }}
        >
          {user.name ?? "Unknown"}
        </Text>
        <Text
          style={{
            fontSize: typography.sizes.sm,
            fontFamily: typography.fonts.bodyRegular,
            color: colors.textSecondary,
          }}
        >
          {user.phone ?? "—"}
        </Text>
      </View>
      <View
        style={{
          backgroundColor: user.userType === "driver" ? "#DBEAFE" : "#D1FAE5",
          borderRadius: borderRadius.sm,
          paddingHorizontal: spacing.sm,
          paddingVertical: 3,
        }}
      >
        <Text
          style={{
            fontSize: typography.sizes.xs,
            fontFamily: typography.fonts.bodyMedium,
            color: user.userType === "driver" ? "#3B82F6" : "#10B981",
          }}
        >
          {user.userType === "driver" ? "Driver" : "Passenger"}
        </Text>
      </View>
    </View>
  );
}

export default function ReportReviewScreen(): React.JSX.Element {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const { reportId } = useLocalSearchParams<{ reportId: string }>();

  const [report, setReport] = useState<Report | null>(null);
  const [reporter, setReporter] = useState<UserProfile | null>(null);
  const [reportedUser, setReportedUser] = useState<UserProfile | null>(null);
  const [ride, setRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [selectedStatus, setSelectedStatus] = useState<ReportStatus>("open");
  const [resolutionNote, setResolutionNote] = useState("");
  const [lightboxUri, setLightboxUri] = useState<string | null>(null);

  useEffect(() => {
    if (!reportId) return;

    const unsub = onSnapshot(
      doc(db, Collections.REPORTS, reportId),
      async (snap) => {
        if (!snap.exists()) {
          setLoading(false);
          return;
        }

        const data = { reportId: snap.id, ...snap.data() } as Report;
        setReport(data);
        setSelectedStatus(data.status);
        setResolutionNote(data.adminNotes ?? "");

        const resolveUser = async (
          uid: string,
        ): Promise<UserProfile | null> => {
          for (const col of [Collections.PASSENGERS, Collections.DRIVERS]) {
            const userSnap = await getDoc(doc(db, col, uid));
            if (userSnap.exists()) {
              return {
                ...(userSnap.data() as Passenger | Driver),
                uid: userSnap.id,
                userType: col === Collections.DRIVERS ? "driver" : "passenger",
              } as UserProfile;
            }
          }
          return null;
        };

        const [rep, repd] = await Promise.all([
          resolveUser(data.reporterId),
          data.reportedUserId ? resolveUser(data.reportedUserId) : null,
        ]);

        setReporter(rep);
        setReportedUser(repd);

        if (data.rideId) {
          const rideSnap = await getDoc(
            doc(db, Collections.RIDES, data.rideId),
          );
          if (rideSnap.exists()) {
            setRide({ rideId: rideSnap.id, ...rideSnap.data() } as Ride);
          }
        }

        setLoading(false);
      },
    );

    return unsub;
  }, [reportId]);

  const handleSave = useCallback(async () => {
    if (!reportId || !report) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, Collections.REPORTS, reportId), {
        status: selectedStatus,
        adminNotes: resolutionNote.trim() || null,
        ...(selectedStatus === "resolved"
          ? {
              resolution: resolutionNote.trim() || null,
              reviewedAt: serverTimestamp(),
            }
          : {}),
        updatedAt: serverTimestamp(),
      });
      showSuccess("Saved", "Report status updated.");
    } catch (err) {
      console.error("Error saving report:", err);
      showError("Error", "Could not save changes.");
    } finally {
      setSaving(false);
    }
  }, [reportId, report, selectedStatus, resolutionNote]);

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
    scroll: {
      padding: spacing.screenPadding,
    },
    label: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.textSecondary,
    },
    value: {
      fontSize: typography.sizes.base,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.textPrimary,
    },
    statusOption: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.sm,
      borderWidth: 1,
      borderColor: colors.border,
      marginRight: spacing.sm,
    },
    statusOptionActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primary,
    },
    statusOptionText: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.textSecondary,
    },
    statusOptionTextActive: {
      color: colors.textInverse,
    },
    noteInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: borderRadius.md,
      padding: spacing.md,
      fontSize: typography.sizes.base,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.textPrimary,
      backgroundColor: colors.background,
      minHeight: 100,
      textAlignVertical: "top",
      marginTop: spacing.sm,
    },
    photo: {
      width: 100,
      height: 100,
      borderRadius: borderRadius.md,
      marginRight: spacing.sm,
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

  if (loading) {
    return <LoadingSpinner message="Loading report..." />;
  }

  if (!report) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
            <ArrowLeft size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Review Report</Text>
        </View>
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <Text
            style={{
              fontSize: typography.sizes.base,
              color: colors.textSecondary,
            }}
          >
            Report not found.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const rideDate = ride?.createdAt?.toDate?.();
  const rideDateStr = rideDate
    ? rideDate.toLocaleDateString("en-NG", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

  const catColors = CATEGORY_COLORS[report.category] ?? CATEGORY_COLORS.other;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review Report</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Reporter */}
        {reporter && (
          <SectionCard>
            <SectionTitle text="Reporter" />
            <UserRow user={reporter} />
          </SectionCard>
        )}

        {/* Reported user */}
        {reportedUser && (
          <SectionCard>
            <SectionTitle text="Reported User" />
            <UserRow user={reportedUser} />
          </SectionCard>
        )}

        {/* Trip */}
        {ride && (
          <SectionCard>
            <SectionTitle text="Trip" />
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: spacing.xs,
              }}
            >
              <Text style={styles.label}>Date</Text>
              <Text style={styles.value}>{rideDateStr}</Text>
            </View>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: spacing.xs,
              }}
            >
              <Text style={styles.label}>From</Text>
              <Text
                style={[
                  styles.value,
                  { flex: 1, textAlign: "right", marginLeft: spacing.md },
                ]}
                numberOfLines={1}
              >
                {ride.pickupLocation?.address ?? "—"}
              </Text>
            </View>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: spacing.xs,
              }}
            >
              <Text style={styles.label}>To</Text>
              <Text
                style={[
                  styles.value,
                  { flex: 1, textAlign: "right", marginLeft: spacing.md },
                ]}
                numberOfLines={1}
              >
                {ride.dropoffLocation?.address ?? "—"}
              </Text>
            </View>
            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <Text style={styles.label}>Fare</Text>
              <Text style={styles.value}>
                NGN {(ride.agreedFare ?? 0).toLocaleString()}
              </Text>
            </View>
          </SectionCard>
        )}

        {/* Description */}
        <SectionCard>
          <SectionTitle text="Description" />
          <View
            style={{
              backgroundColor: catColors.bg,
              borderRadius: borderRadius.sm,
              paddingHorizontal: spacing.sm,
              paddingVertical: 3,
              alignSelf: "flex-start",
              marginBottom: spacing.sm,
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
              fontSize: typography.sizes.base,
              fontFamily: typography.fonts.bodyRegular,
              color: colors.textPrimary,
              lineHeight:
                typography.sizes.base * typography.lineHeights.relaxed,
            }}
          >
            {report.description || "No description provided."}
          </Text>
        </SectionCard>

        {/* Evidence photos */}
        {report.evidencePhotos && report.evidencePhotos.length > 0 && (
          <SectionCard>
            <SectionTitle text="Evidence Photos" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {report.evidencePhotos.map((uri, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => setLightboxUri(uri)}
                  activeOpacity={0.85}
                >
                  <Image source={{ uri }} style={styles.photo} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </SectionCard>
        )}

        {/* Status section */}
        <SectionCard>
          <SectionTitle text="Status" />

          {/* Current badge */}
          <View style={{ marginBottom: spacing.md }}>
            <Text style={[styles.label, { marginBottom: spacing.xs }]}>
              Current status
            </Text>
            <View
              style={{
                backgroundColor: STATUS_CONFIG[report.status]?.bg ?? "#F3F4F6",
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
                  color: STATUS_CONFIG[report.status]?.fg ?? "#6B7280",
                }}
              >
                {STATUS_CONFIG[report.status]?.label ?? report.status}
              </Text>
            </View>
          </View>

          {/* Status selector */}
          <Text style={[styles.label, { marginBottom: spacing.sm }]}>
            Update status
          </Text>
          <View style={{ flexDirection: "row", marginBottom: spacing.md }}>
            {STATUS_OPTIONS.map((s) => (
              <TouchableOpacity
                key={s}
                style={[
                  styles.statusOption,
                  selectedStatus === s && styles.statusOptionActive,
                ]}
                onPress={() => setSelectedStatus(s)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.statusOptionText,
                    selectedStatus === s && styles.statusOptionTextActive,
                  ]}
                >
                  {STATUS_CONFIG[s].label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Resolution note — only when Resolved selected */}
          {selectedStatus === "resolved" && (
            <>
              <Text style={styles.label}>Resolution note</Text>
              <TextInput
                style={styles.noteInput}
                placeholder="Describe how this was resolved..."
                placeholderTextColor={colors.textMuted}
                value={resolutionNote}
                onChangeText={setResolutionNote}
                multiline
              />
            </>
          )}

          <View style={{ marginTop: spacing.md }}>
            <Button
              title="Save Changes"
              onPress={handleSave}
              loading={saving}
              fullWidth
            />
          </View>
        </SectionCard>
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
