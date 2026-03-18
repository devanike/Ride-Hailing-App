import { Collections } from "@/types/database";
import { Earning } from "@/types/earning";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "./firebaseConfig";

export const getDriverEarnings = async (
  driverId: string,
): Promise<Earning[]> => {
  try {
    const q = query(
      collection(db, Collections.EARNINGS),
      where("driverId", "==", driverId),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      earningId: d.id,
      ...d.data(),
    })) as Earning[];
  } catch (error: any) {
    console.error("Error fetching driver earnings:", error);
    throw new Error("Failed to fetch earnings");
  }
};

export const getTodayEarnings = async (driverId: string): Promise<number> => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const earnings = await getDriverEarnings(driverId);
    return earnings
      .filter((e) => {
        const created = e.createdAt?.toDate?.();
        return created && created >= startOfDay;
      })
      .reduce((sum, e) => sum + (e.amount ?? 0), 0);
  } catch (error: any) {
    console.error("Error fetching today earnings:", error);
    throw new Error("Failed to fetch today earnings");
  }
};

export const getWeekEarnings = async (driverId: string): Promise<number> => {
  try {
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const earnings = await getDriverEarnings(driverId);
    return earnings
      .filter((e) => {
        const created = e.createdAt?.toDate?.();
        return created && created >= startOfWeek;
      })
      .reduce((sum, e) => sum + (e.amount ?? 0), 0);
  } catch (error: any) {
    console.error("Error fetching week earnings:", error);
    throw new Error("Failed to fetch week earnings");
  }
};

export const getMonthEarnings = async (driverId: string): Promise<number> => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const earnings = await getDriverEarnings(driverId);
    return earnings
      .filter((e) => {
        const created = e.createdAt?.toDate?.();
        return created && created >= startOfMonth;
      })
      .reduce((sum, e) => sum + (e.amount ?? 0), 0);
  } catch (error: any) {
    console.error("Error fetching month earnings:", error);
    throw new Error("Failed to fetch month earnings");
  }
};

export const getPendingPayoutAmount = async (
  driverId: string,
): Promise<number> => {
  try {
    const q = query(
      collection(db, Collections.EARNINGS),
      where("driverId", "==", driverId),
      where("payoutStatus", "==", "pending"),
    );
    const snap = await getDocs(q);
    return snap.docs.reduce((sum, d) => sum + (d.data().amount ?? 0), 0);
  } catch (error: any) {
    console.error("Error fetching pending payout amount:", error);
    throw new Error("Failed to fetch pending payout amount");
  }
};