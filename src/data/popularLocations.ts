/**
 * Popular Campus Locations Data
 * University of Ibadan Campus
 */

import { LocationCategory, PopularLocation } from '@/types/locations';

export const POPULAR_LOCATIONS: PopularLocation[] = [
  // Academic Buildings
  {
    id: 'main-gate',
    name: 'UI Main Gate',
    shortName: 'Main Gate',
    description: 'University of Ibadan Main Entrance',
    coordinate: { latitude: 7.4407, longitude: 3.9000 },
    category: LocationCategory.ADMINISTRATIVE,
    iconName: 'door-open',
  },
  {
    id: 'ui-library',
    name: 'Kenneth Dike Library',
    shortName: 'Library',
    description: 'Main University Library',
    coordinate: { latitude: 7.4450, longitude: 3.9010 },
    category: LocationCategory.ACADEMIC,
    iconName: 'book-open',
  },
  {
    id: 'fac-sci',
    name: 'Faculty of Science',
    shortName: 'Science',
    description: 'Faculty of Science Complex',
    coordinate: { latitude: 7.4420, longitude: 3.8990 },
    category: LocationCategory.ACADEMIC,
    iconName: 'flask-conical',
  },
  {
    id: 'fac-arts',
    name: 'Faculty of Arts',
    shortName: 'Arts',
    description: 'Faculty of Arts Building',
    coordinate: { latitude: 7.4430, longitude: 3.9020 },
    category: LocationCategory.ACADEMIC,
    iconName: 'palette',
  },
  {
    id: 'fac-soc-sci',
    name: 'Faculty of Social Sciences',
    shortName: 'Social Sciences',
    description: 'Faculty of Social Sciences',
    coordinate: { latitude: 7.4440, longitude: 3.9030 },
    category: LocationCategory.ACADEMIC,
    iconName: 'chart-bar',
  },
  
  // Residential Halls
  {
    id: 'tedder-hall',
    name: 'Tedder Hall',
    shortName: 'Tedder',
    description: 'Tedder Hall (Female)',
    coordinate: { latitude: 7.4380, longitude: 3.8980 },
    category: LocationCategory.RESIDENTIAL,
    iconName: 'home',
  },
  {
    id: 'queen-hall',
    name: 'Queen Elizabeth Hall',
    shortName: 'Queen Hall',
    description: 'Queen Elizabeth Hall (Female)',
    coordinate: { latitude: 7.4390, longitude: 3.8970 },
    category: LocationCategory.RESIDENTIAL,
    iconName: 'home',
  },
  {
    id: 'mellanby-hall',
    name: 'Mellanby Hall',
    shortName: 'Mellanby',
    description: 'Mellanby Hall (Male)',
    coordinate: { latitude: 7.4400, longitude: 3.8960 },
    category: LocationCategory.RESIDENTIAL,
    iconName: 'home',
  },
  {
    id: 'obafemi-awolowo-hall',
    name: 'Obafemi Awolowo Hall',
    shortName: 'Awo Hall',
    description: 'Obafemi Awolowo Hall (Male)',
    coordinate: { latitude: 7.4410, longitude: 3.8950 },
    category: LocationCategory.RESIDENTIAL,
    iconName: 'home',
  },
  
  // Facilities
  {
    id: 'sport-center',
    name: 'Sports Center',
    shortName: 'Sports Center',
    description: 'University Sports Complex',
    coordinate: { latitude: 7.4360, longitude: 3.9040 },
    category: LocationCategory.RECREATION,
    iconName: 'dumbbell',
  },
  {
    id: 'uc',
    name: 'University College (UC)',
    shortName: 'UC',
    description: 'University College',
    coordinate: { latitude: 7.4460, longitude: 3.9000 },
    category: LocationCategory.FACILITIES,
    iconName: 'building-2',
  },
  {
    id: 'jaja-hall',
    name: 'Jaja Hall',
    shortName: 'Jaja',
    description: 'Jaja Hall of Residence',
    coordinate: { latitude: 7.4370, longitude: 3.9010 },
    category: LocationCategory.RESIDENTIAL,
    iconName: 'home',
  },
  {
    id: 'bello-hall',
    name: 'Abdullahi Bello Hall',
    shortName: 'Bello',
    description: 'Abdullahi Bello Hall (Male)',
    coordinate: { latitude: 7.4350, longitude: 3.9020 },
    category: LocationCategory.RESIDENTIAL,
    iconName: 'home',
  },
  
  // Medical
  {
    id: 'uch',
    name: 'University College Hospital',
    shortName: 'UCH',
    description: 'University College Hospital',
    coordinate: { latitude: 7.4300, longitude: 3.9050 },
    category: LocationCategory.MEDICAL,
    iconName: 'hospital',
  },
  {
    id: 'health-center',
    name: 'Student Health Center',
    shortName: 'Health Center',
    description: 'Jaja Clinic',
    coordinate: { latitude: 7.4340, longitude: 3.9000 },
    category: LocationCategory.MEDICAL,
    iconName: 'cross',
  },
  
  // Administrative
  {
    id: 'senate-building',
    name: 'Senate Building',
    shortName: 'Senate',
    description: 'Administrative Senate Building',
    coordinate: { latitude: 7.4470, longitude: 3.9015 },
    category: LocationCategory.ADMINISTRATIVE,
    iconName: 'building',
  },
];

/**
 * Get locations by category
 */
export const getLocationsByCategory = (category: LocationCategory): PopularLocation[] => {
  return POPULAR_LOCATIONS.filter(loc => loc.category === category);
};

/**
 * Search locations by name
 */
export const searchLocations = (query: string): PopularLocation[] => {
  const lowerQuery = query.toLowerCase();
  return POPULAR_LOCATIONS.filter(
    loc =>
      loc.name.toLowerCase().includes(lowerQuery) ||
      loc.shortName.toLowerCase().includes(lowerQuery)
  );
};

/**
 * Get location by ID
 */
export const getLocationById = (id: string): PopularLocation | undefined => {
  return POPULAR_LOCATIONS.find(loc => loc.id === id);
};

export default POPULAR_LOCATIONS;