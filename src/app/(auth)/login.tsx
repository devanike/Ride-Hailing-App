// src/app/(auth)/login.tsx

import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { PINPad } from '@/components/common/PinPad';
import { useTheme } from '@/hooks/useTheme';
import { auth } from '@/services/firebaseConfig';
import {
  authenticateWithBiometric,
  getBiometricCapability,
  getRemainingLockoutTime,
  hasPIN,
  isAccountLocked,
  isBiometricEnabled,
  resetFailedAttempts,
  trackFailedAttempt,
  verifyPIN,
} from '@/services/securityService';
import { showError, showSuccess } from '@/utils/toast';
import { router } from 'expo-router';
import { Phone } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen() {
  const { colors, typography, spacing, borderRadius } = useTheme();
  
  // States
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  
  // PIN/Biometric states
  const [hasPinStored, setHasPinStored] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [pinError, setPinError] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutTime, setLockoutTime] = useState(0);

  useEffect(() => {
    checkAuthStatus();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update lockout timer
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

      // Check if user is already logged in
      if (auth.currentUser) {
        // User is logged in, navigate to home
        // TODO: Check user type and navigate appropriately
        router.replace('/(auth)/welcome'); // Temporary
        return;
      }

      // Check if user has PIN set up
      const pinExists = await hasPIN();
      setHasPinStored(pinExists);

      if (pinExists) {
        // Check if account is locked
        const locked = await isAccountLocked();
        if (locked) {
          const remaining = await getRemainingLockoutTime();
          setIsLocked(true);
          setLockoutTime(remaining);
        }

        // Check biometric availability
        const biometric = await getBiometricCapability();

        if (biometric.available) {
          const enabled = await isBiometricEnabled();
          setBiometricEnabled(enabled);

          // Auto-trigger biometric if enabled
          if (enabled) {
            handleBiometricAuth();
          }
        }
      }
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setCheckingAuth(false);
    }
  };

  const handleBiometricAuth = async () => {
    try {
      const success = await authenticateWithBiometric();
      if (success) {
        await resetFailedAttempts();
        handleLoginSuccess();
      }
    } catch (error: any) {
      console.error('Biometric auth error:', error);
      // User can still use PIN
    }
  };

  const handlePINComplete = async (pin: string) => {
    if (isLocked) {
      showError('Account Locked', `Try again in ${Math.ceil(lockoutTime / 60)} minutes`);
      return;
    }

    try {
      setLoading(true);
      const isValid = await verifyPIN(pin);

      if (isValid) {
        await resetFailedAttempts();
        handleLoginSuccess();
      } else {
        setPinError(true);
        await trackFailedAttempt();
        
        // Check if locked after failed attempt
        const locked = await isAccountLocked();
        if (locked) {
          const remaining = await getRemainingLockoutTime();
          setIsLocked(true);
          setLockoutTime(remaining);
          showError('Account Locked', `Too many failed attempts. Try again in ${Math.ceil(remaining / 60)} minutes`);
        } else {
          showError('Invalid PIN', 'Please try again');
        }

        setTimeout(() => {
          setPinError(false);
        }, 500);
      }
    } catch (error: any) {
      console.error('PIN verification error:', error);
      showError('Login Failed', error.message || 'Failed to verify PIN');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = () => {
    showSuccess('Welcome Back', 'Login successful');
    
    // TODO: Navigate based on user type from Firestore
    // Passenger → /(passenger)
    // Driver → /(driver)
    // Admin → /(admin)
    router.replace('/(auth)/welcome'); // Temporary
  };

  const handlePhoneLogin = async () => {
    if (!phone.trim()) {
      setPhoneError('Phone number is required');
      return;
    }
    if (phone.length !== 10) {
      setPhoneError('Phone number must be 10 digits');
      return;
    }
    if (!/^\d+$/.test(phone)) {
      setPhoneError('Phone number must contain only digits');
      return;
    }

    try {
      setLoading(true);
      const formattedPhone = `+234${phone}`;

      // Navigate to OTP verification for phone login
      router.push({
        pathname: '/(auth)/otp-verification',
        params: {
          phone: formattedPhone,
          isLogin: 'true',
        },
      });
    } catch (error: any) {
      console.error('Phone login error:', error);
      showError('Login Failed', error.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const formatLockoutTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.light,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: spacing.screenPadding,
      paddingTop: spacing.xl,
      paddingBottom: spacing.xl,
    },
    header: {
      marginBottom: spacing['2xl'],
    },
    title: {
      fontSize: typography.sizes['3xl'],
      fontFamily: typography.fonts.heading,
      color: colors.text.primary,
      marginBottom: spacing.xs,
    },
    subtitle: {
      fontSize: typography.sizes.base,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.text.secondary,
      lineHeight: typography.sizes.base * typography.lineHeights.normal,
    },
    pinContainer: {
      marginTop: spacing.xl,
    },
    lockoutContainer: {
      alignItems: 'center',
      padding: spacing.xl,
      backgroundColor: colors.status.errorLight,
      borderRadius: borderRadius.lg,
      marginBottom: spacing.xl,
    },
    lockoutText: {
      fontSize: typography.sizes.base,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.status.error,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    lockoutTimer: {
      fontSize: typography.sizes['2xl'],
      fontFamily: typography.fonts.heading,
      color: colors.status.error,
    },
    forgotPinButton: {
      alignItems: 'center',
      marginTop: spacing.lg,
      paddingVertical: spacing.sm,
    },
    forgotPinText: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.primary,
    },
    divider: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: spacing.xl,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: colors.border.light,
    },
    dividerText: {
      marginHorizontal: spacing.base,
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.text.secondary,
    },
    phoneLoginSection: {
      marginTop: spacing.base,
    },
    footer: {
      marginTop: 'auto',
      alignItems: 'center',
    },
    signupPrompt: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: spacing.base,
    },
    signupPromptText: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.text.secondary,
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
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={styles.subtitle}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>
              {hasPinStored
                ? 'Enter your PIN to continue'
                : 'Enter your phone number to login'}
            </Text>
          </View>

          {hasPinStored ? (
            <>
              {/* Lockout Warning */}
              {isLocked && (
                <View style={styles.lockoutContainer}>
                  <Text style={styles.lockoutText}>
                    Account locked due to too many failed attempts
                  </Text>
                  <Text style={styles.lockoutTimer}>
                    {formatLockoutTime(lockoutTime)}
                  </Text>
                </View>
              )}

              {/* PIN Pad */}
              <View style={styles.pinContainer}>
                <PINPad
                  length={6}
                  onComplete={handlePINComplete}
                  onBiometric={biometricEnabled ? handleBiometricAuth : undefined}
                  error={pinError}
                  loading={loading}
                  showBiometric={biometricEnabled && !isLocked}
                  title=""
                  disabled={loading || isLocked}
                />
              </View>

              {/* Forgot PIN */}
              <TouchableOpacity
                style={styles.forgotPinButton}
                onPress={() => router.push('/(auth)/forgot-pin')}
              >
                <Text style={styles.forgotPinText}>Forgot PIN?</Text>
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Phone Login Option */}
              <View style={styles.phoneLoginSection}>
                <Input
                  label="Login with Phone Number"
                  value={phone}
                  onChangeText={(text) => {
                    const cleaned = text.replace(/\D/g, '');
                    setPhone(cleaned);
                    setPhoneError('');
                  }}
                  placeholder="8012345678"
                  error={phoneError}
                  keyboardType="phone-pad"
                  leftIcon={<Phone size={20} color={colors.text.tertiary} />}
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
              {/* Phone Login */}
              <Input
                label="Phone Number"
                value={phone}
                onChangeText={(text) => {
                  const cleaned = text.replace(/\D/g, '');
                  setPhone(cleaned);
                  setPhoneError('');
                }}
                placeholder="8012345678"
                error={phoneError}
                keyboardType="phone-pad"
                leftIcon={<Phone size={20} color={colors.text.tertiary} />}
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

          {/* Signup Prompt */}
          <View style={styles.signupPrompt}>
            <Text style={styles.signupPromptText}>Don&apos;t have an account?</Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
              <Text style={styles.signupLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}