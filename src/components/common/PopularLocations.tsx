import { POPULAR_LOCATIONS, searchLocations } from '@/data/popularLocations';
import { useTheme } from '@/hooks/useTheme';
import { LocationCategory, PopularLocation } from '@/types/locations';
import { PlaceDetails } from '@/types/places';
import * as Icons from 'lucide-react-native';
import { LucideIcon, MapPin, Search } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LocationSearchInput } from './LocationSearchInput';

interface PopularLocationsProps {
  onLocationSelect: (location: PopularLocation | PlaceDetails) => void;
  selectedLocationId?: string;
  filterCategory?: LocationCategory;
  enableGoogleSearch?: boolean; // NEW: Enable Google Places search
}

/**
 * Get Lucide icon component by name
 */
const getIconComponent = (iconName: string): LucideIcon => {
  const iconMap: Record<string, LucideIcon> = {
    'door-open': Icons.DoorOpen,
    'book-open': Icons.BookOpen,
    'flask-conical': Icons.FlaskConical,
    'palette': Icons.Palette,
    'chart-bar': Icons.BarChart3,
    'home': Icons.Home,
    'dumbbell': Icons.Dumbbell,
    'building-2': Icons.Building2,
    'hospital': Icons.Hospital,
    'cross': Icons.Cross,
    'building': Icons.Building,
  };
  
  return iconMap[iconName] || Icons.MapPin;
};

/**
 * Popular Locations Component
 * Displays list of popular campus locations with search
 */
export const PopularLocations: React.FC<PopularLocationsProps> = ({
  onLocationSelect,
  selectedLocationId,
  filterCategory,
  enableGoogleSearch = true, // Default to enabled
}) => {
  const { colors, spacing, typography, borderRadius, shadows } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [useGoogleSearch, setUseGoogleSearch] = useState(false);

  // Filter locations
  const filteredLocations = searchQuery
    ? searchLocations(searchQuery)
    : filterCategory
    ? POPULAR_LOCATIONS.filter(loc => loc.category === filterCategory)
    : POPULAR_LOCATIONS;

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    searchContainer: {
      paddingHorizontal: spacing.screenPadding,
      paddingVertical: spacing.base,
      backgroundColor: colors.background.light,
    },
    searchToggle: {
      flexDirection: 'row',
      marginBottom: spacing.sm,
      gap: spacing.sm,
    },
    toggleButton: {
      flex: 1,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.base,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.border.light,
      alignItems: 'center',
      backgroundColor: colors.surface.light,
    },
    toggleButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    toggleText: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.text.secondary,
    },
    toggleTextActive: {
      color: colors.text.inverse,
    },
    searchInput: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface.light,
      borderRadius: borderRadius.md,
      paddingHorizontal: spacing.base,
      paddingVertical: spacing.md,
      borderWidth: 1,
      borderColor: colors.border.light,
    },
    searchIcon: {
      marginRight: spacing.sm,
    },
    input: {
      flex: 1,
      fontSize: typography.sizes.base,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.text.primary,
    },
    listContainer: {
      paddingHorizontal: spacing.screenPadding,
    },
    locationCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface.light,
      padding: spacing.base,
      borderRadius: borderRadius.md,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: colors.border.light,
      ...shadows.small,
    },
    locationCardSelected: {
      borderColor: colors.primary,
      borderWidth: 2,
      backgroundColor: colors.primary + '10',
    },
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: borderRadius.md,
      backgroundColor: colors.background.gray,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.base,
    },
    locationInfo: {
      flex: 1,
    },
    locationName: {
      fontSize: typography.sizes.base,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.text.primary,
      marginBottom: spacing.xs / 2,
    },
    locationDescription: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.text.secondary,
    },
    categoryBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs / 2,
      borderRadius: borderRadius.sm,
      backgroundColor: colors.status.infoLight,
    },
    categoryText: {
      fontSize: typography.sizes.xs,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.status.info,
      textTransform: 'capitalize',
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing['3xl'],
    },
    emptyText: {
      fontSize: typography.sizes.base,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.text.secondary,
      marginTop: spacing.base,
    },
    hint: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.text.tertiary,
      marginTop: spacing.sm,
      textAlign: 'center',
    },
  });

  const renderLocationCard = ({ item }: { item: PopularLocation }) => {
    const isSelected = item.id === selectedLocationId;
    const IconComponent = getIconComponent(item.iconName);

    return (
      <TouchableOpacity
        style={[styles.locationCard, isSelected && styles.locationCardSelected]}
        onPress={() => onLocationSelect(item)}
        activeOpacity={0.7}
      >
        <View style={styles.iconContainer}>
          <IconComponent size={24} color={colors.primary} />
        </View>

        <View style={styles.locationInfo}>
          <Text style={styles.locationName}>{item.name}</Text>
          {item.description && (
            <Text style={styles.locationDescription} numberOfLines={1}>
              {item.description}
            </Text>
          )}
        </View>

        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{item.category}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <MapPin size={48} color={colors.text.tertiary} />
      <Text style={styles.emptyText}>
        {searchQuery ? 'No locations found in campus list' : 'No locations available'}
      </Text>
      {enableGoogleSearch && searchQuery && (
        <Text style={styles.hint}>
          Try using Google search or tap the map to select
        </Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Search Container */}
      <View style={styles.searchContainer}>
        {/* Search Toggle */}
        {enableGoogleSearch && (
          <View style={styles.searchToggle}>
            <TouchableOpacity
              style={[styles.toggleButton, !useGoogleSearch && styles.toggleButtonActive]}
              onPress={() => setUseGoogleSearch(false)}
            >
              <Text style={[styles.toggleText, !useGoogleSearch && styles.toggleTextActive]}>
                Campus Locations
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleButton, useGoogleSearch && styles.toggleButtonActive]}
              onPress={() => setUseGoogleSearch(true)}
            >
              <Text style={[styles.toggleText, useGoogleSearch && styles.toggleTextActive]}>
                Google Search
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Search Input */}
        {useGoogleSearch && enableGoogleSearch ? (
          <LocationSearchInput
            placeholder="Search any location..."
            onLocationSelect={onLocationSelect}
          />
        ) : (
          <View style={styles.searchInput}>
            <Search size={20} color={colors.text.tertiary} style={styles.searchIcon} />
            <TextInput
              style={styles.input}
              placeholder="Search campus locations..."
              placeholderTextColor={colors.text.tertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        )}
      </View>

      {/* Only show list if not using Google search */}
      {!useGoogleSearch && (
        <FlatList
          data={filteredLocations}
          renderItem={renderLocationCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

export default PopularLocations;