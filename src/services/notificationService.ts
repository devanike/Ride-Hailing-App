import { Collections } from "@/types/database";
import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebaseConfig";
import * as Notifications from "expo-notifications";

export const registerForPushNotifications = async (
  userId: string,
  userCollection: "passengers" | "drivers",
): Promise<void> => {
  try {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();

    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      return;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;

    await updateDoc(doc(db, userCollection, userId), {
      pushToken: token,
      updatedAt: serverTimestamp(),
    });
  } catch (error: any) {
    console.error("Error registering for push notifications:", error);
  }
};

export const sendNotification = async (
  userId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<void> => {
  try {
    await addDoc(collection(db, Collections.NOTIFICATIONS), {
      userId,
      title,
      body,
      data: data ?? null,
      isRead: false,
      createdAt: serverTimestamp(),
    });
  } catch (error: any) {
    console.error("Error sending notification:", error);
    throw new Error("Failed to send notification");
  }
};

export const markAsRead = async (notificationId: string): Promise<void> => {
  try {
    await updateDoc(doc(db, Collections.NOTIFICATIONS, notificationId), {
      isRead: true,
    });
  } catch (error: any) {
    console.error("Error marking notification as read:", error);
    throw new Error("Failed to mark notification as read");
  }
};