import { Coordinates } from './map';

/**
 * Type of location being selected
 */
export type LocationType = 'pickup' | 'dropoff';

/**
 * Selected location data
 */
export interface SelectedLocation {
  coordinate: Coordinates;
  address: string;
  name?: string;
  placeId?: string;
}

/**
 * Location selection params (passed via Expo Router)
 */
export interface LocationSelectionParams {
  type: LocationType;
  initialLocation?: SelectedLocation;
}

/**
 * Location selection result (returned via router params)
 */
export interface LocationSelectionResult {
  selectedLocation: string; // Address string
  locationType: LocationType;
  latitude: string; // String for router params
  longitude: string; // String for router params
}

/**
 * Campus boundary check result
 */
export interface CampusBoundaryCheck {
  isOnCampus: boolean;
  distance?: number; // Distance from campus center in km
  warningMessage?: string;
}

/**
 * Location search filter options
 */
export interface LocationSearchFilters {
  category?: string;
  radius?: number;
  onCampusOnly?: boolean;
}

/**
 * Location selection state
 */
export interface LocationSelectionState {
  selectedLocation: SelectedLocation | null;
  isLoading: boolean;
  error: string | null;
  showOutsideCampusWarning: boolean;
}