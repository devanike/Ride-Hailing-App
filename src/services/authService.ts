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
import { clearAllSecurityData } from "./securityService";

// Simple verifier for test phone auth in React Native
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

export const verifyOTP = async (
  confirmationResult: ConfirmationResult,
  code: string,
): Promise<UserCredential> => {
  try {
    if (!confirmationResult) {
      throw new Error("No verification session. Please request a new OTP.");
    }
    const userCredential = await confirmationResult.confirm(code);
    return userCredential;
  } catch (error: any) {
    console.error("Error verifying OTP:", error);
    throw new Error("Invalid OTP code");
  }
};

export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

export const logout = async (): Promise<void> => {
  try {
    await clearAllSecurityData();
    await signOut(auth);
  } catch (error: any) {
    console.error("Error logging out:", error);
    throw new Error("Failed to logout");
  }
};

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
