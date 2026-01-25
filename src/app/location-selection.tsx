import { Button } from '@/components/common/Button';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { LocationCategoryFilter } from '@/components/common/LocationCategoryFilter';
import { OutsideCampusModal } from '@/components/common/OutsideCampusModal';
import { PopularLocations } from '@/components/common/PopularLocations';
import { DropoffMarker } from '@/components/map/DropoffMarker';
import { MapComponent, MapComponentRef } from '@/components/map/MapComponent';
import { PickupMarker } from '@/components/map/PickupMarker';
import { UserMarker } from '@/components/map/UserMarker';
import { useCampusBoundary } from '@/hooks/useCampusBoundary';
import { useLocation } from '@/hooks/useLocation';
import { useTheme } from '@/hooks/useTheme';
import {
  getAddressFromCoordinates
} from '@/services/locationService';
import { LocationCategory, PopularLocation } from '@/types/locations';
import { Coordinates } from '@/types/map';
import { PlaceDetails } from '@/types/places';
import { showError } from '@/utils/toast';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, MapPin, Navigation } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type LocationType = 'pickup' | 'dropoff';

export default function LocationSelectionScreen(): React.JSX.Element {
  const { colors, spacing, typography, borderRadius, shadows } = useTheme();
  const params = useLocalSearchParams();
  const locationType = (params.type as LocationType) || 'pickup';

  const mapRef = useRef<MapComponentRef>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);

  const { location: userLocation, loading: locationLoading } = useLocation(true);
  const { checkLocation, showWarning, setShowWarning } = useCampusBoundary();

  const [selectedLocation, setSelectedLocation] = useState<{
    coordinate: Coordinates;
    address: string;
  } | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<LocationCategory | 'all'>('all');
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [addressLoading, setAddressLoading] = useState(false);

  // Animate to user location on mount
  useEffect(() => {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        },
        300
      );
    }
  }, [userLocation]);

  /**
   * Handle map tap to select location
   */
  const handleMapPress = useCallback(
    async (coordinate: Coordinates): Promise<void> => {
      try {
        setAddressLoading(true);

        // Check if location is on campus
        const onCampus = checkLocation(coordinate);
        if (!onCampus) {
          return; // Modal will show via showWarning state
        }

        // Get address from coordinates
        const addressResult = await getAddressFromCoordinates(
          coordinate.latitude,
          coordinate.longitude
        );

        setSelectedLocation({
          coordinate,
          address: addressResult?.formattedAddress || 'Selected location',
        });

        // Animate map to selected location
        mapRef.current?.animateToRegion(
          {
            ...coordinate,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          },
          300
        );
      } catch (error) {
        console.error('Error handling map press:', error);
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to select location';
        showError('Error', errorMessage);
      } finally {
        setAddressLoading(false);
      }
    },
    [checkLocation]
  );

  /**
   * Handle popular location selection
   */
  const handleLocationSelect = useCallback(
    async (location: PopularLocation | PlaceDetails): Promise<void> => {
      try {
        setAddressLoading(true);

        // Check if it's a PopularLocation or PlaceDetails
        const coordinate = location.coordinate;
        const address =
          'shortName' in location ? location.name : location.formattedAddress;

        // Check if location is on campus
        const onCampus = checkLocation(coordinate);
        if (!onCampus) {
          return;
        }

        setSelectedLocation({
          coordinate,
          address,
        });

        // Animate map to selected location
        mapRef.current?.animateToRegion(
          {
            ...coordinate,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          },
          300
        );

        // Collapse bottom sheet to show map
        bottomSheetRef.current?.snapToIndex(0);
      } catch (error) {
        console.error('Error selecting location:', error);
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to select location';
        showError('Error', errorMessage);
      } finally {
        setAddressLoading(false);
      }
    },
    [checkLocation]
  );

  /**
   * Handle use current location
   */
  const handleUseCurrentLocation = useCallback(async (): Promise<void> => {
    if (!userLocation) {
      showError('Location Error', 'Unable to get your current location');
      return;
    }

    try {
      setAddressLoading(true);

      // Check if current location is on campus
      const onCampus = checkLocation(userLocation);
      if (!onCampus) {
        return;
      }

      // Get address from current location
      const addressResult = await getAddressFromCoordinates(
        userLocation.latitude,
        userLocation.longitude
      );

      setSelectedLocation({
        coordinate: {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
        },
        address: addressResult?.formattedAddress || 'Current location',
      });

      // Animate map to current location
      mapRef.current?.animateToRegion(
        {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        300
      );
    } catch (error) {
      console.error('Error using current location:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to use current location';
      showError('Error', errorMessage);
    } finally {
      setAddressLoading(false);
    }
  }, [userLocation, checkLocation]);

  /**
   * Handle confirm location
   */
  const handleConfirm = useCallback(async (): Promise<void> => {
    if (!selectedLocation) {
      showError('No Location', 'Please select a location first');
      return;
    }

    try {
      setConfirmLoading(true);

      // Return to previous screen with selected location
      router.back();
      
      // Pass location data back via router params
      setTimeout(() => {
        router.setParams({
          selectedLocation: selectedLocation.address,
          locationType,
          latitude: selectedLocation.coordinate.latitude.toString(),
          longitude: selectedLocation.coordinate.longitude.toString(),
        });
      }, 100);
    } catch (error) {
      console.error('Error confirming location:', error);
      showError('Error', 'Failed to confirm location');
    } finally {
      setConfirmLoading(false);
    }
  }, [selectedLocation, locationType]);

  /**
   * Handle outside campus confirmation (force select anyway)
   */
  const handleOutsideCampusConfirm = useCallback((): void => {
    setShowWarning(false);
    // Allow selection even if outside campus
    // You might want to add a warning flag to the selection
  }, [setShowWarning]);

  const getTitle = (): string => {
    return locationType === 'pickup' ? 'Select Pickup Location' : 'Select Dropoff Location';
  };

  const getMarkerColor = (): string => {
    return locationType === 'pickup' ? colors.status.success : colors.status.error;
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.light,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.screenPadding,
      paddingVertical: spacing.base,
      backgroundColor: colors.surface.light,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.light,
      ...shadows.small,
    },
    backButton: {
      padding: spacing.xs,
      marginRight: spacing.sm,
    },
    headerTitle: {
      fontSize: typography.sizes.lg,
      fontFamily: typography.fonts.headingSemiBold,
      color: colors.text.primary,
      flex: 1,
    },
    map: {
      flex: 1,
    },
    currentLocationButton: {
      position: 'absolute',
      top: spacing.base,
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
      paddingHorizontal: spacing.screenPadding,
      paddingBottom: spacing.xl,
    },
    selectedLocationContainer: {
      backgroundColor: colors.surface.light,
      padding: spacing.base,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.border.light,
      marginBottom: spacing.base,
    },
    selectedLocationHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    selectedLocationIcon: {
      marginRight: spacing.sm,
    },
    selectedLocationTitle: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.text.secondary,
    },
    selectedLocationAddress: {
      fontSize: typography.sizes.base,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.text.primary,
      lineHeight: typography.sizes.base * typography.lineHeights.normal,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border.light,
      marginVertical: spacing.base,
    },
    sectionTitle: {
      fontSize: typography.sizes.base,
      fontFamily: typography.fonts.headingSemiBold,
      color: colors.text.primary,
      marginBottom: spacing.sm,
    },
    locationsContainer: {
      flex: 1,
    },
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{getTitle()}</Text>
        </View>
      </SafeAreaView>

      {/* Map */}
      <MapComponent
        ref={mapRef}
        style={styles.map}
        showUserLocation
        onMapPress={handleMapPress}
        markers={
          selectedLocation
            ? [
                {
                  id: 'selected',
                  coordinate: selectedLocation.coordinate,
                  title: selectedLocation.address,
                  type: locationType === 'pickup' ? 'pickup' : 'dropoff',
                  icon:
                    locationType === 'pickup' ? (
                      <PickupMarker
                        coordinate={selectedLocation.coordinate}
                        address={selectedLocation.address}
                      />
                    ) : (
                      <DropoffMarker
                        coordinate={selectedLocation.coordinate}
                        address={selectedLocation.address}
                      />
                    ),
                },
              ]
            : userLocation
            ? [
                {
                  id: 'user',
                  coordinate: {
                    latitude: userLocation.latitude,
                    longitude: userLocation.longitude,
                  },
                  title: 'Your location',
                  type: 'user',
                  icon: (
                    <UserMarker
                      coordinate={{
                        latitude: userLocation.latitude,
                        longitude: userLocation.longitude,
                      }}
                    />
                  ),
                },
              ]
            : []
        }
      />

      {/* Current Location Button */}
      <TouchableOpacity
        style={styles.currentLocationButton}
        onPress={handleUseCurrentLocation}
        disabled={!userLocation || addressLoading}
      >
        <Navigation
          size={24}
          color={userLocation ? colors.primary : colors.text.tertiary}
        />
      </TouchableOpacity>

      {/* Bottom Sheet */}
      <BottomSheet
        ref={bottomSheetRef}
        index={1}
        snapPoints={['25%', '50%', '90%']}
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
          {/* Selected Location Display */}
          {selectedLocation && (
            <>
              <View style={styles.selectedLocationContainer}>
                <View style={styles.selectedLocationHeader}>
                  <MapPin
                    size={20}
                    color={getMarkerColor()}
                    style={styles.selectedLocationIcon}
                  />
                  <Text style={styles.selectedLocationTitle}>
                    Selected {locationType === 'pickup' ? 'Pickup' : 'Dropoff'}
                  </Text>
                </View>
                <Text style={styles.selectedLocationAddress}>
                  {selectedLocation.address}
                </Text>
              </View>

              <Button
                title="Confirm Location"
                onPress={handleConfirm}
                variant="primary"
                size="large"
                fullWidth
                loading={confirmLoading}
                disabled={confirmLoading}
              />

              <View style={styles.divider} />
            </>
          )}

          {/* Category Filter */}
          <LocationCategoryFilter
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />

          {/* Popular Locations List */}
          <Text style={styles.sectionTitle}>
            {selectedCategory === 'all'
              ? 'Popular Locations'
              : `${selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)} Locations`}
          </Text>

          <View style={styles.locationsContainer}>
            <PopularLocations
              onLocationSelect={handleLocationSelect}
              selectedLocationId={undefined}
              filterCategory={selectedCategory !== 'all' ? selectedCategory : undefined}
              enableGoogleSearch={true}
            />
          </View>
        </BottomSheetScrollView>
      </BottomSheet>

      {/* Outside Campus Warning Modal */}
      <OutsideCampusModal
        visible={showWarning}
        onClose={() => setShowWarning(false)}
        onConfirm={handleOutsideCampusConfirm}
        locationType={locationType}
      />

      {/* Loading Overlay */}
      {(locationLoading || addressLoading) && (
        <LoadingSpinner
          fullScreen
          message={addressLoading ? 'Getting address...' : 'Getting your location...'}
        />
      )}
    </View>
  );
}