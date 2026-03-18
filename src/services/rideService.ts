import { Coordinates } from "@/types/location";
import { Collections, SubCollections } from "@/types/database";
import { Ride, Bid } from "@/types/ride";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Unsubscribe,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebaseConfig";
import { calculateDistance } from "./locationService";

const NEARBY_RADIUS_KM = 5;

export const createRideRequest = async (
  passengerId: string,
  pickup: { address: string; latitude: number; longitude: number },
  destination: { address: string; latitude: number; longitude: number },
  proposedFare: number,
): Promise<string> => {
  try {
    const ref = await addDoc(collection(db, Collections.RIDES), {
      passengerId,
      driverId: null,
      status: "pending",
      pickupLocation: pickup,
      dropoffLocation: destination,
      proposedFare,
      agreedFare: null,
      declinedBy: [],
      paymentMethod: null,
      paymentStatus: "pending",
      paymentReference: null,
      requestedAt: serverTimestamp(),
      acceptedAt: null,
      startedAt: null,
      completedAt: null,
      cancelledAt: null,
      paidAt: null,
      cancelledBy: null,
      cancellationReason: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  } catch (error: any) {
    console.error("Error creating ride request:", error);
    throw new Error("Failed to create ride request");
  }
};

export const submitDriverBid = async (
  rideId: string,
  driverId: string,
  bidAmount: number,
): Promise<void> => {
  try {
    const bidsRef = collection(
      db,
      Collections.RIDES,
      rideId,
      SubCollections.BIDS,
    );
    await addDoc(bidsRef, {
      rideId,
      driverId,
      amount: bidAmount,
      estimatedArrival: 5,
      createdAt: serverTimestamp(),
      expiresAt: serverTimestamp(),
    });
  } catch (error: any) {
    console.error("Error submitting driver bid:", error);
    throw new Error("Failed to submit bid");
  }
};

export const acceptDriverBid = async (
  rideId: string,
  driverId: string,
  agreedFare: number,
): Promise<void> => {
  try {
    const batch = writeBatch(db);

    batch.update(doc(db, Collections.RIDES, rideId), {
      status: "accepted",
      driverId,
      agreedFare,
      acceptedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const bidsSnap = await getDocs(
      collection(db, Collections.RIDES, rideId, SubCollections.BIDS),
    );

    bidsSnap.forEach((bidDoc) => {
      if (bidDoc.data().driverId !== driverId) {
        batch.update(bidDoc.ref, { status: "rejected" });
      } else {
        batch.update(bidDoc.ref, { status: "accepted" });
      }
    });

    await batch.commit();
  } catch (error: any) {
    console.error("Error accepting driver bid:", error);
    throw new Error("Failed to accept bid");
  }
};

export const listenToRideBids = (
  rideId: string,
  callback: (bids: Bid[]) => void,
): Unsubscribe => {
  const bidsRef = collection(
    db,
    Collections.RIDES,
    rideId,
    SubCollections.BIDS,
  );
  return onSnapshot(query(bidsRef), (snapshot) => {
    const bids = snapshot.docs.map((d) => ({
      bidId: d.id,
      ...d.data(),
    })) as Bid[];
    callback(bids);
  });
};

export const listenToRideStatus = (
  rideId: string,
  callback: (ride: Ride) => void,
): Unsubscribe => {
  return onSnapshot(doc(db, Collections.RIDES, rideId), (snap) => {
    if (snap.exists()) {
      callback({ rideId: snap.id, ...snap.data() } as Ride);
    }
  });
};

export const listenForRideRequests = (
  driverLocation: Coordinates,
  driverId: string,
  callback: (ride: Ride | null) => void,
): Unsubscribe => {
  const q = query(
    collection(db, Collections.RIDES),
    where("status", "==", "pending"),
  );

  return onSnapshot(q, (snapshot) => {
    for (const docSnap of snapshot.docs) {
      const ride = { rideId: docSnap.id, ...docSnap.data() } as Ride;

      if (ride.declinedBy?.includes(driverId)) continue;

      const pickup = ride.pickupLocation;
      if (!pickup) continue;

      const distance = calculateDistance(driverLocation, {
        latitude: pickup.latitude,
        longitude: pickup.longitude,
      });

      if (distance <= NEARBY_RADIUS_KM) {
        callback(ride);
        return;
      }
    }
    callback(null);
  });
};

export const startTrip = async (rideId: string): Promise<void> => {
  try {
    await updateDoc(doc(db, Collections.RIDES, rideId), {
      status: "in_progress",
      startedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error: any) {
    console.error("Error starting trip:", error);
    throw new Error("Failed to start trip");
  }
};

export const completeTrip = async (rideId: string): Promise<void> => {
  try {
    await updateDoc(doc(db, Collections.RIDES, rideId), {
      status: "completed",
      completedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error: any) {
    console.error("Error completing trip:", error);
    throw new Error("Failed to complete trip");
  }
};

export const cancelRide = async (
  rideId: string,
  cancelledBy: string,
): Promise<void> => {
  try {
    await updateDoc(doc(db, Collections.RIDES, rideId), {
      status: "cancelled",
      cancelledBy,
      cancelledAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error: any) {
    console.error("Error cancelling ride:", error);
    throw new Error("Failed to cancel ride");
  }
};

export const getPassengerRideHistory = async (
  passengerId: string,
): Promise<Ride[]> => {
  try {
    const q = query(
      collection(db, Collections.RIDES),
      where("passengerId", "==", passengerId),
      where("status", "in", ["completed", "cancelled"]),
      orderBy("createdAt", "desc"),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ rideId: d.id, ...d.data() })) as Ride[];
  } catch (error: any) {
    console.error("Error fetching passenger ride history:", error);
    throw new Error("Failed to fetch ride history");
  }
};

export const getDriverRideHistory = async (
  driverId: string,
): Promise<Ride[]> => {
  try {
    const q = query(
      collection(db, Collections.RIDES),
      where("driverId", "==", driverId),
      where("status", "==", "completed"),
      orderBy("createdAt", "desc"),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ rideId: d.id, ...d.data() })) as Ride[];
  } catch (error: any) {
    console.error("Error fetching driver ride history:", error);
    throw new Error("Failed to fetch ride history");
  }
};