import { Button } from "@/components/common/Button";
import { useTheme } from "@/hooks/useTheme";
import { auth, db } from "@/services/firebaseConfig";
import { Collections } from "@/types/database";
import { Driver } from "@/types/driver";
import { showError } from "@/utils/toast";
import { router, useLocalSearchParams } from "expo-router";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { Star } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function RatingScreen(): React.JSX.Element {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const { rideId, driverId } = useLocalSearchParams<{
    rideId: string;
    driverId: string;
  }>();

  const [driver, setDriver] = useState<Driver | null>(null);
  const [selectedRating, setSelectedRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!driverId) return;
    const fetchDriver = async (): Promise<void> => {
      try {
        const snap = await getDoc(doc(db, Collections.DRIVERS, driverId));
        if (snap.exists()) setDriver(snap.data() as Driver);
      } catch (err) {
        console.error("Failed to fetch driver:", err);
      }
    };
    fetchDriver();
  }, [driverId]);

  const handleSubmit = useCallback(async (): Promise<void> => {
    if (selectedRating === 0) {
      showError("Select a rating", "Please tap a star to rate your trip.");
      return;
    }

    const passengerId = auth.currentUser?.uid;
    if (!passengerId || !rideId || !driverId) return;

    setSubmitting(true);
    try {
      // Save rating document
      await addDoc(collection(db, Collections.RATINGS), {
        rideId,
        passengerId,
        driverId,
        rating: selectedRating,
        comment: comment.trim() || null,
        createdAt: serverTimestamp(),
      });

      // Recalculate driver average rating
      const driverRef = doc(db, Collections.DRIVERS, driverId);
      const driverSnap = await getDoc(driverRef);
      if (driverSnap.exists()) {
        const driverData = driverSnap.data() as Driver;
        const totalRatings = (driverData.totalRatings ?? 0) + 1;
        const currentTotal =
          (driverData.rating ?? 0) * (driverData.totalRatings ?? 0);
        const newAverage = (currentTotal + selectedRating) / totalRatings;

        await updateDoc(driverRef, {
          rating: Math.round(newAverage * 10) / 10,
          totalRatings,
          updatedAt: serverTimestamp(),
        });
      }

      router.replace("/(passenger)");
    } catch (err) {
      console.error("Failed to submit rating:", err);
      showError("Error", "Could not submit rating. Please try again.");
      setSubmitting(false);
    }
  }, [selectedRating, comment, rideId, driverId]);

  const handleSkip = useCallback((): void => {
    router.replace("/(passenger)");
  }, []);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: spacing.screenPadding,
      alignItems: "center",
    },
    photoContainer: {
      marginTop: spacing.xl,
      marginBottom: spacing.md,
    },
    photo: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.backgroundAlt,
    },
    photoPlaceholder: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.backgroundAlt,
      alignItems: "center",
      justifyContent: "center",
    },
    photoInitial: {
      fontSize: typography.sizes["3xl"],
      fontFamily: typography.fonts.headingSemiBold,
      color: colors.textMuted,
    },
    driverName: {
      fontSize: typography.sizes.xl,
      fontFamily: typography.fonts.headingSemiBold,
      color: colors.textPrimary,
      marginBottom: spacing.xl,
    },
    heading: {
      fontSize: typography.sizes.lg,
      fontFamily: typography.fonts.headingSemiBold,
      color: colors.textPrimary,
      textAlign: "center",
      marginBottom: spacing.xl,
    },
    starsRow: {
      flexDirection: "row",
      gap: spacing.sm,
      marginBottom: spacing.xl,
    },
    starButton: {
      padding: spacing.xs,
    },
    commentInput: {
      width: "100%",
      minHeight: 100,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: borderRadius.md,
      backgroundColor: colors.surface,
      padding: spacing.md,
      fontSize: typography.sizes.base,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.textPrimary,
      textAlignVertical: "top",
      marginBottom: spacing.xl,
    },
    submitButton: {
      width: "100%",
      marginBottom: spacing.md,
    },
    skipText: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.textMuted,
      textAlign: "center",
      paddingVertical: spacing.sm,
    },
  });

  const driverName = driver?.name ?? "your driver";

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.photoContainer}>
          {driver?.profilePhoto ? (
            <Image source={{ uri: driver.profilePhoto }} style={styles.photo} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoInitial}>
                {driver?.name?.charAt(0).toUpperCase() ?? "?"}
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.driverName}>{driverName}</Text>

        <Text style={styles.heading}>How was your trip with {driverName}?</Text>

        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity
              key={star}
              style={styles.starButton}
              onPress={() => setSelectedRating(star)}
              activeOpacity={0.7}
            >
              <Star
                size={40}
                color={star <= selectedRating ? colors.warning : colors.border}
                fill={star <= selectedRating ? colors.warning : "transparent"}
              />
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          style={styles.commentInput}
          placeholder="Share your experience (optional)"
          placeholderTextColor={colors.textMuted}
          value={comment}
          onChangeText={setComment}
          multiline
          numberOfLines={4}
        />

        <View style={styles.submitButton}>
          <Button
            title="Submit Rating"
            onPress={handleSubmit}
            variant="primary"
            fullWidth
            loading={submitting}
          />
        </View>

        <TouchableOpacity onPress={handleSkip} activeOpacity={0.7}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
