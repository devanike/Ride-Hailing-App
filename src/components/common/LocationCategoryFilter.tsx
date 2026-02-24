import { useTheme } from "@/hooks/useTheme";
import { LocationCategory } from "@/types/locations";
import {
  BookOpen,
  Building,
  Building2,
  Dumbbell,
  Grid3x3,
  Home,
  Hospital,
  LucideIcon,
} from "lucide-react-native";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface CategoryFilterProps {
  selectedCategory: LocationCategory | "all";
  onSelectCategory: (category: LocationCategory | "all") => void;
}

interface CategoryItem {
  value: LocationCategory | "all";
  label: string;
  Icon: LucideIcon;
}

const CATEGORIES: CategoryItem[] = [
  { value: "all", label: "All", Icon: Grid3x3 },
  { value: LocationCategory.ACADEMIC, label: "Academic", Icon: BookOpen },
  { value: LocationCategory.RESIDENTIAL, label: "Halls", Icon: Home },
  { value: LocationCategory.FACILITIES, label: "Facilities", Icon: Building2 },
  { value: LocationCategory.RECREATION, label: "Recreation", Icon: Dumbbell },
  { value: LocationCategory.MEDICAL, label: "Medical", Icon: Hospital },
  { value: LocationCategory.ADMINISTRATIVE, label: "Admin", Icon: Building },
];

/**
 * Location Category Filter
 * Horizontal scrollable category chips
 */
export const LocationCategoryFilter: React.FC<CategoryFilterProps> = ({
  selectedCategory,
  onSelectCategory,
}) => {
  const { colors, spacing, typography, borderRadius } = useTheme();

  const styles = StyleSheet.create({
    container: {
      backgroundColor: colors.background,
      paddingVertical: spacing.md,
    },
    scrollContent: {
      paddingHorizontal: spacing.screenPadding,
      gap: spacing.sm,
    },
    categoryChip: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.full,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      marginRight: spacing.sm,
    },
    categoryChipSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    iconContainer: {
      marginRight: spacing.xs,
    },
    categoryText: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.textSecondary,
    },
    categoryTextSelected: {
      color: colors.textInverse,
    },
  });

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {CATEGORIES.map((category) => {
          const isSelected = category.value === selectedCategory;
          const { Icon } = category;

          return (
            <TouchableOpacity
              key={category.value}
              style={[
                styles.categoryChip,
                isSelected && styles.categoryChipSelected,
              ]}
              onPress={() => onSelectCategory(category.value)}
              activeOpacity={0.7}
            >
              <View style={styles.iconContainer}>
                <Icon
                  size={16}
                  color={isSelected ? colors.textInverse : colors.textSecondary}
                />
              </View>
              <Text
                style={[
                  styles.categoryText,
                  isSelected && styles.categoryTextSelected,
                ]}
              >
                {category.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

export default LocationCategoryFilter;
