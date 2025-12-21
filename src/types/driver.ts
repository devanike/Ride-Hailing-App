/**
 * Driver Registration Types
 * TypeScript interfaces for driver registration flow
 */

// Vehicle type enumeration
export enum VehicleType {
  SEDAN = 'sedan',
  SUV = 'suv',
  TRICYCLE = 'tricycle',
  MINIBUS = 'minibus',
}

// Driver status enumeration
export enum DriverStatus {
  INCOMPLETE = 'incomplete', // Registration not completed
  ACTIVE = 'active',         // Can accept rides
  INACTIVE = 'inactive',     // Voluntarily offline
  SUSPENDED = 'suspended',   // Suspended by admin
}

// Vehicle information
export interface VehicleInfo {
  type: VehicleType;
  make: string;
  model: string;
  year: number;
  color: string;
  plateNumber: string;
  photos: string[]; // Cloudinary URLs
}

// Driver license information
export interface LicenseInfo {
  number: string;
  expiryDate: Date;
  frontPhoto: string; // Cloudinary URL
  backPhoto: string;  // Cloudinary URL
}

// Vehicle documents
export interface VehicleDocuments {
  registrationNumber: string;
  registrationPhoto: string; // Cloudinary URL
  insurancePhoto: string;    // Cloudinary URL
}

// Bank account information
export interface BankAccount {
  bankName: string;
  accountNumber: string;
  accountName: string;
}

// Complete driver registration data
export interface DriverRegistrationData {
  vehicleInfo: VehicleInfo;
  license: LicenseInfo;
  documents: VehicleDocuments;
  bankAccount: BankAccount;
}

// Image upload state (used in UI)
export interface ImageUpload {
  uri: string;
  uploading: boolean;
  uploaded: boolean;
  cloudinaryUrl?: string;
}

// Driver profile (from database)
export interface DriverProfile {
  uid: string;
  userId: string;
  status: DriverStatus;
  isOnline: boolean;
  
  // Vehicle Information
  vehicleType: VehicleType;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: number;
  vehicleColor: string;
  plateNumber: string;
  vehiclePhotos: string[];
  
  // Driver License
  licenseNumber: string;
  licenseExpiry: Date;
  licenseFrontPhoto: string;
  licenseBackPhoto: string;
  
  // Vehicle Registration
  registrationNumber: string;
  registrationPhoto: string;
  insurancePhoto: string;
  
  // Bank Information
  bankName: string;
  accountNumber: string;
  accountName: string;
  
  // Current Location
  currentLocation: {
    latitude: number;
    longitude: number;
    heading: number;
    timestamp: Date;
  } | null;
  
  // Statistics
  totalEarnings: number;
  pendingPayouts: number;
  completedRides: number;
  rating: number;
  totalRatings: number;
  
  // Security Fields
  pinLastChanged: Date;
  biometricEnabled: boolean;
  knownDevices: string[];
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}