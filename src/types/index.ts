// User Types
export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  userType: 'passenger' | 'driver';
  profilePhoto?: string;
  rating: number;
  totalRides: number;
  isAdmin: boolean;
  createdAt: Date;
}

export interface Driver extends User {
  vehicleType: string;
  vehiclePlate: string;
  vehicleColor: string;
  vehicleBrand: string;
  isAvailable: boolean;
  isOnline: boolean;
  currentLocation?: Location;
  totalEarnings: number;
  documents: DriverDocuments;
  bankAccount?: BankAccount;
}

export interface DriverDocuments {
  licenseNumber: string;
  licensePhoto: string;
  vehicleRegistration: string;
  vehiclePhoto: string;
  vehicleInsurance?: string;
}

export interface BankAccount {
  bankName: string;
  accountNumber: string;
  accountName: string;
}

// Location Types
export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
  name?: string;
}

// Ride Types
export interface Ride {
  id: string;
  passengerId: string;
  driverId?: string;
  pickupLocation: Location;
  dropoffLocation: Location;
  status: RideStatus;
  agreedFare?: number;
  paymentMethod?: PaymentMethod;
  paymentStatus?: PaymentStatus;
  paymentReference?: string;
  offers?: RideOffer[];
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  distance?: number;
  estimatedFare?: number;
}

export type RideStatus =
  | 'finding_driver'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type PaymentMethod = 'cash' | 'transfer' | 'card';
export type PaymentStatus = 'pending' | 'paid' | 'failed';

export interface RideOffer {
  driverId: string;
  driverName: string;
  driverPhoto: string;
  driverRating: number;
  vehicleType: string;
  vehiclePlate: string;
  offeredFare: number;
  timestamp: Date;
}

// Rating Types
export interface Rating {
  id: string;
  rideId: string;
  raterId: string;
  rateeId: string;
  rating: number;
  review?: string;
  createdAt: Date;
}

// Earnings Types
export interface Earning {
  id: string;
  driverId: string;
  rideId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  date: Date;
  payoutStatus: 'pending' | 'paid';
}

// Report Types
export interface Report {
  id: string;
  rideId: string;
  reportedBy: string;
  reportedDriver: string;
  category: ReportCategory;
  description: string;
  severity: 'low' | 'medium' | 'high';
  evidence: string[];
  status: ReportStatus;
  isAnonymous: boolean;
  adminNotes?: string;
  createdAt: Date;
}

export type ReportCategory =
  | 'safety'
  | 'misconduct'
  | 'payment'
  | 'vehicle'
  | 'route'
  | 'lost_item'
  | 'other';

export type ReportStatus = 'pending' | 'under_review' | 'resolved' | 'dismissed';