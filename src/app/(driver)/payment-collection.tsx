import { Button } from "@/components/common/Button";
import { useTheme } from "@/hooks/useTheme";
import { auth, db } from "@/services/firebaseConfig";
import {
  recordCardPayment,
  recordCashPayment,
  recordDriverEarning,
} from "@/services/paymentService";
import { Collections } from "@/types/database";
import { Ride } from "@/types/ride";
import { showError, showSuccess } from "@/utils/toast";
import { router, useLocalSearchParams } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  BackHandler,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { usePaystack } from "react-native-paystack-webview";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PaymentCollectionScreen(): React.JSX.Element {
  const { colors, spacing, typography, borderRadius, shadows } = useTheme();
  const { rideId } = useLocalSearchParams<{ rideId: string }>();
  const { popup } = usePaystack();

  const [ride, setRide] = useState<Ride | null>(null);
  const [passengerEmail, setPassengerEmail] = useState("passenger@uiride.com");
  const [processing, setProcessing] = useState(false);

  // Disable hardware back — driver must complete this step
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => sub.remove();
  }, []);

  // Load ride
  useEffect(() => {
    if (!rideId) return;
    getDoc(doc(db, Collections.RIDES, rideId))
      .then((snap) => {
        if (snap.exists()) {
          setRide({ rideId: snap.id, ...snap.data() } as Ride);
        }
      })
      .catch((err) => console.error("Failed to load ride:", err));
  }, [rideId]);

  // Load passenger email for Paystack
  useEffect(() => {
    if (!ride?.passengerId) return;
    getDoc(doc(db, Collections.PASSENGERS, ride.passengerId))
      .then((snap) => {
        if (snap.exists()) {
          const email = snap.data().email;
          if (email) setPassengerEmail(email);
        }
      })
      .catch(() => {});
  }, [ride?.passengerId]);

  const navigateHome = useCallback(() => {
    router.replace("/(driver)");
  }, []);

  const handleCashPayment = useCallback(() => {
    if (!ride) return;
    const displayAmount = ride.agreedFare?.toLocaleString() ?? "0";

    Alert.alert(
      "Confirm Cash Payment",
      `Has the passenger paid NGN ${displayAmount} in cash?`,
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Confirm",
          onPress: async () => {
            const uid = auth.currentUser?.uid;
            if (!rideId || !uid || !ride) return;
            setProcessing(true);
            try {
              await recordCashPayment(rideId);
              await recordDriverEarning(
                rideId,
                uid,
                ride.passengerId,
                ride.agreedFare ?? 0,
                "cash",
                null,
              );
              showSuccess("Payment Recorded", "Cash payment confirmed");
              navigateHome();
            } catch (err) {
              showError("Error", "Failed to record payment");
              console.error(err);
            } finally {
              setProcessing(false);
            }
          },
        },
      ],
    );
  }, [ride, rideId, navigateHome]);

  const handleCardPayment = useCallback(() => {
    if (!ride) return;
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const fare = ride.agreedFare ?? 0;
    const reference = `ride_${rideId}_${Date.now()}`;

    popup.checkout({
      email: passengerEmail,
      amount: fare * 100,
      reference,
      metadata: {
        custom_fields: [
          {
            display_name: "Ride ID",
            variable_name: "ride_id",
            value: rideId ?? "",
          },
        ],
      },
      onSuccess: async (res: any) => {
        setProcessing(true);
        try {
          const ref: string = res?.reference ?? reference;
          await recordCardPayment(rideId!, ref);
          await recordDriverEarning(
            rideId!,
            uid,
            ride.passengerId,
            fare,
            "card",
            ref,
          );
          showSuccess("Payment Received", "Card payment successful");
          navigateHome();
        } catch (err) {
          showError("Error", "Payment recorded but earning failed");
          console.error(err);
          navigateHome();
        } finally {
          setProcessing(false);
        }
      },
      onCancel: () => {
        // User dismissed the Paystack popup — do nothing
      },
    });
  }, [ride, rideId, passengerEmail, navigateHome, popup]);

  const fare = ride?.agreedFare ?? 0;

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: spacing.screenPadding,
      paddingVertical: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
    },
    title: {
      fontSize: typography.sizes["2xl"],
      fontFamily: typography.fonts.heading,
      color: colors.textPrimary,
      textAlign: "center",
    },
    body: {
      flex: 1,
      paddingHorizontal: spacing.screenPadding,
      paddingTop: spacing.xl,
      gap: spacing.lg,
    },
    fareCard: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.xl,
      alignItems: "center",
      ...shadows.medium,
    },
    fareLabel: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.textSecondary,
      marginBottom: spacing.sm,
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    fareAmount: {
      fontSize: typography.sizes["4xl"],
      fontFamily: typography.fonts.heading,
      color: colors.primary,
    },
    instruction: {
      fontSize: typography.sizes.base,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.textSecondary,
      textAlign: "center",
    },
    buttons: {
      gap: spacing.md,
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <Text style={styles.title}>Collect Payment</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.fareCard}>
          <Text style={styles.fareLabel}>Agreed Fare</Text>
          <Text style={styles.fareAmount}>NGN {fare.toLocaleString()}</Text>
        </View>

        <Text style={styles.instruction}>
          Select how the passenger is paying
        </Text>

        <View style={styles.buttons}>
          <Button
            title="Cash Received"
            onPress={handleCashPayment}
            variant="outline"
            fullWidth
            loading={processing}
            disabled={!ride}
          />
          <Button
            title="Card Payment"
            onPress={handleCardPayment}
            variant="primary"
            fullWidth
            disabled={!ride || processing}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
