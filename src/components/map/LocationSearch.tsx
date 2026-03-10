import { POPULAR_LOCATIONS } from "@/data/popularLocations";
import { useTheme } from "@/hooks/useTheme";
import { getPlaceDetails, searchPlaces } from "@/services/placesService";
import { PopularLocation } from "@/types/locations";
import { PlaceDetails } from "@/types/places";
import { MapPin, Search, X } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface LocationSearchProps {
  placeholder?: string;
  onLocationSelect: (location: PlaceDetails | PopularLocation) => void;
  initialValue?: string;
}

export const LocationSearch: React.FC<LocationSearchProps> = ({
  placeholder = "Search location...",
  onLocationSelect,
  initialValue = "",
}) => {
  const { colors, spacing, typography, borderRadius, shadows } = useTheme();

  const [query, setQuery] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<
    Awaited<ReturnType<typeof searchPlaces>>
  >([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const results = await searchPlaces({ input: query });
        setSuggestions(results);
        setShowSuggestions(true);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelectSuggestion = useCallback(
    async (placeId: string, mainText: string) => {
      try {
        setLoading(true);
        setQuery(mainText);
        setShowSuggestions(false);
        const details = await getPlaceDetails(placeId);
        onLocationSelect(details);
      } catch {
        // silent — caller handles errors
      } finally {
        setLoading(false);
      }
    },
    [onLocationSelect],
  );

  const handleSelectPopular = useCallback(
    (location: PopularLocation) => {
      setQuery(location.name);
      onLocationSelect(location);
    },
    [onLocationSelect],
  );

  const handleClear = useCallback(() => {
    setQuery("");
    setSuggestions([]);
    setShowSuggestions(false);
  }, []);

  const isEmpty = query.trim().length < 2;

  const styles = StyleSheet.create({
    container: {
      backgroundColor: colors.background,
    },
    inputRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: borderRadius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderWidth: 1,
      borderColor: showSuggestions ? colors.borderFocus : colors.border,
      ...shadows.small,
    },
    searchIcon: {
      marginRight: spacing.sm,
    },
    input: {
      flex: 1,
      fontSize: typography.sizes.base,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.textPrimary,
    },
    clearButton: {
      padding: spacing.xs,
    },
    popularLabel: {
      fontSize: typography.sizes.xs,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.textMuted,
      marginTop: spacing.md,
      marginBottom: spacing.sm,
      textTransform: "uppercase",
      letterSpacing: 0.8,
    },
    popularItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: spacing.sm,
    },
    popularItemLast: {
      borderBottomWidth: 0,
    },
    popularItemText: {
      fontSize: typography.sizes.base,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.textPrimary,
    },
    resultsList: {
      marginTop: spacing.xs,
      backgroundColor: colors.surface,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.border,
      maxHeight: 280,
      ...shadows.medium,
    },
    resultItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: spacing.sm,
    },
    resultItemLast: {
      borderBottomWidth: 0,
    },
    resultTextBlock: {
      flex: 1,
    },
    resultMain: {
      fontSize: typography.sizes.base,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.textPrimary,
    },
    resultSub: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.textSecondary,
      marginTop: 2,
    },
    emptyRow: {
      padding: spacing.md,
      alignItems: "center",
    },
    emptyText: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.textSecondary,
    },
  });

  return (
    <View style={styles.container}>
      {/* Search input */}
      <View style={styles.inputRow}>
        <Search size={18} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
        />
        {loading && <ActivityIndicator size="small" color={colors.primary} />}
        {!loading && query.length > 0 && (
          <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
            <X size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Popular locations — shown when search is empty */}
      {isEmpty && (
        <>
          <Text style={styles.popularLabel}>Popular locations</Text>
          {POPULAR_LOCATIONS.map((loc, index) => (
            <TouchableOpacity
              key={loc.id}
              style={[
                styles.popularItem,
                index === POPULAR_LOCATIONS.length - 1 &&
                  styles.popularItemLast,
              ]}
              onPress={() => handleSelectPopular(loc)}
              activeOpacity={0.7}
            >
              <MapPin size={16} color={colors.textMuted} />
              <Text style={styles.popularItemText}>{loc.name}</Text>
            </TouchableOpacity>
          ))}
        </>
      )}

      {/* Autocomplete results */}
      {showSuggestions && !isEmpty && (
        <View style={styles.resultsList}>
          {suggestions.length > 0 ? (
            <FlatList
              data={suggestions}
              keyExtractor={(item) => item.placeId}
              nestedScrollEnabled
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  style={[
                    styles.resultItem,
                    index === suggestions.length - 1 && styles.resultItemLast,
                  ]}
                  onPress={() =>
                    handleSelectSuggestion(item.placeId, item.mainText)
                  }
                  activeOpacity={0.7}
                  disabled={loading}
                >
                  <MapPin size={16} color={colors.textMuted} />
                  <View style={styles.resultTextBlock}>
                    <Text style={styles.resultMain}>{item.mainText}</Text>
                    {!!item.secondaryText && (
                      <Text style={styles.resultSub}>{item.secondaryText}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              )}
            />
          ) : (
            <View style={styles.emptyRow}>
              <Text style={styles.emptyText}>No locations found</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

export default LocationSearch;
