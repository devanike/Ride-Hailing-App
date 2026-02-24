import { Button } from "@/components/common/Button";
import { useTheme } from "@/hooks/useTheme";
import { sendPhoneOTP, verifyOTP } from "@/services/authService";
import { db } from "@/services/firebaseConfig";
import { showError, showSuccess } from "@/utils/toast";
import { router, useLocalSearchParams } from "expo-router";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import React, { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function OTPVerificationScreen() {
  const { colors, typography, spacing, borderRadius } = useTheme();
  const params = useLocalSearchParams();
  const { name, phone, userType, isLogin } = params as {
    name?: string;
    phone: string;
    userType?: "passenger" | "driver";
    isLogin?: string;
  };

  const isLoginMode = isLogin === "true";

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<any>(null);

  const inputRefs = useRef<(TextInput | null)[]>([]);

  // Timer for resend
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendTimer]);

  // Send initial OTP
  useEffect(() => {
    const sendOTP = async () => {
      try {
        const result = await sendPhoneOTP(phone);
        setConfirmationResult(result);
      } catch (error: any) {
        showError("Error", "Failed to send OTP");
        console.error("OTP send error:", error);
      }
    };

    sendOTP();
  }, [phone]);

  const handleOtpChange = (value: string, index: number) => {
    // Only allow digits
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all filled
    if (newOtp.every((digit) => digit !== "") && index === 5) {
      handleVerify(newOtp.join(""));
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (code?: string) => {
    const otpCode = code || otp.join("");

    if (otpCode.length !== 6) {
      showError("Invalid OTP", "Please enter all 6 digits");
      return;
    }

    try {
      setLoading(true);

      // Verify OTP
      const userCredential = await verifyOTP(confirmationResult, otpCode);
      const uid = userCredential.user.uid;

      if (isLoginMode) {
        // Login mode - just verify and navigate
        showSuccess("Success", "Login successful");

        // TODO: Navigate based on user type
        router.replace("/(auth)/welcome"); // Temporary
        return;
      }

      // Signup mode - create user documents
      await setDoc(doc(db, "users", uid), {
        uid,
        name,
        phone,
        email: null,
        userType,
        profilePhoto: null,
        rating: 0,
        totalRides: 0,
        isAdmin: false,

        // Security fields - initial values
        pinLastChanged: serverTimestamp(),
        biometricEnabled: false,
        knownDevices: [],
        failedLoginAttempts: 0,
        lockedUntil: null,

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // If driver, create driver document with status 'incomplete'
      if (userType === "driver") {
        await setDoc(doc(db, "drivers", uid), {
          uid,
          userId: uid,
          status: "incomplete",
          isOnline: false,

          // Vehicle Information - null initially
          vehicleType: null,
          vehicleMake: "",
          vehicleModel: "",
          vehicleYear: 0,
          vehicleColor: "",
          plateNumber: "",
          vehiclePhotos: [],

          // Driver License - null initially
          licenseNumber: "",
          licenseExpiry: null,
          licenseFrontPhoto: "",
          licenseBackPhoto: "",

          // Vehicle Registration - null initially
          registrationNumber: "",
          registrationPhoto: "",
          insurancePhoto: "",

          // Bank Information - null initially
          bankName: "",
          accountNumber: "",
          accountName: "",

          // Current Location
          currentLocation: null,

          // Statistics
          totalEarnings: 0,
          pendingPayouts: 0,
          completedRides: 0,
          rating: 0,
          totalRatings: 0,

          // Security fields
          pinLastChanged: serverTimestamp(),
          biometricEnabled: false,
          knownDevices: [],
          failedLoginAttempts: 0,
          lockedUntil: null,

          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      showSuccess("Success", "Account created successfully");

      // Navigate to profile setup
      router.push("/(auth)/profile-setup");
    } catch (error: any) {
      console.error("OTP verification error:", error);
      showError("Verification Failed", "Invalid OTP code. Please try again.");
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;

    try {
      setCanResend(false);
      setResendTimer(60);
      const result = await sendPhoneOTP(phone);
      setConfirmationResult(result);
      showSuccess("OTP Sent", "A new code has been sent to your phone");
    } catch (err: any) {
      console.error("Resend OTP error:", err);
      showError("Error", "Failed to resend OTP");
      setCanResend(true);
    }
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
    phoneNumber: {
      fontFamily: typography.fonts.bodyMedium,
      color: colors.primary,
    },
    otpContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: spacing.xxl,
    },
    otpInput: {
      width: 50,
      height: 60,
      borderWidth: 2,
      borderColor: colors.border,
      borderRadius: borderRadius.md,
      textAlign: "center",
      fontSize: typography.sizes["2xl"],
      fontFamily: typography.fonts.bodyMedium,
      color: colors.textPrimary,
      backgroundColor: colors.surface,
    },
    otpInputFilled: {
      borderColor: colors.primary,
    },
    resendContainer: {
      alignItems: "center",
      marginBottom: spacing.xl,
    },
    resendText: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.textSecondary,
      marginBottom: spacing.sm,
    },
    resendButton: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    resendButtonText: {
      fontSize: typography.sizes.base,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.primary,
    },
    resendButtonDisabled: {
      opacity: 0.5,
    },
    footer: {
      marginTop: "auto",
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Enter Verification Code</Text>
            <Text style={styles.subtitle}>
              We sent a 6-digit code to{" "}
              <Text style={styles.phoneNumber}>{phone}</Text>
            </Text>
          </View>

          {/* OTP Inputs */}
          <View style={styles.otpContainer}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => {
                  inputRefs.current[index] = ref;
                }}
                style={[styles.otpInput, digit && styles.otpInputFilled]}
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

          {/* Resend */}
          <View style={styles.resendContainer}>
            <Text style={styles.resendText}>
              {canResend
                ? "Didn't receive code?"
                : `Resend code in ${resendTimer}s`}
            </Text>
            <TouchableOpacity
              style={[
                styles.resendButton,
                !canResend && styles.resendButtonDisabled,
              ]}
              onPress={handleResend}
              disabled={!canResend}
            >
              <Text style={styles.resendButtonText}>Resend Code</Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Button
              title="Verify"
              onPress={() => handleVerify()}
              variant="primary"
              size="large"
              fullWidth
              loading={loading}
              disabled={loading || otp.some((digit) => !digit)}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
