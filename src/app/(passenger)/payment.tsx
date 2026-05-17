import { Button } from "@/components/common/Button";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useTheme } from "@/hooks/useTheme";
import { auth, db } from "@/services/firebaseConfig";
import {
  indicateCashPayment,
  recordCardPayment,
} from "@/services/paymentService";
import { Collections } from "@/types/database";
import { Ride } from "@/types/ride";
import { showError, showSuccess } from "@/utils/toast";
import { router, useLocalSearchParams } from "expo-router";
import { doc, onSnapshot } from "firebase/firestore";
import { Banknote, CreditCard } from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  BackHandler,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { usePaystack } from "react-native-paystack-webview";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PaymentScreen(): React.JSX.Element {
  const { colors, spacing, typography, borderRadius, shadows } = useTheme();
  const { rideId } = useLocalSearchParams<{ rideId: string }>();
  const { popup } = usePaystack();

  const [ride, setRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(true);
  const [cashLoading, setCashLoading] = useState(false);
  const [cardLoading, setCardLoading] = useState(false);
  const [waitingForCash, setWaitingForCash] = useState(false);
  const [cardFailureMessage, setCardFailureMessage] = useState("");

  const navigatedRef = useRef(false);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!rideId) {
      setLoading(false);
      return;
    }

    const unsub = onSnapshot(doc(db, Collections.RIDES, rideId), (snap) => {
      if (!snap.exists()) return;
      const data = { rideId: snap.id, ...snap.data() } as Ride;
      setRide(data);
      setLoading(false);

      // Check if already waiting for cash (e.g. screen re-rendered)
      if (data.paymentMethod === "cash" && data.paymentStatus !== "completed") {
        setWaitingForCash(true);
      }

      // Driver confirmed payment — navigate to rating
      if (data.paymentStatus === "completed" && !navigatedRef.current) {
        navigatedRef.current = true;
        showSuccess("Payment confirmed", "Your driver confirmed the payment.");
        router.replace({
          pathname: "/rating",
          params: {
            rideId: rideId,
            driverId: data.driverId ?? "",
          },
        } as any);
      }
    });

    return unsub;
  }, [rideId]);

  const handleCashPayment = useCallback(async (): Promise<void> => {
    if (!rideId || !ride) return;
    setCashLoading(true);
    setCardFailureMessage("");
    try {
      await indicateCashPayment(rideId);
      setWaitingForCash(true);
      showSuccess("Cash selected", "Please hand the cash to your driver.");
    } catch (err) {
      console.error("Cash payment failed:", err);
      showError("Error", "Could not update payment method.");
    } finally {
      setCashLoading(false);
    }
  }, [rideId, ride]);

  const handleCardPayment = useCallback(() => {
    if (!ride?.agreedFare || !rideId) return;
    setCardLoading(true);
    setCardFailureMessage("");

    const reference = `ride_${rideId}_${Date.now()}`;
    const email = auth.currentUser?.email || "passenger@uiride.app";

    popup.checkout({
      email,
      amount: ride.agreedFare,
      reference,
      metadata: {
        custom_fields: [
          {
            display_name: "Ride ID",
            variable_name: "ride_id",
            value: rideId,
          },
        ],
      },
      onSuccess: async (res: any) => {
        const ref = res?.reference ?? res?.trxref ?? reference;
        try {
          await recordCardPayment(rideId, ref);
          showSuccess("Payment successful", "Thank you!");
          setCardLoading(false);
          navigatedRef.current = true;
          router.replace({
            pathname: "/rating",
            params: {
              rideId: rideId,
              driverId: ride?.driverId ?? "",
            },
          } as any);
        } catch (err) {
          console.error("Card payment recording failed:", err);
          showError("Error", "Payment received but could not record.");
          setCardLoading(false);
          router.replace("/(passenger)");
        }
      },
      onCancel: () => {
        setCardLoading(false);
        setCardFailureMessage(
          "Card payment was cancelled. You can try again or switch to cash.",
        );
      },
      onError: (err: any) => {
        console.error("Paystack error:", err);
        setCardLoading(false);
        setCardFailureMessage(
          "Card payment failed. You can retry or switch to cash.",
        );
      },
    } as any);
  }, [ride, rideId, popup]);

  const retryCardPayment = useCallback(() => {
    setCardFailureMessage("");
    handleCardPayment();
  }, [handleCardPayment]);

  const switchToCash = useCallback(() => {
    setCardFailureMessage("");
    handleCashPayment();
  }, [handleCashPayment]);

  const fareDisplay = ride?.agreedFare?.toLocaleString() ?? "—";

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: spacing.screenPadding,
      paddingVertical: spacing.lg,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      fontSize: typography.sizes["2xl"],
      fontFamily: typography.fonts.heading,
      color: colors.textPrimary,
    },
    scrollContent: {
      padding: spacing.screenPadding,
      paddingBottom: spacing.xxl + 60,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      ...shadows.medium,
      marginBottom: spacing.lg,
    },
    locationLabel: {
      fontSize: typography.sizes.xs,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.textMuted,
      marginBottom: 2,
    },
    locationText: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.textPrimary,
      marginBottom: spacing.md,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginBottom: spacing.lg,
    },
    fareCurrency: {
      fontSize: typography.sizes.lg,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.textMuted,
      textAlign: "center",
      marginBottom: spacing.xs,
    },
    fareAmount: {
      fontSize: 36,
      fontFamily: typography.fonts.heading,
      color: colors.textPrimary,
      textAlign: "center",
      marginBottom: spacing.lg,
    },
    hintText: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.textSecondary,
      textAlign: "center",
      marginBottom: spacing.md,
    },
    failureText: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.error,
      textAlign: "center",
      marginBottom: spacing.lg,
      paddingHorizontal: spacing.md,
    },
    waitingText: {
      fontSize: typography.sizes.base,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.primary,
      textAlign: "center",
      marginBottom: spacing.md,
    },
    waitingHint: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.textMuted,
      textAlign: "center",
      marginBottom: spacing.lg,
    },
    actions: {
      gap: spacing.sm,
    },
  });

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <StatusBar barStyle="dark-content" />
        <LoadingSpinner message="Loading payment details..." />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Trip Complete</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Text style={styles.locationLabel}>From</Text>
          <Text style={styles.locationText} numberOfLines={2}>
            {ride?.pickupLocation?.address ?? "—"}
          </Text>

          <Text style={styles.locationLabel}>To</Text>
          <Text style={styles.locationText} numberOfLines={2}>
            {ride?.dropoffLocation?.address ?? "—"}
          </Text>

          <View style={styles.divider} />

          <Text style={styles.fareCurrency}>NGN</Text>
          <Text style={styles.fareAmount}>{fareDisplay}</Text>
        </View>

        {waitingForCash ? (
          <>
            <Text style={styles.waitingText}>
              Waiting for driver to confirm...
            </Text>
            <Text style={styles.waitingHint}>
              Please hand ₦{fareDisplay} to your driver.{"\n"}
              This screen will update automatically once confirmed.
            </Text>
            <LoadingSpinner message="" />
          </>
        ) : cardFailureMessage ? (
          <>
            <Text style={styles.failureText}>{cardFailureMessage}</Text>
            <View style={styles.actions}>
              <Button
                title="Try Card Again"
                onPress={retryCardPayment}
                variant="primary"
                fullWidth
                icon={<CreditCard size={18} color={colors.textInverse} />}
              />
              <Button
                title="Switch to Cash"
                onPress={switchToCash}
                variant="outline"
                fullWidth
                icon={<Banknote size={18} color={colors.primary} />}
              />
            </View>
          </>
        ) : (
          <>
            <Text style={styles.hintText}>
              Choose how you would like to pay
            </Text>
            <View style={styles.actions}>
              <Button
                title={`Pay Cash  •  ₦${fareDisplay}`}
                onPress={handleCashPayment}
                variant="outline"
                fullWidth
                loading={cashLoading}
                disabled={cardLoading}
                icon={<Banknote size={18} color={colors.primary} />}
              />
              <Button
                title="Pay by Card"
                onPress={handleCardPayment}
                variant="primary"
                fullWidth
                loading={cardLoading}
                disabled={cashLoading}
                icon={<CreditCard size={18} color={colors.textInverse} />}
              />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
