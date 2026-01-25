/**
 * Location Service
 * Handles all location-related operations using expo-location
 */

import {
  Coordinates,
  GeocodeResult,
  Location,
  LocationPermissionStatus,
  LocationSubscription,
  ReverseGeocodeResult,
} from '@/types/location';
import { isWithinCampus } from '@/utils/constants';
import * as ExpoLocation from 'expo-location';

/**
 * Request location permissions from user
 * @returns Permission status
 */
export const requestLocationPermission = async (): Promise<LocationPermissionStatus> => {
  try {
    const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
    
    if (status === 'granted') {
      return LocationPermissionStatus.GRANTED;
    } else if (status === 'denied') {
      return LocationPermissionStatus.DENIED;
    } else {
      return LocationPermissionStatus.UNDETERMINED;
    }
  } catch (error) {
    console.error('Error requesting location permission:', error);
    return LocationPermissionStatus.DENIED;
  }
};

/**
 * Check if location permissions are granted
 * @returns Boolean indicating if permissions are granted
 */
export const hasLocationPermission = async (): Promise<boolean> => {
  try {
    const { status } = await ExpoLocation.getForegroundPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error checking location permission:', error);
    return false;
  }
};

/**
 * Get current location (one-time)
 * @returns Current location coordinates
 */
export const getCurrentLocation = async (): Promise<Location | null> => {
  try {
    const hasPermission = await hasLocationPermission();
    
    if (!hasPermission) {
      const status = await requestLocationPermission();
      if (status !== LocationPermissionStatus.GRANTED) {
        throw new Error('Location permission not granted');
      }
    }

    const location = await ExpoLocation.getCurrentPositionAsync({
      accuracy: ExpoLocation.Accuracy.High,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy,
      altitude: location.coords.altitude,
      altitudeAccuracy: location.coords.altitudeAccuracy,
      heading: location.coords.heading,
      speed: location.coords.speed,
      timestamp: location.timestamp,
    };
  } catch (error: any) {
    console.error('Error getting current location:', error);
    throw new Error(error.message || 'Failed to get current location');
  }
};

/**
 * Watch location updates (real-time tracking)
 * @param callback - Function to call when location updates
 * @returns Subscription object to stop watching
 */
export const watchLocation = async (
  callback: (location: Location) => void
): Promise<LocationSubscription | null> => {
  try {
    const hasPermission = await hasLocationPermission();
    
    if (!hasPermission) {
      const status = await requestLocationPermission();
      if (status !== LocationPermissionStatus.GRANTED) {
        throw new Error('Location permission not granted');
      }
    }

    const subscription = await ExpoLocation.watchPositionAsync(
      {
        accuracy: ExpoLocation.Accuracy.High,
        timeInterval: 5000, // Update every 5 seconds
        distanceInterval: 10, // Update every 10 meters
      },
      (location) => {
        callback({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy,
          altitude: location.coords.altitude,
          altitudeAccuracy: location.coords.altitudeAccuracy,
          heading: location.coords.heading,
          speed: location.coords.speed,
          timestamp: location.timestamp,
        });
      }
    );

    return subscription;
  } catch (error: any) {
    console.error('Error watching location:', error);
    throw new Error(error.message || 'Failed to watch location');
  }
};

/**
 * Check if a location is within campus boundaries
 * @param location - Location to check
 * @returns Boolean indicating if location is within campus
 */
export const isLocationOnCampus = (location: Coordinates): boolean => {
  return isWithinCampus(location.latitude, location.longitude);
};

/**
 * Get address from coordinates (Reverse Geocoding)
 * @param latitude - Latitude coordinate
 * @param longitude - Longitude coordinate
 * @returns Address information
 */
export const getAddressFromCoordinates = async (
  latitude: number,
  longitude: number
): Promise<ReverseGeocodeResult | null> => {
  try {
    const results = await ExpoLocation.reverseGeocodeAsync({
      latitude,
      longitude,
    });

    if (results.length > 0) {
      const result = results[0];
      
      return {
        formattedAddress: [
          result.name,
          result.street,
          result.district,
          result.city,
          result.region,
        ]
          .filter(Boolean)
          .join(', '),
        street: result.street || undefined,
        name: result.name || undefined,
        district: result.district || undefined,
        city: result.city || undefined,
        region: result.region || undefined,
        country: result.country || undefined,
      };
    }

    return null;
  } catch (error: any) {
    console.error('Error getting address from coordinates:', error);
    throw new Error('Failed to get address from coordinates');
  }
};

/**
 * Get coordinates from address (Geocoding)
 * @param address - Address string to geocode
 * @returns Coordinates and formatted address
 */
export const getCoordinatesFromAddress = async (
  address: string
): Promise<GeocodeResult | null> => {
  try {
    const results = await ExpoLocation.geocodeAsync(address);

    if (results.length > 0) {
      const result = results[0];
      
      return {
        formattedAddress: address,
        latitude: result.latitude,
        longitude: result.longitude,
      };
    }

    return null;
  } catch (error: any) {
    console.error('Error getting coordinates from address:', error);
    throw new Error('Failed to get coordinates from address');
  }
};

/**
 * Calculate distance between two coordinates (in kilometers)
 * Uses Haversine formula
 * @param from - Starting coordinates
 * @param to - Ending coordinates
 * @returns Distance in kilometers
 */
export const calculateDistanceBetween = (
  from: Coordinates,
  to: Coordinates
): number => {
  const R = 6371; // Earth's radius in km
  
  const toRad = (value: number): number => {
    return (value * Math.PI) / 180;
  };

  const dLat = toRad(to.latitude - from.latitude);
  const dLon = toRad(to.longitude - from.longitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(from.latitude)) *
    Math.cos(toRad(to.latitude)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 100) / 100; // Round to 2 decimal places
};

/**
 * Format distance for display
 * @param distanceInKm - Distance in kilometers
 * @returns Formatted string (e.g., "1.5 km" or "500 m")
 */
export const formatDistance = (distanceInKm: number): string => {
  if (distanceInKm < 1) {
    const meters = Math.round(distanceInKm * 1000);
    return `${meters} m`;
  }
  
  return `${distanceInKm.toFixed(1)} km`;
};

/**
 * Check if location services are enabled on device
 * @returns Boolean indicating if location services are enabled
 */
export const isLocationEnabled = async (): Promise<boolean> => {
  try {
    return await ExpoLocation.hasServicesEnabledAsync();
  } catch (error) {
    console.error('Error checking if location is enabled:', error);
    return false;
  }
};

/**
 * Open device location settings
 */
export const openLocationSettings = async (): Promise<void> => {
  try {
    // Note: This is platform-specific and may not work on all devices
    // On iOS, it opens app settings; on Android, it opens location settings
    await ExpoLocation.enableNetworkProviderAsync();
  } catch (error) {
    console.error('Error opening location settings:', error);
  }
};

/**
 * Get last known location (may be cached/stale)
 * Faster than getCurrentLocation but less accurate
 * @returns Last known location
 */
export const getLastKnownLocation = async (): Promise<Location | null> => {
  try {
    const hasPermission = await hasLocationPermission();
    
    if (!hasPermission) {
      return null;
    }

    const location = await ExpoLocation.getLastKnownPositionAsync();
    
    if (!location) {
      return null;
    }

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy,
      altitude: location.coords.altitude,
      altitudeAccuracy: location.coords.altitudeAccuracy,
      heading: location.coords.heading,
      speed: location.coords.speed,
      timestamp: location.timestamp,
    };
  } catch (error: any) {
    console.error('Error getting last known location:', error);
    return null;
  }
};

/**
 * Request background location permission (for ride tracking)
 * @returns Permission status
 */
export const requestBackgroundLocationPermission = async (): Promise<LocationPermissionStatus> => {
  try {
    const { status } = await ExpoLocation.requestBackgroundPermissionsAsync();
    
    if (status === 'granted') {
      return LocationPermissionStatus.GRANTED;
    } else if (status === 'denied') {
      return LocationPermissionStatus.DENIED;
    } else {
      return LocationPermissionStatus.UNDETERMINED;
    }
  } catch (error) {
    console.error('Error requesting background location permission:', error);
    return LocationPermissionStatus.DENIED;
  }
};

/**
 * Default export with all functions
 */
export default {
  requestLocationPermission,
  hasLocationPermission,
  getCurrentLocation,
  watchLocation,
  isLocationOnCampus,
  getAddressFromCoordinates,
  getCoordinatesFromAddress,
  calculateDistanceBetween,
  formatDistance,
  isLocationEnabled,
  openLocationSettings,
  getLastKnownLocation,
  requestBackgroundLocationPermission,
};