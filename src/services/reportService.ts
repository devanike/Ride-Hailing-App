import { Collections } from "@/types/database";
import { Report, ReportStatus } from "@/types/report";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebaseConfig";

export const submitReport = async (
  report: Omit<Report, "reportId" | "status" | "reviewedBy" | "reviewedAt" | "adminNotes" | "resolution" | "createdAt" | "updatedAt">,
): Promise<string> => {
  try {
    const ref = await addDoc(collection(db, Collections.REPORTS), {
      ...report,
      status: "open",
      reviewedBy: null,
      reviewedAt: null,
      adminNotes: null,
      resolution: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  } catch (error: any) {
    console.error("Error submitting report:", error);
    throw new Error("Failed to submit report");
  }
};

export const getMyReports = async (userId: string): Promise<Report[]> => {
  try {
    const q = query(
      collection(db, Collections.REPORTS),
      where("reporterId", "==", userId),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      reportId: d.id,
      ...d.data(),
    })) as Report[];
  } catch (error: any) {
    console.error("Error fetching reports:", error);
    throw new Error("Failed to fetch reports");
  }
};

export const getReportsAgainstDriver = async (
  driverId: string,
): Promise<Report[]> => {
  try {
    const q = query(
      collection(db, Collections.REPORTS),
      where("reportedUserId", "==", driverId),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      reportId: d.id,
      ...d.data(),
    })) as Report[];
  } catch (error: any) {
    console.error("Error fetching reports against driver:", error);
    throw new Error("Failed to fetch driver reports");
  }
};

export const getAllReports = async (): Promise<Report[]> => {
  try {
    const snap = await getDocs(collection(db, Collections.REPORTS));
    return snap.docs.map((d) => ({
      reportId: d.id,
      ...d.data(),
    })) as Report[];
  } catch (error: any) {
    console.error("Error fetching all reports:", error);
    throw new Error("Failed to fetch reports");
  }
};

export const updateReportStatus = async (
  reportId: string,
  status: ReportStatus,
  note?: string,
): Promise<void> => {
  try {
    await updateDoc(doc(db, Collections.REPORTS, reportId), {
      status,
      ...(note ? { adminNotes: note } : {}),
      updatedAt: serverTimestamp(),
    });
  } catch (error: any) {
    console.error("Error updating report status:", error);
    throw new Error("Failed to update report status");
  }
};