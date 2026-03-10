import {
  Coordinates,
  GeocodeResult,
  Location,
  ReverseGeocodeResult,
} from "@/types/location";
import { isWithinCampus } from "@/utils/constants";
import * as ExpoLocation from "expo-location";

/**
 * Request location permissions from user
 * Returns true if granted, false otherwise
 */
export const requestLocationPermission = async (): Promise<boolean> => {
  try {
    const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
    return status === "granted";
  } catch (error) {
    console.error("Error requesting location permission:", error);
    return false;
  }
};

/**
 * Check if location permissions are granted
 */
export const hasLocationPermission = async (): Promise<boolean> => {
  try {
    const { status } = await ExpoLocation.getForegroundPermissionsAsync();
    return status === "granted";
  } catch (error) {
    console.error("Error checking location permission:", error);
    return false;
  }
};

/**
 * Get current location as Coordinates (one-time)
 */
export const getCurrentLocation = async (): Promise<Coordinates> => {
  try {
    const hasPermission = await hasLocationPermission();

    if (!hasPermission) {
      const granted = await requestLocationPermission();
      if (!granted) {
        throw new Error("Location permission not granted");
      }
    }

    const location = await ExpoLocation.getCurrentPositionAsync({
      accuracy: ExpoLocation.Accuracy.High,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  } catch (error: any) {
    console.error("Error getting current location:", error);
    throw new Error(error.message || "Failed to get current location");
  }
};

/**
 * Watch location updates (real-time tracking)
 * Calls callback on each update; returns unsubscribe function
 */
export const watchLocation = (
  callback: (location: Location) => void,
): (() => void) => {
  let subscription: ExpoLocation.LocationSubscription | null = null;

  const start = async () => {
    try {
      const hasPermission = await hasLocationPermission();

      if (!hasPermission) {
        const granted = await requestLocationPermission();
        if (!granted) {
          throw new Error("Location permission not granted");
        }
      }

      subscription = await ExpoLocation.watchPositionAsync(
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
        },
      );
    } catch (error: any) {
      console.error("Error watching location:", error);
    }
  };

  start();

  return () => {
    subscription?.remove();
  };
};

/**
 * Check if a location is within campus boundaries
 */
export const isLocationOnCampus = (location: Coordinates): boolean => {
  return isWithinCampus(location.latitude, location.longitude);
};

/** Alias with the spec-required name */
export const isWithinCampusBounds = isLocationOnCampus;

/**
 * Get address from coordinates (Reverse Geocoding)
 * Returns full structured address result
 */
export const getAddressFromCoordinates = async (
  latitude: number,
  longitude: number,
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
          .join(", "),
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
    console.error("Error getting address from coordinates:", error);
    throw new Error("Failed to get address from coordinates");
  }
};

/**
 * Reverse geocode coordinates to a simple address string
 */
export const reverseGeocode = async (
  coordinates: Coordinates,
): Promise<string> => {
  const result = await getAddressFromCoordinates(
    coordinates.latitude,
    coordinates.longitude,
  );
  return result?.formattedAddress ?? "";
};

/**
 * Get coordinates from address (Geocoding)
 */
export const getCoordinatesFromAddress = async (
  address: string,
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
    console.error("Error getting coordinates from address:", error);
    throw new Error("Failed to get coordinates from address");
  }
};

/**
 * Calculate distance between two coordinates in kilometres (Haversine formula)
 */
export const calculateDistance = (
  coord1: Coordinates,
  coord2: Coordinates,
): number => {
  const R = 6371; // Earth's radius in km

  const toRad = (value: number): number => {
    return (value * Math.PI) / 180;
  };

  const dLat = toRad(coord2.latitude - coord1.latitude);
  const dLon = toRad(coord2.longitude - coord1.longitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(coord1.latitude)) *
      Math.cos(toRad(coord2.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 100) / 100; // Round to 2 decimal places
};

/** Original name kept as alias so existing call sites don't break */
export const calculateDistanceBetween = calculateDistance;

/**
 * Format distance for display
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
 */
export const isLocationEnabled = async (): Promise<boolean> => {
  try {
    return await ExpoLocation.hasServicesEnabledAsync();
  } catch (error) {
    console.error("Error checking if location is enabled:", error);
    return false;
  }
};

/**
 * Open device location settings
 */
export const openLocationSettings = async (): Promise<void> => {
  try {
    await ExpoLocation.enableNetworkProviderAsync();
  } catch (error) {
    console.error("Error opening location settings:", error);
  }
};

/**
 * Get last known location (may be cached/stale)
 * Faster than getCurrentLocation but less accurate
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
    console.error("Error getting last known location:", error);
    return null;
  }
};

/**
 * Request background location permission (for ride tracking)
 * Returns true if granted, false otherwise
 */
export const requestBackgroundLocationPermission =
  async (): Promise<boolean> => {
    try {
      const { status } = await ExpoLocation.requestBackgroundPermissionsAsync();
      return status === "granted";
    } catch (error) {
      console.error("Error requesting background location permission:", error);
      return false;
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
  isWithinCampusBounds,
  getAddressFromCoordinates,
  reverseGeocode,
  getCoordinatesFromAddress,
  calculateDistance,
  calculateDistanceBetween,
  formatDistance,
  isLocationEnabled,
  openLocationSettings,
  getLastKnownLocation,
  requestBackgroundLocationPermission,
};
