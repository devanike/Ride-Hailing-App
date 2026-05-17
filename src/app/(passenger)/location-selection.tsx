import { Button } from "@/components/common/Button";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { DropoffMarker } from "@/components/map/DropoffMarker";
import { MapComponent, MapComponentRef } from "@/components/map/MapComponent";
import { PickupMarker } from "@/components/map/PickupMarker";
import { POPULAR_LOCATIONS } from "@/data/popularLocations";
import { useLocation } from "@/hooks/useLocation";
import { useTheme } from "@/hooks/useTheme";
import { db } from "@/services/firebaseConfig";
import {
  calculateDistance,
  getAddressFromCoordinates,
} from "@/services/locationService";
import { Collections } from "@/types/database";
import { VehicleType } from "@/types/driver";
import { PopularLocation } from "@/types/locations";
import { Coordinates } from "@/types/map";
import { VALIDATION } from "@/utils/constants";
import { showError, showSuccess } from "@/utils/toast";
import { router, useFocusEffect } from "expo-router";
import { collection, getDocs } from "firebase/firestore";
import { ArrowLeft, ArrowUpDown, Navigation } from "lucide-react-native";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
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

type SelectionMode = "pickup" | "destination" | null;

export default function LocationSelectionScreen(): React.JSX.Element {
  const { colors, spacing, typography, borderRadius, shadows } = useTheme();
  const mapRef = useRef<MapComponentRef>(null);

  const { location: userLocation, loading: locationLoading } =
    useLocation(true);

  const [pickup, setPickup] = useState<SelectedLocation | null>(null);
  const [destination, setDestination] = useState<SelectedLocation | null>(null);
  const [selectionMode, setSelectionMode] = useState<SelectionMode>(null);
  const [proposedFare, setProposedFare] = useState("");
  const [selectedVehicleType, setSelectedVehicleType] =
    useState<VehicleType | null>(null);
  const [passengerCount, setPassengerCount] = useState(1);
  const [addressLoading, setAddressLoading] = useState(false);
  const pickupPrefilled = useRef(false);
  const [checking, setChecking] = useState(false);

  // Use current location as pickup
  const handleUseCurrentLocation = useCallback(async () => {
    if (!userLocation) {
      showError("Location unavailable", "Please enable location services");
      return;
    }

    try {
      setAddressLoading(true);
      const result = await getAddressFromCoordinates(
        userLocation.latitude,
        userLocation.longitude,
      );

      let address = "Current location";
      if (result?.formattedAddress && result.formattedAddress.length > 5) {
        address = result.formattedAddress;
      }

      setPickup({
        coordinate: {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
        },
        address,
      });
      setSelectionMode(null);
      showSuccess("Pickup set", "Using your current location");
    } catch {
      setPickup({
        coordinate: {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
        },
        address: "Current location",
      });
    } finally {
      setAddressLoading(false);
    }
  }, [userLocation]);

  useFocusEffect(
    useCallback(() => {
      setPickup(null);
      setDestination(null);
      setSelectionMode(null);
      setProposedFare("");
      setSelectedVehicleType(null);
      setPassengerCount(1);
      pickupPrefilled.current = false;
    }, []),
  );

  // Auto-fill pickup with current location on mount
  useEffect(() => {
    if (userLocation && !pickupPrefilled.current) {
      pickupPrefilled.current = true;
      handleUseCurrentLocation();
    }
  }, [userLocation, handleUseCurrentLocation]);

  // Fit map when both locations are set
  useEffect(() => {
    if (pickup && destination) {
      mapRef.current?.fitToCoordinates(
        [pickup.coordinate, destination.coordinate],
        { top: 100, right: 60, bottom: 200, left: 60 },
      );
    } else if (pickup) {
      mapRef.current?.animateToRegion(
        { ...pickup.coordinate, latitudeDelta: 0.01, longitudeDelta: 0.01 },
        300,
      );
    } else if (destination) {
      mapRef.current?.animateToRegion(
        {
          ...destination.coordinate,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        300,
      );
    }
  }, [pickup, destination]);

  // Handle map tap to select location
  const handleMapPress = useCallback(
    async (coordinate: Coordinates) => {
      if (!selectionMode) {
        showError(
          "Tap a field first",
          "Tap on Pickup or Destination field, then tap the map",
        );
        return;
      }

      try {
        setAddressLoading(true);
        const result = await getAddressFromCoordinates(
          coordinate.latitude,
          coordinate.longitude,
        );

        // Build a meaningful address, falling back to coordinates
        let address = "Selected location";
        if (result?.formattedAddress && result.formattedAddress.length > 5) {
          address = result.formattedAddress;
        } else {
          address = `Location (${coordinate.latitude.toFixed(4)}, ${coordinate.longitude.toFixed(4)})`;
        }

        if (selectionMode === "pickup") {
          setPickup({ coordinate, address });
          showSuccess("Pickup set", address);
        } else {
          setDestination({ coordinate, address });
          showSuccess("Destination set", address);
        }
        setSelectionMode(null);
      } catch {
        const address = `Location (${coordinate.latitude.toFixed(4)}, ${coordinate.longitude.toFixed(4)})`;
        if (selectionMode === "pickup") {
          setPickup({ coordinate, address });
        } else {
          setDestination({ coordinate, address });
        }
        setSelectionMode(null);
      } finally {
        setAddressLoading(false);
      }
    },
    [selectionMode],
  );

  // Handle popular location select
  const handlePopularSelect = useCallback(
    (location: PopularLocation) => {
      const target = selectionMode || "destination";
      const selectedLoc: SelectedLocation = {
        coordinate: location.coordinate,
        address: location.description || location.name,
      };

      if (target === "pickup") {
        setPickup(selectedLoc);
        showSuccess("Pickup set", selectedLoc.address);
      } else {
        setDestination(selectedLoc);
        showSuccess("Destination set", selectedLoc.address);
      }
      setSelectionMode(null);
    },
    [selectionMode],
  );

  // Swap pickup and destination
  const handleSwap = useCallback(() => {
    const temp = pickup;
    setPickup(destination);
    setDestination(temp);
  }, [pickup, destination]);

  // Fare validation
  const fareValue = parseFloat(proposedFare);
  const fareError: string | null =
    proposedFare.trim() === ""
      ? null
      : isNaN(fareValue) || fareValue < VALIDATION.minFare
        ? `Minimum fare is ₦${VALIDATION.minFare.toLocaleString()}`
        : fareValue > VALIDATION.maxFare
          ? `Maximum fare is ₦${VALIDATION.maxFare.toLocaleString()}`
          : null;

  const canConfirm =
    pickup !== null &&
    destination !== null &&
    proposedFare.trim() !== "" &&
    fareError === null;

  // Confirm and navigate
  const handleConfirm = useCallback(async () => {
    if (!pickup || !destination) {
      showError("Incomplete", "Please select both pickup and destination");
      return;
    }

    const value = parseFloat(proposedFare);
    if (
      isNaN(value) ||
      value < VALIDATION.minFare ||
      value > VALIDATION.maxFare
    ) {
      showError("Invalid Fare", "Please enter a valid fare amount");
      return;
    }

    const goToOffers = (fare: number, vehicle: VehicleType | null) => {
      if (!pickup || !destination) return;
      router.push({
        pathname: "/(passenger)/driver-offers",
        params: {
          pickupAddress: pickup.address,
          pickupLat: pickup.coordinate.latitude.toString(),
          pickupLng: pickup.coordinate.longitude.toString(),
          destinationAddress: destination.address,
          destinationLat: destination.coordinate.latitude.toString(),
          destinationLng: destination.coordinate.longitude.toString(),
          proposedFare: fare.toString(),
          vehicleType: vehicle ?? "",
          passengerCount: passengerCount.toString(),
        },
      });
    };

    setChecking(true);
    try {
      const driversSnap = await getDocs(
        collection(db, Collections.DRIVER_LOCATIONS),
      );

      let nearbyDrivers = 0;
      let matchingVehicle = 0;
      const NEARBY_RADIUS_KM = 5;

      const driverDocsSnap = await getDocs(collection(db, Collections.DRIVERS));
      const driverVehicleMap: Record<string, string> = {};
      driverDocsSnap.forEach((d) => {
        const data = d.data();
        if (data.vehicleType) {
          driverVehicleMap[d.id] = data.vehicleType;
        }
      });

      driversSnap.forEach((d) => {
        const data = d.data();
        if (data.isOnline !== true) return;

        const dist = calculateDistance(
          {
            latitude: pickup.coordinate.latitude,
            longitude: pickup.coordinate.longitude,
          },
          { latitude: data.latitude, longitude: data.longitude },
        );

        if (dist <= NEARBY_RADIUS_KM) {
          nearbyDrivers++;

          if (selectedVehicleType) {
            const driverType = driverVehicleMap[d.id];
            if (driverType === selectedVehicleType) {
              matchingVehicle++;
            }
          } else {
            matchingVehicle++;
          }
        }
      });

      setChecking(false);

      if (nearbyDrivers === 0) {
        Alert.alert(
          "No Drivers Nearby",
          "There are no online drivers within 5km of your pickup location. Would you like to proceed anyway and wait?",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Wait Anyway",
              onPress: () => goToOffers(value, selectedVehicleType),
            },
          ],
        );
        return;
      }

      if (selectedVehicleType && matchingVehicle === 0) {
        Alert.alert(
          "No Matching Vehicles",
          `There are ${nearbyDrivers} driver${nearbyDrivers > 1 ? "s" : ""} nearby, but none with a ${selectedVehicleType}. Would you like to remove the vehicle filter?`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Remove Filter",
              onPress: () => {
                setSelectedVehicleType(null);
                goToOffers(value, null);
              },
            },
            {
              text: "Wait Anyway",
              onPress: () => goToOffers(value, selectedVehicleType),
            },
          ],
        );
        return;
      }

      goToOffers(value, selectedVehicleType);
    } catch (err) {
      console.error("Driver check error:", err);
      setChecking(false);
      goToOffers(value, selectedVehicleType);
    }
  }, [pickup, destination, proposedFare, selectedVehicleType, passengerCount]);

  // Map markers
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

  // Route line
  const routeCoordinates = useMemo((): Coordinates[] => {
    if (pickup && destination) {
      return [pickup.coordinate, destination.coordinate];
    }
    return [];
  }, [pickup, destination]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
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
    mapContainer: {
      height: 280,
      marginHorizontal: spacing.screenPadding,
      marginTop: spacing.md,
      borderRadius: borderRadius.lg,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: colors.border,
    },
    mapHint: {
      position: "absolute",
      top: spacing.sm,
      left: spacing.sm,
      right: spacing.sm,
      backgroundColor: colors.primary,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.md,
      zIndex: 10,
    },
    mapHintText: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.textInverse,
      textAlign: "center",
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
    dot: {
      width: 12,
      height: 12,
      borderRadius: 6,
    },
    dotPickup: {
      backgroundColor: colors.success,
    },
    dotDest: {
      backgroundColor: colors.error,
    },
    inputWrapper: {
      flex: 1,
    },
    inputTouchable: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.backgroundAlt,
      borderRadius: borderRadius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderWidth: 2,
      borderColor: "transparent",
    },
    inputTouchableActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + "10",
    },
    inputText: {
      flex: 1,
      fontSize: typography.sizes.base,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.textPrimary,
    },
    inputPlaceholder: {
      color: colors.textMuted,
    },
    currentLocationBtn: {
      padding: spacing.xs,
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
    section: {
      marginHorizontal: spacing.screenPadding,
      marginTop: spacing.md,
    },
    sectionLabel: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.textPrimary,
      marginBottom: spacing.sm,
    },
    popularGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
    },
    popularChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: borderRadius.full,
      borderWidth: 1,
      borderColor: colors.border,
    },
    popularChipText: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.textPrimary,
    },
    optionsRow: {
      flexDirection: "row",
      gap: spacing.sm,
    },
    optionCard: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.xs,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.md,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    optionCardActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + "14",
    },
    optionText: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.textSecondary,
    },
    optionTextActive: {
      color: colors.primary,
    },
    stepperRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.border,
      alignSelf: "flex-start",
    },
    stepperButton: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    stepperButtonDisabled: {
      opacity: 0.35,
    },
    stepperButtonText: {
      fontSize: typography.sizes["2xl"],
      fontFamily: typography.fonts.bodyMedium,
      color: colors.primary,
    },
    stepperCount: {
      minWidth: 40,
      textAlign: "center",
      fontSize: typography.sizes.lg,
      fontFamily: typography.fonts.headingSemiBold,
      color: colors.textPrimary,
    },
    fareInputRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: fareError ? colors.error : colors.border,
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
    fareError: {
      fontSize: typography.sizes.xs,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.error,
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
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar barStyle="dark-content" />

      <SafeAreaView style={{ backgroundColor: colors.surface }} edges={["top"]}>
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
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
      >
        {/* Interactive Map */}
        <View style={styles.mapContainer}>
          {selectionMode && (
            <View style={styles.mapHint}>
              <Text style={styles.mapHintText}>
                Tap on the map to set {selectionMode}
              </Text>
            </View>
          )}
          <MapComponent
            ref={mapRef}
            style={{ flex: 1 }}
            markers={mapMarkers}
            routeCoordinates={routeCoordinates}
            showUserLocation
            showsMyLocationButton={false}
            onMapPress={handleMapPress}
          />
        </View>

        {/* Location Inputs */}
        <View style={styles.inputsCard}>
          {/* Pickup */}
          <View style={styles.inputRow}>
            <View style={[styles.dot, styles.dotPickup]} />
            <View style={styles.inputWrapper}>
              <TouchableOpacity
                style={[
                  styles.inputTouchable,
                  selectionMode === "pickup" && styles.inputTouchableActive,
                ]}
                onPress={() =>
                  setSelectionMode(selectionMode === "pickup" ? null : "pickup")
                }
                activeOpacity={0.7}
              >
                <Text
                  style={[styles.inputText, !pickup && styles.inputPlaceholder]}
                  numberOfLines={1}
                >
                  {pickup?.address ?? "Tap to set pickup"}
                </Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.currentLocationBtn}
              onPress={handleUseCurrentLocation}
              activeOpacity={0.7}
            >
              <Navigation size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Divider + Swap */}
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

          {/* Destination */}
          <View style={styles.inputRow}>
            <View style={[styles.dot, styles.dotDest]} />
            <View style={styles.inputWrapper}>
              <TouchableOpacity
                style={[
                  styles.inputTouchable,
                  selectionMode === "destination" &&
                    styles.inputTouchableActive,
                ]}
                onPress={() =>
                  setSelectionMode(
                    selectionMode === "destination" ? null : "destination",
                  )
                }
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.inputText,
                    !destination && styles.inputPlaceholder,
                  ]}
                  numberOfLines={1}
                >
                  {destination?.address ?? "Tap to set destination"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Quick Picks (Popular Locations) */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Quick picks</Text>
          <View style={styles.popularGrid}>
            {POPULAR_LOCATIONS.slice(0, 8).map((loc) => (
              <TouchableOpacity
                key={loc.id}
                style={styles.popularChip}
                onPress={() => handlePopularSelect(loc)}
                activeOpacity={0.7}
              >
                <Text style={styles.popularChipText}>
                  {loc.shortName || loc.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Vehicle Type */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Vehicle type (optional)</Text>
          <View style={styles.optionsRow}>
            {(["car", "tricycle", "bus"] as VehicleType[]).map((type) => {
              const labels: Record<VehicleType, string> = {
                car: "Car",
                tricycle: "Tricycle",
                bus: "Bus",
              };
              const active = selectedVehicleType === type;
              return (
                <TouchableOpacity
                  key={type}
                  style={[styles.optionCard, active && styles.optionCardActive]}
                  onPress={() => setSelectedVehicleType(active ? null : type)}
                  activeOpacity={0.7}
                >
                  {/* <Car
                    size={16}
                    color={active ? colors.primary : colors.textSecondary}
                  /> */}
                  <Text
                    style={[
                      styles.optionText,
                      active && styles.optionTextActive,
                    ]}
                  >
                    {labels[type]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Passengers */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Passengers</Text>
          <View style={styles.stepperRow}>
            <TouchableOpacity
              style={[
                styles.stepperButton,
                passengerCount <= 1 && styles.stepperButtonDisabled,
              ]}
              onPress={() => setPassengerCount((c) => Math.max(1, c - 1))}
              disabled={passengerCount <= 1}
              activeOpacity={0.7}
            >
              <Text style={styles.stepperButtonText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.stepperCount}>{passengerCount}</Text>
            <TouchableOpacity
              style={[
                styles.stepperButton,
                passengerCount >= 7 && styles.stepperButtonDisabled,
              ]}
              onPress={() => setPassengerCount((c) => Math.min(7, c + 1))}
              disabled={passengerCount >= 7}
              activeOpacity={0.7}
            >
              <Text style={styles.stepperButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Fare */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Your fare offer (NGN)</Text>
          <View style={styles.fareInputRow}>
            <Text style={styles.currencyLabel}>₦</Text>
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
          {fareError && <Text style={styles.fareError}>{fareError}</Text>}
        </View>

        {/* Confirm */}
        <View style={styles.confirmSection}>
          <Button
            title={checking ? "Checking availability..." : "Find Drivers"}
            onPress={handleConfirm}
            variant="primary"
            size="large"
            fullWidth
            disabled={!canConfirm || checking}
            loading={checking}
          />
        </View>
      </ScrollView>

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
