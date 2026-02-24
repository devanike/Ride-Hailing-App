import { Timestamp } from "firebase/firestore";
import { PaymentMethod } from "./payment";

export type PayoutStatus = "pending" | "processing" | "completed";

export interface Earning {
  earningId: string;
  rideId: string;
  driverId: string;
  passengerId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentReference: string | null;
  payoutStatus: PayoutStatus;
  payoutId: string | null;
  payoutDate: Timestamp | null;
  createdAt: Timestamp;
}
