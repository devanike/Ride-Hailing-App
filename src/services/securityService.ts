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

// Custom error class for security errors
export class SecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecurityError';
    Object.setPrototypeOf(this, SecurityError.prototype);
  }
}

// Type definitions
interface BiometricCapability {
  available: boolean;
  type: 'fingerprint' | 'none';
}

interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  deviceType: 'android' | 'ios';
}

// PIN MANAGEMENT
/**
 * Hash PIN with salt using SHA256
 */
const hashPIN = async (pin: string, salt: string): Promise<string> => {
  try {
    const combined = pin + salt;
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      combined
    );
    return hash;
  } catch (error) {
    console.error('Error hashing PIN:', error);
    throw new SecurityError('Failed to secure PIN');
  }
};

/**
 * Generate random salt
 */
const generateSalt = async (): Promise<string> => {
  try {
    const randomBytes = await Crypto.getRandomBytesAsync(16);
    return Array.from(randomBytes, (byte: number) => 
      byte.toString(16).padStart(2, '0')
    ).join('');
  } catch (error) {
    console.error('Error generating salt:', error);
    throw new SecurityError('Failed to generate security token');
  }
};

/**
 * Set up a new PIN
 * @param pin - 4-6 digit PIN
 * @returns Promise<boolean> - Success status
 * @throws SecurityError if PIN is invalid or setup fails
 */
export const setupPIN = async (pin: string): Promise<boolean> => {
  try {
    if (!pin || typeof pin !== 'string') {
      throw new SecurityError('PIN is required');
    }

    if (pin.length < 4 || pin.length > 6) {
      throw new SecurityError('PIN must be 4-6 digits');
    }

    if (!/^\d+$/.test(pin)) {
      throw new SecurityError('PIN must contain only numbers');
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
    if (error instanceof SecurityError) {
      throw error;
    }
    throw new SecurityError('Failed to setup PIN. Please try again.');
  }
};

/**
 * Verify PIN
 * @param pin - PIN to verify
 * @returns Promise<boolean> - Whether PIN is correct
 * @throws SecurityError if verification fails
 */
export const verifyPIN = async (pin: string): Promise<boolean> => {
  try {
    if (!pin || typeof pin !== 'string') {
      return false;
    }

    const storedHash = await SecureStore.getItemAsync(PIN_KEY);
    const salt = await SecureStore.getItemAsync(PIN_SALT_KEY);

    if (!storedHash || !salt) {
      throw new SecurityError('PIN not found. Please setup your PIN.');
    }

    const hash = await hashPIN(pin, salt);
    return hash === storedHash;
  } catch (error) {
    console.error('Error verifying PIN:', error);
    if (error instanceof SecurityError) {
      throw error;
    }
    throw new SecurityError('Failed to verify PIN. Please try again.');
  }
};

/**
 * Update PIN
 * @param currentPin - Current PIN for verification
 * @param newPin - New PIN to set
 * @returns Promise<boolean> - Success status
 * @throws SecurityError if current PIN is incorrect or update fails
 */
export const updatePIN = async (currentPin: string, newPin: string): Promise<boolean> => {
  try {
    if (!currentPin || !newPin) {
      throw new SecurityError('Both current and new PIN are required');
    }

    // Verify current PIN first
    const isValid = await verifyPIN(currentPin);
    if (!isValid) {
      throw new SecurityError('Current PIN is incorrect');
    }

    // Set up new PIN
    const success = await setupPIN(newPin);
    if (success) {
      await AsyncStorage.setItem(PIN_LAST_CHANGED_KEY, new Date().toISOString());
    }
    return success;
  } catch (error) {
    console.error('Error updating PIN:', error);
    if (error instanceof SecurityError) {
      throw error;
    }
    throw new SecurityError('Failed to update PIN. Please try again.');
  }
};

/**
 * Delete PIN
 * @returns Promise<boolean> - Success status
 * @throws SecurityError if deletion fails
 */
export const deletePIN = async (): Promise<boolean> => {
  try {
    await SecureStore.deleteItemAsync(PIN_KEY);
    await SecureStore.deleteItemAsync(PIN_SALT_KEY);
    await AsyncStorage.removeItem(PIN_LAST_CHANGED_KEY);
    return true;
  } catch (error) {
    console.error('Error deleting PIN:', error);
    throw new SecurityError('Failed to delete PIN. Please try again.');
  }
};

/**
 * Check if user has PIN set up
 * @returns Promise<boolean> - Whether PIN exists
 */
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
/**
 * Get biometric capability of device (Fingerprint only)
 * @returns Promise<BiometricCapability>
 */
export const getBiometricCapability = async (): Promise<BiometricCapability> => {
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

/**
 * Authenticate with biometric
 * @returns Promise<boolean> - Whether authentication was successful
 * @throws SecurityError if authentication fails
 */
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
    throw new SecurityError('Biometric authentication failed. Please use PIN.');
  }
};

/**
 * Enable biometric authentication
 * @returns Promise<boolean> - Success status
 * @throws SecurityError if biometric is not available or enable fails
 */
export const enableBiometric = async (): Promise<boolean> => {
  try {
    const capability = await getBiometricCapability();
    if (!capability.available) {
      throw new SecurityError('Biometric authentication is not available on this device');
    }

    await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true');
    return true;
  } catch (error) {
    console.error('Error enabling biometric:', error);
    if (error instanceof SecurityError) {
      throw error;
    }
    throw new SecurityError('Failed to enable biometric. Please try again.');
  }
};

