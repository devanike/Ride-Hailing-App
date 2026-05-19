import { Collections, UserSecurity } from "@/types/database";
import {
  AuthenticationResult,
  BiometricCapability,
  DeviceInfo,
  LockStatus,
} from "@/types/security";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Crypto from "expo-crypto";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Platform } from "react-native";
import { auth, db } from "./firebaseConfig";

// Security Service - Handles PIN and biometric authentication

// Storage keys (local cache)
const PIN_KEY = "user_pin_hash";
const PIN_SALT_KEY = "user_pin_salt";
const PIN_LAST_CHANGED_KEY = "pin_last_changed";
const BIOMETRIC_ENABLED_KEY = "biometric_enabled";
const KNOWN_DEVICES_KEY = "known_devices";
const FAILED_ATTEMPTS_KEY = "failed_attempts";
const LOCKED_UNTIL_KEY = "locked_until";
const DEVICE_ID_KEY = "device_unique_id";
const ONBOARDING_KEY = "@onboarding_completed";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION = 5 * 60 * 1000;

const makeError = (message: string): Error => {
  const error = new Error(message);
  error.name = "SecurityError";
  return error;
};

const isSecurityError = (error: unknown): boolean =>
  error instanceof Error && error.name === "SecurityError";

// PIN MANAGEMENT
const hashPIN = async (pin: string, salt: string): Promise<string> => {
  try {
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      pin + salt,
    );
    return hash;
  } catch (error) {
    console.error("Error hashing PIN:", error);
    throw makeError("Failed to secure PIN");
  }
};

