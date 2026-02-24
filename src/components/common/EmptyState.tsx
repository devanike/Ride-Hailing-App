import { useTheme } from "@/hooks/useTheme";
import React from "react";
import {
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";

export interface ActionButton {
  title: string;
  onPress: () => void;
  variant?: "primary" | "outline";
}

export interface EmptyStateProps {
  icon: React.ReactNode | string;
  title: string;
  message: string;
  actionButton?: ActionButton;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  message,
  actionButton,
}) => {
  const { colors, spacing, borderRadius, typography, shadows } = useTheme();

  const isStringIcon = typeof icon === "string";

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: spacing.xl,
    } as ViewStyle,

    iconContainer: {
      marginBottom: spacing.xl,
    } as ViewStyle,

    emoji: {
      fontSize: 64,
      textAlign: "center",
    } as TextStyle,

    title: {
      fontSize: typography.sizes["2xl"],
      fontFamily: typography.fonts.headingSemiBold,
      color: colors.textPrimary,
      textAlign: "center",
      marginBottom: spacing.sm,
    } as TextStyle,

    message: {
      fontSize: typography.sizes.base,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: typography.sizes.base * typography.lineHeights.normal,
      marginBottom: spacing.xl,
      maxWidth: 300,
    } as TextStyle,

    button: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xl,
      borderRadius: borderRadius.md,
      minWidth: 150,
      alignItems: "center",
    } as ViewStyle,

    buttonPrimary: {
      backgroundColor: colors.primary,
      ...shadows.medium,
    } as ViewStyle,

    buttonOutline: {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: colors.primary,
    } as ViewStyle,

    buttonText: {
      fontSize: typography.sizes.base,
      fontWeight: "600",
    } as TextStyle,

    buttonTextPrimary: {
      color: colors.textInverse,
    } as TextStyle,

    buttonTextOutline: {
      color: colors.primary,
    } as TextStyle,
  });

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        {isStringIcon ? <Text style={styles.emoji}>{icon}</Text> : icon}
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>

      {actionButton && (
        <TouchableOpacity
          style={[
            styles.button,
            actionButton.variant === "outline"
              ? styles.buttonOutline
              : styles.buttonPrimary,
          ]}
          onPress={actionButton.onPress}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.buttonText,
              actionButton.variant === "outline"
                ? styles.buttonTextOutline
                : styles.buttonTextPrimary,
            ]}
          >
            {actionButton.title}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default EmptyState;
