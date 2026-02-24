import { Timestamp } from "firebase/firestore";

export type NotificationType =
  | "ride_request"
  | "ride_accepted"
  | "ride_started"
  | "ride_completed"
  | "payment_received"
  | "rating_received"
  | "report_submitted"
  | "report_resolved"
  | "payout_processed"
  | "account_suspended";

export interface Notification {
  notificationId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  rideId: string | null;
  reportId: string | null;
  isRead: boolean;
  createdAt: Timestamp;
}
