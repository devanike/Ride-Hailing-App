import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { DocumentUploadButton } from "@/components/driver/DocumentUploadButton";
import { PhotoUploadGrid } from "@/components/driver/PhotoUploadGrid";
import { SectionHeader } from "@/components/driver/SectionHeader";
import { useTheme } from "@/hooks/useTheme";
import { auth, db } from "@/services/firebaseConfig";
import { uploadImage, uploadMultipleImages } from "@/services/uploadService";
import { showError, showSuccess } from "@/utils/toast";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { Calendar, CreditCard } from "lucide-react-native";
import React, { useState } from "react";
import {
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

type VehicleType = "car" | "tricycle" | "bus";
type PayoutPreference = "daily" | "weekly";

interface ImageUpload {
  uri: string;
  uploading: boolean;
  uploaded: boolean;
  cloudinaryUrl?: string;
}

export default function DriverRegistrationScreen() {
  const { colors, typography, spacing, borderRadius } = useTheme();

  // Vehicle Information
  const [vehicleType, setVehicleType] = useState<VehicleType>("car");
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleYear, setVehicleYear] = useState("");
  const [vehicleColor, setVehicleColor] = useState("");
  const [plateNumber, setPlateNumber] = useState("");
  const [vehiclePhotos, setVehiclePhotos] = useState<ImageUpload[]>([]);

  // Driver License
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseExpiry, setLicenseExpiry] = useState("");
  const [licenseFront, setLicenseFront] = useState<ImageUpload | null>(null);
  const [licenseBack, setLicenseBack] = useState<ImageUpload | null>(null);

  // Bank Account
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [payoutPref, setPayoutPref] = useState<PayoutPreference>("daily");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const pickImage = async (
    type: "vehicle" | "license-front" | "license-back",
  ) => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        showError(
          "Permission Denied",
          "Please allow access to your photo library",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: type === "vehicle" ? [4, 3] : [3, 2],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUpload: ImageUpload = {
          uri: result.assets[0].uri,
          uploading: false,
          uploaded: false,
        };

        switch (type) {
          case "vehicle":
            if (vehiclePhotos.length < 3) {
              setVehiclePhotos([...vehiclePhotos, imageUpload]);
            } else {
              showError("Limit Reached", "Maximum 3 vehicle photos allowed");
            }
            break;
          case "license-front":
            setLicenseFront(imageUpload);
            break;
          case "license-back":
            setLicenseBack(imageUpload);
            break;
        }
      }
    } catch (error: any) {
      console.error("Image pick error:", error);
      showError("Error", "Failed to pick image");
    }
  };

  const removeVehiclePhoto = (index: number) => {
    setVehiclePhotos(vehiclePhotos.filter((_, i) => i !== index));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Car-only fields
    if (vehicleType === "car") {
      if (!vehicleMake.trim()) newErrors.vehicleMake = "Make is required";
      if (!vehicleModel.trim()) newErrors.vehicleModel = "Model is required";
      if (!vehicleYear.trim()) newErrors.vehicleYear = "Year is required";
    }

    if (!vehicleColor.trim()) newErrors.vehicleColor = "Color is required";
    if (!plateNumber.trim()) newErrors.plateNumber = "Plate number is required";
    if (vehiclePhotos.length === 0)
      newErrors.vehiclePhotos = "At least 1 vehicle photo required";

    if (!licenseNumber.trim())
      newErrors.licenseNumber = "License number is required";
    if (!licenseExpiry.trim())
      newErrors.licenseExpiry = "License expiry is required";
    if (!licenseFront)
      newErrors.licenseFront = "License front photo is required";
    if (!licenseBack) newErrors.licenseBack = "License back photo is required";

    if (!bankName.trim()) newErrors.bankName = "Bank name is required";
    if (!accountNumber.trim())
      newErrors.accountNumber = "Account number is required";
    if (accountNumber.length !== 10)
      newErrors.accountNumber = "Account number must be 10 digits";
    if (!accountName.trim()) newErrors.accountName = "Account name is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      showError("Validation Error", "Please fill all required fields");
      return;
    }

    try {
      setLoading(true);
      const uid = auth.currentUser?.uid;

      if (!uid) {
        showError("Error", "User not found");
        return;
      }

      // Upload all images
      const vehiclePhotoUrls = await uploadMultipleImages(
        vehiclePhotos.map((p) => p.uri),
        "vehicle_photos",
      );
      const licenseFrontUrl = await uploadImage(
        licenseFront!.uri,
        "driver_licenses",
      );
      const licenseBackUrl = await uploadImage(
        licenseBack!.uri,
        "driver_licenses",
      );

      // Build update data
      const updateData: Record<string, any> = {
        status: "active",
        vehicleType,
        vehicleColor,
        plateNumber: plateNumber.toUpperCase(),
        vehiclePhotos: vehiclePhotoUrls,
        licenseNumber: licenseNumber.toUpperCase(),
        licenseExpiry: new Date(licenseExpiry),
        licenseFrontPhoto: licenseFrontUrl,
        licenseBackPhoto: licenseBackUrl,
        bankName,
        accountNumber,
        accountName,
        payout_pref: payoutPref,
        updatedAt: serverTimestamp(),
      };

      // Car-only fields
      if (vehicleType === "car") {
        updateData.vehicleMake = vehicleMake;
        updateData.vehicleModel = vehicleModel;
        updateData.vehicleYear = vehicleYear ? parseInt(vehicleYear) : null;
      }

      await updateDoc(doc(db, "drivers", uid), updateData);

      showSuccess("Registration Complete", "Your details have been saved");
      router.push("/(auth)/pin-setup");
    } catch (error: any) {
      console.error("Registration error:", error);
      showError(
        "Registration Failed",
        error.message || "Failed to complete registration",
      );
    } finally {
      setLoading(false);
    }
  };

  const vehicleTypes: { type: VehicleType; label: string }[] = [
    { type: "car", label: "Car" },
    { type: "tricycle", label: "Tricycle" },
    { type: "bus", label: "Bus" },
  ];

  const payoutOptions: {
    value: PayoutPreference;
    label: string;
    description: string;
  }[] = [
    { value: "daily", label: "Daily", description: "Paid out every day" },
    { value: "weekly", label: "Weekly", description: "Paid out every week" },
  ];

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      paddingHorizontal: spacing.screenPadding,
      paddingTop: spacing.lg,
      paddingBottom: spacing.xxl,
    },
    header: {
      marginBottom: spacing.xl,
    },
    title: {
      fontSize: typography.sizes["2xl"],
      fontFamily: typography.fonts.heading,
      color: colors.textPrimary,
      marginBottom: spacing.xs,
    },
    subtitle: {
      fontSize: typography.sizes.base,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.textSecondary,
    },
    section: {
      marginBottom: spacing.xl,
    },
    vehicleTypeLabel: {
      fontSize: typography.sizes.sm,
      fontWeight: "500",
      color: colors.textSecondary,
      marginBottom: spacing.sm,
    },
    vehicleTypeRow: {
      flexDirection: "row",
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    vehicleTypeCard: {
      flex: 1,
      paddingVertical: spacing.md,
      borderRadius: borderRadius.md,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: "center",
      backgroundColor: colors.surface,
    },
    vehicleTypeCardActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + "10",
    },
    vehicleTypeText: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.textSecondary,
    },
    vehicleTypeTextActive: {
      color: colors.primary,
    },
    payoutLabel: {
      fontSize: typography.sizes.sm,
      fontWeight: "500",
      color: colors.textSecondary,
      marginBottom: spacing.sm,
    },
    payoutRow: {
      flexDirection: "row",
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    payoutCard: {
      flex: 1,
      padding: spacing.md,
      borderRadius: borderRadius.md,
      borderWidth: 2,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    payoutCardActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + "10",
    },
    payoutCardLabel: {
      fontSize: typography.sizes.base,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.textSecondary,
      marginBottom: spacing.xs,
    },
    payoutCardLabelActive: {
      color: colors.primary,
    },
    payoutCardDesc: {
      fontSize: typography.sizes.xs,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.textMuted,
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
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.title}>Vehicle Details</Text>
            <Text style={styles.subtitle}>
              Complete your vehicle and bank details to start accepting rides
            </Text>
          </View>

          {/* VEHICLE SECTION */}
          <View style={styles.section}>
            <SectionHeader title="Vehicle Information" />

            {/* Vehicle type selector */}
            <Text style={styles.vehicleTypeLabel}>Vehicle Type</Text>
            <View style={styles.vehicleTypeRow}>
              {vehicleTypes.map(({ type, label }) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.vehicleTypeCard,
                    vehicleType === type && styles.vehicleTypeCardActive,
                  ]}
                  onPress={() => setVehicleType(type)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.vehicleTypeText,
                      vehicleType === type && styles.vehicleTypeTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Car-only fields */}
            {vehicleType === "car" && (
              <>
                <Input
                  label="Make"
                  value={vehicleMake}
                  onChangeText={setVehicleMake}
                  placeholder="e.g., Toyota"
                  error={errors.vehicleMake}
                />
                <Input
                  label="Model"
                  value={vehicleModel}
                  onChangeText={setVehicleModel}
                  placeholder="e.g., Camry"
                  error={errors.vehicleModel}
                />
                <Input
                  label="Year"
                  value={vehicleYear}
                  onChangeText={setVehicleYear}
                  placeholder="e.g., 2020"
                  keyboardType="number-pad"
                  error={errors.vehicleYear}
                  maxLength={4}
                />
              </>
            )}

            <Input
              label="Color"
              value={vehicleColor}
              onChangeText={setVehicleColor}
              placeholder="e.g., Black"
              error={errors.vehicleColor}
            />

            <Input
              label="Plate Number"
              value={plateNumber}
              onChangeText={(text) => setPlateNumber(text.toUpperCase())}
              placeholder="e.g., ABC-123-XY"
              error={errors.plateNumber}
              autoCapitalize="characters"
            />

            <PhotoUploadGrid
              photos={vehiclePhotos}
              onAddPhoto={() => pickImage("vehicle")}
              onRemovePhoto={removeVehiclePhoto}
              maxPhotos={3}
              label="Vehicle Photos (Max 3)"
              error={errors.vehiclePhotos}
            />
          </View>

          {/* LICENCE SECTION */}
          <View style={styles.section}>
            <SectionHeader title="Driver Licence" />

            <Input
              label="Licence Number"
              value={licenseNumber}
              onChangeText={(text) => setLicenseNumber(text.toUpperCase())}
              placeholder="Licence number"
              error={errors.licenseNumber}
              autoCapitalize="characters"
            />

            <Input
              label="Licence Expiry Date"
              value={licenseExpiry}
              onChangeText={setLicenseExpiry}
              placeholder="YYYY-MM-DD"
              error={errors.licenseExpiry}
              leftIcon={<Calendar size={20} color={colors.textMuted} />}
            />

            <DocumentUploadButton
              label="Licence Front"
              document={licenseFront}
              onUpload={() => pickImage("license-front")}
              error={errors.licenseFront}
            />

            <DocumentUploadButton
              label="Licence Back"
              document={licenseBack}
              onUpload={() => pickImage("license-back")}
              error={errors.licenseBack}
            />
          </View>

          {/* BANK ACCOUNT SECTION */}
          <View style={styles.section}>
            <SectionHeader title="Bank Account" />

            <Input
              label="Bank Name"
              value={bankName}
              onChangeText={setBankName}
              placeholder="e.g., First Bank"
              error={errors.bankName}
            />

            <Input
              label="Account Number"
              value={accountNumber}
              onChangeText={setAccountNumber}
              placeholder="10-digit account number"
              keyboardType="number-pad"
              error={errors.accountNumber}
              maxLength={10}
              leftIcon={<CreditCard size={20} color={colors.textMuted} />}
            />

            <Input
              label="Account Name"
              value={accountName}
              onChangeText={setAccountName}
              placeholder="Account holder name"
              error={errors.accountName}
            />

            {/* Payout Preference */}
            <Text style={styles.payoutLabel}>Payout Preference</Text>
            <View style={styles.payoutRow}>
              {payoutOptions.map(({ value, label, description }) => (
                <TouchableOpacity
                  key={value}
                  style={[
                    styles.payoutCard,
                    payoutPref === value && styles.payoutCardActive,
                  ]}
                  onPress={() => setPayoutPref(value)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.payoutCardLabel,
                      payoutPref === value && styles.payoutCardLabelActive,
                    ]}
                  >
                    {label}
                  </Text>
                  <Text style={styles.payoutCardDesc}>{description}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <Button
            title="Complete Registration"
            onPress={handleSubmit}
            variant="primary"
            size="large"
            fullWidth
            loading={loading}
            disabled={loading}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
