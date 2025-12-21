import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { useTheme } from '@/hooks/useTheme';
import { sendPhoneOTP, verifyOTP } from '@/services/authService';
import { auth } from '@/services/firebaseConfig';
import { showError, showSuccess } from '@/utils/toast';
import { router } from 'expo-router';
import { Phone } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type ForgotPinStep = 'phone' | 'otp' | 'complete';

export default function ForgotPinScreen() {
  const { colors, typography, spacing, borderRadius } = useTheme();
  
  // States
  const [currentStep, setCurrentStep] = useState<ForgotPinStep>('phone');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<any>(null);

  const inputRefs = useRef<(TextInput | null)[]>([]);

  // Timer for resend
  useEffect(() => {
    if (currentStep === 'otp' && resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    } else if (resendTimer === 0) {
      setCanResend(true);
    }
  }, [resendTimer, currentStep]);

  const validatePhone = (): boolean => {
    if (!phone.trim()) {
      setPhoneError('Phone number is required');
      return false;
    }
    if (phone.length !== 10) {
      setPhoneError('Phone number must be 10 digits');
      return false;
    }
    if (!/^\d+$/.test(phone)) {
      setPhoneError('Phone number must contain only digits');
      return false;
    }
    
    setPhoneError('');
    return true;
  };

  const handleSendOTP = async () => {
    if (!validatePhone()) return;

    try {
      setLoading(true);
      const formattedPhone = `+234${phone}`;

      // Check if user exists
      const userExists = auth.currentUser?.phoneNumber === formattedPhone;
      
      if (!userExists) {
        showError('Account Not Found', 'No account found with this phone number');
        return;
      }

      // Send OTP
      const result = await sendPhoneOTP(formattedPhone);
      setConfirmationResult(result);
      setCurrentStep('otp');
      showSuccess('OTP Sent', 'Verification code sent to your phone');
    } catch (error: any) {
      console.error('Send OTP error:', error);
      showError('Error', error.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (value: string, index: number) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all filled
    if (newOtp.every((digit) => digit !== '') && index === 5) {
      handleVerifyOTP(newOtp.join(''));
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOTP = async (code?: string) => {
    const otpCode = code || otp.join('');
    
    if (otpCode.length !== 6) {
      showError('Invalid OTP', 'Please enter all 6 digits');
      return;
    }

    try {
      setLoading(true);

      // Verify OTP
      await verifyOTP(confirmationResult, otpCode);
      
      setCurrentStep('complete');
      showSuccess('Verified', 'OTP verified successfully');

      // Navigate to PIN setup after short delay
      setTimeout(() => {
        router.replace({
          pathname: '/(auth)/pin-setup',
          params: { isReset: 'true' }
        });
      }, 1500);
    } catch (error: any) {
      console.error('OTP verification error:', error);
      showError('Verification Failed', 'Invalid OTP code. Please try again.');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!canResend) return;

    try {
      setLoading(true);
      setCanResend(false);
      setResendTimer(60);
      
      const formattedPhone = `+234${phone}`;
      const result = await sendPhoneOTP(formattedPhone);
      setConfirmationResult(result);
      
      showSuccess('OTP Sent', 'A new code has been sent');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (error: any) {
      console.error('Resend OTP error:', error);
      showError('Error', 'Failed to resend OTP');
      setCanResend(true);
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
    phoneNumber: {
      fontFamily: typography.fonts.bodyMedium,
      color: colors.primary,
    },
    form: {
      marginBottom: spacing.xl,
    },
    otpContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: spacing['2xl'],
    },
    otpInput: {
      width: 50,
      height: 60,
      borderWidth: 2,
      borderColor: colors.border.light,
      borderRadius: borderRadius.md,
      textAlign: 'center',
      fontSize: typography.sizes['2xl'],
      fontFamily: typography.fonts.bodyMedium,
      color: colors.text.primary,
      backgroundColor: colors.surface.light,
    },
    otpInputFilled: {
      borderColor: colors.primary,
    },
    resendContainer: {
      alignItems: 'center',
      marginBottom: spacing.xl,
    },
    resendText: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.text.secondary,
      marginBottom: spacing.sm,
    },
    resendButton: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.base,
    },
    resendButtonText: {
      fontSize: typography.sizes.base,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.primary,
    },
    resendButtonDisabled: {
      opacity: 0.5,
    },
    successContainer: {
      alignItems: 'center',
      paddingVertical: spacing['3xl'],
    },
    successIcon: {
      width: 80,
      height: 80,
      borderRadius: borderRadius.full,
      backgroundColor: colors.status.successLight,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    successText: {
      fontSize: typography.sizes.xl,
      fontFamily: typography.fonts.headingSemiBold,
      color: colors.status.success,
      textAlign: 'center',
    },
    footer: {
      marginTop: 'auto',
    },
    backButton: {
      alignItems: 'center',
      paddingVertical: spacing.sm,
      marginTop: spacing.base,
    },
    backButtonText: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.text.secondary,
    },
  });

  const renderPhoneStep = () => (
    <>
      <View style={styles.header}>
        <Text style={styles.title}>Forgot PIN?</Text>
        <Text style={styles.subtitle}>
          Enter your phone number to receive a verification code
        </Text>
      </View>

      <View style={styles.form}>
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
      </View>

      <View style={styles.footer}>
        <Button
          title="Send Verification Code"
          onPress={handleSendOTP}
          variant="primary"
          size="large"
          fullWidth
          loading={loading}
          disabled={loading}
        />

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const renderOTPStep = () => (
    <>
      <View style={styles.header}>
        <Text style={styles.title}>Enter Verification Code</Text>
        <Text style={styles.subtitle}>
          We sent a 6-digit code to{' '}
          <Text style={styles.phoneNumber}>+234{phone}</Text>
        </Text>
      </View>

      <View style={styles.otpContainer}>
        {otp.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => {
              inputRefs.current[index] = ref;
            }}
            style={[
              styles.otpInput,
              digit && styles.otpInputFilled,
            ]}
            value={digit}
            onChangeText={(value) => handleOtpChange(value, index)}
            onKeyPress={(e) => handleKeyPress(e, index)}
            keyboardType="number-pad"
            maxLength={1}
            selectTextOnFocus
            autoFocus={index === 0}
            editable={!loading}
          />
        ))}
      </View>

      <View style={styles.resendContainer}>
        <Text style={styles.resendText}>
          {canResend ? "Didn't receive code?" : `Resend code in ${resendTimer}s`}
        </Text>
        <TouchableOpacity
          style={[
            styles.resendButton,
            !canResend && styles.resendButtonDisabled,
          ]}
          onPress={handleResendOTP}
          disabled={!canResend || loading}
        >
          <Text style={styles.resendButtonText}>Resend Code</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Button
          title="Verify"
          onPress={() => handleVerifyOTP()}
          variant="primary"
          size="large"
          fullWidth
          loading={loading}
          disabled={loading || otp.some((digit) => !digit)}
        />

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            setCurrentStep('phone');
            setOtp(['', '', '', '', '', '']);
            setResendTimer(60);
            setCanResend(false);
          }}
        >
          <Text style={styles.backButtonText}>Change Phone Number</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const renderCompleteStep = () => (
    <View style={styles.successContainer}>
      <View style={styles.successIcon}>
        <Text style={{ fontSize: 40 }}>✓</Text>
      </View>
      <Text style={styles.successText}>Verification Successful!</Text>
      <Text style={styles.subtitle}>Redirecting to PIN setup...</Text>
    </View>
  );

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
          {currentStep === 'phone' && renderPhoneStep()}
          {currentStep === 'otp' && renderOTPStep()}
          {currentStep === 'complete' && renderCompleteStep()}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}