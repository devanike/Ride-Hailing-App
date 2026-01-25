/**
 * Map-related type definitions
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface MapRegion extends Coordinates {
  latitudeDelta: number;
  longitudeDelta: number;
}

export interface EdgePadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface MapConfiguration {
  initialRegion: MapRegion;
  edgePadding: EdgePadding;
  animationDuration: number;
}

export interface MapMarker {
  id: string;
  coordinate: Coordinates;
  title?: string;
  description?: string;
  type: MarkerType;
  color?: string;
  icon?: React.ReactNode;
}

export type MarkerType = 'user' | 'driver' | 'pickup' | 'dropoff' | 'campus_location';

// export enum MarkerType {
//   USER = 'user',
//   DRIVER = 'driver',
//   PICKUP = 'pickup',
//   DROPOFF = 'dropoff',
//   CAMPUS_LOCATION = 'campus_location',
// }

export interface RouteCoordinates {
  pickup: Coordinates;
  dropoff: Coordinates;
}

export interface DirectionsResult {
  distance: number; // in kilometers
  duration: number; // in minutes
  coordinates: Coordinates[];
}

export interface MapViewMethods {
  animateToRegion: (region: MapRegion, duration?: number) => void;
  fitToCoordinates: (coordinates: Coordinates[], options?: FitToCoordinatesOptions) => void;
}

export interface FitToCoordinatesOptions {
  edgePadding?: EdgePadding;
  animated?: boolean;
}