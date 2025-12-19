/**
 * Firestore Database Schema Types
 * Complete TypeScript interfaces for all collections
 */

// Import payment types to avoid duplication
import { PaymentMethod, PaymentStatus } from './payment';

// ============================================
// ENUMS
// ============================================

export enum UserType {
  PASSENGER = 'passenger',
  DRIVER = 'driver',
  ADMIN = 'admin',
}

export enum RideStatus {
  PENDING = 'pending',           // Passenger created request
  OFFERS_SENT = 'offers_sent',   // Drivers sent offers
  ACCEPTED = 'accepted',         // Passenger accepted offer
  ONGOING = 'ongoing',           // Ride started
  COMPLETED = 'completed',       // Ride completed
  CANCELLED = 'cancelled',       // Cancelled by passenger/driver
}

export enum PayoutStatus {
  PENDING = 'pending',
  PAID = 'paid',
}

export enum ReportCategory {
  SAFETY = 'safety',
  VEHICLE = 'vehicle',
  DRIVER_BEHAVIOR = 'driver_behavior',
  PASSENGER_BEHAVIOR = 'passenger_behavior',
  ROUTE = 'route',
  PAYMENT = 'payment',
  OTHER = 'other',
}

export enum ReportSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum ReportStatus {
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed',
}

export enum VehicleType {
  SEDAN = 'sedan',
  SUV = 'suv',
  TRICYCLE = 'tricycle',
  MINIBUS = 'minibus',
}

export enum DriverStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  INCOMPLETE = 'incomplete',
  SUSPENDED = 'suspended',
}

// ============================================
// COLLECTIONS
// ============================================

/**
 * Users Collection
 * Stores all user accounts (passengers, drivers, admins)
 */
export interface User {
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
  knownDevices: string[];           // Array of device IDs
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Drivers Collection
 * Extended driver information
 */
export interface Driver {
  uid: string;                      // Same as user uid
  userId: string;                   // Reference to users collection
  status: DriverStatus;
  isOnline: boolean;
  
  // Vehicle Information
  vehicleType: VehicleType;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: number;
  vehicleColor: string;
  plateNumber: string;
  vehiclePhotos: string[];          // Array of Cloudinary URLs
  
  // Driver License
  licenseNumber: string;
  licenseExpiry: Date;
  licenseFrontPhoto: string;        // Cloudinary URL
  licenseBackPhoto: string;         // Cloudinary URL
  
  // Vehicle Registration
  registrationNumber: string;
  registrationPhoto: string;        // Cloudinary URL
  insurancePhoto: string;           // Cloudinary URL
  
  // Bank Information
  bankName: string;
  accountNumber: string;
  accountName: string;
  
  // Current Location (updated in real-time)
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
  
  // Security Fields (same as User)
  pinLastChanged: Date;
  biometricEnabled: boolean;
  knownDevices: string[];
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Rides Collection
 * All ride requests and completed rides
 */
export interface Ride {
  rideId: string;
  passengerId: string;
  driverId: string | null;
  status: RideStatus;
  
  // Location Details
  pickupLocation: {
    address: string;
    latitude: number;
    longitude: number;
  };
  dropoffLocation: {
    address: string;
    latitude: number;
    longitude: number;
  };
  
  // Ride Details
  distance: number;                 // in kilometers
  estimatedDuration: number;        // in minutes
  baseFare: number;                 // Calculated base fare
  offeredFare: number | null;       // Driver's offered fare
  finalFare: number | null;         // Actual fare paid
  
  // Payment - using imported types from payment.ts
  paymentMethod: PaymentMethod | null;
  paymentStatus: PaymentStatus;
  paymentReference: string | null;  // For card payments
  
  // Timestamps
  requestedAt: Date;
  acceptedAt: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
  paidAt: Date | null;
  
  // Cancellation
  cancelledBy: string | null;       // userId who cancelled
  cancellationReason: string | null;
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Ratings Collection
 * Mutual ratings between passengers and drivers
 */
export interface Rating {
  ratingId: string;
  rideId: string;
  
  // Passenger Rating of Driver
  passengerToDriver: {
    rating: number;                 // 1-5
    comment: string | null;
    createdAt: Date;
  } | null;
  
