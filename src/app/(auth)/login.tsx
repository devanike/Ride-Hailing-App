import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { PINPad } from "@/components/common/PinPad";
import { useAuthRefresh } from "@/contexts/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { auth } from "@/services/firebaseConfig";
import {
  authenticateWithBiometric,
  getBiometricCapability,
  getRemainingLockoutTime,
  hasPIN,
  isAccountLocked,
  isBiometricEnabled,
  markDeviceAsKnown,
  resetFailedAttempts,
  trackFailedAttempt,
  verifyPIN,
} from "@/services/securityService";
import { showError, showSuccess } from "@/utils/toast";
import { router } from "expo-router";
import { Lock, Phone } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LoginScreen() {
  const { colors, typography, spacing, borderRadius } = useTheme();
  const { refreshAuthState } = useAuthRefresh();

  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [hasPinStored, setHasPinStored] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [pinError, setPinError] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutTime, setLockoutTime] = useState(0);
  const [biometricPrompted, setBiometricPrompted] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Countdown lockout timer
  useEffect(() => {
    if (isLocked && lockoutTime > 0) {
      const timer = setTimeout(async () => {
        const remaining = await getRemainingLockoutTime();
        setLockoutTime(remaining);
        if (remaining === 0) {
          setIsLocked(false);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isLocked, lockoutTime]);

  const checkAuthStatus = async () => {
    try {
      setCheckingAuth(true);

      const currentUser = auth.currentUser;
      if (!currentUser) {
        setHasPinStored(false);
        return;
      }

      const pinExists = await hasPIN();
      setHasPinStored(pinExists);

      if (pinExists) {
        const lockStatus = await isAccountLocked();
        if (lockStatus.isLocked) {
          setIsLocked(true);
          setLockoutTime(lockStatus.remainingTime);
          return; // Don't prompt biometric if locked
        }

        const biometric = await getBiometricCapability();
        if (biometric.available) {
          const enabled = await isBiometricEnabled();
          setBiometricEnabled(enabled);

          // Auto-prompt biometric if enabled and not locked
          // if (enabled) {
          //   setCheckingAuth(false);
          //   setTimeout(() => {
          //     handleBiometricAuth();
          //   }, 300);
          //   return;
          // }
        }
      }
    } catch (error) {
      console.error("Auth check error:", error);
    } finally {
      setCheckingAuth(false);
    }
  };

  const handleBiometricAuth = useCallback(async () => {
    try {
      const result = await authenticateWithBiometric();
      if (result.success) {
        await resetFailedAttempts();
        await markDeviceAsKnown();
        showSuccess("Welcome Back", "Authenticated successfully");
        refreshAuthState();
      }
    } catch (error: any) {
      console.error("Biometric auth error:", error);
      // User cancelled or failed - they can use PIN instead
    }
  }, [refreshAuthState]);

  useEffect(() => {
    if (
      !checkingAuth &&
      hasPinStored &&
      biometricEnabled &&
      !isLocked &&
      !biometricPrompted
    ) {
      setBiometricPrompted(true);
      handleBiometricAuth();
    }
  }, [
    checkingAuth,
    hasPinStored,
    biometricEnabled,
    isLocked,
    biometricPrompted,
    handleBiometricAuth,
  ]);

  const handlePINComplete = async (pin: string) => {
    if (isLocked) {
      showError(
        "Account Locked",
        `Try again in ${Math.ceil(lockoutTime / 60)} minutes`,
      );
      return;
    }

    try {
      setLoading(true);
      const isValid = await verifyPIN(pin);

      if (isValid) {
        await resetFailedAttempts();
        await markDeviceAsKnown();
        showSuccess("Welcome Back", "Login successful");
        refreshAuthState();
      } else {
        setPinError(true);
        await trackFailedAttempt();

        const lockStatus = await isAccountLocked();
        if (lockStatus.isLocked) {
          setIsLocked(true);
          setLockoutTime(lockStatus.remainingTime);
          showError(
            "Account Locked",
            `Too many failed attempts. Try again in ${Math.ceil(lockStatus.remainingTime / 60)} minutes`,
          );
        } else {
          showError("Invalid PIN", "Please try again");
        }

        setTimeout(() => {
          setPinError(false);
        }, 500);
      }
    } catch (error: any) {
      console.error("PIN verification error:", error);
      showError("Login Failed", error.message || "Failed to verify PIN");
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneLogin = async () => {
    if (!phone.trim()) {
      setPhoneError("Phone number is required");
      return;
    }
    if (phone.length !== 10) {
      setPhoneError("Phone number must be 10 digits");
      return;
    }
    if (!/^\d+$/.test(phone)) {
      setPhoneError("Phone number must contain only digits");
      return;
    }

    try {
      setLoading(true);
      const formattedPhone = `+234${phone}`;

      router.push({
        pathname: "/(auth)/otp-verification",
        params: {
          phone: formattedPhone,
          isLogin: "true",
        },
      });
    } catch (error: any) {
      console.error("Phone login error:", error);
      showError("Login Failed", error.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const formatLockoutTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: spacing.screenPadding,
      paddingTop: spacing.xl,
      paddingBottom: spacing.xl,
    },
    header: {
      marginBottom: spacing.xxl,
    },
    title: {
      fontSize: typography.sizes["3xl"],
      fontFamily: typography.fonts.heading,
      color: colors.textPrimary,
      marginBottom: spacing.xs,
    },
    subtitle: {
      fontSize: typography.sizes.base,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.textSecondary,
      lineHeight: typography.sizes.base * typography.lineHeights.normal,
    },
    pinContainer: {
      marginTop: spacing.xl,
    },
    lockoutContainer: {
      alignItems: "center",
      padding: spacing.xl,
      backgroundColor: colors.errorBackground,
      borderRadius: borderRadius.lg,
      marginBottom: spacing.xl,
    },
    lockoutIcon: {
      marginBottom: spacing.md,
    },
    lockoutText: {
      fontSize: typography.sizes.base,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.error,
      textAlign: "center",
      marginBottom: spacing.sm,
    },
    lockoutTimer: {
      fontSize: typography.sizes["2xl"],
      fontFamily: typography.fonts.heading,
      color: colors.error,
    },
    forgotPinButton: {
      alignItems: "center",
      marginTop: spacing.lg,
      paddingVertical: spacing.sm,
    },
    forgotPinText: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.primary,
    },
    divider: {
      flexDirection: "row",
      alignItems: "center",
      marginVertical: spacing.xl,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: colors.border,
    },
    dividerText: {
      marginHorizontal: spacing.md,
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.textSecondary,
    },
    phoneLoginSection: {
      marginTop: spacing.md,
    },
    footer: {
      marginTop: "auto",
      alignItems: "center",
    },
    signupPrompt: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: spacing.md,
    },
    signupPromptText: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.textSecondary,
    },
    signupLink: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.primary,
      marginLeft: spacing.xs,
    },
  });

  if (checkingAuth) {
    return (
      <SafeAreaView style={styles.container}>
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Text style={styles.subtitle}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>
              {hasPinStored
                ? "Enter your PIN to continue"
                : "Enter your phone number to login"}
            </Text>
          </View>

          {hasPinStored ? (
            <>
              {/* Lockout view */}
              {isLocked && (
                <View style={styles.lockoutContainer}>
                  <View style={styles.lockoutIcon}>
                    <Lock size={32} color={colors.error} />
                  </View>
                  <Text style={styles.lockoutText}>
                    Too many failed attempts. Try again in:
                  </Text>
                  <Text style={styles.lockoutTimer}>
                    {formatLockoutTime(lockoutTime)}
                  </Text>
                </View>
              )}

              {/* PIN Pad (hidden during lockout) */}
              {!isLocked && (
                <View style={styles.pinContainer}>
                  <PINPad
                    length={6}
                    onComplete={handlePINComplete}
                    onBiometric={
                      biometricEnabled ? handleBiometricAuth : undefined
                    }
                    error={pinError}
                    loading={loading}
                    showBiometric={biometricEnabled}
                    title=""
                    disabled={loading}
                  />
                </View>
              )}

              <TouchableOpacity
                style={styles.forgotPinButton}
                onPress={() => router.push("/(auth)/forgot-pin")}
              >
                <Text style={styles.forgotPinText}>Forgot PIN?</Text>
              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.phoneLoginSection}>
                <Input
                  label="Login with Phone Number"
                  value={phone}
                  onChangeText={(text) => {
                    const cleaned = text.replace(/\D/g, "");
                    setPhone(cleaned);
                    setPhoneError("");
                  }}
                  placeholder="8012345678"
                  error={phoneError}
                  keyboardType="phone-pad"
                  leftIcon={<Phone size={20} color={colors.textMuted} />}
                  maxLength={10}
                />
                <Button
                  title="Send OTP"
                  onPress={handlePhoneLogin}
                  variant="outline"
                  size="large"
                  fullWidth
                  loading={loading}
                  disabled={loading}
                  style={{ marginTop: spacing.md }}
                />
              </View>
            </>
          ) : (
            <>
              <Input
                label="Phone Number"
                value={phone}
                onChangeText={(text) => {
                  const cleaned = text.replace(/\D/g, "");
                  setPhone(cleaned);
                  setPhoneError("");
                }}
                placeholder="8012345678"
                error={phoneError}
                keyboardType="phone-pad"
                leftIcon={<Phone size={20} color={colors.textMuted} />}
                maxLength={10}
              />

              <View style={styles.footer}>
                <Button
                  title="Continue"
                  onPress={handlePhoneLogin}
                  variant="primary"
                  size="large"
                  fullWidth
                  loading={loading}
                  disabled={loading}
                />
              </View>
            </>
          )}

          <View style={styles.signupPrompt}>
            <Text style={styles.signupPromptText}>
              Don&apos;t have an account?
            </Text>
            <TouchableOpacity onPress={() => router.push("/(auth)/signup")}>
              <Text style={styles.signupLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
