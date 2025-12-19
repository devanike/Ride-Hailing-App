import { Button } from '@/components/common/Button';
import { useTheme } from '@/hooks/useTheme';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

interface OnboardingSlide {
  id: string;
  title: string;
  description: string;
  image: any;
}

const ONBOARDING_KEY = '@onboarding_completed';

const slides: OnboardingSlide[] = [
  {
    id: '1',
    title: 'Find Your Ride',
    description: 'Connect with verified drivers across UI campus in seconds',
    image: require('@/assets/illustrations/onboarding-1.svg'),
  },
  {
    id: '2',
    title: 'Track in Real-Time',
    description: 'Know exactly where your driver is and get accurate arrival times',
    image: require('@/assets/illustrations/onboarding-2.svg'),
  },
  {
    id: '3',
    title: 'Safe & Secure',
    description: 'Pay with cash, transfer, or card. Your safety is our priority',
    // Todo: download and add the correct illustration
    image: require('@/assets/illustrations/onboarding-3.svg'),
  },
];

export default function OnboardingScreen() {
  const { colors, typography, spacing, borderRadius } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0) {
        setCurrentIndex(viewableItems[0].index || 0);
      }
    }
  ).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    } else {
      handleGetStarted();
    }
  };

  const handleSkip = async () => {
    // TODO: uncomment this when I'm satisfied with the onboarding design
    // await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    router.replace('/(auth)/welcome');
  };

  const handleGetStarted = async () => {
    // TODO: uncomment this when I'm satisfied with the onboarding design
    // await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    router.replace('/(auth)/welcome');
  };

  const renderSlide = ({ item }: { item: OnboardingSlide }) => {
    const styles = StyleSheet.create({
      slide: {
        width,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.screenPadding,
        paddingTop: spacing['3xl'],
      },
      illustration: {
        width: Math.min(width * 0.75, 280),
        height: Math.min(width * 0.75, 280),
        resizeMode: 'contain',
        marginBottom: spacing['2xl'],
      },
      title: {
        fontSize: typography.sizes['3xl'],
        fontFamily: typography.fonts.heading,
        color: colors.text.primary,
        textAlign: 'center',
        marginBottom: spacing.md,
      },
      description: {
        fontSize: typography.sizes.base,
        fontFamily: typography.fonts.bodyRegular,
        color: colors.text.secondary,
        textAlign: 'center',
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
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.light,
    },
    skipButton: {
      position: 'absolute',
      top: spacing.xl,
      right: spacing.screenPadding,
      zIndex: 10,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.base,
    },
    skipText: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.text.secondary,
    },
    dotsContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing.xl,
      gap: spacing.sm,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: borderRadius.full,
      backgroundColor: colors.border.light,
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
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" />

      {/* Skip Button */}
      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
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
        keyExtractor={(item) => item.id}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        bounces={false}
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
          title={currentIndex === slides.length - 1 ? 'Get Started' : 'Next'}
          onPress={handleNext}
          variant="primary"
          size="large"
          fullWidth
        />
      </View>
    </SafeAreaView>
  );
}