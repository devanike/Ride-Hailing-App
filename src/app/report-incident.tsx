import { Button } from "@/components/common/Button";
import { useTheme } from "@/hooks/useTheme";
import { auth, db } from "@/services/firebaseConfig";
import { submitReport } from "@/services/reportService";
import { uploadImage } from "@/services/uploadService";
import { Collections } from "@/types/database";
import { ReportCategory } from "@/types/report";
import { Ride } from "@/types/ride";
import { showError, showSuccess } from "@/utils/toast";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  ChevronDown,
  CreditCard,
  HelpCircle,
  Package,
  ShieldAlert,
  X,
} from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const MAX_DESCRIPTION = 1000;
const MAX_PHOTOS = 3;

interface CategoryOption {
  value: ReportCategory;
  label: string;
  Icon: React.ComponentType<{ size: number; color: string }>;
}

const CATEGORIES: CategoryOption[] = [
  { value: "safety", label: "Safety", Icon: ShieldAlert },
  { value: "lost_item", label: "Lost Item", Icon: Package },
  {
    value: "driver_misconduct",
    label: "Driver Misconduct",
    Icon: AlertTriangle,
  },
  { value: "payment_dispute", label: "Payment Dispute", Icon: CreditCard },
  { value: "other", label: "Other", Icon: HelpCircle },
];

interface PhotoSlot {
  uri: string;
  cloudinaryUrl?: string;
  uploading: boolean;
}

