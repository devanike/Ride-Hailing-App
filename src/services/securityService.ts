import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Security Service - Handles PIN and biometric authentication

// Storage keys
const PIN_KEY = 'user_pin_hash';
const PIN_SALT_KEY = 'user_pin_salt';
const PIN_LAST_CHANGED_KEY = 'pin_last_changed';
const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';
const KNOWN_DEVICES_KEY = 'known_devices';
const FAILED_ATTEMPTS_KEY = 'failed_attempts';
const LOCKED_UNTIL_KEY = 'locked_until';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

// PIN MANAGEMENT
// Hash PIN with salt using SHA256
const hashPIN = async (pin: string, salt: string): Promise<string> => {
  const combined = pin + salt;
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    combined
  );
  return hash;
};

// Generate random salt
const generateSalt = async (): Promise<string> => {
  const randomBytes = await Crypto.getRandomBytesAsync(16);
  return Array.from(randomBytes, (byte: number) => byte.toString(16).padStart(2, '0')).join('');
};

// Set up a new PIN
export const setupPIN = async (pin: string): Promise<boolean> => {
  try {
    if (pin.length < 4 || pin.length > 6) {
      throw new Error('PIN must be 4-6 digits');
    }

    // Generate salt and hash PIN
    const salt = await generateSalt();
    const hash = await hashPIN(pin, salt);

    // Store hash and salt securely
    await SecureStore.setItemAsync(PIN_KEY, hash);
    await SecureStore.setItemAsync(PIN_SALT_KEY, salt);
    await AsyncStorage.setItem(PIN_LAST_CHANGED_KEY, new Date().toISOString());

    return true;
  } catch (error) {
    console.error('Error setting up PIN:', error);
    return false;
  }
};

// Verify PIN
export const verifyPIN = async (pin: string): Promise<boolean> => {
  try {
    const storedHash = await SecureStore.getItemAsync(PIN_KEY);
    const salt = await SecureStore.getItemAsync(PIN_SALT_KEY);

    if (!storedHash || !salt) {
      return false;
    }

    const hash = await hashPIN(pin, salt);
    return hash === storedHash;
  } catch (error) {
    console.error('Error verifying PIN:', error);
    return false;
  }
};

// Update PIN
export const updatePIN = async (currentPin: string, newPin: string): Promise<boolean> => {
  try {
    // Verify current PIN first
    const isValid = await verifyPIN(currentPin);
    if (!isValid) {
      throw new Error('Current PIN is incorrect');
    }

    // Set up new PIN
    const success = await setupPIN(newPin);
    if (success) {
      await AsyncStorage.setItem(PIN_LAST_CHANGED_KEY, new Date().toISOString());
    }
    return success;
  } catch (error) {
    console.error('Error updating PIN:', error);
    return false;
  }
};

// Delete PIN
export const deletePIN = async (): Promise<boolean> => {
  try {
    await SecureStore.deleteItemAsync(PIN_KEY);
    await SecureStore.deleteItemAsync(PIN_SALT_KEY);
    await AsyncStorage.removeItem(PIN_LAST_CHANGED_KEY);
    return true;
  } catch (error) {
    console.error('Error deleting PIN:', error);
    return false;
  }
};


// Check if user has PIN set up
export const hasPIN = async (): Promise<boolean> => {
  try {
    const pin = await SecureStore.getItemAsync(PIN_KEY);
    return !!pin;
  } catch (error) {
    console.error('Error checking PIN:', error);
    return false;
  }
};

// BIOMETRIC AUTHENTICATION
// Get biometric capability of device (Fingerprint only)
export const getBiometricCapability = async (): Promise<{
  available: boolean;
  type: 'fingerprint' | 'none';
}> => {
  try {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();

    if (!compatible || !enrolled) {
      return { available: false, type: 'none' };
    }

    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    
    // Only accept fingerprint
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return { available: true, type: 'fingerprint' };
    }

    return { available: false, type: 'none' };
  } catch (error) {
    console.error('Error getting biometric capability:', error);
    return { available: false, type: 'none' };
  }
};

// Authenticate with biometric
export const authenticateWithBiometric = async (): Promise<boolean> => {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Authenticate to continue',
      fallbackLabel: 'Use PIN',
      cancelLabel: 'Cancel',
    });

    return result.success;
  } catch (error) {
    console.error('Error authenticating with biometric:', error);
    return false;
  }
};

// Enable biometric authentication
export const enableBiometric = async (): Promise<boolean> => {
  try {
    await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true');
    return true;
  } catch (error) {
    console.error('Error enabling biometric:', error);
    return false;
  }
};