/**
 * Disable biometric authentication
 * @returns Promise<boolean> - Success status
 * @throws SecurityError if disable fails
 */
export const disableBiometric = async (): Promise<boolean> => {
  try {
    await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, 'false');
    return true;
  } catch (error) {
    console.error('Error disabling biometric:', error);
    throw new SecurityError('Failed to disable biometric. Please try again.');
  }
};

/**
 * Check if biometric is enabled
 * @returns Promise<boolean> - Whether biometric is enabled
 */
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
/**
 * Authenticate user (tries biometric first, falls back to PIN)
 * @param pin - Optional PIN for fallback
 * @returns Promise<boolean> - Whether authentication was successful
 * @throws SecurityError if account is locked or authentication fails
 */
export const authenticateUser = async (pin?: string): Promise<boolean> => {
  try {
    // Check if account is locked
    const locked = await isAccountLocked();
    if (locked) {
      const remainingTime = await getRemainingLockoutTime();
      throw new SecurityError(
        `Account is locked due to too many failed attempts. Try again in ${Math.ceil(remainingTime / 60)} minutes.`
      );
    }

    // Try biometric first if enabled
    const biometricEnabled = await isBiometricEnabled();
    if (biometricEnabled) {
      try {
        const biometricSuccess = await authenticateWithBiometric();
        if (biometricSuccess) {
          await resetFailedAttempts();
          return true;
        }
      } catch (bioError) {
        // Log the specific biometric error for user feedback
        console.error('Biometric authentication error:', bioError);
        
        // If there's a specific error message, we could throw it
        // But we'll fall through to PIN as a graceful fallback
        const errorMessage = bioError instanceof Error 
          ? bioError.message 
          : 'Biometric authentication failed';
        
        console.log(`${errorMessage}, falling back to PIN`);
        
        // If user explicitly cancelled, we might want to throw
        if (bioError instanceof Error && bioError.message.includes('cancel')) {
          throw new SecurityError('Authentication cancelled. Please use PIN.');
        }
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
        throw new SecurityError('Invalid PIN');
      }
    }

    throw new SecurityError('Authentication required');
  } catch (error) {
    console.error('Error authenticating user:', error);
    if (error instanceof SecurityError) {
      throw error;
    }
    throw new SecurityError('Authentication failed. Please try again.');
  }
};

// DEVICE MANAGEMENT
/**
 * Get current device information
 * @returns Promise<DeviceInfo>
 */
export const getDeviceInfo = async (): Promise<DeviceInfo> => {
  const deviceId = Constants.sessionId || 'unknown';
  const deviceName = Constants.deviceName || 'Unknown Device';
  const deviceType: 'android' | 'ios' = Platform.OS === 'ios' ? 'ios' : 'android';

  return { deviceId, deviceName, deviceType };
};

/**
 * Check if current device is new (not in known devices)
 * @returns Promise<boolean> - Whether device is new
 */
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

/**
 * Mark current device as known
 * @returns Promise<boolean> - Success status
 * @throws SecurityError if registration fails
 */
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
    throw new SecurityError('Failed to register device. Please try again.');
  }
};

// FAILED ATTEMPTS & LOCKOUT
/**
 * Track failed login attempt
 * @returns Promise<void>
 * @throws SecurityError if max attempts reached
 */
export const trackFailedAttempt = async (): Promise<void> => {
  try {
    const attemptsJson = await AsyncStorage.getItem(FAILED_ATTEMPTS_KEY);
    const attempts = attemptsJson ? parseInt(attemptsJson, 10) : 0;
    const newAttempts = attempts + 1;

    await AsyncStorage.setItem(FAILED_ATTEMPTS_KEY, newAttempts.toString());

    if (newAttempts >= MAX_FAILED_ATTEMPTS) {
      await lockAccount();
      throw new SecurityError(
        `Too many failed attempts. Account locked for ${LOCKOUT_DURATION / 60000} minutes.`
      );
    }
  } catch (error) {
    console.error('Error tracking failed attempt:', error);
    if (error instanceof SecurityError) {
      throw error;
    }
  }
};

/**
 * Reset failed attempts counter
 * @returns Promise<void>
 */
export const resetFailedAttempts = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(FAILED_ATTEMPTS_KEY, '0');
    await AsyncStorage.removeItem(LOCKED_UNTIL_KEY);
  } catch (error) {
    console.error('Error resetting failed attempts:', error);
  }
};

/**
 * Lock account for specified duration
 * @returns Promise<void>
 * @throws SecurityError if lock fails
 */
export const lockAccount = async (): Promise<void> => {
  try {
    const lockedUntil = new Date(Date.now() + LOCKOUT_DURATION).toISOString();
    await AsyncStorage.setItem(LOCKED_UNTIL_KEY, lockedUntil);
  } catch (error) {
    console.error('Error locking account:', error);
    throw new SecurityError('Failed to lock account');
  }
};

/**
 * Check if account is currently locked
 * @returns Promise<boolean> - Whether account is locked
 */
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

/**
 * Get remaining lockout time in seconds
 * @returns Promise<number> - Remaining time in seconds
 */
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