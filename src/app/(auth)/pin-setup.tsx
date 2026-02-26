import { Button } from "@/components/common/Button";
import { PINPad } from "@/components/common/PinPad";
import { useAuthRefresh } from "@/contexts/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import {
  enableBiometric,
  getBiometricCapability,
  markDeviceAsKnown,
  setupPIN,
} from "@/services/securityService";
import { showError, showSuccess } from "@/utils/toast";
import { useLocalSearchParams } from "expo-router";
import { Fingerprint } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import { Modal, StatusBar, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type SetupStep = "create" | "confirm";

export default function PINSetupScreen() {
  const { colors, typography, spacing, borderRadius, shadows } = useTheme();
  const params = useLocalSearchParams();
  const isReset = params.isReset === "true";
  const { refreshAuthState } = useAuthRefresh();

  const [currentStep, setCurrentStep] = useState<SetupStep>("create");
  const [firstPin, setFirstPin] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showBiometricModal, setShowBiometricModal] = useState(false);
  const [pinKey, setPinKey] = useState(0);

  // Reset PINPad when step changes
  useEffect(() => {
    setPinKey((prev) => prev + 1);
    setError(false);
  }, [currentStep]);

  const completeSetup = useCallback(async () => {
    try {
      showSuccess(
        isReset ? "PIN Reset" : "Account Created",
        isReset ? "Your PIN has been reset" : "Your account has been set up",
      );
      // _layout.tsx re-evaluates auth state and navigates to correct home
      refreshAuthState();
    } catch (err) {
      console.error("Error completing setup:", err);
      showError("Error", "Failed to complete setup. Please try again.");
    }
  }, [isReset, refreshAuthState]);

  const handleCreatePin = useCallback((pin: string) => {
    setFirstPin(pin);
    setCurrentStep("confirm");
    setError(false);
  }, []);

  const handleConfirmPin = useCallback(
    async (pin: string) => {
      if (pin !== firstPin) {
        setError(true);
        showError("PIN Mismatch", "PINs do not match. Please try again.");

        setTimeout(() => {
          setError(false);
          setCurrentStep("create");
          setFirstPin("");
        }, 1000);
        return;
      }

      try {
        setLoading(true);

        await setupPIN(pin);

        if (!isReset) {
          await markDeviceAsKnown();
        }

        const biometric = await getBiometricCapability();

        if (biometric.available) {
          setShowBiometricModal(true);
        } else {
          await completeSetup();
        }
      } catch (err: any) {
        console.error("PIN setup error:", err);
        showError("Setup Failed", err.message || "Failed to setup PIN");
        setCurrentStep("create");
        setFirstPin("");
      } finally {
        setLoading(false);
      }
    },
    [firstPin, isReset, completeSetup],
  );

  const handleEnableBiometric = useCallback(async () => {
    try {
      await enableBiometric();
      setShowBiometricModal(false);
      showSuccess("Success", "Fingerprint authentication enabled");
      await completeSetup();
    } catch (err: any) {
      console.error("Biometric enable error:", err);
      showError("Error", "Failed to enable fingerprint");
      setShowBiometricModal(false);
      await completeSetup();
    }
  }, [completeSetup]);

  const handleSkipBiometric = useCallback(async () => {
    setShowBiometricModal(false);
    await completeSetup();
  }, [completeSetup]);

  const getTitle = () => {
    if (isReset) {
      return currentStep === "create" ? "Reset Your PIN" : "Confirm New PIN";
    }
    return currentStep === "create" ? "Create Your PIN" : "Confirm Your PIN";
  };

  const getSubtitle = () => {
    if (isReset) {
      return currentStep === "create"
        ? "Choose a new 6-digit PIN"
        : "Enter your new PIN again to confirm";
    }
    return currentStep === "create"
      ? "Choose a 6-digit PIN to secure your account"
      : "Enter your PIN again to confirm";
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flex: 1,
      paddingHorizontal: spacing.screenPadding,
      paddingTop: spacing.xl,
      justifyContent: "center",
    },
    header: {
      alignItems: "center",
      marginBottom: spacing.xxl,
    },
    progressContainer: {
      flexDirection: "row",
      gap: spacing.sm,
      marginBottom: spacing.xl,
    },
    progressDot: {
      width: 8,
      height: 8,
      borderRadius: borderRadius.full,
      backgroundColor: colors.border,
    },
    progressDotActive: {
      width: 24,
      backgroundColor: colors.accent,
    },
    title: {
      fontSize: typography.sizes["2xl"],
      fontFamily: typography.fonts.heading,
      color: colors.textPrimary,
      textAlign: "center",
      marginBottom: spacing.xs,
    },
    subtitle: {
      fontSize: typography.sizes.base,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.textSecondary,
      textAlign: "center",
      paddingHorizontal: spacing.xl,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: spacing.screenPadding,
    },
    modalContent: {
      backgroundColor: colors.background,
      borderRadius: borderRadius.xl,
      padding: spacing.xl,
      width: "100%",
      maxWidth: 400,
      ...shadows.large,
    },
    modalIcon: {
      width: 80,
      height: 80,
      borderRadius: borderRadius.full,
      backgroundColor: colors.primary + "20",
      justifyContent: "center",
      alignItems: "center",
      alignSelf: "center",
      marginBottom: spacing.lg,
    },
    modalTitle: {
      fontSize: typography.sizes.xl,
      fontFamily: typography.fonts.headingSemiBold,
      color: colors.textPrimary,
      textAlign: "center",
      marginBottom: spacing.sm,
    },
    modalDescription: {
      fontSize: typography.sizes.base,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: typography.sizes.base * typography.lineHeights.normal,
      marginBottom: spacing.xl,
    },
    modalButtons: {
      gap: spacing.md,
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.content}>
        <View style={styles.header}>
          {!isReset && (
            <View style={styles.progressContainer}>
              <View
                style={[
                  styles.progressDot,
                  currentStep === "create" && styles.progressDotActive,
                ]}
              />
              <View
                style={[
                  styles.progressDot,
                  currentStep === "confirm" && styles.progressDotActive,
                ]}
              />
            </View>
          )}

          <Text style={styles.title}>{getTitle()}</Text>
          <Text style={styles.subtitle}>{getSubtitle()}</Text>
        </View>

        <PINPad
          key={pinKey}
          length={6}
          onComplete={
            currentStep === "create" ? handleCreatePin : handleConfirmPin
          }
          error={error}
          loading={loading}
          showBiometric={false}
          title=""
          disabled={loading}
        />
      </View>

      {/* Biometric Modal */}
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

            <Text style={styles.modalTitle}>Enable Fingerprint Login?</Text>
            <Text style={styles.modalDescription}>
              Use your fingerprint to log in faster and more securely
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
