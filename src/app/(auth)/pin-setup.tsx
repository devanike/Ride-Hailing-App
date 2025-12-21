import { Button } from '@/components/common/Button';
import { PINPad } from '@/components/common/PinPad';
import { useTheme } from '@/hooks/useTheme';
import {
  enableBiometric,
  getBiometricCapability,
  markDeviceAsKnown,
  setupPIN,
} from '@/services/securityService';
import { showError, showSuccess } from '@/utils/toast';
import { router, useLocalSearchParams } from 'expo-router';
import { Fingerprint } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Modal,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type SetupStep = 'create' | 'confirm' | 'biometric';

export default function PINSetupScreen() {
  const { colors, typography, spacing, borderRadius, shadows } = useTheme();
  const params = useLocalSearchParams();
  const isReset = params.isReset === 'true';
  
  const [currentStep, setCurrentStep] = useState<SetupStep>('create');
  const [firstPin, setFirstPin] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showBiometricModal, setShowBiometricModal] = useState(false);

  const handleCreatePin = async (pin: string) => {
    setFirstPin(pin);
    setCurrentStep('confirm');
    setError(false);
  };

  const handleConfirmPin = async (pin: string) => {
    if (pin !== firstPin) {
      setError(true);
      showError('PIN Mismatch', 'PINs do not match. Please try again.');
      setTimeout(() => {
        setError(false);
      }, 500);
      return;
    }

    try {
      setLoading(true);

      // Setup PIN
      const success = await setupPIN(pin);
      
      if (!success) {
        showError('Setup Failed', 'Failed to setup PIN. Please try again.');
        setCurrentStep('create');
        setFirstPin('');
        return;
      }

      // Mark device as known (only for new setup, not reset)
      if (!isReset) {
        await markDeviceAsKnown();
      }

      // Check biometric availability
      const biometric = await getBiometricCapability();
      
      if (biometric.available) {
        setShowBiometricModal(true);
      } else {
        // No biometric, complete setup
        completeSetup();
      }
    } catch (error: any) {
      console.error('PIN setup error:', error);
      showError('Setup Failed', error.message || 'Failed to setup PIN');
    } finally {
      setLoading(false);
    }
  };

  const handleEnableBiometric = async () => {
    try {
      await enableBiometric();
      setShowBiometricModal(false);
      showSuccess('Success', 'Fingerprint authentication enabled');
      completeSetup();
    } catch (error: any) {
      console.error('Biometric enable error:', error);
      showError('Error', 'Failed to enable fingerprint');
    }
  };

  const handleSkipBiometric = () => {
    setShowBiometricModal(false);
    completeSetup();
  };

  const completeSetup = () => {
    const successMessage = isReset 
      ? 'PIN Reset Successfully' 
      : 'Account Created';
    const successDescription = isReset
      ? 'Your PIN has been reset successfully'
      : 'Your account has been set up successfully';
    
    showSuccess(successMessage, successDescription);
    
    if (isReset) {
      // For reset, go back to login
      router.replace('/(auth)/login');
    } else {
      // For new setup, navigate based on user type
      // TODO: Get user type from Firestore and navigate appropriately
      // Passenger → /(passenger)
      // Driver → /(driver) 
      // Admin → /(admin)
      router.replace('/(auth)/welcome'); 
    }
  };

  const getTitle = () => {
    if (isReset) {
      return currentStep === 'create' ? 'Reset Your PIN' : 'Confirm New PIN';
    }
    switch (currentStep) {
      case 'create':
        return 'Create Your PIN';
      case 'confirm':
        return 'Confirm Your PIN';
      default:
        return 'Setup Complete';
    }
  };

  const getSubtitle = () => {
    if (isReset) {
      return currentStep === 'create' 
        ? 'Choose a new 6-digit PIN'
        : 'Enter your new PIN again to confirm';
    }
    switch (currentStep) {
      case 'create':
        return 'Choose a 6-digit PIN to secure your account';
      case 'confirm':
        return 'Enter your PIN again to confirm';
      default:
        return '';
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.light,
    },
    content: {
      flex: 1,
      paddingHorizontal: spacing.screenPadding,
      paddingTop: spacing['2xl'],
      justifyContent: 'center',
    },
    header: {
      alignItems: 'center',
      marginBottom: spacing['3xl'],
    },
    progressContainer: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: spacing.xl,
    },
    progressDot: {
      width: 8,
      height: 8,
      borderRadius: borderRadius.full,
      backgroundColor: colors.border.light,
    },
    progressDotActive: {
      width: 24,
      backgroundColor: colors.accent,
    },
    title: {
      fontSize: typography.sizes['2xl'],
      fontFamily: typography.fonts.heading,
      color: colors.text.primary,
      textAlign: 'center',
      marginBottom: spacing.xs,
    },
    subtitle: {
      fontSize: typography.sizes.base,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.text.secondary,
      textAlign: 'center',
      paddingHorizontal: spacing.xl,
    },
    // Biometric Modal
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing.screenPadding,
    },
    modalContent: {
      backgroundColor: colors.background.light,
      borderRadius: borderRadius.xl,
      padding: spacing.xl,
      width: '100%',
      maxWidth: 400,
      ...shadows.large,
    },
    modalIcon: {
      width: 80,
      height: 80,
      borderRadius: borderRadius.full,
      backgroundColor: colors.primary + '20',
      justifyContent: 'center',
      alignItems: 'center',
      alignSelf: 'center',
      marginBottom: spacing.lg,
    },
    modalTitle: {
      fontSize: typography.sizes.xl,
      fontFamily: typography.fonts.headingSemiBold,
      color: colors.text.primary,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    modalDescription: {
      fontSize: typography.sizes.base,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.text.secondary,
      textAlign: 'center',
      lineHeight: typography.sizes.base * typography.lineHeights.normal,
      marginBottom: spacing.xl,
    },
    modalButtons: {
      gap: spacing.md,
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          {/* Progress Indicator - only show for new setup */}
          {!isReset && (
            <View style={styles.progressContainer}>
              <View
                style={[
                  styles.progressDot,
                  currentStep === 'create' && styles.progressDotActive,
                ]}
              />
              <View
                style={[
                  styles.progressDot,
                  currentStep === 'confirm' && styles.progressDotActive,
                ]}
              />
            </View>
          )}

          <Text style={styles.title}>{getTitle()}</Text>
          <Text style={styles.subtitle}>{getSubtitle()}</Text>
        </View>

        {/* PIN Pad */}
        <PINPad
          length={6}
          onComplete={currentStep === 'create' ? handleCreatePin : handleConfirmPin}
          error={error}
          loading={loading}
          showBiometric={false}
          title=""
          disabled={loading}
        />
      </View>

      {/* Biometric Setup Modal */}
      <Modal
        visible={showBiometricModal}
        transparent
        animationType="fade"
        onRequestClose={handleSkipBiometric}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIcon}>
              <Fingerprint size={40} color={colors.primary} />
            </View>

            <Text style={styles.modalTitle}>Enable Fingerprint?</Text>
            <Text style={styles.modalDescription}>
              Use your fingerprint to quickly and securely access your account
            </Text>

            <View style={styles.modalButtons}>
              <Button
                title="Enable Fingerprint"
                onPress={handleEnableBiometric}
                variant="primary"
                size="large"
                fullWidth
              />
              <Button
                title="Skip for Now"
                onPress={handleSkipBiometric}
                variant="outline"
                size="large"
                fullWidth
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}