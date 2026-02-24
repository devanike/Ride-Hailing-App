import { Button } from "@/components/common/Button";
import { useTheme } from "@/hooks/useTheme";
import { showError } from "@/utils/toast";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  ImageSourcePropType,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewToken,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

interface OnboardingSlide {
  id: string;
  title: string;
  description: string;
  image: ImageSourcePropType;
}

interface ViewableItemsChanged {
  viewableItems: ViewToken[];
  changed: ViewToken[];
}

const ONBOARDING_KEY = "@onboarding_completed" as const;

const slides: readonly OnboardingSlide[] = [
  {
    id: "1",
    title: "Find Your Ride",
    description: "Connect with verified drivers across UI campus in seconds",
    image: require("@/assets/illustrations/onboarding-1.svg"),
  },
  {
    id: "2",
    title: "Track in Real-Time",
    description:
      "Know exactly where your driver is and get accurate arrival times",
    image: require("@/assets/illustrations/onboarding-2.svg"),
  },
  // {
  //   id: '3',
  //   title: 'Safe & Secure',
  //   description: 'Pay with cash, transfer, or card. Your safety is our priority',
  //   image: require('@/assets/illustrations/onboarding-3.svg'),
  // },
] as const;

export default function OnboardingScreen(): React.JSX.Element {
  const { colors, typography, spacing, borderRadius } = useTheme();
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const flatListRef = useRef<FlatList<OnboardingSlide>>(null);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: ViewableItemsChanged): void => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setCurrentIndex(viewableItems[0].index);
      }
    },
  ).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const handleGetStarted = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      await AsyncStorage.setItem(ONBOARDING_KEY, "true");

      // Add small delay for better UX
      setTimeout(() => {
        router.replace("/(auth)/welcome");
      }, 200);
    } catch (error) {
      console.error("Error saving onboarding status:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to complete setup";
      showError("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleNext = useCallback((): void => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    } else {
      handleGetStarted();
    }
  }, [currentIndex, handleGetStarted]);

  const handleSkip = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      await AsyncStorage.setItem(ONBOARDING_KEY, "true");

      // Add small delay for better UX
      setTimeout(() => {
        router.replace("/(auth)/welcome");
      }, 200);
    } catch (error) {
      console.error("Error saving onboarding status:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to save progress";
      showError("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const renderSlide = useCallback(
    ({ item }: { item: OnboardingSlide }): React.JSX.Element => {
      const styles = StyleSheet.create({
        slide: {
          width,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: spacing.screenPadding,
          paddingTop: spacing.xxl,
        },
        illustration: {
          width: Math.min(width * 0.75, 280),
          height: Math.min(width * 0.75, 280),
          resizeMode: "contain",
          marginBottom: spacing.xl,
        },
        title: {
          fontSize: typography.sizes["3xl"],
          fontFamily: typography.fonts.heading,
          color: colors.textPrimary,
          textAlign: "center",
          marginBottom: spacing.md,
        },
        description: {
          fontSize: typography.sizes.base,
          fontFamily: typography.fonts.bodyRegular,
          color: colors.textSecondary,
          textAlign: "center",
          lineHeight: typography.sizes.base * typography.lineHeights.normal,
          paddingHorizontal: spacing.lg,
        },
      });

      return (
        <View style={styles.slide}>
          <Image source={item.image} style={styles.illustration} />
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.description}>{item.description}</Text>
        </View>
      );
    },
    [colors, typography, spacing],
  );

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    skipButton: {
      position: "absolute",
      top: spacing.xl,
      right: spacing.screenPadding,
      zIndex: 10,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    skipText: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.textSecondary,
    },
    dotsContainer: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: spacing.xl,
      gap: spacing.sm,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: borderRadius.full,
      backgroundColor: colors.border,
    },
    dotActive: {
      width: 24,
      height: 8,
      borderRadius: borderRadius.sm,
      backgroundColor: colors.accent,
    },
    buttonContainer: {
      paddingHorizontal: spacing.screenPadding,
      paddingBottom: spacing.xl,
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" />

      {/* Skip Button */}
      <TouchableOpacity
        style={styles.skipButton}
        onPress={handleSkip}
        disabled={loading}
      >
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item): string => item.id}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        bounces={false}
        scrollEnabled={!loading}
      />

      {/* Pagination Dots */}
      <View style={styles.dotsContainer}>
        {slides.map((_, index) => (
          <View
            key={index}
            style={index === currentIndex ? styles.dotActive : styles.dot}
          />
        ))}
      </View>

      {/* Next/Get Started Button */}
      <View style={styles.buttonContainer}>
        <Button
          title={currentIndex === slides.length - 1 ? "Get Started" : "Next"}
          onPress={handleNext}
          variant="primary"
          size="large"
          fullWidth
          loading={loading}
          disabled={loading}
        />
      </View>
    </SafeAreaView>
  );
}