const generateSalt = async (): Promise<string> => {
  try {
    const randomBytes = await Crypto.getRandomBytesAsync(16);
    return Array.from(randomBytes, (byte: number) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
  } catch (error) {
    console.error("Error generating salt:", error);
    throw makeError("Failed to generate security token");
  }
};

export const setupPIN = async (pin: string): Promise<void> => {
  try {
    if (!pin || typeof pin !== "string") {
      throw makeError("PIN is required");
    }
    if (!/^\d{6}$/.test(pin)) {
      throw makeError("PIN must be exactly 6 digits");
    }

    const uid = auth.currentUser?.uid;
    if (!uid) throw makeError("User not authenticated");

    const salt = await generateSalt();
    const hash = await hashPIN(pin, salt);
    const now = new Date().toISOString();

    // Store in Firestore (synced across devices)
    await setDoc(
      doc(db, Collections.USER_SECURITY, uid),
      {
        pinHash: hash,
        pinSalt: salt,
        pinLastChanged: now,
        updatedAt: now,
      } as UserSecurity,
      { merge: true },
    );

    // Also cache locally for faster verification
    await SecureStore.setItemAsync(PIN_KEY, hash);
    await SecureStore.setItemAsync(PIN_SALT_KEY, salt);
    await AsyncStorage.setItem(PIN_LAST_CHANGED_KEY, now);
  } catch (error) {
    console.error("Error setting up PIN:", error);
    if (isSecurityError(error)) throw error;
    throw makeError("Failed to setup PIN. Please try again.");
  }
};

export const verifyPIN = async (pin: string): Promise<boolean> => {
  try {
    if (!pin || typeof pin !== "string") return false;

    // Try local cache first (faster)
    let storedHash = await SecureStore.getItemAsync(PIN_KEY);
    let salt = await SecureStore.getItemAsync(PIN_SALT_KEY);

    // If not local, fetch from Firestore
    if (!storedHash || !salt) {
      const uid = auth.currentUser?.uid;
      if (!uid) throw makeError("User not authenticated");

      const secDoc = await getDoc(doc(db, Collections.USER_SECURITY, uid));
      if (!secDoc.exists()) {
        throw makeError("PIN not found. Please setup your PIN.");
      }

      const data = secDoc.data() as UserSecurity;
      storedHash = data.pinHash;
      salt = data.pinSalt;

      // Cache locally for next time
      if (storedHash && salt) {
        await SecureStore.setItemAsync(PIN_KEY, storedHash);
        await SecureStore.setItemAsync(PIN_SALT_KEY, salt);
      }
    }

    if (!storedHash || !salt) {
      throw makeError("PIN not found. Please setup your PIN.");
    }

    const hash = await hashPIN(pin, salt);
    return hash === storedHash;
  } catch (error) {
    console.error("Error verifying PIN:", error);
    if (isSecurityError(error)) throw error;
    throw makeError("Failed to verify PIN. Please try again.");
  }
};

export const updatePIN = async (
  currentPin: string,
  newPin: string,
): Promise<void> => {
  try {
    if (!currentPin || !newPin) {
      throw makeError("Both current and new PIN are required");
    }
    const isValid = await verifyPIN(currentPin);
    if (!isValid) {
      throw makeError("Current PIN is incorrect");
    }
    // setupPIN handles both Firestore and local storage
    await setupPIN(newPin);
  } catch (error) {
    console.error("Error updating PIN:", error);
    if (isSecurityError(error)) throw error;
    throw makeError("Failed to update PIN. Please try again.");
  }
};

export const deletePIN = async (): Promise<void> => {
  try {
    // Clear local cache
    await SecureStore.deleteItemAsync(PIN_KEY);
    await SecureStore.deleteItemAsync(PIN_SALT_KEY);
    await AsyncStorage.removeItem(PIN_LAST_CHANGED_KEY);

    // Clear from Firestore
    const uid = auth.currentUser?.uid;
    if (uid) {
      await setDoc(
        doc(db, Collections.USER_SECURITY, uid),
        {
          pinHash: null,
          pinSalt: null,
          pinLastChanged: null,
          updatedAt: new Date().toISOString(),
        } as UserSecurity,
        { merge: true },
      );
    }
  } catch (error) {
    console.error("Error deleting PIN:", error);
    throw makeError("Failed to delete PIN. Please try again.");
  }
};

export const hasPIN = async (): Promise<boolean> => {
  try {
    // Check local cache first
    const localPin = await SecureStore.getItemAsync(PIN_KEY);
    if (localPin) return true;

    // Check Firestore
    const uid = auth.currentUser?.uid;
    if (!uid) return false;

    const secDoc = await getDoc(doc(db, Collections.USER_SECURITY, uid));
    if (!secDoc.exists()) return false;

    const data = secDoc.data() as UserSecurity;
    return !!data.pinHash;
  } catch (error) {
    console.error("Error checking PIN:", error);
    return false;
  }
};

// BIOMETRIC AUTHENTICATION
export const getBiometricCapability =
  async (): Promise<BiometricCapability> => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!compatible || !enrolled) {
        return { available: false, type: "none" };
      }
      const types =
        await LocalAuthentication.supportedAuthenticationTypesAsync();
      if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        return { available: true, type: "fingerprint" };
      }
      return { available: false, type: "none" };
    } catch (error) {
      console.error("Error getting biometric capability:", error);
      return { available: false, type: "none" };
    }
  };

export const authenticateWithBiometric =
  async (): Promise<AuthenticationResult> => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Scan your fingerprint to continue",
        fallbackLabel: "Use PIN",
        cancelLabel: "Cancel",
        disableDeviceFallback: false,
      });
      return {
        success: result.success,
        method: "biometric",
        error: result.success ? undefined : "Biometric authentication failed",
      };
    } catch (error) {
      console.error("Error authenticating with biometric:", error);
      throw makeError("Biometric authentication failed. Please use PIN.");
    }
  };

export const enableBiometric = async (): Promise<void> => {
  try {
    const capability = await getBiometricCapability();
    if (!capability.available) {
      throw makeError(
        "Biometric authentication is not available on this device",
      );
    }
    await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, "true");
  } catch (error) {
    console.error("Error enabling biometric:", error);
    if (isSecurityError(error)) throw error;
    throw makeError("Failed to enable biometric. Please try again.");
  }
};

export const disableBiometric = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, "false");
  } catch (error) {
    console.error("Error disabling biometric:", error);
    throw makeError("Failed to disable biometric. Please try again.");
  }
};

export const isBiometricEnabled = async (): Promise<boolean> => {
  try {
    const enabled = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
    return enabled === "true";
  } catch (error) {
    console.error("Error checking biometric status:", error);
    return false;
  }
};

