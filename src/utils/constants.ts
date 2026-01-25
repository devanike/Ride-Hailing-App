export const APP_NAME = 'UI-Ride';
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

// MAP CONFIGURATION (NEW)
export const MAP_CONFIG = {
  // Initial region for map
  initialRegion: {
    latitude: CAMPUS_CENTER.latitude,
    longitude: CAMPUS_CENTER.longitude,
    latitudeDelta: 0.05,    // Zoom level
    longitudeDelta: 0.05,
  },
  
  // Map padding for UI elements
  edgePadding: {
    top: 50,
    right: 50,
    bottom: 50,
    left: 50,
  },
  
  // Animation duration
  animationDuration: 300,
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
  email: 'support@uiride.com',
  phone: '+234 800 000 0000',
  whatsapp: '+234 800 000 0000',
};

// DEEP LINKS
export const DEEP_LINKS = {
  scheme: 'uirideapp://',
  paymentCallback: 'uirideapp://payment-callback',
  rideDetails: 'uirideapp://ride-details',
};

// GOOGLE MAPS API KEY (NEW)
export const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

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

/**
 * Helper function to check if coordinates are within campus
 */
export const isWithinCampus = (latitude: number, longitude: number): boolean => {
  return (
    latitude >= CAMPUS_BOUNDARIES.south &&
    latitude <= CAMPUS_BOUNDARIES.north &&
    longitude >= CAMPUS_BOUNDARIES.west &&
    longitude <= CAMPUS_BOUNDARIES.east
  );
};

/**
 * Helper function to calculate distance between two points (Haversine formula)
 */
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance; // Distance in km
};

const toRad = (value: number): number => {
  return (value * Math.PI) / 180;
};

export default {
  APP_NAME,
  APP_VERSION,
  CAMPUS_BOUNDARIES,
  CAMPUS_CENTER,
  MAP_CONFIG,
  DISTANCE_THRESHOLDS,
  TIME_LIMITS,
  VALIDATION,
  IMAGE_CONSTRAINTS,
  PAGINATION,
  SUPPORT,
  DEEP_LINKS,
  GOOGLE_MAPS_API_KEY,
  SECURITY,
  isWithinCampus,
  calculateDistance,
};