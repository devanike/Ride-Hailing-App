/**
 * Google Places API Types
 */

import { Coordinates } from './map';

export interface PlaceAutocompleteResult {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
  types: string[];
}

export interface PlaceDetails {
  placeId: string;
  name: string;
  formattedAddress: string;
  coordinate: Coordinates;
  types: string[];
  vicinity?: string;
}

export interface PlacesSearchParams {
  input: string;
  location?: Coordinates;
  radius?: number; // in meters
  types?: string[];
}