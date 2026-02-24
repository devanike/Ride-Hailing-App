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
import { Platform } from "react-native";

// Security Service - Handles PIN and biometric authentication

// Storage keys
const PIN_KEY = "user_pin_hash";
const PIN_SALT_KEY = "user_pin_salt";
const PIN_LAST_CHANGED_KEY = "pin_last_changed";
const BIOMETRIC_ENABLED_KEY = "biometric_enabled";
const KNOWN_DEVICES_KEY = "known_devices";
const FAILED_ATTEMPTS_KEY = "failed_attempts";
const LOCKED_UNTIL_KEY = "locked_until";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

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
    const salt = await generateSalt();
    const hash = await hashPIN(pin, salt);
    await SecureStore.setItemAsync(PIN_KEY, hash);
    await SecureStore.setItemAsync(PIN_SALT_KEY, salt);
    await AsyncStorage.setItem(PIN_LAST_CHANGED_KEY, new Date().toISOString());
  } catch (error) {
    console.error("Error setting up PIN:", error);
    if (isSecurityError(error)) throw error;
    throw makeError("Failed to setup PIN. Please try again.");
  }
};

export const verifyPIN = async (pin: string): Promise<boolean> => {
  try {
    if (!pin || typeof pin !== "string") {
      return false;
    }
    const storedHash = await SecureStore.getItemAsync(PIN_KEY);
    const salt = await SecureStore.getItemAsync(PIN_SALT_KEY);
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
    await setupPIN(newPin);
    await AsyncStorage.setItem(PIN_LAST_CHANGED_KEY, new Date().toISOString());
  } catch (error) {
    console.error("Error updating PIN:", error);
    if (isSecurityError(error)) throw error;
    throw makeError("Failed to update PIN. Please try again.");
  }
};

export const deletePIN = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(PIN_KEY);
    await SecureStore.deleteItemAsync(PIN_SALT_KEY);
    await AsyncStorage.removeItem(PIN_LAST_CHANGED_KEY);
  } catch (error) {
    console.error("Error deleting PIN:", error);
    throw makeError("Failed to delete PIN. Please try again.");
  }
};

export const hasPIN = async (): Promise<boolean> => {
  try {
    const pin = await SecureStore.getItemAsync(PIN_KEY);
    return !!pin;
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
        promptMessage: "Authenticate to continue",
        fallbackLabel: "Use PIN",
        cancelLabel: "Cancel",
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
  const deviceId = Constants.sessionId || "unknown";
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
};
