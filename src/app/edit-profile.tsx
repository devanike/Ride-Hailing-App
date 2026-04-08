import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useTheme } from "@/hooks/useTheme";
import { auth, db } from "@/services/firebaseConfig";
import { uploadImage } from "@/services/uploadService";
import { Collections } from "@/types/database";
import { Driver, PayoutPreference, VehicleType } from "@/types/driver";
import { Passenger } from "@/types/passenger";
import { showError, showSuccess } from "@/utils/toast";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { ArrowLeft, Camera, User } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
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

type UserType = "passenger" | "driver" | null;

export default function EditProfileScreen(): React.JSX.Element {
  const { colors, spacing, typography, borderRadius } = useTheme();

  const [userType, setUserType] = useState<UserType>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);

  // Common fields
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  // Driver-only fields
  const [vehicleType, setVehicleType] = useState<VehicleType>("car");
  const [vehicleColor, setVehicleColor] = useState("");
  const [plateNumber, setPlateNumber] = useState("");
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleYear, setVehicleYear] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [payoutPref, setPayoutPref] = useState<PayoutPreference>("daily");

  // Load profile on mount
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setLoading(false);
      return;
    }

    const loadProfile = async () => {
      try {
        // Check driver first, then passenger
        const driverSnap = await getDoc(doc(db, Collections.DRIVERS, uid));
        if (driverSnap.exists()) {
          const d = driverSnap.data() as Driver;
          setUserType("driver");
          setProfilePhoto(d.profilePhoto);
          setName(d.name ?? "");
          setEmail(d.email ?? "");
          setVehicleType(d.vehicleType ?? "car");
          setVehicleColor(d.vehicleColor ?? "");
          setPlateNumber(d.plateNumber ?? "");
          setVehicleMake(d.vehicleMake ?? "");
          setVehicleModel(d.vehicleModel ?? "");
          setVehicleYear(d.vehicleYear ?? "");
          setBankName(d.bankName ?? "");
          setAccountNumber(d.accountNumber ?? "");
          setAccountName(d.accountName ?? "");
          setPayoutPref(d.payout_pref ?? "daily");
          return;
        }
        const passengerSnap = await getDoc(
          doc(db, Collections.PASSENGERS, uid),
        );
        if (passengerSnap.exists()) {
          const p = passengerSnap.data() as Passenger;
          setUserType("passenger");
          setProfilePhoto(p.profilePhoto);
          setName(p.name ?? "");
          setEmail(p.email ?? "");
        }
      } catch (err) {
        console.error("Failed to load profile:", err);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  const handleChangePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showError("Permission Denied", "Please allow access to your photos");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    setPhotoUploading(true);
    try {
      const url = await uploadImage(result.assets[0].uri, "profile_photos");
      setProfilePhoto(url);
      showSuccess("Photo updated", "Profile photo changed successfully.");
    } catch {
      showError("Upload Failed", "Could not upload photo. Please try again.");
    } finally {
      setPhotoUploading(false);
    }
  }, []);

  const handleSave = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid || !userType) return;
    if (!name.trim()) {
      showError("Required", "Name cannot be empty");
      return;
    }

    setSaving(true);
    try {
      if (userType === "driver") {
        const update: Record<string, any> = {
          name: name.trim(),
          email: email.trim() || null,
          profilePhoto: profilePhoto || null,
          vehicleColor: vehicleColor.trim(),
          plateNumber: plateNumber.trim().toUpperCase(),
          bankName: bankName.trim(),
          accountNumber: accountNumber.trim(),
          accountName: accountName.trim(),
          payout_pref: payoutPref,
          updatedAt: serverTimestamp(),
        };
        if (vehicleType === "car") {
          update.vehicleMake = vehicleMake.trim();
          update.vehicleModel = vehicleModel.trim();
          update.vehicleYear = vehicleYear.trim();
        }
        await updateDoc(doc(db, Collections.DRIVERS, uid), update);
      } else {
        await updateDoc(doc(db, Collections.PASSENGERS, uid), {
          name: name.trim(),
          email: email.trim() || null,
          profilePhoto: profilePhoto || null,
          updatedAt: serverTimestamp(),
        });
      }
      showSuccess("Saved", "Profile updated successfully.");
      router.back();
    } catch (err) {
      console.error("Failed to save profile:", err);
      showError("Failed", "Could not save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [
    userType,
    name,
    email,
    profilePhoto,
    vehicleColor,
    plateNumber,
    vehicleMake,
    vehicleModel,
    vehicleYear,
    bankName,
    accountNumber,
    accountName,
    payoutPref,
    vehicleType,
  ]);

  const vehicleTypeLabel: Record<VehicleType, string> = {
    car: "Car",
    tricycle: "Tricycle",
    bus: "Bus",
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingHorizontal: spacing.screenPadding,
      paddingVertical: spacing.md,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      fontSize: typography.sizes["2xl"],
      fontFamily: typography.fonts.heading,
      color: colors.textPrimary,
    },
    scroll: { padding: spacing.screenPadding, paddingBottom: spacing.xxl },
    photoSection: { alignItems: "center", marginBottom: spacing.xl },
    photoWrapper: { position: "relative", marginBottom: spacing.sm },
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
    cameraOverlay: {
      position: "absolute",
      bottom: 0,
      right: 0,
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: colors.surface,
    },
    changePhotoText: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.primary,
    },
    sectionTitle: {
      fontSize: typography.sizes.base,
      fontFamily: typography.fonts.headingSemiBold,
      color: colors.textPrimary,
      marginTop: spacing.md,
      marginBottom: spacing.md,
    },
    vehicleTypeBadge: {
      backgroundColor: colors.infoBackground,
      borderRadius: borderRadius.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      alignSelf: "flex-start",
      marginBottom: spacing.md,
    },
    vehicleTypeBadgeText: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.info,
    },
    payoutRow: {
      flexDirection: "row",
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    payoutOption: {
      flex: 1,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.md,
      borderWidth: 1.5,
      borderColor: colors.border,
      alignItems: "center",
      backgroundColor: colors.surface,
    },
    payoutOptionActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + "10",
    },
    payoutOptionText: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.textSecondary,
    },
    payoutOptionTextActive: { color: colors.primary },
    payoutLabel: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.textSecondary,
      marginBottom: spacing.sm,
    },
  });

  if (loading) return <LoadingSpinner message="Loading profile..." />;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Profile photo */}
          <View style={styles.photoSection}>
            <TouchableOpacity
              style={styles.photoWrapper}
              onPress={handleChangePhoto}
              activeOpacity={0.8}
              disabled={photoUploading}
            >
              {photoUploading ? (
                <View style={styles.photoPlaceholder}>
                  <ActivityIndicator size="large" color={colors.primary} />
                </View>
              ) : profilePhoto ? (
                <Image source={{ uri: profilePhoto }} style={styles.photo} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <User size={36} color={colors.textMuted} />
                </View>
              )}
              <View style={styles.cameraOverlay}>
                <Camera size={14} color={colors.textInverse} />
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleChangePhoto}
              disabled={photoUploading}
              activeOpacity={0.7}
            >
              <Text style={styles.changePhotoText}>Change Photo</Text>
            </TouchableOpacity>
          </View>

          {/* Common fields */}
          <Input
            label="Full Name"
            value={name}
            onChangeText={setName}
            placeholder="Your full name"
          />
          <Input
            label="Email Address (Optional)"
            value={email}
            onChangeText={setEmail}
            placeholder="your.email@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          {/* Driver-only fields */}
          {userType === "driver" && (
            <>
              <Text style={styles.sectionTitle}>Vehicle Details</Text>

              <View style={styles.vehicleTypeBadge}>
                <Text style={styles.vehicleTypeBadgeText}>
                  {vehicleTypeLabel[vehicleType] ?? vehicleType}
                </Text>
              </View>

              <Input
                label="Vehicle Colour"
                value={vehicleColor}
                onChangeText={setVehicleColor}
                placeholder="e.g. Black"
              />
              <Input
                label="Plate Number"
                value={plateNumber}
                onChangeText={(t) => setPlateNumber(t.toUpperCase())}
                placeholder="e.g. ABC-123-XY"
                autoCapitalize="characters"
              />

              {vehicleType === "car" && (
                <>
                  <Input
                    label="Make"
                    value={vehicleMake}
                    onChangeText={setVehicleMake}
                    placeholder="e.g. Toyota"
                  />
                  <Input
                    label="Model"
                    value={vehicleModel}
                    onChangeText={setVehicleModel}
                    placeholder="e.g. Camry"
                  />
                  <Input
                    label="Year"
                    value={vehicleYear}
                    onChangeText={setVehicleYear}
                    placeholder="e.g. 2020"
                    keyboardType="number-pad"
                    maxLength={4}
                  />
                </>
              )}

              <Text style={styles.sectionTitle}>Bank Account</Text>
              <Input
                label="Bank Name"
                value={bankName}
                onChangeText={setBankName}
                placeholder="e.g. First Bank"
              />
              <Input
                label="Account Number"
                value={accountNumber}
                onChangeText={setAccountNumber}
                placeholder="10-digit account number"
                keyboardType="number-pad"
                maxLength={10}
              />
              <Input
                label="Account Name"
                value={accountName}
                onChangeText={setAccountName}
                placeholder="Account holder name"
              />

              <Text style={styles.payoutLabel}>Payout Preference</Text>
              <View style={styles.payoutRow}>
                {(["daily", "weekly"] as PayoutPreference[]).map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[
                      styles.payoutOption,
                      payoutPref === opt && styles.payoutOptionActive,
                    ]}
                    onPress={() => setPayoutPref(opt)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.payoutOptionText,
                        payoutPref === opt && styles.payoutOptionTextActive,
                      ]}
                    >
                      {opt === "daily" ? "Daily" : "Weekly"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          <Button
            title="Save Changes"
            onPress={handleSave}
            variant="primary"
            size="large"
            fullWidth
            loading={saving}
            disabled={saving || photoUploading}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
