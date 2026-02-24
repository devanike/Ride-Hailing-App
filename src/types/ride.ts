import { Timestamp } from "firebase/firestore";
import { PaymentMethod, PaymentStatus } from "./payment";

export type RideStatus =
  | "pending"
  | "accepted"
  | "in_progress"
  | "completed"
  | "cancelled";

export interface Bid {
  bidId: string;
  rideId: string;
  driverId: string;
  amount: number;
  estimatedArrival: number;
  createdAt: Timestamp;
  expiresAt: Timestamp;
}

export interface Ride {
  rideId: string;
  passengerId: string;
  driverId: string | null;
  status: RideStatus;
  pickupLocation: {
    address: string;
    latitude: number;
    longitude: number;
  };
  dropoffLocation: {
    address: string;
    latitude: number;
    longitude: number;
  };
  agreedFare: number | null;
  paymentMethod: PaymentMethod | null;
  paymentStatus: PaymentStatus;
  paymentReference: string | null;
  requestedAt: Timestamp;
  acceptedAt: Timestamp | null;
  startedAt: Timestamp | null;
  completedAt: Timestamp | null;
  cancelledAt: Timestamp | null;
  paidAt: Timestamp | null;
  cancelledBy: string | null;
  cancellationReason: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
