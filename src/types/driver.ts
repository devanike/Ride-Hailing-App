import { Timestamp } from "firebase/firestore";

export type VehicleType = "car" | "tricycle" | "bus";
export type DriverStatus = "active" | "suspended";
export type PayoutPreference = "daily" | "weekly";

export interface BankAccount {
  bankName: string;
  accountNumber: string;
  accountName: string;
}

export interface DriverRegistrationData {
  vehicleType: VehicleType;
  vehicleColor: string;
  plateNumber: string;
  vehiclePhotos: string[];
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: string;
  licenseNumber: string;
  licenseExpiry: string;
  licenseFrontPhoto: string;
  licenseBackPhoto: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  payout_pref: PayoutPreference;
}

export interface Driver {
  uid: string;
  name: string;
  phone: string;
  email: string | null;
  profilePhoto: string | null;
  status: DriverStatus;
  isOnline: boolean;
  payout_pref: PayoutPreference;

  vehicleType: VehicleType;
  vehicleColor: string;
  plateNumber: string;
  vehiclePhotos: string[];
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: string;

  licenseNumber: string;
  licenseExpiry: string;
  licenseFrontPhoto: string;
  licenseBackPhoto: string;

  bankName: string;
  accountNumber: string;
  accountName: string;

  totalEarnings: number;
  pendingPayouts: number;
  completedRides: number;
  rating: number;
  totalRatings: number;

  pinLastChanged?: Timestamp;
  biometricEnabled?: boolean;
  knownDevices?: string[];
  failedLoginAttempts?: number;
  lockedUntil?: Timestamp | null;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
