import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { useTheme } from "@/hooks/useTheme";
import { auth, db } from "@/services/firebaseConfig";
import { uploadImage } from "@/services/uploadService";
import { showError, showSuccess } from "@/utils/toast";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { doc, updateDoc } from "firebase/firestore";
import { Camera, Mail, User } from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProfileSetupScreen() {
  const { colors, typography, spacing, borderRadius } = useTheme();
  const [email, setEmail] = useState("");
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState("");

  const validateEmail = (email: string): boolean => {
    if (!email.trim()) return true; // Email is optional

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError("Invalid email address");
      return false;
    }

    setEmailError("");
    return true;
  };

  const pickImage = async () => {
    try {
      // Request permission
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        showError(
          "Permission Denied",
          "Please allow access to your photo library",
        );
        return;
      }

      // Pick image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setUploading(true);

        // Upload to Cloudinary
        const imageUrl = await uploadImage(
          result.assets[0].uri,
          "profile_photos",
        );
        setProfilePhoto(imageUrl);
        showSuccess("Success", "Photo uploaded successfully");
      }
    } catch (error: any) {
      console.error("Image pick error:", error);
      showError("Upload Failed", error.message || "Failed to upload photo");
    } finally {
      setUploading(false);
    }
  };

  const handleContinue = async () => {
    if (!validateEmail(email)) return;

    try {
      setLoading(true);
      const uid = auth.currentUser?.uid;

      if (!uid) {
        showError("Error", "User not found. Please try again.");
        return;
      }

      // Update user document
      await updateDoc(doc(db, "users", uid), {
        email: email.trim() || null,
        profilePhoto: profilePhoto || null,
        updatedAt: new Date(),
      });

      showSuccess("Success", "Profile updated successfully");

      // Navigate to PIN setup
      router.push("/(auth)/pin-setup");
    } catch (error: any) {
      console.error("Profile update error:", error);
      showError("Update Failed", error.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    // Skip to PIN setup without updating profile
    router.push("/(auth)/pin-setup");
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: spacing.screenPadding,
      paddingTop: spacing.xl,
      paddingBottom: spacing.xl,
    },
    header: {
      marginBottom: spacing.xxl,
    },
    title: {
      fontSize: typography.sizes["3xl"],
      fontFamily: typography.fonts.heading,
      color: colors.textPrimary,
      marginBottom: spacing.xs,
    },
    subtitle: {
      fontSize: typography.sizes.base,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.textSecondary,
      lineHeight: typography.sizes.base * typography.lineHeights.normal,
    },
    photoSection: {
      alignItems: "center",
      marginBottom: spacing.xxl,
    },
    photoContainer: {
      width: 120,
      height: 120,
      borderRadius: borderRadius.full,
      backgroundColor: colors.surface,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 2,
      borderColor: colors.border,
      marginBottom: spacing.md,
      overflow: "hidden",
    },
    profileImage: {
      width: "100%",
      height: "100%",
    },
    cameraButton: {
      position: "absolute",
      bottom: 0,
      right: 0,
      width: 40,
      height: 40,
      borderRadius: borderRadius.full,
      backgroundColor: colors.primary,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 3,
      borderColor: colors.background,
    },
    uploadText: {
      fontSize: typography.sizes.base,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.primary,
    },
    form: {
      marginBottom: spacing.xl,
    },
    footer: {
      marginTop: "auto",
      gap: spacing.md,
    },
    skipButton: {
      alignItems: "center",
      paddingVertical: spacing.sm,
    },
    skipText: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.textSecondary,
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Complete Your Profile</Text>
            <Text style={styles.subtitle}>
              Add a photo and email to personalize your account
            </Text>
          </View>

          {/* Photo Section */}
          <View style={styles.photoSection}>
            <TouchableOpacity
              style={styles.photoContainer}
              onPress={pickImage}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator size="large" color={colors.primary} />
              ) : profilePhoto ? (
                <Image
                  source={{ uri: profilePhoto }}
                  style={styles.profileImage}
                />
              ) : (
                <User size={60} color={colors.textMuted} />
              )}

              <View style={styles.cameraButton}>
                <Camera size={20} color={colors.textInverse} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity onPress={pickImage} disabled={uploading}>
              <Text style={styles.uploadText}>
                {profilePhoto ? "Change Photo" : "Upload Photo"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Input
              label="Email Address (Optional)"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setEmailError("");
              }}
              placeholder="your.email@example.com"
              error={emailError}
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon={<Mail size={20} color={colors.textMuted} />}
            />
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Button
              title="Continue"
              onPress={handleContinue}
              variant="primary"
              size="large"
              fullWidth
              loading={loading}
              disabled={loading || uploading}
            />

            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkip}
              disabled={loading}
            >
              <Text style={styles.skipText}>Skip for now</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