// UNIFIED AUTHENTICATION
export const authenticateUser = async (
  pin?: string,
): Promise<AuthenticationResult> => {
  try {
    const lockStatus = await isAccountLocked();
    if (lockStatus.isLocked) {
      throw makeError(
        `Account is locked due to too many failed attempts. Try again in ${Math.ceil(lockStatus.remainingTime / 60)} minutes.`,
      );
    }

    const biometricEnabled = await isBiometricEnabled();
    if (biometricEnabled) {
      try {
        const result = await authenticateWithBiometric();
        if (result.success) {
          await resetFailedAttempts();
          return result;
        }
      } catch (bioError) {
        console.error("Biometric authentication error:", bioError);
        const errorMessage =
          bioError instanceof Error
            ? bioError.message
            : "Biometric authentication failed";
        console.log(`${errorMessage}, falling back to PIN`);
        if (bioError instanceof Error && bioError.message.includes("cancel")) {
          throw makeError("Authentication cancelled. Please use PIN.");
        }
      }
    }

    if (pin) {
      const pinSuccess = await verifyPIN(pin);
      if (pinSuccess) {
        await resetFailedAttempts();
        return { success: true, method: "pin" };
      } else {
        await trackFailedAttempt();
        throw makeError("Invalid PIN");
      }
    }

    throw makeError("Authentication required");
  } catch (error) {
    console.error("Error authenticating user:", error);
    if (isSecurityError(error)) throw error;
    throw makeError("Authentication failed. Please try again.");
  }
};

// DEVICE MANAGEMENT
export const getDeviceInfo = async (): Promise<DeviceInfo> => {
  let deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);

  if (!deviceId) {
    const randomBytes = await Crypto.getRandomBytesAsync(16);
    deviceId = Array.from(randomBytes, (byte: number) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
    await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
  }

  const deviceName =
    (Constants.deviceName as string | undefined) || "Unknown Device";
  const deviceType: "android" | "ios" =
    Platform.OS === "ios" ? "ios" : "android";
  return { deviceId, deviceName, deviceType };
};

export const isNewDevice = async (): Promise<boolean> => {
  try {
    const currentDevice = await getDeviceInfo();
    const knownDevicesJson = await AsyncStorage.getItem(KNOWN_DEVICES_KEY);
    if (!knownDevicesJson) {
      return true;
    }
    const knownDevices: string[] = JSON.parse(knownDevicesJson);
    return !knownDevices.includes(currentDevice.deviceId);
  } catch (error) {
    console.error("Error checking if device is new:", error);
    return true;
  }
};

export const markDeviceAsKnown = async (): Promise<void> => {
  try {
    const currentDevice = await getDeviceInfo();
    const knownDevicesJson = await AsyncStorage.getItem(KNOWN_DEVICES_KEY);
    const knownDevices: string[] = knownDevicesJson
      ? JSON.parse(knownDevicesJson)
      : [];
    if (!knownDevices.includes(currentDevice.deviceId)) {
      knownDevices.push(currentDevice.deviceId);
      await AsyncStorage.setItem(
        KNOWN_DEVICES_KEY,
        JSON.stringify(knownDevices),
      );
    }
  } catch (error) {
    console.error("Error marking device as known:", error);
    throw makeError("Failed to register device. Please try again.");
  }
};

// FAILED ATTEMPTS & LOCKOUT
export const trackFailedAttempt = async (): Promise<void> => {
  try {
    const attemptsJson = await AsyncStorage.getItem(FAILED_ATTEMPTS_KEY);
    const attempts = attemptsJson ? parseInt(attemptsJson, 10) : 0;
    const newAttempts = attempts + 1;
    await AsyncStorage.setItem(FAILED_ATTEMPTS_KEY, newAttempts.toString());
    if (newAttempts >= MAX_FAILED_ATTEMPTS) {
      await lockAccount();
      throw makeError(
        `Too many failed attempts. Account locked for ${LOCKOUT_DURATION / 60000} minutes.`,
      );
    }
  } catch (error) {
    console.error("Error tracking failed attempt:", error);
    if (isSecurityError(error)) throw error;
  }
};

