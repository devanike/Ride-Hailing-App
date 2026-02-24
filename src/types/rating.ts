import { Timestamp } from "firebase/firestore";

export interface Rating {
  ratingId: string;
  rideId: string;
  passengerId: string;
  driverId: string;
  rating: number;
  comment: string | null;
  createdAt: Timestamp;
}
