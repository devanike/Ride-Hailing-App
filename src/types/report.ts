import { Timestamp } from "firebase/firestore";

export type ReportCategory =
  | "safety"
  | "lost_item"
  | "driver_misconduct"
  | "payment_dispute"
  | "other";
export type ReportStatus = "open" | "under_review" | "resolved";

export interface Report {
  reportId: string;
  rideId: string | null;
  reporterId: string;
  reportedUserId: string | null;
  category: ReportCategory;
  status: ReportStatus;
  title: string;
  description: string;
  evidencePhotos: string[];
  reviewedBy: string | null;
  reviewedAt: Timestamp | null;
  adminNotes: string | null;
  resolution: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