  // Driver Rating of Passenger
  driverToPassenger: {
    rating: number;                 // 1-5
    comment: string | null;
    createdAt: Date;
  } | null;
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Earnings Collection
 * Driver earnings from completed rides
 */
export interface Earning {
  earningId: string;
  rideId: string;
  driverId: string;
  passengerId: string;
  
  amount: number;
  paymentMethod: PaymentMethod;     // Using imported type
  paymentReference: string | null;  // For card payments
  
  // Payout tracking
  payoutStatus: PayoutStatus;
  payoutId: string | null;          // Reference to payout
  payoutDate: Date | null;
  
  createdAt: Date;
}

/**
 * Payouts Collection
 * Weekly payouts to drivers (card payment earnings)
 */
export interface Payout {
  payoutId: string;
  driverId: string;
  
  // Amount Details
  totalAmount: number;
  numberOfRides: number;
  earningIds: string[];             // Array of earning IDs included
  
  // Bank Transfer Details
  bankName: string;
  accountNumber: string;
  accountName: string;
  transferReference: string | null;
  
  // Status
  status: PayoutStatus;
  processedBy: string | null;       // Admin uid
  processedAt: Date | null;
  
  // Period
  startDate: Date;
  endDate: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Reports Collection
 * Incident reports from passengers and drivers
 */
export interface Report {
  reportId: string;
  rideId: string | null;            // null for general reports
  reporterId: string;               // User who submitted report
  reportedUserId: string | null;    // User being reported (if applicable)
  
  category: ReportCategory;
  severity: ReportSeverity;
  status: ReportStatus;
  
  // Report Details
  title: string;
  description: string;
  evidencePhotos: string[];         // Array of Cloudinary URLs
  location: {
    latitude: number;
    longitude: number;
  } | null;
  
  // Admin Actions
  reviewedBy: string | null;        // Admin uid
  reviewedAt: Date | null;
  adminNotes: string | null;
  resolution: string | null;
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Messages Collection
 * In-app messaging between passenger and driver (optional feature)
 */
export interface Message {
  messageId: string;
  rideId: string;
  senderId: string;
  receiverId: string;
  
  content: string;
  isRead: boolean;
  
  createdAt: Date;
}

/**
 * Notifications Collection
 * Push notifications for users
 */
export interface Notification {
  notificationId: string;
  userId: string;
  
  type: 'ride_request' | 'ride_accepted' | 'ride_started' | 'ride_completed' 
        | 'payment_received' | 'rating_received' | 'report_submitted' 
        | 'report_resolved' | 'payout_processed' | 'account_suspended';
  
  title: string;
  message: string;
  
  // Related Data
  rideId: string | null;
  reportId: string | null;
  
  isRead: boolean;
  
  createdAt: Date;
}

// ============================================
// HELPER TYPES
// ============================================

/**
 * Location coordinates
 */
export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Location with address
 */
export interface LocationData {
  address: string;
  latitude: number;
  longitude: number;
}

/**
 * Device information for security
 */
export interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  deviceType: 'android' | 'ios';
  lastUsed: Date;
}

/**
 * Ride offer from driver to passenger
 */
export interface RideOffer {
  offerId: string;
  rideId: string;
  driverId: string;
  offeredFare: number;
  estimatedArrival: number;         // in minutes
  createdAt: Date;
  expiresAt: Date;
}

// ============================================
// COLLECTION REFERENCES
// ============================================

/**
 * Firestore collection paths
 */
export const Collections = {
  USERS: 'users',
  DRIVERS: 'drivers',
  RIDES: 'rides',
  RATINGS: 'ratings',
  EARNINGS: 'earnings',
  PAYOUTS: 'payouts',
  REPORTS: 'reports',
  MESSAGES: 'messages',
  NOTIFICATIONS: 'notifications',
} as const;

/**
 * Subcollections
 */
export const SubCollections = {
  RIDE_OFFERS: 'offers',            // rides/{rideId}/offers
  SECURITY_ACTIVITY: 'security_activity', // users/{userId}/security_activity
} as const;