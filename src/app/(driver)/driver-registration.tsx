import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { DocumentUploadButton } from '@/components/driver/DocumentUploadButton';
import { PhotoUploadGrid } from '@/components/driver/PhotoUploadGrid';
import { SectionHeader } from '@/components/driver/SectionHeader';
import { VehicleTypeSelector } from '@/components/driver/VehicleTypeSelector';
import { useTheme } from '@/hooks/useTheme';
import { auth, db } from '@/services/firebaseConfig';
import { uploadImage, uploadMultipleImages } from '@/services/uploadService';
import { showError, showSuccess } from '@/utils/toast';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Calendar, CreditCard } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type VehicleType = 'sedan' | 'suv' | 'tricycle' | 'minibus';

interface ImageUpload {
  uri: string;
  uploading: boolean;
  uploaded: boolean;
  cloudinaryUrl?: string;
}

export default function DriverRegistrationScreen() {
  const { colors, typography, spacing } = useTheme();

  // Vehicle Information
  const [vehicleType, setVehicleType] = useState<VehicleType>('sedan');
  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleYear, setVehicleYear] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [vehiclePhotos, setVehiclePhotos] = useState<ImageUpload[]>([]);

  // Driver License
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseExpiry, setLicenseExpiry] = useState('');
  const [licenseFront, setLicenseFront] = useState<ImageUpload | null>(null);
  const [licenseBack, setLicenseBack] = useState<ImageUpload | null>(null);

  // Vehicle Documents
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [registrationPhoto, setRegistrationPhoto] = useState<ImageUpload | null>(null);
  const [insurancePhoto, setInsurancePhoto] = useState<ImageUpload | null>(null);

  // Bank Account
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');

  // State
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const pickImage = async (
    type: 'vehicle' | 'license-front' | 'license-back' | 'registration' | 'insurance'
  ) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        showError('Permission Denied', 'Please allow access to your photo library');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: type === 'vehicle' ? [4, 3] : [3, 2],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUpload: ImageUpload = {
          uri: result.assets[0].uri,
          uploading: false,
          uploaded: false,
        };

        switch (type) {
          case 'vehicle':
            if (vehiclePhotos.length < 4) {
              setVehiclePhotos([...vehiclePhotos, imageUpload]);
            } else {
              showError('Limit Reached', 'Maximum 4 vehicle photos allowed');
            }
            break;
          case 'license-front':
            setLicenseFront(imageUpload);
            break;
          case 'license-back':
            setLicenseBack(imageUpload);
            break;
          case 'registration':
            setRegistrationPhoto(imageUpload);
            break;
          case 'insurance':
            setInsurancePhoto(imageUpload);
            break;
        }
      }
    } catch (error: any) {
      console.error('Image pick error:', error);
      showError('Error', 'Failed to pick image');
    }
  };

  const removeVehiclePhoto = (index: number) => {
    setVehiclePhotos(vehiclePhotos.filter((_, i) => i !== index));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!vehicleMake.trim()) newErrors.vehicleMake = 'Make is required';
    if (!vehicleModel.trim()) newErrors.vehicleModel = 'Model is required';
    if (!vehicleYear.trim()) newErrors.vehicleYear = 'Year is required';
    if (!vehicleColor.trim()) newErrors.vehicleColor = 'Color is required';
    if (!plateNumber.trim()) newErrors.plateNumber = 'Plate number is required';
    if (vehiclePhotos.length === 0) newErrors.vehiclePhotos = 'At least 1 vehicle photo required';

    if (!licenseNumber.trim()) newErrors.licenseNumber = 'License number is required';
    if (!licenseExpiry.trim()) newErrors.licenseExpiry = 'License expiry is required';
    if (!licenseFront) newErrors.licenseFront = 'License front photo is required';
    if (!licenseBack) newErrors.licenseBack = 'License back photo is required';

    if (!registrationNumber.trim()) newErrors.registrationNumber = 'Registration number is required';
    if (!registrationPhoto) newErrors.registrationPhoto = 'Registration photo is required';
    if (!insurancePhoto) newErrors.insurancePhoto = 'Insurance photo is required';

    if (!bankName.trim()) newErrors.bankName = 'Bank name is required';
    if (!accountNumber.trim()) newErrors.accountNumber = 'Account number is required';
    if (accountNumber.length !== 10) newErrors.accountNumber = 'Account number must be 10 digits';
    if (!accountName.trim()) newErrors.accountName = 'Account name is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      showError('Validation Error', 'Please fill all required fields');
      return;
    }

    try {
      setLoading(true);
      const uid = auth.currentUser?.uid;

      if (!uid) {
        showError('Error', 'User not found');
        return;
      }

      // Upload all images
      const vehiclePhotoUrls = await uploadMultipleImages(
        vehiclePhotos.map(p => p.uri),
        'vehicle_photos'
      );
      const licenseFrontUrl = await uploadImage(licenseFront!.uri, 'driver_licenses');
      const licenseBackUrl = await uploadImage(licenseBack!.uri, 'driver_licenses');
      const registrationUrl = await uploadImage(registrationPhoto!.uri, 'vehicle_registrations');
      const insuranceUrl = await uploadImage(insurancePhoto!.uri, 'vehicle_registrations');

      // Update driver document
      await updateDoc(doc(db, 'drivers', uid), {
        status: 'active',
        vehicleType,
        vehicleMake,
        vehicleModel,
        vehicleYear: parseInt(vehicleYear),
        vehicleColor,
        plateNumber: plateNumber.toUpperCase(),
        vehiclePhotos: vehiclePhotoUrls,
        licenseNumber: licenseNumber.toUpperCase(),
        licenseExpiry: new Date(licenseExpiry),
        licenseFrontPhoto: licenseFrontUrl,
        licenseBackPhoto: licenseBackUrl,
        registrationNumber: registrationNumber.toUpperCase(),
        registrationPhoto: registrationUrl,
        insurancePhoto: insuranceUrl,
        bankName,
        accountNumber,
        accountName,
        updatedAt: serverTimestamp(),
      });

      showSuccess('Registration Complete', 'You can now go online!');
      router.back();
    } catch (error: any) {
      console.error('Registration error:', error);
      showError('Registration Failed', error.message || 'Failed to complete registration');
    } finally {
      setLoading(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.light,
    },
    scrollContent: {
      paddingHorizontal: spacing.screenPadding,
      paddingTop: spacing.lg,
      paddingBottom: spacing['3xl'],
    },
    header: {
      marginBottom: spacing.xl,
    },
    title: {
      fontSize: typography.sizes['2xl'],
      fontFamily: typography.fonts.heading,
      color: colors.text.primary,
      marginBottom: spacing.xs,
    },
    subtitle: {
      fontSize: typography.sizes.base,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.text.secondary,
    },
    section: {
      marginBottom: spacing.xl,
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Driver Registration</Text>
            <Text style={styles.subtitle}>
              Complete your profile to start accepting rides
            </Text>
          </View>

          {/* Vehicle Information */}
          <View style={styles.section}>
            <SectionHeader title="Vehicle Information" />
            
            <VehicleTypeSelector
              selectedType={vehicleType}
              onSelectType={setVehicleType}
            />

            <Input
              label="Vehicle Make"
              value={vehicleMake}
              onChangeText={setVehicleMake}
              placeholder="e.g., Toyota"
              error={errors.vehicleMake}
            />

            <Input
              label="Vehicle Model"
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
              onAddPhoto={() => pickImage('vehicle')}
              onRemovePhoto={removeVehiclePhoto}
              maxPhotos={4}
              label="Vehicle Photos (Max 4)"
              error={errors.vehiclePhotos}
            />
          </View>

          {/* Driver License */}
          <View style={styles.section}>
            <SectionHeader title="Driver License" />

            <Input
              label="License Number"
              value={licenseNumber}
              onChangeText={(text) => setLicenseNumber(text.toUpperCase())}
              placeholder="License number"
              error={errors.licenseNumber}
              autoCapitalize="characters"
            />

            <Input
              label="License Expiry Date"
              value={licenseExpiry}
              onChangeText={setLicenseExpiry}
              placeholder="YYYY-MM-DD"
              error={errors.licenseExpiry}
              leftIcon={<Calendar size={20} color={colors.text.tertiary} />}
            />

            <DocumentUploadButton
              label="License Front"
              document={licenseFront}
              onUpload={() => pickImage('license-front')}
              error={errors.licenseFront}
            />

            <DocumentUploadButton
              label="License Back"
              document={licenseBack}
              onUpload={() => pickImage('license-back')}
              error={errors.licenseBack}
            />
          </View>

          {/* Vehicle Documents */}
          <View style={styles.section}>
            <SectionHeader title="Vehicle Documents" />

            <Input
              label="Registration Number"
              value={registrationNumber}
              onChangeText={(text) => setRegistrationNumber(text.toUpperCase())}
              placeholder="Registration number"
              error={errors.registrationNumber}
              autoCapitalize="characters"
            />

            <DocumentUploadButton
              label="Registration"
              document={registrationPhoto}
              onUpload={() => pickImage('registration')}
              error={errors.registrationPhoto}
            />

            <DocumentUploadButton
              label="Insurance"
              document={insurancePhoto}
              onUpload={() => pickImage('insurance')}
              error={errors.insurancePhoto}
            />
          </View>

          {/* Bank Account */}
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
              leftIcon={<CreditCard size={20} color={colors.text.tertiary} />}
            />

            <Input
              label="Account Name"
              value={accountName}
              onChangeText={setAccountName}
              placeholder="Account holder name"
              error={errors.accountName}
            />
          </View>

          {/* Submit Button */}
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