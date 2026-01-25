/**
 * Campus Location Types
 */

import { Coordinates } from './map';

export interface PopularLocation {
  id: string;
  name: string;
  shortName: string;
  description?: string;
  coordinate: Coordinates;
  category: LocationCategory;
  iconName: string; 
}

export enum LocationCategory {
  ACADEMIC = 'academic',
  RESIDENTIAL = 'residential',
  FACILITIES = 'facilities',
  RECREATION = 'recreation',
  MEDICAL = 'medical',
  ADMINISTRATIVE = 'administrative',
}

export interface LocationGroup {
  category: LocationCategory;
  title: string;
  locations: PopularLocation[];
}