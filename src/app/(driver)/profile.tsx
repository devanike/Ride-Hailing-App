import { Button } from "@/components/common/Button";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useTheme } from "@/hooks/useTheme";
import { logout } from "@/services/authService";
import { auth, db } from "@/services/firebaseConfig";
import { Collections } from "@/types/database";
import { Driver } from "@/types/driver";
import { showError } from "@/utils/toast";
import { router } from "expo-router";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import {
  ChevronRight,
  Flag,
  HelpCircle,
  Pencil,
  Shield,
  Star,
} from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface MenuItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
}

function VehicleTypeBadge({ type }: { type: string }) {
  const { colors, typography, spacing, borderRadius } = useTheme();
  const label =
    type === "car" ? "Car" : type === "tricycle" ? "Tricycle" : "Bus";
  return (
    <View
      style={{
        backgroundColor: colors.infoBackground,
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
          color: colors.info,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

export default function DriverProfileScreen(): React.JSX.Element {
  const { colors, spacing, typography, borderRadius, shadows } = useTheme();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  const unsubDriverRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (!user) setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!currentUser?.uid) return;

    const unsubDoc = onSnapshot(
      doc(db, Collections.DRIVERS, currentUser.uid),
      (snap) => {
        if (snap.exists()) setDriver(snap.data() as Driver);
        setLoading(false);
      },
    );

    unsubDriverRef.current = unsubDoc;
    return () => unsubDoc();
  }, [currentUser?.uid]);

  const handleLogout = useCallback(async (): Promise<void> => {
    setLoggingOut(true);
    try {
      if (unsubDriverRef.current) unsubDriverRef.current();
      await logout();
      router.replace("/(auth)/welcome");
    } catch (err) {
      console.error("Logout failed:", err);
      showError("Error", "Could not log out. Please try again.");
      setLoggingOut(false);
    }
  }, []);

  const menuItems: MenuItem[] = [
    {
      key: "edit-profile",
      label: "Edit Profile",
      icon: <Pencil size={20} color={colors.textSecondary} />,
      onPress: () => router.push("/edit-profile"),
    },
    {
      key: "reports-received",
      label: "Reports Filed Against Me",
      icon: <Flag size={20} color={colors.textSecondary} />,
      onPress: () => router.push("/(driver)/reports-received"),
    },
    {
      key: "security",
      label: "Security Settings",
      icon: <Shield size={20} color={colors.textSecondary} />,
      onPress: () => router.push("/security-settings"),
    },
    {
      key: "help",
      label: "Help",
      icon: <HelpCircle size={20} color={colors.textSecondary} />,
      onPress: () => router.push("/help"),
    },
  ];

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
    scroll: { flex: 1 },
    scrollContent: {
      padding: spacing.screenPadding,
      paddingBottom: spacing.xxl,
    },

    // Profile header
    profileSection: {
      alignItems: "center",
      paddingVertical: spacing.xl,
    },
    photoWrapper: {
      position: "relative",
      marginBottom: spacing.md,
    },
    photo: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.backgroundAlt,
    },
    photoPlaceholder: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.backgroundAlt,
      alignItems: "center",
      justifyContent: "center",
    },
    photoInitial: {
      fontSize: typography.sizes["3xl"],
      fontFamily: typography.fonts.heading,
      color: colors.textMuted,
    },
    editOverlay: {
      position: "absolute",
      bottom: 0,
      right: 0,
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: colors.surface,
    },
    nameText: {
      fontSize: typography.sizes.xl,
      fontFamily: typography.fonts.heading,
      color: colors.textPrimary,
      marginBottom: spacing.xs,
    },
    phoneText: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.textMuted,
      marginBottom: spacing.md,
    },
    ratingRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      marginBottom: spacing.xs,
    },
    ratingText: {
      fontSize: typography.sizes.base,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.textPrimary,
    },
    tripsRow: {
      alignItems: "center",
    },
    tripsCount: {
      fontSize: typography.sizes.lg,
      fontFamily: typography.fonts.heading,
      color: colors.textPrimary,
    },
    tripsLabel: {
      fontSize: typography.sizes.xs,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.textMuted,
    },

    // Vehicle card
    card: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      marginBottom: spacing.lg,
      ...shadows.medium,
    },
    cardTitle: {
      fontSize: typography.sizes.base,
      fontFamily: typography.fonts.headingSemiBold,
      color: colors.textPrimary,
      marginBottom: spacing.md,
    },
    vehicleRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: spacing.xs,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    vehicleRowLast: {
      borderBottomWidth: 0,
    },
    vehicleLabel: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.textMuted,
    },
    vehicleValue: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.textPrimary,
    },

    // Menu card
    menuCard: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      marginBottom: spacing.lg,
      overflow: "hidden",
      ...shadows.medium,
    },
    menuItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
    },
    menuIcon: {
      width: 36,
      alignItems: "center",
    },
    menuLabel: {
      flex: 1,
      fontSize: typography.sizes.base,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.textPrimary,
      marginLeft: spacing.sm,
    },
    menuItemDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginLeft: spacing.md + 36 + spacing.sm,
    },
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
        </View>
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  const vehicleType = driver?.vehicleType ?? "car";
  const isCar = vehicleType === "car";

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile header */}
        <View style={styles.profileSection}>
          <TouchableOpacity
            style={styles.photoWrapper}
            onPress={() => router.push("/edit-profile")}
            activeOpacity={0.8}
          >
            {driver?.profilePhoto ? (
              <Image
                source={{ uri: driver.profilePhoto }}
                style={styles.photo}
              />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Text style={styles.photoInitial}>
                  {driver?.name?.charAt(0).toUpperCase() ?? "?"}
                </Text>
              </View>
            )}
            <View style={styles.editOverlay}>
              <Pencil size={12} color={colors.textInverse} />
            </View>
          </TouchableOpacity>

          <Text style={styles.nameText}>{driver?.name ?? "—"}</Text>
          <Text style={styles.phoneText}>
            {driver?.phone ?? currentUser?.phoneNumber ?? "—"}
          </Text>

          <View style={styles.ratingRow}>
            <Star size={16} color={colors.warning} fill={colors.warning} />
            <Text style={styles.ratingText}>
              {driver?.rating?.toFixed(1) ?? "0.0"}
            </Text>
            <Text style={[styles.ratingText, { color: colors.textMuted }]}>
              ({driver?.totalRatings ?? 0})
            </Text>
          </View>

          <View style={styles.tripsRow}>
            <Text style={styles.tripsCount}>{driver?.completedRides ?? 0}</Text>
            <Text style={styles.tripsLabel}>Total Trips</Text>
          </View>
        </View>

        {/* Vehicle card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>My Vehicle</Text>
          <View style={{ marginBottom: spacing.sm }}>
            <VehicleTypeBadge type={vehicleType} />
          </View>

          {isCar && (
            <>
              <View style={styles.vehicleRow}>
                <Text style={styles.vehicleLabel}>Make</Text>
                <Text style={styles.vehicleValue}>
                  {driver?.vehicleMake ?? "—"}
                </Text>
              </View>
              <View style={styles.vehicleRow}>
                <Text style={styles.vehicleLabel}>Model</Text>
                <Text style={styles.vehicleValue}>
                  {driver?.vehicleModel ?? "—"}
                </Text>
              </View>
            </>
          )}

          <View style={styles.vehicleRow}>
            <Text style={styles.vehicleLabel}>Colour</Text>
            <Text style={styles.vehicleValue}>
              {driver?.vehicleColor ?? "—"}
            </Text>
          </View>
          <View style={[styles.vehicleRow, styles.vehicleRowLast]}>
            <Text style={styles.vehicleLabel}>Plate Number</Text>
            <Text style={styles.vehicleValue}>
              {driver?.plateNumber ?? "—"}
            </Text>
          </View>
        </View>

        {/* Menu */}
        <View style={styles.menuCard}>
          {menuItems.map((item, index) => (
            <React.Fragment key={item.key}>
              {index > 0 && <View style={styles.menuItemDivider} />}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={item.onPress}
                activeOpacity={0.7}
              >
                <View style={styles.menuIcon}>{item.icon}</View>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <ChevronRight size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </View>

        {/* Logout */}
        <Button
          title="Log Out"
          onPress={handleLogout}
          variant="danger"
          fullWidth
          loading={loggingOut}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
