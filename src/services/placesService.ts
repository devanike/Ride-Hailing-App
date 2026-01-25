/**
 * Google Places Service
 * Handles location search and autocomplete using Google Places API
 */

import { Coordinates } from '@/types/map';
import {
  PlaceAutocompleteResult,
  PlaceDetails,
  PlacesSearchParams,
} from '@/types/places';
import { CAMPUS_CENTER, GOOGLE_MAPS_API_KEY } from '@/utils/constants';

const PLACES_API_BASE = 'https://maps.googleapis.com/maps/api/place';

/**
 * Search for places using autocomplete
 * @param params - Search parameters
 * @returns Array of autocomplete predictions
 */
export const searchPlaces = async (
  params: PlacesSearchParams
): Promise<PlaceAutocompleteResult[]> => {
  try {
    const { input, location = CAMPUS_CENTER, radius = 5000 } = params;

    if (!input || input.trim().length < 2) {
      return [];
    }

    const url = new URL(`${PLACES_API_BASE}/autocomplete/json`);
    url.searchParams.append('input', input);
    url.searchParams.append('key', GOOGLE_MAPS_API_KEY);
    url.searchParams.append('location', `${location.latitude},${location.longitude}`);
    url.searchParams.append('radius', radius.toString());
    url.searchParams.append('components', 'country:ng'); // Restrict to Nigeria

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error('Places API request failed');
    }

    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      throw new Error(`Places API error: ${data.status}`);
    }

    if (!data.predictions || data.predictions.length === 0) {
      return [];
    }

    return data.predictions.map((prediction: {
      place_id: string;
      description: string;
      structured_formatting: {
        main_text: string;
        secondary_text: string;
      };
      types: string[];
    }) => ({
      placeId: prediction.place_id,
      description: prediction.description,
      mainText: prediction.structured_formatting.main_text,
      secondaryText: prediction.structured_formatting.secondary_text || '',
      types: prediction.types,
    }));
  } catch (err) {
    console.error('Error searching places:', err);
    throw new Error(err instanceof Error ? err.message : 'Failed to search places');
  }
};

/**
 * Get detailed information about a place
 * @param placeId - Google Place ID
 * @returns Place details including coordinates
 */
export const getPlaceDetails = async (placeId: string): Promise<PlaceDetails> => {
  try {
    const url = new URL(`${PLACES_API_BASE}/details/json`);
    url.searchParams.append('place_id', placeId);
    url.searchParams.append('key', GOOGLE_MAPS_API_KEY);
    url.searchParams.append('fields', 'name,formatted_address,geometry,types,vicinity');

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error('Place details request failed');
    }

    const data = await response.json();

    if (data.status !== 'OK') {
      throw new Error(`Place details error: ${data.status}`);
    }

    const result = data.result;

    return {
      placeId,
      name: result.name,
      formattedAddress: result.formatted_address,
      coordinate: {
        latitude: result.geometry.location.lat,
        longitude: result.geometry.location.lng,
      },
      types: result.types,
      vicinity: result.vicinity,
    };
  } catch (err) {
    console.error('Error getting place details:', err);
    throw new Error(err instanceof Error ? err.message : 'Failed to get place details');
  }
};

/**
 * Search places near a coordinate (Nearby Search)
 * @param location - Center point for search
 * @param radius - Search radius in meters
 * @param type - Type of place to search for
 * @returns Array of nearby places
 */
export const searchNearbyPlaces = async (
  location: Coordinates,
  radius: number = 1000,
  type?: string
): Promise<PlaceDetails[]> => {
  try {
    const url = new URL(`${PLACES_API_BASE}/nearbysearch/json`);
    url.searchParams.append('location', `${location.latitude},${location.longitude}`);
    url.searchParams.append('radius', radius.toString());
    url.searchParams.append('key', GOOGLE_MAPS_API_KEY);

    if (type) {
      url.searchParams.append('type', type);
    }

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error('Nearby search request failed');
    }

    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      throw new Error(`Nearby search error: ${data.status}`);
    }

    if (!data.results || data.results.length === 0) {
      return [];
    }

    return data.results.map((result: {
      place_id: string;
      name: string;
      formatted_address?: string;
      vicinity?: string;
      geometry: {
        location: {
          lat: number;
          lng: number;
        };
      };
      types: string[];
    }) => ({
      placeId: result.place_id,
      name: result.name,
      formattedAddress: result.formatted_address || result.vicinity || '',
      coordinate: {
        latitude: result.geometry.location.lat,
        longitude: result.geometry.location.lng,
      },
      types: result.types,
      vicinity: result.vicinity,
    }));
  } catch (err) {
    console.error('Error searching nearby places:', err);
    throw new Error(err instanceof Error ? err.message : 'Failed to search nearby places');
  }
};

export default {
  searchPlaces,
  getPlaceDetails,
  searchNearbyPlaces,
};