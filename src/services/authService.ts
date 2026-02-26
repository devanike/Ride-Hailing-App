import {
  ApplicationVerifier,
  ConfirmationResult,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  signInWithPhoneNumber,
  signOut,
  Unsubscribe,
  User,
  UserCredential,
} from "firebase/auth";
import { auth } from "./firebaseConfig";

// Auth Service - Handles Firebase Authentication with Phone Number

// Simple verifier for React Native
// Firebase will use test numbers if configured in Firebase Console
class InvisibleVerifier implements ApplicationVerifier {
  type = "recaptcha" as const;

  async verify(): Promise<string> {
    return "";
  }

  clear() {
    // No-op
  }

  _reset() {
    // No-op
  }
}

const verifier = new InvisibleVerifier();

// Send OTP to phone number
// Works with test phone numbers configured in Firebase Console
export const sendPhoneOTP = async (
  phoneNumber: string,
): Promise<ConfirmationResult> => {
  try {
    console.log("Sending OTP to:", phoneNumber);

    if (!phoneNumber.startsWith("+")) {
      throw new Error(
        "Phone number must be in E.164 format (e.g., +2348012345678)",
      );
    }

    const confirmationResult = await signInWithPhoneNumber(
      auth,
      phoneNumber,
      verifier,
    );

    console.log("OTP request successful");
    return confirmationResult;
  } catch (error: any) {
    console.error("Error sending OTP:", error);
    console.error("Error code:", error.code);

    if (error.code === "auth/argument-error") {
      throw new Error(
        "Please ensure test phone numbers are configured in Firebase Console",
      );
    }

    throw new Error(error.message || "Failed to send OTP");
  }
};

// Verify OTP code
export const verifyOTP = async (
  confirmationResult: ConfirmationResult,
  code: string,
): Promise<UserCredential> => {
  try {
    const userCredential = await confirmationResult.confirm(code);
    return userCredential;
  } catch (error: any) {
    console.error("Error verifying OTP:", error);
    throw new Error("Invalid OTP code");
  }
};

// Get current authenticated user
export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

// Logout current user
export const logout = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error: any) {
    console.error("Error logging out:", error);
    throw new Error("Failed to logout");
  }
};

// Listen to auth state changes
export const onAuthStateChanged = (
  callback: (user: User | null) => void,
): Unsubscribe => {
  return firebaseOnAuthStateChanged(auth, callback);
};

export default {
  sendPhoneOTP,
  verifyOTP,
  getCurrentUser,
  logout,
  onAuthStateChanged,
};