export default function ReportIncidentScreen(): React.JSX.Element {
  const { colors, spacing, typography, borderRadius, shadows } = useTheme();
  const params = useLocalSearchParams<{ rideId?: string }>();

  const [category, setCategory] = useState<ReportCategory | null>(null);
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<PhotoSlot[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [recentRides, setRecentRides] = useState<Ride[]>([]);
  const [selectedRideId, setSelectedRideId] = useState<string | null>(
    params.rideId ?? null,
  );
  const [ridesLoading, setRidesLoading] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [reportedUserId, setReportedUserId] = useState<string | null>(null);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setRidesLoading(false);
      return;
    }
    const q = query(
      collection(db, Collections.RIDES),
      where("passengerId", "==", uid),
      where("status", "==", "completed"),
      orderBy("createdAt", "desc"),
      limit(10),
    );
    getDocs(q)
      .then((snap) =>
        setRecentRides(
          snap.docs.map((d) => ({ rideId: d.id, ...d.data() })) as Ride[],
        ),
      )
      .catch(() => {})
      .finally(() => setRidesLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedRideId) {
      setReportedUserId(null);
      return;
    }
    getDoc(doc(db, Collections.RIDES, selectedRideId))
      .then((snap) => {
        if (snap.exists())
          setReportedUserId((snap.data() as Ride).driverId ?? null);
      })
      .catch(() => {});
  }, [selectedRideId]);

  const handlePickPhoto = useCallback(async () => {
    if (photos.length >= MAX_PHOTOS) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showError("Permission Denied", "Please allow access to your photos");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    const slot: PhotoSlot = { uri: result.assets[0].uri, uploading: true };
    setPhotos((prev) => [...prev, slot]);
    try {
      const url = await uploadImage(result.assets[0].uri, "report_evidence");
      setPhotos((prev) =>
        prev.map((p) =>
          p.uri === slot.uri
            ? { ...p, cloudinaryUrl: url, uploading: false }
            : p,
        ),
      );
    } catch {
      showError("Upload Failed", "Could not upload photo");
      setPhotos((prev) => prev.filter((p) => p.uri !== slot.uri));
    }
  }, [photos.length]);

  const handleRemovePhoto = useCallback((uri: string) => {
    setPhotos((prev) => prev.filter((p) => p.uri !== uri));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!category) {
      showError("Required", "Please select a category");
      return;
    }
    if (description.trim().length < 10) {
      showError(
        "Required",
        "Please describe what happened (at least 10 characters)",
      );
      return;
    }
    const uid = auth.currentUser?.uid;
    if (!uid) {
      showError("Error", "Please sign in and try again");
      return;
    }
    if (photos.some((p) => p.uploading)) {
      showError("Please wait", "Photos are still uploading");
      return;
    }
    setSubmitting(true);
    try {
      await submitReport({
        rideId: selectedRideId,
        reporterId: uid,
        reportedUserId,
        category,
        title: CATEGORIES.find((c) => c.value === category)?.label ?? "Report",
        description: description.trim(),
        evidencePhotos: photos
          .filter((p) => p.cloudinaryUrl)
          .map((p) => p.cloudinaryUrl!),
      });
      showSuccess("Submitted", "We will review your report shortly.");
      router.replace("/my-reports");
    } catch {
      showError("Failed", "Could not submit report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [category, description, photos, selectedRideId, reportedUserId]);

  const selectedRide = recentRides.find((r) => r.rideId === selectedRideId);

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
    scroll: { padding: spacing.screenPadding, paddingBottom: spacing.xxl },
    sectionLabel: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.textSecondary,
      marginBottom: spacing.sm,
    },
    section: { marginBottom: spacing.xl },
    categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
    categoryCard: {
      width: "47.5%",
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
      borderRadius: borderRadius.md,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: "center",
      gap: spacing.xs,
      ...shadows.small,
    },
    categoryCardActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + "10",
    },
    categoryLabel: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.textSecondary,
      textAlign: "center",
    },
    categoryLabelActive: { color: colors.primary },
    rideSelector: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.small,
    },
    rideSelectorRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      gap: spacing.sm,
    },
    rideSelectorText: {
      flex: 1,
      fontSize: typography.sizes.base,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.textPrimary,
    },
    rideSelectorPlaceholder: { color: colors.textMuted },
    rideOption: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    rideOptionActive: { backgroundColor: colors.primary + "10" },
    rideOptionText: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.textPrimary,
    },
    rideOptionSub: {
      fontSize: typography.sizes.xs,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.textMuted,
      marginTop: 2,
    },
    descInput: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: borderRadius.md,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      paddingBottom: spacing.md,
      fontSize: typography.sizes.base,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.textPrimary,
      minHeight: 110,
      textAlignVertical: "top",
    },
    charCount: {
      fontSize: typography.sizes.xs,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.textMuted,
      textAlign: "right",
      marginTop: spacing.xs,
    },
    photoRow: { flexDirection: "row", gap: spacing.sm },
    photoSlot: {
      width: 88,
      height: 88,
      borderRadius: borderRadius.md,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderStyle: "dashed",
      backgroundColor: colors.backgroundAlt,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    photoImage: { width: 88, height: 88, borderRadius: borderRadius.md },
    photoRemove: {
      position: "absolute",
      top: 4,
      right: 4,
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: colors.error,
      alignItems: "center",
      justifyContent: "center",
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report an Issue</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Category */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>What happened?</Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map(({ value, label, Icon }) => {
                const active = category === value;
                return (
                  <TouchableOpacity
                    key={value}
                    style={[
                      styles.categoryCard,
                      active && styles.categoryCardActive,
                    ]}
                    onPress={() => setCategory(value)}
                    activeOpacity={0.7}
                  >
                    <Icon
                      size={24}
                      color={active ? colors.primary : colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.categoryLabel,
                        active && styles.categoryLabelActive,
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Ride selector */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              Which trip was this about? (optional)
            </Text>
            {ridesLoading ? (
              <ActivityIndicator
                size="small"
                color={colors.primary}
                style={{ alignSelf: "flex-start" }}
              />
            ) : (
              <View style={styles.rideSelector}>
                <TouchableOpacity
                  style={styles.rideSelectorRow}
                  onPress={() => setDropdownOpen((v) => !v)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.rideSelectorText,
                      !selectedRide && styles.rideSelectorPlaceholder,
                    ]}
                    numberOfLines={1}
                  >
                    {selectedRide
                      ? `${selectedRide.pickupLocation.address} → ${selectedRide.dropoffLocation.address}`
                      : "Select a trip (optional)"}
                  </Text>
                  <ChevronDown size={18} color={colors.textMuted} />
                </TouchableOpacity>
                {dropdownOpen && (
                  <>
                    <TouchableOpacity
                      style={[
                        styles.rideOption,
                        !selectedRideId && styles.rideOptionActive,
                      ]}
                      onPress={() => {
                        setSelectedRideId(null);
                        setDropdownOpen(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.rideOptionText,
                          { color: colors.textMuted },
                        ]}
                      >
                        Not about a specific trip
                      </Text>
                    </TouchableOpacity>
                    {recentRides.length === 0 ? (
                      <View style={styles.rideOption}>
                        <Text style={styles.rideOptionSub}>
                          No completed trips found
                        </Text>
                      </View>
                    ) : (
                      recentRides.map((r) => {
                        const dateStr = r.createdAt?.toDate?.()
                          ? r.createdAt
                              .toDate()
                              .toLocaleDateString("en-NG", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })
                          : "—";
                        return (
                          <TouchableOpacity
                            key={r.rideId}
                            style={[
                              styles.rideOption,
                              selectedRideId === r.rideId &&
                                styles.rideOptionActive,
                            ]}
                            onPress={() => {
                              setSelectedRideId(r.rideId);
                              setDropdownOpen(false);
                            }}
                            activeOpacity={0.7}
                          >
                            <Text
                              style={styles.rideOptionText}
                              numberOfLines={1}
                            >
                              {r.pickupLocation.address} →{" "}
                              {r.dropoffLocation.address}
                            </Text>
                            <Text style={styles.rideOptionSub}>{dateStr}</Text>
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </>
                )}
              </View>
            )}
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Describe what happened</Text>
            <TextInput
              style={styles.descInput}
              value={description}
              onChangeText={(t) => setDescription(t.slice(0, MAX_DESCRIPTION))}
              placeholder="Provide as much detail as possible..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
            />
            <Text style={styles.charCount}>
              {description.length}/{MAX_DESCRIPTION}
            </Text>
          </View>

          {/* Evidence photos */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              Add photos (optional, up to {MAX_PHOTOS})
            </Text>
            <View style={styles.photoRow}>
              {photos.map((p) => (
                <View key={p.uri} style={styles.photoSlot}>
                  {p.uploading ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <>
                      <Image
                        source={{ uri: p.uri }}
                        style={styles.photoImage}
                      />
                      <TouchableOpacity
                        style={styles.photoRemove}
                        onPress={() => handleRemovePhoto(p.uri)}
                        activeOpacity={0.7}
                      >
                        <X size={12} color={colors.textInverse} />
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              ))}
              {photos.length < MAX_PHOTOS && (
                <TouchableOpacity
                  style={styles.photoSlot}
                  onPress={handlePickPhoto}
                  activeOpacity={0.7}
                >
                  <Camera size={24} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <Button
            title="Submit Report"
            onPress={handleSubmit}
            variant="primary"
            size="large"
            fullWidth
            loading={submitting}
            disabled={submitting}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
