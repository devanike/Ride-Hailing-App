import { useTheme } from '@/hooks/useTheme';
import { Coordinates } from '@/types/map';
import { Car } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Marker } from 'react-native-maps';

/**
 * Driver Marker Component
 * Displays driver location on map with online status
 */
interface DriverMarkerProps {
  coordinate: Coordinates;
  driverId: string;
  driverName?: string;
  isOnline?: boolean;
  onPress?: () => void;
}

export const DriverMarker: React.FC<DriverMarkerProps> = ({
  coordinate,
  driverId,
  driverName,
  isOnline = true,
  onPress,
}) => {
  const { colors, borderRadius, shadows } = useTheme();

  const styles = StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: borderRadius.full,
      backgroundColor: isOnline ? colors.primary : colors.text.tertiary,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      borderColor: colors.surface.light,
      ...shadows.medium,
    },
  });

  return (
    <Marker
      coordinate={coordinate}
      identifier={driverId}
      title={driverName}
      onPress={onPress}
    >
      <View style={styles.container}>
        <View style={styles.iconContainer}>
          <Car size={20} color={colors.text.inverse} />
        </View>
      </View>
    </Marker>
  );
};

export default DriverMarker;