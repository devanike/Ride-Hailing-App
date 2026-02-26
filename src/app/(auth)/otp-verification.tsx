import { Button } from "@/components/common/Button";
import { useTheme } from "@/hooks/useTheme";
import { sendPhoneOTP, verifyOTP } from "@/services/authService";
import { db } from "@/services/firebaseConfig";
import { markDeviceAsKnown } from "@/services/securityService";
import { showError, showSuccess } from "@/utils/toast";
import { router, useLocalSearchParams } from "expo-router";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
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

  // Countdown timer
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendTimer]);

  // Send OTP on mount
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
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newOtp.every((digit) => digit !== "") && index === 5) {
      handleVerify(newOtp.join(""));
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Route user to the correct home after successful auth
  const routeAuthenticatedUser = async (uid: string) => {
    const [adminSnap, driverSnap, passengerSnap] = await Promise.all([
      getDoc(doc(db, "admins", uid)),
      getDoc(doc(db, "drivers", uid)),
      getDoc(doc(db, "passengers", uid)),
    ]);

    if (adminSnap.exists()) {
      router.replace("/(admin)");
    } else if (driverSnap.exists()) {
      router.replace("/(driver)");
    } else if (passengerSnap.exists()) {
      router.replace("/(passenger)");
    } else {
      router.replace("/(auth)/profile-setup");
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

      const userCredential = await verifyOTP(confirmationResult, otpCode);
      const uid = userCredential.user.uid;

      await markDeviceAsKnown();

      if (isLoginMode) {
        // Login: check Firestore to route correctly
        showSuccess("Success", "Login successful");
        await routeAuthenticatedUser(uid);
        return;
      }

      // Signup: create initial document in correct collection
      if (userType === "driver") {
        await setDoc(doc(db, "drivers", uid), {
          uid,
          name: name ?? "",
          phone,
          email: null,
          profilePhoto: null,
          status: "active",
          isOnline: false,
          vehicleType: null,
          vehicleColor: "",
          plateNumber: "",
          vehiclePhotos: [],
          vehicleMake: null,
          vehicleModel: null,
          vehicleYear: null,
          licenseNumber: "",
          licenseExpiry: null,
          licenseFrontPhoto: "",
          licenseBackPhoto: "",
          bankName: "",
          accountNumber: "",
          accountName: "",
          payout_pref: "daily",
          totalEarnings: 0,
          pendingPayouts: 0,
          completedRides: 0,
          rating: 0,
          totalRatings: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(doc(db, "passengers", uid), {
          uid,
          name: name ?? "",
          phone,
          email: null,
          profilePhoto: null,
          totalRides: 0,
          rating: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      showSuccess("Success", "Account verified successfully");

      // Always go to profile-setup next
      router.push({
        pathname: "/(auth)/profile-setup",
        params: { userType: userType ?? "passenger" },
      });
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
