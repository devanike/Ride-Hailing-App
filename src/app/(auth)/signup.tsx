import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { useTheme } from '@/hooks/useTheme';
import { showError } from '@/utils/toast';
import { router } from 'expo-router';
import { Phone, User } from 'lucide-react-native';
import React, { useState } from 'react';
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

type UserType = 'passenger' | 'driver';

export default function SignupScreen() {
  const { colors, typography, spacing, borderRadius } = useTheme();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [userType, setUserType] = useState<UserType>('passenger');
  const [loading, setLoading] = useState(false);

  // Validation
  const [nameError, setNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');

  const validateInputs = (): boolean => {
    let isValid = true;

    // Validate name
    if (!name.trim()) {
      setNameError('Name is required');
      isValid = false;
    } else if (name.trim().length < 2) {
      setNameError('Name must be at least 2 characters');
      isValid = false;
    } else {
      setNameError('');
    }

    // Validate phone
    if (!phone.trim()) {
      setPhoneError('Phone number is required');
      isValid = false;
    } else if (phone.length !== 10) {
      setPhoneError('Phone number must be 10 digits');
      isValid = false;
    } else if (!/^\d+$/.test(phone)) {
      setPhoneError('Phone number must contain only digits');
      isValid = false;
    } else {
      setPhoneError('');
    }

    return isValid;
  };

  const handleSignup = async () => {
    if (!validateInputs()) return;

    try {
      setLoading(true);

      // Format phone number to E.164 format (+234...)
      const formattedPhone = `+234${phone}`;

      // Navigate to OTP verification with data
      // OTP will be sent from the verification screen
      router.push({
        pathname: '/(auth)/otp-verification',
        params: {
          name,
          phone: formattedPhone,
          userType,
        },
      });
    } catch (error: any) {
      console.error('Signup error:', error);
      showError('Signup Failed', error.message || 'Failed to proceed');
    } finally {
      setLoading(false);
    }
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
    // Testing helper banner
    testingBanner: {
      backgroundColor: colors.status.infoLight,
      padding: spacing.md,
      borderRadius: borderRadius.md,
      marginBottom: spacing.lg,
      borderLeftWidth: 4,
      borderLeftColor: colors.status.info,
    },
    testingTitle: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.status.info,
      marginBottom: spacing.xs,
    },
    testingText: {
      fontSize: typography.sizes.xs,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.text.secondary,
      lineHeight: typography.sizes.xs * typography.lineHeights.normal,
    },
    form: {
      marginBottom: spacing.xl,
    },
    userTypeContainer: {
      marginBottom: spacing.xl,
    },
    userTypeLabel: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.text.secondary,
      marginBottom: spacing.sm,
    },
    userTypeOptions: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    userTypeOption: {
      flex: 1,
      paddingVertical: spacing.base,
      paddingHorizontal: spacing.md,
      borderRadius: borderRadius.md,
      borderWidth: 2,
      borderColor: colors.border.light,
      alignItems: 'center',
      backgroundColor: colors.surface.light,
    },
    userTypeOptionActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + '10',
    },
    userTypeText: {
      fontSize: typography.sizes.base,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.text.secondary,
      marginTop: spacing.xs,
    },
    userTypeTextActive: {
      color: colors.primary,
      fontFamily: typography.fonts.body,
    },
    footer: {
      marginTop: 'auto',
      alignItems: 'center',
    },
    loginPrompt: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: spacing.base,
    },
    loginPromptText: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.text.secondary,
    },
    loginLink: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.primary,
      marginLeft: spacing.xs,
    },
  });

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
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>
              Sign up to start booking rides across UI campus
            </Text>
          </View>

          {/* Testing Helper Banner */}
          {/* {__DEV__ && (
            <View style={styles.testingBanner}>
              <Text style={styles.testingTitle}>Development Mode</Text>
              <Text style={styles.testingText}>
                Use test phone numbers: 1234567890 (code: 123456) or 9876543210 (code: 654321)
              </Text>
            </View>
          )} */}

          {/* Form */}
          <View style={styles.form}>
            {/* Name Input */}
            <Input
              label="Full Name"
              value={name}
              onChangeText={(text) => {
                setName(text);
                setNameError('');
              }}
              placeholder="Enter your full name"
              error={nameError}
              leftIcon={<User size={20} color={colors.text.tertiary} />}
              autoCapitalize="words"
            />

            {/* Phone Input */}
            <Input
              label="Phone Number"
              value={phone}
              onChangeText={(text) => {
                // Only allow digits
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

            {/* User Type Selection */}
            <View style={styles.userTypeContainer}>
              <Text style={styles.userTypeLabel}>I am a</Text>
              <View style={styles.userTypeOptions}>
                <TouchableOpacity
                  style={[
                    styles.userTypeOption,
                    userType === 'passenger' && styles.userTypeOptionActive,
                  ]}
                  onPress={() => setUserType('passenger')}
                  activeOpacity={0.7}
                >
                  <User
                    size={32}
                    color={userType === 'passenger' ? colors.primary : colors.text.tertiary}
                  />
                  <Text
                    style={[
                      styles.userTypeText,
                      userType === 'passenger' && styles.userTypeTextActive,
                    ]}
                  >
                    Passenger
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.userTypeOption,
                    userType === 'driver' && styles.userTypeOptionActive,
                  ]}
                  onPress={() => setUserType('driver')}
                  activeOpacity={0.7}
                >
                  <User
                    size={32}
                    color={userType === 'driver' ? colors.primary : colors.text.tertiary}
                  />
                  <Text
                    style={[
                      styles.userTypeText,
                      userType === 'driver' && styles.userTypeTextActive,
                    ]}
                  >
                    Driver
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Button
              title="Continue"
              onPress={handleSignup}
              variant="primary"
              size="large"
              fullWidth
              loading={loading}
              disabled={loading}
            />

            {/* Login Prompt */}
            <View style={styles.loginPrompt}>
              <Text style={styles.loginPromptText}>Already have an account?</Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                <Text style={styles.loginLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}