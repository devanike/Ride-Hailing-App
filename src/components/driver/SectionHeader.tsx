import { useTheme } from "@/hooks/useTheme";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface SectionHeaderProps {
  title: string;
  style?: any;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  style,
}) => {
  const { colors, typography, spacing } = useTheme();

  const styles = StyleSheet.create({
    container: {
      marginBottom: spacing.md,
    },
    title: {
      fontSize: typography.sizes.lg,
      fontFamily: typography.fonts.headingSemiBold,
      color: colors.textPrimary,
    },
  });

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
};