export const resetFailedAttempts = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(FAILED_ATTEMPTS_KEY, "0");
    await AsyncStorage.removeItem(LOCKED_UNTIL_KEY);
  } catch (error) {
    console.error("Error resetting failed attempts:", error);
  }
};

export const lockAccount = async (): Promise<void> => {
  try {
    const lockedUntil = new Date(Date.now() + LOCKOUT_DURATION).toISOString();
    await AsyncStorage.setItem(LOCKED_UNTIL_KEY, lockedUntil);
  } catch (error) {
    console.error("Error locking account:", error);
    throw makeError("Failed to lock account");
  }
};

export const isAccountLocked = async (): Promise<LockStatus> => {
  try {
    const lockedUntilJson = await AsyncStorage.getItem(LOCKED_UNTIL_KEY);
    const attemptsJson = await AsyncStorage.getItem(FAILED_ATTEMPTS_KEY);
    const failedAttempts = attemptsJson ? parseInt(attemptsJson, 10) : 0;

    if (!lockedUntilJson) {
      return { isLocked: false, remainingTime: 0, failedAttempts };
    }

    const lockedUntil = new Date(lockedUntilJson);
    const now = new Date();

    if (now < lockedUntil) {
      const diff = lockedUntil.getTime() - now.getTime();
      return {
        isLocked: true,
        remainingTime: Math.ceil(diff / 1000),
        failedAttempts,
      };
    }

    await resetFailedAttempts();
    return { isLocked: false, remainingTime: 0, failedAttempts: 0 };
  } catch (error) {
    console.error("Error checking if account is locked:", error);
    return { isLocked: false, remainingTime: 0, failedAttempts: 0 };
  }
};

export const getRemainingLockoutTime = async (): Promise<number> => {
  try {
    const lockedUntilJson = await AsyncStorage.getItem(LOCKED_UNTIL_KEY);
    if (!lockedUntilJson) {
      return 0;
    }
    const lockedUntil = new Date(lockedUntilJson);
    const now = new Date();
    const diff = lockedUntil.getTime() - now.getTime();
    return Math.max(0, Math.floor(diff / 1000));
  } catch (error) {
    console.error("Error getting remaining lockout time:", error);
    return 0;
  }
};

// ONBOARDING MANAGEMENT
export const setHasSeenOnboarding = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(ONBOARDING_KEY, "true");
  } catch (error) {
    console.error("Error setting onboarding status:", error);
  }
};

export const checkOnboardingStatus = async (): Promise<boolean> => {
  try {
    const status = await AsyncStorage.getItem(ONBOARDING_KEY);
    return status === "true";
  } catch (error) {
    console.error("Error checking onboarding status:", error);
    return false;
  }
};

// CLEAR ALL SECURITY DATA (for logout)
export const clearAllSecurityData = async (): Promise<void> => {
  try {
    // Clear local PIN cache (NOT Firestore — PIN persists across devices)
    await SecureStore.deleteItemAsync(PIN_KEY);
    await SecureStore.deleteItemAsync(PIN_SALT_KEY);

    // Clear other local security data
    await AsyncStorage.removeItem(PIN_LAST_CHANGED_KEY);
    await AsyncStorage.removeItem(BIOMETRIC_ENABLED_KEY);
    await AsyncStorage.removeItem(KNOWN_DEVICES_KEY);
    await AsyncStorage.removeItem(FAILED_ATTEMPTS_KEY);
    await AsyncStorage.removeItem(LOCKED_UNTIL_KEY);

    // Keep DEVICE_ID_KEY — device-level, not user-level
    // Keep ONBOARDING_KEY — user already saw onboarding
  } catch (error) {
    console.error("Error clearing security data:", error);
    throw error;
  }
};

export default {
  setupPIN,
  verifyPIN,
  updatePIN,
  deletePIN,
  hasPIN,
  getBiometricCapability,
  authenticateWithBiometric,
  enableBiometric,
  disableBiometric,
  isBiometricEnabled,
  authenticateUser,
  getDeviceInfo,
  isNewDevice,
  markDeviceAsKnown,
  trackFailedAttempt,
  resetFailedAttempts,
  lockAccount,
  isAccountLocked,
  getRemainingLockoutTime,
  setHasSeenOnboarding,
  checkOnboardingStatus,
  clearAllSecurityData,
};
