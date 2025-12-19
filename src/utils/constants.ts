export const APP_NAME = 'UI Campus Cab';
export const APP_VERSION = '1.0.0';

// CAMPUS BOUNDARIES (University of Ibadan)
export const CAMPUS_BOUNDARIES = {
  north: 7.4500,
  south: 7.3700,
  east: 3.9100,
  west: 3.8900,
};

export const CAMPUS_CENTER = {
  latitude: 7.4407,
  longitude: 3.9000,
};

// PRICING CONFIGURATION
// export const PRICING = {
//   baseFare: 200, // Minimum fare in Naira
//   perKmRate: 100, // Rate per kilometer
//   minDistance: 0.5, // Minimum distance in km
// };

// DISTANCE THRESHOLDS
export const DISTANCE_THRESHOLDS = {
  nearbyDrivers: 5, // km - Show drivers within this radius
  maxRideDistance: 10, // km - Maximum ride distance
};

// TIME LIMITS
export const TIME_LIMITS = {
  otpExpiry: 300, // seconds (5 minutes)
  rideRequestExpiry: 300, // seconds (5 minutes)
  driverResponseTime: 180, // seconds (3 minutes)
};

// VALIDATION RULES
export const VALIDATION = {
  phoneNumberLength: 10, // Nigerian phone numbers (without country code)
  minPasswordLength: 6,
  maxDescriptionLength: 500,
  maxReportDescriptionLength: 1000,
  minNameLength: 2,
  maxNameLength: 50,
  minFare: 100, // Minimum fare drivers can offer (₦100)
  maxFare: 10000, // Maximum fare drivers can offer (₦10,000)
};

// IMAGE CONSTRAINTS
export const IMAGE_CONSTRAINTS = {
  maxSizeInMB: 5,
  maxSizeInBytes: 5 * 1024 * 1024, // 5MB
  allowedFormats: ['jpg', 'jpeg', 'png'],
  compressionQuality: 0.8,
  maxWidth: 1200,
  maxHeight: 1200,
};

// PAGINATION
export const PAGINATION = {
  ridesPerPage: 20,
  driversPerPage: 10,
  reportsPerPage: 20,
};

// SUPPORT CONTACT
export const SUPPORT = {
  email: 'support@uicampuscab.com',
  phone: '+234 800 000 0000',
  whatsapp: '+234 800 000 0000',
};

// DEEP LINKS
export const DEEP_LINKS = {
  scheme: 'uicampuscab',
  paymentCallback: 'uicampuscab://payment-callback',
  rideDetails: 'uicampuscab://ride-details',
};

// SECURITY CONFIGURATION
export const SECURITY = {
  pinLength: 6, // or make it configurable 4-6
  pinMinLength: 4,
  pinMaxLength: 6,
  maxFailedAttempts: 5,
  lockoutDuration: 300, // seconds (5 minutes)
  pinExpiryDays: 90, // Force PIN change after 90 days
  requireBiometricReauth: false, // Require biometric every time or allow remember
};

export default {
  APP_NAME,
  APP_VERSION,
  CAMPUS_BOUNDARIES,
  CAMPUS_CENTER,
  DISTANCE_THRESHOLDS,
  TIME_LIMITS,
  VALIDATION,
  IMAGE_CONSTRAINTS,
  PAGINATION,
  SUPPORT,
  DEEP_LINKS,
};