import { Button } from "@/components/common/Button";
import { useTheme } from "@/hooks/useTheme";
import { logout } from "@/services/authService";
import { auth } from "@/services/firebaseConfig";
import { showError } from "@/utils/toast";
import { onAuthStateChanged, User } from "firebase/auth";
import React, { useCallback, useEffect, useState } from "react";
import { StatusBar, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AdminSettingsScreen(): React.JSX.Element {
  const { colors, spacing, typography, borderRadius, shadows } = useTheme();
  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => setCurrentUser(user));
    return unsub;
  }, []);

  const handleLogout = useCallback(async () => {
    setLoggingOut(true);
    try {
      await logout();
    } catch (err) {
      console.error("Logout failed:", err);
      showError("Error", "Could not log out. Please try again.");
      setLoggingOut(false);
    }
  }, []);

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
    content: {
      flex: 1,
      padding: spacing.screenPadding,
    },
    infoCard: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      marginBottom: spacing.lg,
      ...shadows.small,
    },
    label: {
      fontSize: typography.sizes.xs,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.textMuted,
      marginBottom: 2,
    },
    value: {
      fontSize: typography.sizes.base,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.textPrimary,
      marginBottom: spacing.md,
    },
    roleTag: {
      alignSelf: "flex-start",
      backgroundColor: colors.primary + "15",
      borderRadius: borderRadius.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      marginBottom: spacing.md,
    },
    roleText: {
      fontSize: typography.sizes.xs,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.primary,
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.infoCard}>
          <View style={styles.roleTag}>
            <Text style={styles.roleText}>Administrator</Text>
          </View>

          <Text style={styles.label}>Phone</Text>
          <Text style={styles.value}>{currentUser?.phoneNumber ?? "—"}</Text>

          {/* <Text style={styles.label}>User ID</Text>
          <Text style={styles.value}>{currentUser?.uid ?? "—"}</Text> */}
        </View>

        <Button
          title="Log Out"
          onPress={handleLogout}
          variant="danger"
          fullWidth
          loading={loggingOut}
        />
      </View>
    </SafeAreaView>
  );
}
