import {
  PaystackInitializeResponse,
  PaystackVerifyResponse,
  Payment,
} from "@/types/payment";
import { Collections } from "@/types/database";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  increment,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebaseConfig";

const PAYSTACK_PUBLIC_KEY = process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY;

export const initializeCardPayment = async (
  rideId: string,
  amount: number,
  email: string,
): Promise<string> => {
  try {
    const amountInKobo = amount * 100;
    const reference = `ride_${rideId}_${Date.now()}`;

    const response = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PAYSTACK_PUBLIC_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          amount: amountInKobo,
          reference,
          metadata: { rideId },
          callback_url: "uirideapp://payment-callback",
        }),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Payment initialization failed");
    }

    const data: PaystackInitializeResponse = await response.json();

    if (!data.status) {
      throw new Error(data.message || "Payment initialization failed");
    }

    return data.data.reference;
  } catch (error: any) {
    console.error("Error initializing payment:", error);
    throw new Error(error.message || "Failed to initialize payment");
  }
};

export const verifyPayment = async (reference: string): Promise<boolean> => {
  try {
    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${PAYSTACK_PUBLIC_KEY}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error("Payment verification failed");
    }

    const data: PaystackVerifyResponse = await response.json();
    return data.status && data.data.status === "success";
  } catch (error: any) {
    console.error("Error verifying payment:", error);
    throw new Error("Failed to verify payment");
  }
};

export const recordPayment = async (
  rideId: string,
  passengerId: string,
  driverId: string,
  method: "cash" | "card",
  amount: number,
  reference?: string,
): Promise<void> => {
  try {
    await addDoc(collection(db, Collections.PAYMENTS), {
      rideId,
      passengerId,
      driverId,
      amount,
      paymentMethod: method,
      status: "completed",
      reference: reference ?? null,
      paidAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await updateDoc(doc(db, Collections.RIDES, rideId), {
      paymentStatus: "paid",
      paymentMethod: method,
      paymentReference: reference ?? null,
      paidAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error: any) {
    console.error("Error recording payment:", error);
    throw new Error("Failed to record payment");
  }
};

export const recordDriverEarning = async (
  rideId: string,
  driverId: string,
  amount: number,
  method: "cash" | "card",
): Promise<void> => {
  try {
    const earningRef = doc(db, Collections.EARNINGS, `${rideId}_earning`);
    await setDoc(earningRef, {
      rideId,
      driverId,
      amount,
      paymentMethod: method,
      payoutStatus: method === "cash" ? "completed" : "pending",
      payoutId: null,
      payoutDate: null,
      createdAt: serverTimestamp(),
    });

    await updateDoc(doc(db, Collections.DRIVERS, driverId), {
      totalEarnings: increment(amount),
      completedRides: increment(1),
      updatedAt: serverTimestamp(),
    });
  } catch (error: any) {
    console.error("Error recording driver earning:", error);
    throw new Error("Failed to record earning");
  }
};

export const getPaymentByRideId = async (rideId: string): Promise<Payment> => {
  try {
    const q = query(
      collection(db, Collections.PAYMENTS),
      where("rideId", "==", rideId),
    );
    const snap = await getDocs(q);

    if (snap.empty) {
      throw new Error("Payment not found");
    }

    const d = snap.docs[0];
    return { paymentId: d.id, ...d.data() } as Payment;
  } catch (error: any) {
    console.error("Error fetching payment:", error);
    throw new Error("Failed to fetch payment");
  }
};

// Kept for backwards compatibility with existing screens
export const recordCardPayment = async (
  rideId: string,
  reference: string,
): Promise<void> => {
  try {
    await updateDoc(doc(db, Collections.RIDES, rideId), {
      paymentStatus: "paid",
      paymentMethod: "card",
      paymentReference: reference,
      paidAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error: any) {
    console.error("Error recording card payment:", error);
    throw new Error("Failed to record payment");
  }
};

export const recordCashPayment = async (rideId: string): Promise<void> => {
  try {
    await updateDoc(doc(db, Collections.RIDES, rideId), {
      paymentStatus: "paid",
      paymentMethod: "cash",
      paidAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error: any) {
    console.error("Error recording cash payment:", error);
    throw new Error("Failed to record payment");
  }
};