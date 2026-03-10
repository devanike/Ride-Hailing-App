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

export const LocationPermissionStatus = {
  GRANTED: "granted",
  DENIED: "denied",
  UNDETERMINED: "undetermined",
} as const;

export type LocationPermissionStatusValue =
  (typeof LocationPermissionStatus)[keyof typeof LocationPermissionStatus];

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
