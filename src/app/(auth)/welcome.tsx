import { Button } from "@/components/common/Button";
import { useTheme } from "@/hooks/useTheme";
import { router } from "expo-router";
import { Car } from "lucide-react-native";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

export default function WelcomeScreen() {
  const { colors, typography, spacing, borderRadius } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flex: 1,
      paddingHorizontal: spacing.screenPadding,
      justifyContent: "space-between",
      paddingTop: spacing.xl,
      paddingBottom: spacing.xl,
    },
    topSection: {
      alignItems: "center",
      marginTop: spacing.md,
    },
    logoContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: spacing.xs,
    },
    logoIcon: {
      width: 40,
      height: 40,
      backgroundColor: colors.primary,
      borderRadius: borderRadius.full,
      justifyContent: "center",
      alignItems: "center",
      marginRight: spacing.sm,
    },
    appName: {
      fontSize: typography.sizes["3xl"],
      fontFamily: typography.fonts.heading,
      color: colors.primary,
    },
    tagline: {
      fontSize: typography.sizes.base,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.textSecondary,
    },
    middleSection: {
      alignItems: "center",
      justifyContent: "center",
      flex: 1,
      paddingVertical: spacing.xl,
    },
    illustration: {
      width: Math.min(width * 0.85, 350),
      height: Math.min(width * 0.85, 350),
      resizeMode: "contain",
    },
    bottomSection: {
      paddingBottom: spacing.md,
    },
    buttonsContainer: {
      gap: spacing.md,
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" />
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        {/* Top Section - Logo + App Name */}
        <View style={styles.topSection}>
          <View style={styles.logoContainer}>
            <View style={styles.logoIcon}>
              <Car size={20} color={colors.textInverse} />
            </View>
            <Text style={styles.appName}>UICampusCab</Text>
          </View>
          <Text style={styles.tagline}>Campus Rides Made Simple</Text>
        </View>

        {/* Middle Section - Main Illustration (Image 1) */}
        {/* <View style={styles.middleSection}>
          <Image
            source={require('@/assets/illustrations/welcome.png')}
            style={styles.illustration}
          />
        </View> */}

        {/* Bottom Section - Action Buttons */}
        <View style={styles.bottomSection}>
          <View style={styles.buttonsContainer}>
            <Button
              title="Get Started"
              onPress={() => router.push("/(auth)/signup")}
              variant="primary"
              size="large"
              fullWidth
            />
            <Button
              title="I Have an Account"
              onPress={() => router.push("/(auth)/login")}
              variant="outline"
              size="large"
              fullWidth
            />
          </View>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}
