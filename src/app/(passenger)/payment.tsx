import { Button } from "@/components/common/Button";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useTheme } from "@/hooks/useTheme";
import { db } from "@/services/firebaseConfig";
import {
  recordCardPayment,
  recordCashPayment,
} from "@/services/paymentService";
import { Collections } from "@/types/database";
import { Ride } from "@/types/ride";
import { showError, showSuccess } from "@/utils/toast";
import { router, useLocalSearchParams } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import React, { useCallback, useEffect, useState } from "react";
import {
  BackHandler,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import PaystackRaw from "react-native-paystack-webview";
import { SafeAreaView } from "react-native-safe-area-context";

const Paystack = PaystackRaw as any;

const PAYSTACK_PUBLIC_KEY = process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY ?? "";

export default function PaymentScreen(): React.JSX.Element {
  const { colors, spacing, typography, borderRadius, shadows } = useTheme();
  const { rideId } = useLocalSearchParams<{ rideId: string }>();

  const [ride, setRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(true);
  const [cashLoading, setCashLoading] = useState(false);
  const [showPaystack, setShowPaystack] = useState(false);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!rideId) return;
    const fetchRide = async (): Promise<void> => {
      try {
        const snap = await getDoc(doc(db, Collections.RIDES, rideId));
        if (snap.exists()) setRide(snap.data() as Ride);
      } catch (err) {
        console.error("Failed to fetch ride:", err);
        showError("Error", "Could not load trip details.");
      } finally {
        setLoading(false);
      }
    };
    fetchRide();
  }, [rideId]);

  const handleCashPayment = useCallback(async (): Promise<void> => {
    if (!rideId || !ride) return;
    setCashLoading(true);
    try {
      await recordCashPayment(rideId);
      showSuccess("Payment recorded", "Enjoy your trip!");
      router.replace({
        pathname: "/rating",
        params: {
          rideId,
          driverId: ride.driverId ?? "",
        },
      });
    } catch (err) {
      console.error("Cash payment failed:", err);
      showError("Error", "Could not record payment.");
      setCashLoading(false);
    }
  }, [rideId, ride]);

  const handleCardSuccess = useCallback(
    async (reference: string): Promise<void> => {
      setShowPaystack(false);
      if (!rideId || !ride) return;
      try {
        await recordCardPayment(rideId, reference);
        showSuccess("Payment successful", "Thank you!");
        router.replace({
          pathname: "/rating",
          params: {
            rideId,
            driverId: ride.driverId ?? "",
          },
        });
      } catch (err) {
        console.error("Card payment recording failed:", err);
        showError(
          "Error",
          "Payment received but could not record. Contact support.",
        );
      }
    },
    [rideId, ride],
  );

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
    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: spacing.screenPadding,
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
    fareAmount: {
      fontSize: typography.sizes["4xl"],
      fontFamily: typography.fonts.heading,
      color: colors.textPrimary,
      textAlign: "center",
      marginBottom: spacing.xs,
    },
    fareCurrency: {
      fontSize: typography.sizes.lg,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.textMuted,
      textAlign: "center",
      marginBottom: spacing.lg,
    },
    paymentMethodRow: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
    },
    paymentMethodLabel: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.textMuted,
    },
    cashHint: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.textSecondary,
      textAlign: "center",
      marginBottom: spacing.md,
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

  if (showPaystack && ride?.agreedFare) {
    return (
      <Paystack
        paystackKey={PAYSTACK_PUBLIC_KEY}
        amount={ride.agreedFare}
        billingEmail="passenger@uiride.app"
        activityIndicatorColor={colors.primary}
        onCancel={() => setShowPaystack(false)}
        onSuccess={(response: {
          transactionRef?: { reference?: string };
          data?: { reference?: string };
        }) => {
          const ref =
            response?.transactionRef?.reference ??
            response?.data?.reference ??
            `ref_${Date.now()}`;
          handleCardSuccess(ref);
        }}
        autoStart
      />
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Trip Complete</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
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

          <View style={styles.paymentMethodRow}>
            <Text style={styles.paymentMethodLabel}>
              {ride?.paymentMethod
                ? `Payment: ${ride.paymentMethod}`
                : "Choose payment method"}
            </Text>
          </View>
        </View>

        <Text style={styles.cashHint}>
          Cash: hand NGN {fareDisplay} directly to your driver
        </Text>

        <View style={styles.actions}>
          <Button
            title={`Pay Cash  •  NGN ${fareDisplay}`}
            onPress={handleCashPayment}
            variant="outline"
            fullWidth
            loading={cashLoading}
          />
          <Button
            title="Pay by Card"
            onPress={() => setShowPaystack(true)}
            variant="primary"
            fullWidth
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
