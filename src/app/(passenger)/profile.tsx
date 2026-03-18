import { Button } from "@/components/common/Button";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useTheme } from "@/hooks/useTheme";
import { logout } from "@/services/authService";
import { auth, db } from "@/services/firebaseConfig";
import { Collections } from "@/types/database";
import { Passenger } from "@/types/passenger";
import { showError } from "@/utils/toast";
import { router } from "expo-router";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import {
  ChevronRight,
  FileText,
  HelpCircle,
  Pencil,
  Shield,
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

export default function ProfileScreen(): React.JSX.Element {
  const { colors, spacing, typography, borderRadius, shadows } = useTheme();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [passenger, setPassenger] = useState<Passenger | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  const unsubPassengerRef = useRef<(() => void) | null>(null);

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
      doc(db, Collections.PASSENGERS, currentUser.uid),
      (snap) => {
        if (snap.exists()) setPassenger(snap.data() as Passenger);
        setLoading(false);
      },
    );

    unsubPassengerRef.current = unsubDoc;
    return () => {
      unsubDoc();
    };
  }, [currentUser?.uid]);

  const handleLogout = useCallback(async (): Promise<void> => {
    setLoggingOut(true);
    try {
      if (unsubPassengerRef.current) unsubPassengerRef.current();
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
      key: "my-reports",
      label: "My Reports",
      icon: <FileText size={20} color={colors.textSecondary} />,
      onPress: () => router.push("/my-reports"),
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
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: spacing.screenPadding,
      paddingBottom: spacing.xxl,
    },

    // Profile header section
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
      fontFamily: typography.fonts.headingSemiBold,
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
      fontFamily: typography.fonts.headingSemiBold,
      color: colors.textPrimary,
      marginBottom: spacing.xs,
    },
    phoneText: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.textMuted,
      marginBottom: spacing.md,
    },
    tripsRow: {
      alignItems: "center",
    },
    tripsCount: {
      fontSize: typography.sizes["2xl"],
      fontFamily: typography.fonts.heading,
      color: colors.textPrimary,
    },
    tripsLabel: {
      fontSize: typography.sizes.xs,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.textMuted,
    },

    // Menu card
    menuCard: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      ...shadows.small,
      marginBottom: spacing.xl,
    },
    menuItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
    },
    menuItemDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginHorizontal: spacing.md,
    },
    menuIcon: {
      width: 32,
      alignItems: "center",
    },
    menuLabel: {
      flex: 1,
      fontSize: typography.sizes.base,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.textPrimary,
      marginLeft: spacing.sm,
    },
  });

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <StatusBar barStyle="dark-content" />
        <LoadingSpinner />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Profile header */}
        <View style={styles.profileSection}>
          <TouchableOpacity
            style={styles.photoWrapper}
            onPress={() => router.push("/edit-profile")}
            activeOpacity={0.8}
          >
            {passenger?.profilePhoto ? (
              <Image
                source={{ uri: passenger.profilePhoto }}
                style={styles.photo}
              />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Text style={styles.photoInitial}>
                  {passenger?.name?.charAt(0).toUpperCase() ?? "?"}
                </Text>
              </View>
            )}
            <View style={styles.editOverlay}>
              <Pencil size={12} color={colors.textInverse} />
            </View>
          </TouchableOpacity>

          <Text style={styles.nameText}>{passenger?.name ?? "—"}</Text>
          <Text style={styles.phoneText}>
            {passenger?.phone ?? currentUser?.phoneNumber ?? "—"}
          </Text>

          <View style={styles.tripsRow}>
            <Text style={styles.tripsCount}>{passenger?.totalRides ?? 0}</Text>
            <Text style={styles.tripsLabel}>Total Trips</Text>
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
