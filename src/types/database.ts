import { Timestamp } from "firebase/firestore";

// HELPER TYPES
export type UserType = "passenger" | "driver" | "admin";

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface LocationData {
  address: string;
  latitude: number;
  longitude: number;
}

export interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  deviceType: "android" | "ios";
  lastUsed: Timestamp;
}

// COLLECTION REFERENCES
export const Collections = {
  PASSENGERS: "passengers",
  DRIVERS: "drivers",
  ADMINS: "admins",
  RIDES: "rides",
  DRIVER_LOCATIONS: "driverLocations",
  RATINGS: "ratings",
  PAYMENTS: "payments",
  EARNINGS: "earnings",
  PAYOUTS: "payouts",
  REPORTS: "reports",
  NOTIFICATIONS: "notifications",
} as const;

export const SubCollections = {
  BIDS: "bids",
} as const;
