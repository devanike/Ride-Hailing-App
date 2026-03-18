import { Button } from "@/components/common/Button";
import { useTheme } from "@/hooks/useTheme";
import { Ride } from "@/types/ride";
import { Flag, MapPin } from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  Vibration,
  View,
} from "react-native";

const COUNTDOWN_SECONDS = 30;

interface RideRequestModalProps {
  ride: Ride;
  distanceToPickup: number;
  onAccept: (fare: number) => void;
  onBid: (amount: number) => void;
  onDecline: () => void;
  visible: boolean;
}

export const RideRequestModal: React.FC<RideRequestModalProps> = ({
  ride,
  distanceToPickup,
  onAccept,
  onBid,
  onDecline,
  visible,
}) => {
  const { colors, spacing, typography, borderRadius, shadows } = useTheme();

  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [bidAmount, setBidAmount] = useState(String(ride.proposedFare ?? 0));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Keep latest callback and fare in refs so the interval never goes stale
  const onDeclineRef = useRef(onDecline);
  const proposedFareRef = useRef(ride.proposedFare);
  useEffect(() => {
    onDeclineRef.current = onDecline;
  }, [onDecline]);
  useEffect(() => {
    proposedFareRef.current = ride.proposedFare;
  }, [ride.proposedFare]);

  // Vibrate and start countdown when modal becomes visible
  useEffect(() => {
    if (!visible) return;

    setCountdown(COUNTDOWN_SECONDS);
    setBidAmount(String(proposedFareRef.current ?? 0));

    Vibration.vibrate([0, 400, 200, 400]);

    intervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          onDeclineRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [visible]);

  const handleAccept = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    onAccept(ride.proposedFare);
  }, [ride.proposedFare, onAccept]);

  const handleBid = useCallback(() => {
    const amount = parseFloat(bidAmount);
    if (!amount || isNaN(amount) || amount <= 0) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    onBid(amount);
  }, [bidAmount, onBid]);

  const handleDecline = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    onDecline();
  }, [onDecline]);

  const countdownColor = countdown <= 10 ? colors.error : colors.textSecondary;

  const formatCountdown = (s: number): string => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.6)",
      justifyContent: "flex-end",
    },
    card: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: borderRadius.xl,
      borderTopRightRadius: borderRadius.xl,
      paddingHorizontal: spacing.screenPadding,
      paddingTop: spacing.lg,
      paddingBottom: spacing.xxl,
      ...shadows.large,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: spacing.md,
    },
    title: {
      fontSize: typography.sizes.lg,
      fontFamily: typography.fonts.headingSemiBold,
      color: colors.textPrimary,
    },
    countdown: {
      fontSize: typography.sizes.lg,
      fontFamily: typography.fonts.heading,
      color: countdownColor,
    },
    infoRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: spacing.sm,
    },
    infoLabel: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.textMuted,
      marginBottom: 2,
    },
    infoValue: {
      fontSize: typography.sizes.md,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.textPrimary,
      flex: 1,
    },
    fareRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    fareLabel: {
      fontSize: typography.sizes.md,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.textSecondary,
    },
    fareAmount: {
      fontSize: typography.sizes.lg,
      fontFamily: typography.fonts.heading,
      color: colors.textPrimary,
    },
    bidSection: {
      marginTop: spacing.md,
      marginBottom: spacing.md,
    },
    bidLabel: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.textSecondary,
      marginBottom: spacing.sm,
    },
    bidInput: {
      height: 48,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: borderRadius.md,
      paddingHorizontal: spacing.md,
      fontSize: typography.sizes.base,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.textPrimary,
      backgroundColor: colors.backgroundAlt,
    },
    bidInputFocused: {
      borderColor: colors.primary,
    },
    buttons: {
      gap: spacing.sm,
    },
    outlineDanger: {
      height: 48,
      justifyContent: "center",
      alignItems: "center",
      borderRadius: borderRadius.md,
      borderWidth: 1.5,
      borderColor: colors.error,
    },
    outlineDangerText: {
      fontSize: typography.sizes.base,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.error,
    },
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={handleDecline}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          style={styles.overlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.card}>
            {/* Header */}
            <View style={styles.headerRow}>
              <Text style={styles.title}>New Ride Request</Text>
              <Text style={styles.countdown}>{formatCountdown(countdown)}</Text>
            </View>

            {/* Pickup */}
            <View style={styles.infoRow}>
              <MapPin size={18} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>Pickup</Text>
                <Text style={styles.infoValue} numberOfLines={2}>
                  {ride.pickupLocation.address}
                </Text>
              </View>
            </View>

            {/* Destination */}
            <View style={styles.infoRow}>
              <Flag size={18} color={colors.error} />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>Destination</Text>
                <Text style={styles.infoValue} numberOfLines={2}>
                  {ride.dropoffLocation.address}
                </Text>
              </View>
            </View>

            {/* Passenger offer */}
            <View style={styles.fareRow}>
              <Text style={styles.fareLabel}>Passenger offer</Text>
              <Text style={styles.fareAmount}>
                NGN {ride.proposedFare?.toLocaleString()}
              </Text>
            </View>

            {/* Distance to pickup */}
            <View style={styles.fareRow}>
              <Text style={styles.fareLabel}>Distance to pickup</Text>
              <Text style={styles.fareAmount}>
                {distanceToPickup.toFixed(1)} km
              </Text>
            </View>

            {/* Bid input */}
            <View style={styles.bidSection}>
              <Text style={styles.bidLabel}>Your bid (NGN)</Text>
              <TextInput
                style={styles.bidInput}
                value={bidAmount}
                onChangeText={setBidAmount}
                keyboardType="numeric"
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
              />
            </View>

            {/* Action buttons */}
            <View style={styles.buttons}>
              <Button
                title="Accept at Proposed Fare"
                onPress={handleAccept}
                variant="primary"
                fullWidth
              />
              <Button
                title="Submit Own Bid"
                onPress={handleBid}
                variant="outline"
                fullWidth
              />
              <TouchableWithoutFeedback onPress={handleDecline}>
                <View style={styles.outlineDanger}>
                  <Text style={styles.outlineDangerText}>Decline</Text>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default RideRequestModal;
