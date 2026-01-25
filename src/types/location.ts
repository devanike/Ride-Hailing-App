/**
 * Location-related type definitions
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Location extends Coordinates {
  accuracy: number | null;
  altitude: number | null;
  altitudeAccuracy: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number;
}

export interface LocationError {
  code: string;
  message: string;
}

export enum LocationPermissionStatus {
  GRANTED = 'granted',
  DENIED = 'denied',
  UNDETERMINED = 'undetermined',
}

export interface LocationSubscription {
  remove: () => void;
}

export interface GeocodeResult {
  formattedAddress: string;
  latitude: number;
  longitude: number;
  city?: string;
  region?: string;
  country?: string;
  postalCode?: string;
}

export interface ReverseGeocodeResult {
  formattedAddress: string;
  street?: string;
  name?: string;
  district?: string;
  city?: string;
  region?: string;
  country?: string;
}