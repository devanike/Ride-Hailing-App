import { Button } from "@/components/common/Button";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useTheme } from "@/hooks/useTheme";
import { auth, db } from "@/services/firebaseConfig";
import {
  recordCashPayment,
  recordDriverEarning,
} from "@/services/paymentService";
import { Collections } from "@/types/database";
import { Ride } from "@/types/ride";
import { showError, showSuccess } from "@/utils/toast";
import { router, useLocalSearchParams } from "expo-router";
import { doc, onSnapshot } from "firebase/firestore";
import { Banknote, CheckCircle, Clock, CreditCard } from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  BackHandler,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PaymentCollectionScreen(): React.JSX.Element {
  const { colors, spacing, typography, borderRadius, shadows } = useTheme();
  const { rideId } = useLocalSearchParams<{ rideId: string }>();

  const [ride, setRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(true);
  const [paid, setPaid] = useState(false);
  const [processing, setProcessing] = useState(false);

  const earningRecorded = useRef(false);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!rideId) {
      setLoading(false);
      return;
    }

    const unsub = onSnapshot(
      doc(db, Collections.RIDES, rideId),
      async (snap) => {
        if (!snap.exists()) return;
        const data = { rideId: snap.id, ...snap.data() } as Ride;
        setRide(data);
        setLoading(false);

        // Auto-detect card payment completion
        if (data.paymentStatus === "completed" && !earningRecorded.current) {
          earningRecorded.current = true;
          setPaid(true);

          try {
            const uid = auth.currentUser?.uid;
            if (uid) {
              await recordDriverEarning(
                rideId,
                uid,
                data.agreedFare ?? 0,
                (data.paymentMethod as "cash" | "card") ?? "card",
              );
            }
            showSuccess(
              "Payment Received",
              "Your earnings have been recorded!",
            );
          } catch (err) {
            console.error("Failed to record earning:", err);
          }
        }
      },
    );

    return unsub;
  }, [rideId]);

  const handleCashReceived = useCallback(() => {
    if (!ride || !rideId) return;
    const displayAmount = ride.agreedFare?.toLocaleString() ?? "0";

    Alert.alert(
      "Confirm Cash Payment",
      `Has the passenger paid ₦${displayAmount} in cash?`,
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Confirm",
          onPress: async () => {
            const uid = auth.currentUser?.uid;
            if (!uid) return;
            setProcessing(true);
            try {
              await recordCashPayment(rideId);
              await recordDriverEarning(
                rideId,
                uid,
                ride.agreedFare ?? 0,
                "cash",
              );
              setPaid(true);
              earningRecorded.current = true;
              showSuccess("Payment Recorded", "Cash payment confirmed");
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
  }, [ride, rideId]);

  const handleDone = useCallback(() => {
    router.replace("/(driver)");
  }, []);

  const fareDisplay = ride?.agreedFare?.toLocaleString() ?? "—";
  const paymentMethod = ride?.paymentMethod ?? null;
  // const waitingForMethod = !paymentMethod && !paid;
  const waitingForCard = paymentMethod === "card" && !paid;
  const waitingForCash = paymentMethod === "cash" && !paid;

  const getStatusIcon = () => {
    if (paid) return <CheckCircle size={40} color={colors.success} />;
    if (waitingForCard) return <CreditCard size={40} color={colors.info} />;
    if (waitingForCash) return <Banknote size={40} color={colors.warning} />;
    return <Clock size={40} color={colors.warning} />;
  };

  const getIconStyle = () => {
    if (paid) return { backgroundColor: colors.success + "20" };
    if (waitingForCard) return { backgroundColor: colors.info + "20" };
    if (waitingForCash) return { backgroundColor: colors.warning + "20" };
    return { backgroundColor: colors.warning + "20" };
  };

  const getStatusText = () => {
    if (paid) return "Payment Complete!";
    if (waitingForCard) return "Passenger Paying by Card";
    if (waitingForCash) return "Cash Payment Selected";
    return "Waiting for Passenger";
  };

  const getStatusHint = () => {
    if (paid) return "Your earnings have been recorded.";
    if (waitingForCard)
      return "This screen will update automatically once the card payment succeeds.";
    if (waitingForCash)
      return "Confirm below only after the passenger has handed you the cash.";
    return "The passenger is choosing their payment method (cash or card).";
  };

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
      textAlign: "center",
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: spacing.screenPadding,
      paddingTop: spacing.xl,
      paddingBottom: spacing.xxl + 60,
      alignItems: "center",
    },
    iconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: spacing.lg,
    },
    statusText: {
      fontSize: typography.sizes.xl,
      fontFamily: typography.fonts.headingSemiBold,
      color: colors.textPrimary,
      textAlign: "center",
      marginBottom: spacing.sm,
    },
    statusHint: {
      fontSize: typography.sizes.base,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.textSecondary,
      textAlign: "center",
      marginBottom: spacing.xl,
      paddingHorizontal: spacing.lg,
    },
    fareCard: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      width: "100%",
      alignItems: "center",
      marginBottom: spacing.xl,
      ...shadows.medium,
    },
    fareLabel: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.textMuted,
      marginBottom: spacing.xs,
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    fareAmount: {
      fontSize: 36,
      fontFamily: typography.fonts.heading,
      color: colors.primary,
      marginBottom: spacing.xs,
    },
    paymentMethodText: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.textSecondary,
    },
    locationCard: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      width: "100%",
      marginBottom: spacing.xl,
      ...shadows.small,
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
      marginBottom: spacing.md,
      width: "100%",
    },
    buttonContainer: {
      width: "100%",
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
        <LoadingSpinner message="Loading trip details..." />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {paid ? "Payment Received" : "Collect Payment"}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.iconContainer, getIconStyle()]}>
          {getStatusIcon()}
        </View>

        <Text style={styles.statusText}>{getStatusText()}</Text>
        <Text style={styles.statusHint}>{getStatusHint()}</Text>

        <View style={styles.fareCard}>
          <Text style={styles.fareLabel}>Trip Fare</Text>
          <Text style={styles.fareAmount}>₦{fareDisplay}</Text>
          {paid && ride?.paymentMethod && (
            <Text style={styles.paymentMethodText}>
              Paid via {ride.paymentMethod === "cash" ? "Cash" : "Card"}
            </Text>
          )}
        </View>

        <View style={styles.locationCard}>
          <Text style={styles.locationLabel}>From</Text>
          <Text style={styles.locationText} numberOfLines={2}>
            {ride?.pickupLocation?.address ?? "—"}
          </Text>
          <View style={styles.divider} />
          <Text style={styles.locationLabel}>To</Text>
          <Text style={styles.locationText} numberOfLines={1}>
            {ride?.dropoffLocation?.address ?? "—"}
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          {waitingForCash && (
            <Button
              title="Confirm Cash Received"
              onPress={handleCashReceived}
              variant="primary"
              fullWidth
              loading={processing}
            />
          )}
          {waitingForCard && (
            <LoadingSpinner message="Waiting for card payment..." />
          )}
          {paid && (
            <Button
              title="Done"
              onPress={handleDone}
              variant="primary"
              fullWidth
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
