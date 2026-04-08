import { Button } from "@/components/common/Button";
import { PINPad } from "@/components/common/PinPad";
import { useTheme } from "@/hooks/useTheme";
import {
  disableBiometric,
  enableBiometric,
  getBiometricCapability,
  getDeviceInfo,
  isBiometricEnabled,
  updatePIN,
} from "@/services/securityService";
import { BiometricCapability } from "@/types/security";
import { showError, showSuccess } from "@/utils/toast";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { ArrowLeft, Monitor, Smartphone } from "lucide-react-native";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const PIN_LAST_CHANGED_KEY = "pin_last_changed";
const KNOWN_DEVICES_KEY = "known_devices";

type PinStep = "current" | "new" | "confirm";

interface DeviceRow {
  deviceId: string;
  deviceName: string;
  deviceType: "android" | "ios";
  isCurrent: boolean;
}

export default function SecuritySettingsScreen(): React.JSX.Element {
  const { colors, spacing, typography, borderRadius, shadows } = useTheme();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["70%", "90%"], []);

  const [pinLastChanged, setPinLastChanged] = useState<string | null>(null);
  const [biometricCapability, setBiometricCapability] =
    useState<BiometricCapability>({ available: false, type: "none" });
  const [biometricOn, setBiometricOn] = useState(false);
  const [biometricToggling, setBiometricToggling] = useState(false);
  const [devices, setDevices] = useState<DeviceRow[]>([]);

  // PIN change sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pinStep, setPinStep] = useState<PinStep>("current");
  const [newPinTemp, setNewPinTemp] = useState("");
  const [pinError, setPinError] = useState(false);
  const [pinLoading, setPinLoading] = useState(false);
  const [pinKey, setPinKey] = useState(0);

  // Load security data on mount
  useEffect(() => {
    const load = async () => {
      const [lastChanged, capability, bioEnabled, currentDevice, devicesJson] =
        await Promise.all([
          AsyncStorage.getItem(PIN_LAST_CHANGED_KEY),
          getBiometricCapability(),
          isBiometricEnabled(),
          getDeviceInfo(),
          AsyncStorage.getItem(KNOWN_DEVICES_KEY),
        ]);

      setPinLastChanged(lastChanged);
      setBiometricCapability(capability);
      setBiometricOn(bioEnabled);

      const knownIds: string[] = devicesJson ? JSON.parse(devicesJson) : [];
      const rows: DeviceRow[] = knownIds.map((id) => ({
        deviceId: id,
        deviceName:
          id === currentDevice.deviceId
            ? currentDevice.deviceName
            : "Unknown Device",
        deviceType: currentDevice.deviceType,
        isCurrent: id === currentDevice.deviceId,
      }));
      // Ensure current device is always listed even if not in knownDevices yet
      if (!knownIds.includes(currentDevice.deviceId)) {
        rows.unshift({
          deviceId: currentDevice.deviceId,
          deviceName: currentDevice.deviceName,
          deviceType: currentDevice.deviceType,
          isCurrent: true,
        });
      }
      setDevices(rows);
    };
    load();
  }, []);

  const openChangePIN = useCallback(() => {
    setPinStep("current");
    setNewPinTemp("");
    setPinError(false);
    setPinKey((k) => k + 1);
    setSheetOpen(true);
    bottomSheetRef.current?.expand();
  }, []);

  const handleSheetPinComplete = useCallback(
    async (pin: string) => {
      if (pinStep === "current") {
        // We verify by attempting updatePIN with a dummy new pin — instead
        // just advance; actual verification happens in step 3 via updatePIN()
        setPinStep("new");
        setPinKey((k) => k + 1);
        setPinError(false);
        // Store current pin temporarily to use in updatePIN
        setNewPinTemp(pin); // reuse state to store current pin first
        return;
      }

      if (pinStep === "new") {
        setPinStep("confirm");
        setPinKey((k) => k + 1);
        setPinError(false);
        // newPinTemp currently holds the current pin; store new pin differently
        // We'll use a two-stage approach with a ref below
        setNewPinTemp((prev) => `${prev}|${pin}`);
        return;
      }

      // Step: confirm
      const parts = newPinTemp.split("|");
      const currentPin = parts[0];
      const newPin = parts[1];

      if (pin !== newPin) {
        setPinError(true);
        showError("Mismatch", "PINs do not match. Please try again.");
        setTimeout(() => {
          setPinError(false);
          setPinStep("current");
          setNewPinTemp("");
          setPinKey((k) => k + 1);
        }, 800);
        return;
      }

      setPinLoading(true);
      try {
        await updatePIN(currentPin, newPin);
        showSuccess("PIN Changed", "Your PIN has been updated successfully.");
        setSheetOpen(false);
        bottomSheetRef.current?.close();
        // Refresh last changed date
        const updated = await AsyncStorage.getItem(PIN_LAST_CHANGED_KEY);
        setPinLastChanged(updated);
      } catch (err: any) {
        setPinError(true);
        showError(
          "Failed",
          err.message ?? "Incorrect current PIN or error updating.",
        );
        setTimeout(() => {
          setPinError(false);
          setPinStep("current");
          setNewPinTemp("");
          setPinKey((k) => k + 1);
        }, 800);
      } finally {
        setPinLoading(false);
      }
    },
    [pinStep, newPinTemp],
  );

  const handleBiometricToggle = useCallback(async (value: boolean) => {
    setBiometricToggling(true);
    try {
      if (value) {
        await enableBiometric();
        setBiometricOn(true);
      } else {
        await disableBiometric();
        setBiometricOn(false);
      }
    } catch (err: any) {
      showError("Error", err.message ?? "Could not update biometric setting.");
    } finally {
      setBiometricToggling(false);
    }
  }, []);

  const handleRemoveDevice = useCallback(
    (deviceId: string, deviceName: string) => {
      Alert.alert(
        "Remove Device",
        `Remove this device? They will need to verify via OTP next time they log in.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove",
            style: "destructive",
            onPress: async () => {
              try {
                const devicesJson =
                  await AsyncStorage.getItem(KNOWN_DEVICES_KEY);
                const knownIds: string[] = devicesJson
                  ? JSON.parse(devicesJson)
                  : [];
                const updated = knownIds.filter((id) => id !== deviceId);
                await AsyncStorage.setItem(
                  KNOWN_DEVICES_KEY,
                  JSON.stringify(updated),
                );
                setDevices((prev) =>
                  prev.filter((d) => d.deviceId !== deviceId),
                );
                showSuccess("Removed", `${deviceName} has been removed.`);
              } catch {
                showError("Error", "Could not remove device.");
              }
            },
          },
        ],
      );
    },
    [],
  );

  const pinLastChangedStr = pinLastChanged
    ? new Date(pinLastChanged).toLocaleDateString("en-NG", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Never";

  const pinStepTitle: Record<PinStep, string> = {
    current: "Enter current PIN",
    new: "Enter new PIN",
    confirm: "Confirm new PIN",
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.backgroundAlt },
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
    card: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.small,
    },
    cardTitle: {
      fontSize: typography.sizes.base,
      fontFamily: typography.fonts.headingSemiBold,
      color: colors.textPrimary,
      marginBottom: spacing.md,
    },
    pinRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    pinMeta: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.textMuted,
      marginBottom: spacing.md,
    },
    bioRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    bioLabel: {
      fontSize: typography.sizes.base,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.textPrimary,
    },
    bioUnavailable: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.textMuted,
      marginTop: spacing.xs,
    },
    deviceRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    deviceRowLast: { borderBottomWidth: 0 },
    deviceInfo: { flex: 1 },
    deviceName: {
      fontSize: typography.sizes.base,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.textPrimary,
    },
    deviceSub: {
      fontSize: typography.sizes.xs,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.textMuted,
      marginTop: 2,
    },
    thisDeviceBadge: {
      backgroundColor: colors.infoBackground,
      borderRadius: borderRadius.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      marginLeft: spacing.sm,
    },
    thisDeviceBadgeText: {
      fontSize: typography.sizes.xs,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.info,
    },
    removeButton: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      marginLeft: spacing.sm,
    },
    removeText: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.error,
    },
    sheetContent: {
      flex: 1,
      paddingHorizontal: spacing.screenPadding,
      paddingBottom: spacing.xl,
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Security Settings</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* PIN card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>PIN</Text>
          <Text style={styles.pinMeta}>Last changed: {pinLastChangedStr}</Text>
          <View style={styles.pinRow}>
            <Button
              title="Change PIN"
              onPress={openChangePIN}
              variant="outline"
              size="small"
            />
          </View>
        </View>

        {/* Biometric card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Biometric Login</Text>
          {biometricCapability.available ? (
            <View style={styles.bioRow}>
              <Text style={styles.bioLabel}>
                {biometricCapability.type === "fingerprint"
                  ? "Fingerprint"
                  : "Biometric"}
              </Text>
              <Switch
                value={biometricOn}
                onValueChange={handleBiometricToggle}
                disabled={biometricToggling}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.surface}
              />
            </View>
          ) : (
            <Text style={styles.bioUnavailable}>
              Not available on this device
            </Text>
          )}
        </View>

        {/* Devices card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Devices</Text>
          {devices.length === 0 ? (
            <Text style={styles.deviceSub}>No linked devices found.</Text>
          ) : (
            devices.map((device, idx) => (
              <View
                key={device.deviceId}
                style={[
                  styles.deviceRow,
                  idx === devices.length - 1 && styles.deviceRowLast,
                ]}
              >
                {device.deviceType === "ios" ? (
                  <Smartphone size={20} color={colors.textMuted} />
                ) : (
                  <Monitor size={20} color={colors.textMuted} />
                )}
                <View style={[styles.deviceInfo, { marginLeft: spacing.sm }]}>
                  <Text style={styles.deviceName}>{device.deviceName}</Text>
                </View>
                {device.isCurrent ? (
                  <View style={styles.thisDeviceBadge}>
                    <Text style={styles.thisDeviceBadgeText}>This device</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() =>
                      handleRemoveDevice(device.deviceId, device.deviceName)
                    }
                    activeOpacity={0.7}
                  >
                    <Text style={styles.removeText}>Remove</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Change PIN Bottom Sheet */}
      {sheetOpen && (
        <BottomSheet
          ref={bottomSheetRef}
          snapPoints={snapPoints}
          index={0}
          backgroundStyle={{ backgroundColor: colors.surface }}
          handleIndicatorStyle={{ backgroundColor: colors.border }}
          enablePanDownToClose
          onClose={() => setSheetOpen(false)}
        >
          <BottomSheetView style={styles.sheetContent}>
            <PINPad
              key={pinKey}
              length={6}
              title={pinStepTitle[pinStep]}
              onComplete={handleSheetPinComplete}
              error={pinError}
              loading={pinLoading}
              showBiometric={false}
              disabled={pinLoading}
            />
          </BottomSheetView>
        </BottomSheet>
      )}
    </SafeAreaView>
  );
}