// Disable biometric authentication
export const disableBiometric = async (): Promise<boolean> => {
  try {
    await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, 'false');
    return true;
  } catch (error) {
    console.error('Error disabling biometric:', error);
    return false;
  }
};

// Check if biometric is enabled
export const isBiometricEnabled = async (): Promise<boolean> => {
  try {
    const enabled = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
    return enabled === 'true';
  } catch (error) {
    console.error('Error checking biometric status:', error);
    return false;
  }
};

// UNIFIED AUTHENTICATION
// Authenticate user (tries biometric first, falls back to PIN)
export const authenticateUser = async (pin?: string): Promise<boolean> => {
  try {
    // Check if account is locked
    const isLocked = await isAccountLocked();
    if (isLocked) {
      throw new Error('Account is locked due to too many failed attempts');
    }

    // Try biometric first if enabled
    const biometricEnabled = await isBiometricEnabled();
    if (biometricEnabled) {
      const biometricSuccess = await authenticateWithBiometric();
      if (biometricSuccess) {
        await resetFailedAttempts();
        return true;
      }
    }

    // Fall back to PIN
    if (pin) {
      const pinSuccess = await verifyPIN(pin);
      if (pinSuccess) {
        await resetFailedAttempts();
        return true;
      } else {
        await trackFailedAttempt();
        return false;
      }
    }

    return false;
  } catch (error) {
    console.error('Error authenticating user:', error);
    return false;
  }
};

// DEVICE MANAGEMENT
// Get current device information
export const getDeviceInfo = async (): Promise<{
  deviceId: string;
  deviceName: string;
  deviceType: 'android' | 'ios';
}> => {
  const deviceId = Constants.sessionId || 'unknown';
  const deviceName = Constants.deviceName || 'Unknown Device';
  const deviceType = Platform.OS === 'ios' ? 'ios' : 'android';

  return { deviceId, deviceName, deviceType };
};

// Check if current device is new (not in known devices)
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
    console.error('Error checking if device is new:', error);
    return true;
  }
};

// Mark current device as known
export const markDeviceAsKnown = async (): Promise<boolean> => {
  try {
    const currentDevice = await getDeviceInfo();
    const knownDevicesJson = await AsyncStorage.getItem(KNOWN_DEVICES_KEY);
    
    let knownDevices: string[] = knownDevicesJson ? JSON.parse(knownDevicesJson) : [];
    
    if (!knownDevices.includes(currentDevice.deviceId)) {
      knownDevices.push(currentDevice.deviceId);
      await AsyncStorage.setItem(KNOWN_DEVICES_KEY, JSON.stringify(knownDevices));
    }

    return true;
  } catch (error) {
    console.error('Error marking device as known:', error);
    return false;
  }
};

// FAILED ATTEMPTS & LOCKOUT
// Track failed login attempt
export const trackFailedAttempt = async (): Promise<void> => {
  try {
    const attemptsJson = await AsyncStorage.getItem(FAILED_ATTEMPTS_KEY);
    const attempts = attemptsJson ? parseInt(attemptsJson) : 0;
    const newAttempts = attempts + 1;

    await AsyncStorage.setItem(FAILED_ATTEMPTS_KEY, newAttempts.toString());

    if (newAttempts >= MAX_FAILED_ATTEMPTS) {
      await lockAccount();
    }
  } catch (error) {
    console.error('Error tracking failed attempt:', error);
  }
};

// Reset failed attempts counter
export const resetFailedAttempts = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(FAILED_ATTEMPTS_KEY, '0');
    await AsyncStorage.removeItem(LOCKED_UNTIL_KEY);
  } catch (error) {
    console.error('Error resetting failed attempts:', error);
  }
};

// Lock account for specified duration
export const lockAccount = async (): Promise<void> => {
  try {
    const lockedUntil = new Date(Date.now() + LOCKOUT_DURATION).toISOString();
    await AsyncStorage.setItem(LOCKED_UNTIL_KEY, lockedUntil);
  } catch (error) {
    console.error('Error locking account:', error);
  }
};

// Check if account is currently locked
export const isAccountLocked = async (): Promise<boolean> => {
  try {
    const lockedUntilJson = await AsyncStorage.getItem(LOCKED_UNTIL_KEY);
    
    if (!lockedUntilJson) {
      return false;
    }

    const lockedUntil = new Date(lockedUntilJson);
    const now = new Date();

    if (now < lockedUntil) {
      return true;
    } else {
      // Lockout period has expired, reset
      await resetFailedAttempts();
      return false;
    }
  } catch (error) {
    console.error('Error checking if account is locked:', error);
    return false;
  }
};

// Get remaining lockout time in seconds
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
    console.error('Error getting remaining lockout time:', error);
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