import { Button } from '@/components/common/Button';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { MapComponent, MapComponentRef } from '@/components/map/MapComponent';
import { useLocation } from '@/hooks/useLocation';
import { useTheme } from '@/hooks/useTheme';
import { showError } from '@/utils/toast';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { router, useLocalSearchParams } from 'expo-router';
import { MapPin, Navigation, Search } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * Passenger Home Screen
 * Main screen with map and ride request functionality
 */
export default function PassengerHomeScreen(): React.JSX.Element {
  const { colors, spacing, typography, borderRadius, shadows } = useTheme();
  const mapRef = useRef<MapComponentRef>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);
  
  const { location, loading, error, hasPermission, requestPermission } = useLocation();
  
  const [pickupLocation, setPickupLocation] = useState<string>('');
  const [dropoffLocation, setDropoffLocation] = useState<string>('');

  // Get location data returned from location-selection screen
  const params = useLocalSearchParams();
  const selectedLocation = params.selectedLocation as string | undefined;
  const locationType = params.locationType as 'pickup' | 'dropoff' | undefined;

  // Handle returned location from location-selection screen
  useEffect(() => {
    if (selectedLocation && locationType) {
      if (locationType === 'pickup') {
        setPickupLocation(selectedLocation);
      } else if (locationType === 'dropoff') {
        setDropoffLocation(selectedLocation);
      }
    }
  }, [selectedLocation, locationType]);

  // Animate to user location when available
  useEffect(() => {
    if (location) {
      try {
        mapRef.current?.animateToRegion(
          {
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          },
          300
        );
      } catch (err) {
        console.error('Error animating to location:', err);
      }
    }
  }, [location]);

  const handleRequestLocation = useCallback(async (): Promise<void> => {
    try {
      if (!hasPermission) {
        await requestPermission();
      }
    } catch (err) {
      console.error('Error requesting location permission:', err);
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Failed to request location permission';
      showError('Permission Error', errorMessage);
    }
  }, [hasPermission, requestPermission]);

  const handleSelectPickup = useCallback((): void => {
    try {
      router.push({
        pathname: '/location-selection',
        params: { type: 'pickup' },
      });
    } catch (err) {
      console.error('Navigation error:', err);
      showError('Error', 'Failed to open location selection');
    }
  }, []);

  const handleSelectDropoff = useCallback((): void => {
    try {
      router.push({
        pathname: '/location-selection',
        params: { type: 'dropoff' },
      });
    } catch (err) {
      console.error('Navigation error:', err);
      showError('Error', 'Failed to open location selection');
    }
  }, []);

  const handleRequestRide = useCallback((): void => {
    if (!pickupLocation || !dropoffLocation) {
      showError('Incomplete Information', 'Please select both pickup and dropoff locations');
      return;
    }
    
    try {
      router.push('/(passenger)/driver-offers');
    } catch (err) {
      console.error('Navigation error:', err);
      showError('Error', 'Failed to find drivers. Please try again.');
    }
  }, [pickupLocation, dropoffLocation]);

  const handleRetryLocation = useCallback(async (): Promise<void> => {
    try {
      await requestPermission();
    } catch (err) {
      console.error('Retry location error:', err);
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Failed to get location';
      showError('Error', errorMessage);
    }
  }, [requestPermission]);

  const handleCenterMap = useCallback((): void => {
    if (location) {
      try {
        mapRef.current?.animateToRegion(
          {
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          },
          300
        );
      } catch (err) {
        console.error('Error centering map:', err);
        showError('Error', 'Failed to center map on your location');
      }
    } else {
      showError('Location Unavailable', 'Unable to get your current location');
    }
  }, [location]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.light,
    },
    map: {
      flex: 1,
    },
    header: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      paddingTop: spacing.xl,
      paddingHorizontal: spacing.screenPadding,
      paddingBottom: spacing.base,
      backgroundColor: colors.surface.light,
      ...shadows.medium,
    },
    greeting: {
      fontSize: typography.sizes.xl,
      fontFamily: typography.fonts.heading,
      color: colors.text.primary,
    },
    subGreeting: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.text.secondary,
      marginTop: spacing.xs / 2,
    },
    myLocationButton: {
      position: 'absolute',
      top: 140,
      right: spacing.screenPadding,
      width: 48,
      height: 48,
      borderRadius: borderRadius.full,
      backgroundColor: colors.surface.light,
      alignItems: 'center',
      justifyContent: 'center',
      ...shadows.medium,
    },
    bottomSheetContent: {
      padding: spacing.screenPadding,
    },
    sheetTitle: {
      fontSize: typography.sizes.xl,
      fontFamily: typography.fonts.headingSemiBold,
      color: colors.text.primary,
      marginBottom: spacing.lg,
    },
    locationInputContainer: {
      marginBottom: spacing.base,
    },
    locationInput: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface.light,
      padding: spacing.base,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.border.light,
    },
    locationInputFilled: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + '10',
    },
    locationIcon: {
      marginRight: spacing.md,
    },
    locationTextContainer: {
      flex: 1,
    },
    locationLabel: {
      fontSize: typography.sizes.xs,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.text.tertiary,
      marginBottom: spacing.xs / 2,
    },
    locationText: {
      fontSize: typography.sizes.base,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.text.secondary,
    },
    locationTextFilled: {
      color: colors.text.primary,
      fontFamily: typography.fonts.bodyMedium,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border.light,
      marginVertical: spacing.md,
    },
    requestButton: {
      marginTop: spacing.base,
    },
    permissionContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.xl,
    },
    permissionText: {
      fontSize: typography.sizes.base,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.text.secondary,
      textAlign: 'center',
      marginBottom: spacing.lg,
      marginTop: spacing.base,
    },
    errorContainer: {
      position: 'absolute',
      top: 100,
      left: spacing.screenPadding,
      right: spacing.screenPadding,
      zIndex: 1000,
    },
  });

  // Show permission request if needed
  if (!hasPermission) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.permissionContainer}>
          <MapPin size={64} color={colors.text.tertiary} />
          <Text style={styles.permissionText}>
            We need your location to show nearby drivers and enable ride tracking.
          </Text>
          <Button
            title="Enable Location"
            onPress={handleRequestLocation}
            variant="primary"
            size="large"
            loading={loading}
            disabled={loading}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Map */}
      <MapComponent
        ref={mapRef}
        style={styles.map}
        showUserLocation
        followUserLocation={false}
      />

      {/* Error Banner */}
      {error && (
        <View style={styles.errorContainer}>
          <ErrorMessage
            message={error}
            onRetry={handleRetryLocation}
            type="error"
          />
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello!</Text>
        <Text style={styles.subGreeting}>Where would you like to go?</Text>
      </View>

      {/* My Location Button */}
      <TouchableOpacity
        style={styles.myLocationButton}
        onPress={handleCenterMap}
        disabled={!location}
      >
        <Navigation size={24} color={location ? colors.primary : colors.text.tertiary} />
      </TouchableOpacity>

      {/* Bottom Sheet */}
      <BottomSheet
        ref={bottomSheetRef}
        index={0}
        snapPoints={['30%', '50%', '90%']}
        backgroundStyle={{
          backgroundColor: colors.surface.light,
        }}
        handleIndicatorStyle={{
          backgroundColor: colors.border.medium,
        }}
      >
        <BottomSheetScrollView
          contentContainerStyle={styles.bottomSheetContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sheetTitle}>Request a Ride</Text>

          {/* Pickup Location */}
          <View style={styles.locationInputContainer}>
            <TouchableOpacity
              style={[
                styles.locationInput,
                pickupLocation && styles.locationInputFilled,
              ]}
              onPress={handleSelectPickup}
            >
              <View style={styles.locationIcon}>
                <MapPin size={20} color={colors.status.success} />
              </View>
              <View style={styles.locationTextContainer}>
                <Text style={styles.locationLabel}>Pickup Location</Text>
                <Text
                  style={[
                    styles.locationText,
                    pickupLocation && styles.locationTextFilled,
                  ]}
                  numberOfLines={1}
                >
                  {pickupLocation || 'Select pickup location'}
                </Text>
              </View>
              <Search size={20} color={colors.text.tertiary} />
            </TouchableOpacity>
          </View>

          {/* Dropoff Location */}
          <View style={styles.locationInputContainer}>
            <TouchableOpacity
              style={[
                styles.locationInput,
                dropoffLocation && styles.locationInputFilled,
              ]}
              onPress={handleSelectDropoff}
            >
              <View style={styles.locationIcon}>
                <MapPin size={20} color={colors.status.error} />
              </View>
              <View style={styles.locationTextContainer}>
                <Text style={styles.locationLabel}>Dropoff Location</Text>
                <Text
                  style={[
                    styles.locationText,
                    dropoffLocation && styles.locationTextFilled,
                  ]}
                  numberOfLines={1}
                >
                  {dropoffLocation || 'Select dropoff location'}
                </Text>
              </View>
              <Search size={20} color={colors.text.tertiary} />
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          {/* Request Ride Button */}
          <View style={styles.requestButton}>
            <Button
              title="Find Drivers"
              onPress={handleRequestRide}
              variant="primary"
              size="large"
              fullWidth
              disabled={!pickupLocation || !dropoffLocation}
            />
          </View>
        </BottomSheetScrollView>
      </BottomSheet>

      {/* Loading Overlay */}
      {loading && <LoadingSpinner fullScreen message="Getting your location..." />}
    </View>
  );
}