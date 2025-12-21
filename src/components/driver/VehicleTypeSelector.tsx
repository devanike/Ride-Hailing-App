import { useTheme } from '@/hooks/useTheme';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type VehicleType = 'sedan' | 'suv' | 'tricycle' | 'minibus';

interface VehicleTypeSelectorProps {
  selectedType: VehicleType;
  onSelectType: (type: VehicleType) => void;
}

const vehicleTypes: { value: VehicleType; label: string; icon: string }[] = [
  { value: 'sedan', label: 'Sedan', icon: '🚗' },
  { value: 'suv', label: 'SUV', icon: '🚙' },
  { value: 'tricycle', label: 'Tricycle', icon: '🛺' },
  { value: 'minibus', label: 'Minibus', icon: '🚐' },
];

export const VehicleTypeSelector: React.FC<VehicleTypeSelectorProps> = ({
  selectedType,
  onSelectType,
}) => {
  const { colors, typography, spacing, borderRadius } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
      marginBottom: spacing.base,
    },
    card: {
      flex: 1,
      minWidth: '45%',
      paddingVertical: spacing.base,
      paddingHorizontal: spacing.md,
      borderRadius: borderRadius.md,
      borderWidth: 2,
      borderColor: colors.border.light,
      alignItems: 'center',
      backgroundColor: colors.surface.light,
    },
    cardActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + '10',
    },
    icon: {
      fontSize: 32,
      marginBottom: spacing.xs,
    },
    label: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.text.secondary,
    },
    labelActive: {
      color: colors.primary,
      fontFamily: typography.fonts.body,
    },
  });

  return (
    <View style={styles.container}>
      {vehicleTypes.map((type) => (
        <TouchableOpacity
          key={type.value}
          style={[styles.card, selectedType === type.value && styles.cardActive]}
          onPress={() => onSelectType(type.value)}
          activeOpacity={0.7}
        >
          <Text style={styles.icon}>{type.icon}</Text>
          <Text style={[styles.label, selectedType === type.value && styles.labelActive]}>
            {type.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};