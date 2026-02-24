import { Timestamp } from "firebase/firestore";
import { PayoutPreference } from "./driver";
import { PayoutStatus } from "./earning";

export interface Payout {
  payoutId: string;
  driverId: string;
  payout_pref: PayoutPreference;
  totalAmount: number;
  numberOfRides: number;
  earningIds: string[];
  bankName: string;
  accountNumber: string;
  accountName: string;
  transferReference: string | null;
  status: PayoutStatus;
  processedBy: string | null;
  processedAt: Timestamp | null;
  startDate: Timestamp;
  endDate: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
