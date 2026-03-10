import { EmptyState } from "@/components/common/EmptyState";
import { useTheme } from "@/hooks/useTheme";
import { Clock } from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HistoryScreen(): React.JSX.Element {
  const { colors, spacing, typography } = useTheme();

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
  });

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Ride History</Text>
      </View>

      <EmptyState
        icon={<Clock size={64} color={colors.textMuted} />}
        title="No Rides Yet"
        message="Your ride history will appear here once you complete your first ride"
      />
    </SafeAreaView>
  );
}
