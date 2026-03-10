import { Coordinates } from "./map";

export const LocationCategory = {
  ACADEMIC: "academic",
  RESIDENTIAL: "residential",
  FACILITIES: "facilities",
  RECREATION: "recreation",
  MEDICAL: "medical",
  ADMINISTRATIVE: "administrative",
} as const;
export type LocationCategoryValue =
  (typeof LocationCategory)[keyof typeof LocationCategory];

export interface PopularLocation {
  id: string;
  name: string;
  shortName: string;
  description?: string;
  coordinate: Coordinates;
  category: LocationCategoryValue;
  iconName: string;
}

export interface LocationGroup {
  category: LocationCategoryValue;
  title: string;
  locations: PopularLocation[];
}
