// PIN configuration
export interface PinConfig {
  minLength: number;
  maxLength: number;
  expiryDays: number;
}

// Biometric authentication type (Fingerprint only)
export type BiometricType = 'fingerprint' | 'none';

// Biometric capability
export interface BiometricCapability {
  available: boolean;
  type: BiometricType;
}

// Authentication result
export interface AuthenticationResult {
  success: boolean;
  method: 'pin' | 'biometric' | 'none';
  error?: string;
}

// Device information
export interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  deviceType: 'android' | 'ios';
  lastUsed?: Date;
}

// Account lock status
export interface LockStatus {
  isLocked: boolean;
  remainingTime: number; // in seconds
  failedAttempts: number;
}

// Security settings
export interface SecuritySettings {
  pinEnabled: boolean;
  biometricEnabled: boolean;
  pinLastChanged: Date | null;
  knownDevices: string[];
}