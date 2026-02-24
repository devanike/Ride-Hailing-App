import { useTheme } from "@/hooks/useTheme";
import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";

export interface LoadingSpinnerProps {
  size?: "small" | "large";
  color?: string;
  fullScreen?: boolean;
  message?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = "large",
  color,
  fullScreen = false,
  message,
}) => {
  const { colors, spacing, typography, shadows, borderRadius } = useTheme();

  const spinnerColor = color || colors.primary;

  const styles = StyleSheet.create({
    container: {
      justifyContent: "center",
      alignItems: "center",
      padding: spacing.xl,
      ...(fullScreen && {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: colors.overlay,
        zIndex: 9999,
      }),
    } as ViewStyle,

    content: {
      alignItems: "center",
      backgroundColor: fullScreen ? colors.surface : "transparent",
      padding: fullScreen ? spacing.xl : 0,
      borderRadius: borderRadius.lg,
      ...(fullScreen && shadows.large),
    } as ViewStyle,

    message: {
      marginTop: spacing.md,
      fontSize: typography.sizes.base,
      color: fullScreen ? colors.textPrimary : colors.textSecondary,
      fontFamily: typography.fonts.bodyMedium,
      textAlign: "center",
    } as TextStyle,
  });

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <ActivityIndicator size={size} color={spinnerColor} />
        {message && <Text style={styles.message}>{message}</Text>}
      </View>
    </View>
  );
};

export default LoadingSpinner;
