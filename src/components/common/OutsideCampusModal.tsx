import { useTheme } from "@/hooks/useTheme";
import { AlertTriangle } from "lucide-react-native";
import React from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface OutsideCampusModalProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Outside Campus Modal
 * Bottom sheet style warning shown when a location outside
 * the University of Ibadan campus boundary is selected.
 */
export const OutsideCampusModal: React.FC<OutsideCampusModalProps> = ({
  visible,
  onClose,
}) => {
  const { colors, spacing, typography, borderRadius, shadows } = useTheme();

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: borderRadius.xl,
      borderTopRightRadius: borderRadius.xl,
      paddingTop: spacing.lg,
      paddingBottom: spacing.xl,
      paddingHorizontal: spacing.screenPadding,
      alignItems: "center",
      ...shadows.large,
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      marginBottom: spacing.xl,
    },
    iconContainer: {
      width: 72,
      height: 72,
      borderRadius: borderRadius.full,
      backgroundColor: colors.warningBackground,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: spacing.lg,
    },
    title: {
      fontSize: typography.sizes.xl,
      fontFamily: typography.fonts.headingSemiBold,
      color: colors.textPrimary,
      textAlign: "center",
      marginBottom: spacing.sm,
    },
    message: {
      fontSize: typography.sizes.base,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: typography.sizes.base * typography.lineHeights.normal,
      marginBottom: spacing.xl,
    },
    okButton: {
      width: "100%",
      paddingVertical: spacing.md,
      backgroundColor: colors.primary,
      borderRadius: borderRadius.md,
      alignItems: "center",
    },
    okButtonText: {
      fontSize: typography.sizes.base,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.textInverse,
    },
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />

          <View style={styles.iconContainer}>
            <AlertTriangle size={36} color={colors.warning} />
          </View>

          <Text style={styles.title}>Outside Campus</Text>

          <Text style={styles.message}>
            UI-Ride only operates within the University of Ibadan campus. Please
            select a pickup or drop-off point inside the campus boundary.
          </Text>

          <TouchableOpacity
            style={styles.okButton}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={styles.okButtonText}>OK</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default OutsideCampusModal;
