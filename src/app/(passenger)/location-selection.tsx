import { Button } from "@/components/common/Button";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { LocationCategoryFilter } from "@/components/common/LocationCategoryFilter";
import { OutsideCampusModal } from "@/components/common/OutsideCampusModal";
import { PopularLocations } from "@/components/common/PopularLocations";
import { DropoffMarker } from "@/components/map/DropoffMarker";
import { LocationSearch } from "@/components/map/LocationSearch";
import { MapComponent, MapComponentRef } from "@/components/map/MapComponent";
import { PickupMarker } from "@/components/map/PickupMarker";
import { useCampusBoundary } from "@/hooks/useCampusBoundary";
import { useLocation } from "@/hooks/useLocation";
import { useTheme } from "@/hooks/useTheme";
import { getAddressFromCoordinates } from "@/services/locationService";
import { LocationCategoryValue, PopularLocation } from "@/types/locations";
import { Coordinates } from "@/types/map";
import { PlaceDetails } from "@/types/places";
import { showError } from "@/utils/toast";
import { router } from "expo-router";
import { ArrowLeft, ArrowUpDown } from "lucide-react-native";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface SelectedLocation {
  coordinate: Coordinates;
  address: string;
}

export default function LocationSelectionScreen(): React.JSX.Element {
  const { colors, spacing, typography, borderRadius, shadows } = useTheme();
  const mapRef = useRef<MapComponentRef>(null);

  const { location: userLocation, loading: locationLoading } =
    useLocation(true);
  const pickupBoundary = useCampusBoundary();
  const destBoundary = useCampusBoundary();

  const [pickup, setPickup] = useState<SelectedLocation | null>(null);
  const [destination, setDestination] = useState<SelectedLocation | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<
    LocationCategoryValue | "all"
  >("all");
  const [proposedFare, setProposedFare] = useState("");
  const [outsideModal, setOutsideModal] = useState(false);
  const [addressLoading, setAddressLoading] = useState(false);

  // Ref flag so the pre-fill effect runs only once without needing
  // `pickup` as a dependency
  const pickupPrefilled = useRef(false);

  useEffect(() => {
    if (userLocation && !pickupPrefilled.current) {
      pickupPrefilled.current = true;
      (async () => {
        try {
          setAddressLoading(true);
          const result = await getAddressFromCoordinates(
            userLocation.latitude,
            userLocation.longitude,
          );
          setPickup({
            coordinate: {
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
            },
            address: result?.formattedAddress ?? "Current location",
          });
        } catch {
          // silent — user can search manually
        } finally {
          setAddressLoading(false);
        }
      })();
    }
  }, [userLocation]);

  // Fit map whenever both locations are available
  useEffect(() => {
    if (pickup && destination) {
      mapRef.current?.fitToCoordinates(
        [pickup.coordinate, destination.coordinate],
        { top: 60, right: 40, bottom: 60, left: 40 },
      );
    } else if (pickup) {
      mapRef.current?.animateToRegion(
        { ...pickup.coordinate, latitudeDelta: 0.015, longitudeDelta: 0.015 },
        300,
      );
    }
  }, [pickup, destination]);

  const handlePickupSelect = useCallback(
    (location: PopularLocation | PlaceDetails): void => {
      const coordinate = location.coordinate;
      const address =
        "shortName" in location ? location.name : location.formattedAddress;

      if (!pickupBoundary.checkLocation(coordinate)) {
        setOutsideModal(true);
        return;
      }
      setPickup({ coordinate, address });
    },
    [pickupBoundary],
  );

  const handleDestinationSelect = useCallback(
    (location: PopularLocation | PlaceDetails): void => {
      const coordinate = location.coordinate;
      const address =
        "shortName" in location ? location.name : location.formattedAddress;

      if (!destBoundary.checkLocation(coordinate)) {
        setOutsideModal(true);
        return;
      }
      setDestination({ coordinate, address });
    },
    [destBoundary],
  );

  const handleSwap = useCallback((): void => {
    setPickup(destination);
    setDestination(pickup);
  }, [pickup, destination]);

  const canConfirm =
    pickup !== null &&
    destination !== null &&
    proposedFare.trim() !== "" &&
    parseFloat(proposedFare) > 0;

  const handleConfirm = useCallback((): void => {
    if (!pickup || !destination) {
      showError("Incomplete", "Please select both pickup and destination");
      return;
    }

    const fareValue = parseFloat(proposedFare);
    if (isNaN(fareValue) || fareValue <= 0) {
      showError("Invalid Fare", "Please enter a valid fare amount");
      return;
    }

    router.push({
      pathname: "/(passenger)/driver-offers",
      params: {
        pickupAddress: pickup.address,
        pickupLat: pickup.coordinate.latitude.toString(),
        pickupLng: pickup.coordinate.longitude.toString(),
        destinationAddress: destination.address,
        destinationLat: destination.coordinate.latitude.toString(),
        destinationLng: destination.coordinate.longitude.toString(),
        proposedFare: fareValue.toString(),
      },
    });
  }, [pickup, destination, proposedFare]);

  const mapMarkers = useMemo(() => {
    const markers = [];
    if (pickup) {
      markers.push({
        id: "pickup",
        coordinate: pickup.coordinate,
        title: pickup.address,
        type: "pickup" as const,
        icon: (
          <PickupMarker
            coordinate={pickup.coordinate}
            address={pickup.address}
          />
        ),
      });
    }
    if (destination) {
      markers.push({
        id: "destination",
        coordinate: destination.coordinate,
        title: destination.address,
        type: "dropoff" as const,
        icon: (
          <DropoffMarker
            coordinate={destination.coordinate}
            address={destination.address}
          />
        ),
      });
    }
    return markers;
  }, [pickup, destination]);

  const routeCoordinates = useMemo((): Coordinates[] => {
    if (pickup && destination) {
      return [pickup.coordinate, destination.coordinate];
    }
    return [];
  }, [pickup, destination]);

  const styles = StyleSheet.create({
    outer: {
      flex: 1,
      backgroundColor: colors.background,
    },
    safeTop: {
      backgroundColor: colors.surface,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.screenPadding,
      paddingVertical: spacing.md,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      padding: spacing.xs,
      marginRight: spacing.sm,
    },
    headerTitle: {
      fontSize: typography.sizes.lg,
      fontFamily: typography.fonts.headingSemiBold,
      color: colors.textPrimary,
    },
    scrollContent: {
      flexGrow: 1,
    },
    inputsCard: {
      backgroundColor: colors.surface,
      marginHorizontal: spacing.screenPadding,
      marginTop: spacing.md,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.small,
    },
    inputRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    dotPickup: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: colors.success,
    },
    dotDest: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: colors.error,
    },
    searchWrapper: {
      flex: 1,
    },
    dividerRow: {
      flexDirection: "row",
      alignItems: "center",
      marginVertical: spacing.xs,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: colors.border,
    },
    swapButton: {
      marginHorizontal: spacing.sm,
      width: 32,
      height: 32,
      borderRadius: borderRadius.full,
      backgroundColor: colors.backgroundAlt,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    mapPreview: {
      marginHorizontal: spacing.screenPadding,
      marginTop: spacing.md,
      height: 180,
      borderRadius: borderRadius.lg,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: colors.border,
    },
    map: {
      flex: 1,
    },
    popularSection: {
      marginTop: spacing.md,
    },
    sectionLabel: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.7,
      marginBottom: spacing.xs,
      paddingHorizontal: spacing.screenPadding,
    },
    fareSection: {
      marginHorizontal: spacing.screenPadding,
      marginTop: spacing.md,
    },
    fareLabel: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.textPrimary,
      marginBottom: spacing.xs,
    },
    fareInputRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: spacing.md,
      height: 52,
    },
    currencyLabel: {
      fontSize: typography.sizes.base,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.textSecondary,
      marginRight: spacing.xs,
    },
    fareInput: {
      flex: 1,
      fontSize: typography.sizes.lg,
      fontFamily: typography.fonts.headingSemiBold,
      color: colors.textPrimary,
    },
    fareHint: {
      fontSize: typography.sizes.xs,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.textMuted,
      marginTop: spacing.xs,
    },
    confirmSection: {
      marginHorizontal: spacing.screenPadding,
      marginTop: spacing.lg,
      marginBottom: spacing.xl,
    },
  });

  return (
    <KeyboardAvoidingView
      style={styles.outer}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar barStyle="dark-content" />

      <SafeAreaView style={styles.safeTop} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Plan Your Ride</Text>
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Location Inputs */}
        <View style={styles.inputsCard}>
          <View style={styles.inputRow}>
            <View style={styles.dotPickup} />
            <View style={styles.searchWrapper}>
              <LocationSearch
                placeholder="Pickup location"
                initialValue={pickup?.address ?? ""}
                onLocationSelect={handlePickupSelect}
              />
            </View>
          </View>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <TouchableOpacity
              style={styles.swapButton}
              onPress={handleSwap}
              activeOpacity={0.7}
            >
              <ArrowUpDown size={16} color={colors.textSecondary} />
            </TouchableOpacity>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.inputRow}>
            <View style={styles.dotDest} />
            <View style={styles.searchWrapper}>
              <LocationSearch
                placeholder="Where to?"
                initialValue={destination?.address ?? ""}
                onLocationSelect={handleDestinationSelect}
              />
            </View>
          </View>
        </View>

        {/* Map Preview */}
        <View style={styles.mapPreview}>
          <MapComponent
            ref={mapRef}
            style={styles.map}
            markers={mapMarkers}
            routeCoordinates={routeCoordinates}
            showUserLocation={false}
            showsMyLocationButton={false}
            showsCompass={false}
            zoomEnabled={false}
            scrollEnabled={false}
            rotateEnabled={false}
          />
        </View>

        {/* Popular Locations */}
        <View style={styles.popularSection}>
          <LocationCategoryFilter
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />

          <Text style={styles.sectionLabel}>
            {selectedCategory === "all"
              ? "Popular Locations"
              : selectedCategory.charAt(0).toUpperCase() +
                selectedCategory.slice(1)}
          </Text>

          <PopularLocations
            onLocationSelect={handleDestinationSelect}
            filterCategory={
              selectedCategory !== "all" ? selectedCategory : undefined
            }
            enableGoogleSearch={false}
          />
        </View>

        {/* Proposed Fare */}
        <View style={styles.fareSection}>
          <Text style={styles.fareLabel}>Your fare offer (NGN)</Text>
          <View style={styles.fareInputRow}>
            <Text style={styles.currencyLabel}>NGN</Text>
            <TextInput
              style={styles.fareInput}
              value={proposedFare}
              onChangeText={(text) =>
                setProposedFare(text.replace(/[^0-9]/g, ""))
              }
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              returnKeyType="done"
            />
          </View>
          <Text style={styles.fareHint}>
            Drivers will see this and can counter-offer
          </Text>
        </View>

        {/* Confirm */}
        <View style={styles.confirmSection}>
          <Button
            title="Continue"
            onPress={handleConfirm}
            variant="primary"
            size="large"
            fullWidth
            disabled={!canConfirm}
          />
        </View>
      </ScrollView>

      <OutsideCampusModal
        visible={outsideModal}
        onClose={() => setOutsideModal(false)}
      />

      {(locationLoading || addressLoading) && (
        <LoadingSpinner
          fullScreen
          message={
            addressLoading ? "Getting address..." : "Getting your location..."
          }
        />
      )}
    </KeyboardAvoidingView>
  );
}
