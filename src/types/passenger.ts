import { Timestamp } from "firebase/firestore";

export interface Passenger {
  uid: string;
  name: string;
  phone: string;
  email: string | null;
  profilePhoto: string | null;
  totalRides: number;
  pinLastChanged?: Timestamp;
  biometricEnabled?: boolean;
  knownDevices?: string[];
  failedLoginAttempts?: number;
  lockedUntil?: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
