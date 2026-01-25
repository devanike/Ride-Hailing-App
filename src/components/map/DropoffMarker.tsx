import { useTheme } from '@/hooks/useTheme';
import { Coordinates } from '@/types/map';
import { MapPin } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Marker } from 'react-native-maps';

/**
 * Dropoff Location Marker
 * Red marker indicating ride destination
 */
interface DropoffMarkerProps {
  coordinate: Coordinates;
  address?: string;
  onPress?: () => void;
}

export const DropoffMarker: React.FC<DropoffMarkerProps> = ({
  coordinate,
  address,
  onPress,
}) => {
  const { colors, spacing, borderRadius, typography, shadows } = useTheme();

  const styles = StyleSheet.create({
    container: {
      alignItems: 'center',
    },
    iconContainer: {
      width: 36,
      height: 36,
      borderRadius: borderRadius.full,
      backgroundColor: colors.status.error,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      borderColor: colors.surface.light,
      ...shadows.medium,
    },
    labelContainer: {
      backgroundColor: colors.surface.light,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.sm,
      marginTop: spacing.xs,
      ...shadows.small,
    },
    label: {
      fontSize: typography.sizes.xs,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.text.primary,
    },
  });

  return (
    <Marker coordinate={coordinate} onPress={onPress}>
      <View style={styles.container}>
        <View style={styles.iconContainer}>
          <MapPin size={18} color={colors.text.inverse} />
        </View>
        {address && (
          <View style={styles.labelContainer}>
            <Text style={styles.label} numberOfLines={1}>
              Dropoff
            </Text>
          </View>
        )}
      </View>
    </Marker>
  );
};

export default DropoffMarker;