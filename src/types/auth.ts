import { ConfirmationResult, User, UserCredential } from 'firebase/auth';

export type UserType = 'passenger' | 'driver' | 'admin';

export interface AuthUser {
  uid: string;
  phoneNumber: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface UserProfile {
  uid: string;
  name: string;
  phone: string;
  email: string | null;
  userType: UserType;
  profilePhoto: string | null;
  rating: number;
  totalRides: number;
  isAdmin: boolean;
  
  // Security Fields
  pinLastChanged: Date;
  biometricEnabled: boolean;
  knownDevices: string[];
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  
  createdAt: Date;
  updatedAt: Date;
}

// Re-export Firebase types for convenience
export type { ConfirmationResult, User, UserCredential };
