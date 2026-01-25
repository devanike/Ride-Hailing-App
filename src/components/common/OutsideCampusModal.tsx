import { useTheme } from '@/hooks/useTheme';
import { AlertTriangle, X } from 'lucide-react-native';
import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button } from './Button';

interface OutsideCampusModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  locationType: 'pickup' | 'dropoff';
}

/**
 * Outside Campus Modal
 * Warns users when they select a location outside campus boundaries
 */
export const OutsideCampusModal: React.FC<OutsideCampusModalProps> = ({
  visible,
  onClose,
  onConfirm,
  locationType,
}) => {
  const { colors, spacing, typography, borderRadius, shadows } = useTheme();

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing.screenPadding,
    },
    modalContainer: {
      backgroundColor: colors.surface.light,
      borderRadius: borderRadius.xl,
      padding: spacing.xl,
      width: '100%',
      maxWidth: 400,
      ...shadows.large,
    },
    closeButton: {
      position: 'absolute',
      top: spacing.base,
      right: spacing.base,
      padding: spacing.xs,
      zIndex: 1,
    },
    iconContainer: {
      width: 80,
      height: 80,
      borderRadius: borderRadius.full,
      backgroundColor: colors.status.warningLight,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
      marginBottom: spacing.lg,
    },
    title: {
      fontSize: typography.sizes.xl,
      fontFamily: typography.fonts.headingSemiBold,
      color: colors.text.primary,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    message: {
      fontSize: typography.sizes.base,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.text.secondary,
      textAlign: 'center',
      lineHeight: typography.sizes.base * typography.lineHeights.normal,
      marginBottom: spacing.base,
    },
    warningBox: {
      backgroundColor: colors.status.warningLight,
      padding: spacing.base,
      borderRadius: borderRadius.md,
      marginBottom: spacing.xl,
      borderLeftWidth: 4,
      borderLeftColor: colors.status.warning,
    },
    warningText: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.status.warning,
      lineHeight: typography.sizes.sm * typography.lineHeights.normal,
    },
    buttonsContainer: {
      gap: spacing.md,
    },
  });

  const getMessage = () => {
    if (locationType === 'pickup') {
      return 'Your pickup location is outside the University of Ibadan campus. Our service is currently limited to on-campus rides only.';
    }
    return 'Your dropoff location is outside the University of Ibadan campus. Our service is currently limited to on-campus rides only.';
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={styles.modalContainer}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color={colors.text.secondary} />
          </TouchableOpacity>

          {/* Warning Icon */}
          <View style={styles.iconContainer}>
            <AlertTriangle size={40} color={colors.status.warning} />
          </View>

          {/* Title */}
          <Text style={styles.title}>Location Outside Campus</Text>

          {/* Message */}
          <Text style={styles.message}>{getMessage()}</Text>

          {/* Warning Box */}
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              Please select a location within the campus boundaries to continue.
            </Text>
          </View>

          {/* Buttons */}
          <View style={styles.buttonsContainer}>
            <Button
              title="Choose Different Location"
              onPress={onClose}
              variant="primary"
              size="large"
              fullWidth
            />
            <Button
              title="Continue Anyway"
              onPress={onConfirm}
              variant="outline"
              size="large"
              fullWidth
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default OutsideCampusModal;