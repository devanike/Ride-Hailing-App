import { useTheme } from '@/hooks/useTheme';
import { getPlaceDetails, searchPlaces } from '@/services/placesService';
import { PlaceAutocompleteResult, PlaceDetails } from '@/types/places';
import { showError } from '@/utils/toast';
import { MapPin, Search, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ListRenderItem,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface LocationSearchInputProps {
  placeholder?: string;
  onLocationSelect: (location: PlaceDetails) => void;
  initialValue?: string;
}

/**
 * Location Search Input with Google Places Autocomplete
 * 
 * Features:
 * - Real-time autocomplete suggestions
 * - Debounced API calls
 * - Loading states
 * - Error handling with user feedback
 * - Clear button
 */
export const LocationSearchInput: React.FC<LocationSearchInputProps> = ({
  placeholder = 'Search location...',
  onLocationSelect,
  initialValue = '',
}) => {
  const { colors, spacing, typography, borderRadius, shadows } = useTheme();
  
  const [query, setQuery] = useState<string>(initialValue);
  const [suggestions, setSuggestions] = useState<PlaceAutocompleteResult[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      setSearchError(null);
      return;
    }

    setLoading(true);
    setSearchError(null);
    
    const timer = setTimeout(async () => {
      try {
        const results = await searchPlaces({ input: query });
        setSuggestions(results);
        setShowSuggestions(true);
        
        if (results.length === 0) {
          setSearchError('No locations found');
        }
      } catch (err) {
        console.error('Search error:', err);
        const errorMessage = err instanceof Error 
          ? err.message 
          : 'Failed to search locations';
        setSearchError(errorMessage);
        setSuggestions([]);
        showError('Search Failed', 'Unable to search locations. Please check your connection and try again.');
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelectSuggestion = useCallback(async (suggestion: PlaceAutocompleteResult): Promise<void> => {
    try {
      setLoading(true);
      setQuery(suggestion.mainText);
      setShowSuggestions(false);
      setSearchError(null);

      const details = await getPlaceDetails(suggestion.placeId);
      onLocationSelect(details);
    } catch (err) {
      console.error('Error getting place details:', err);
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Failed to get location details';
      showError('Error', errorMessage);
      setSearchError('Failed to select location');
    } finally {
      setLoading(false);
    }
  }, [onLocationSelect]);

  const handleClear = useCallback((): void => {
    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    setSearchError(null);
  }, []);

  const handleFocus = useCallback((): void => {
    if (query.length >= 2) {
      setShowSuggestions(true);
    }
  }, [query.length]);

  const styles = StyleSheet.create({
    container: {
      position: 'relative',
      zIndex: 1000,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface.light,
      borderRadius: borderRadius.md,
      paddingHorizontal: spacing.base,
      paddingVertical: spacing.md,
      borderWidth: 1,
      borderColor: searchError 
        ? colors.status.error 
        : showSuggestions 
        ? colors.border.focus 
        : colors.border.light,
      ...shadows.small,
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
    clearButton: {
      padding: spacing.xs,
    },
    loadingContainer: {
      padding: spacing.xs,
    },
    suggestionsContainer: {
      position: 'absolute',
      top: '100%',
      left: 0,
      right: 0,
      marginTop: spacing.xs,
      backgroundColor: colors.surface.light,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.border.light,
      maxHeight: 300,
      ...shadows.medium,
    },
    suggestionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.base,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.light,
    },
    suggestionItemLast: {
      borderBottomWidth: 0,
    },
    suggestionIcon: {
      marginRight: spacing.md,
    },
    suggestionTextContainer: {
      flex: 1,
    },
    suggestionMainText: {
      fontSize: typography.sizes.base,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.text.primary,
      marginBottom: spacing.xs / 2,
    },
    suggestionSecondaryText: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.text.secondary,
    },
    emptyContainer: {
      padding: spacing.lg,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyRegular,
      color: searchError ? colors.status.error : colors.text.secondary,
    },
    errorHint: {
      fontSize: typography.sizes.xs,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.text.tertiary,
      marginTop: spacing.xs,
      textAlign: 'center',
    },
  });

  const renderSuggestionItem: ListRenderItem<PlaceAutocompleteResult> = useCallback(({ item, index }) => {
    const isLast = index === suggestions.length - 1;
    
    return (
      <TouchableOpacity
        style={[
          styles.suggestionItem,
          isLast && styles.suggestionItemLast,
        ]}
        onPress={() => handleSelectSuggestion(item)}
        activeOpacity={0.7}
        disabled={loading}
      >
        <MapPin
          size={20}
          color={colors.text.tertiary}
          style={styles.suggestionIcon}
        />
        <View style={styles.suggestionTextContainer}>
          <Text style={styles.suggestionMainText}>{item.mainText}</Text>
          {item.secondaryText && (
            <Text style={styles.suggestionSecondaryText}>
              {item.secondaryText}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  }, [loading, suggestions.length, handleSelectSuggestion, colors.text.tertiary, styles.suggestionItem, styles.suggestionItemLast, styles.suggestionIcon, styles.suggestionTextContainer, styles.suggestionMainText, styles.suggestionSecondaryText]);

  const renderEmptyComponent = useCallback((): React.JSX.Element => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>
        {searchError || 'No locations found'}
      </Text>
      {searchError && (
        <Text style={styles.errorHint}>
          Check your internet connection and try again
        </Text>
      )}
    </View>
  ), [searchError, styles.emptyContainer, styles.emptyText, styles.errorHint]);

  return (
    <View style={styles.container}>
      {/* Search Input */}
      <View style={styles.inputContainer}>
        <Search 
          size={20} 
          color={searchError ? colors.status.error : colors.text.tertiary} 
          style={styles.searchIcon} 
        />
        
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={colors.text.tertiary}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          onFocus={handleFocus}
          editable={!loading}
        />

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        )}

        {query.length > 0 && !loading && (
          <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
            <X size={20} color={colors.text.tertiary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Autocomplete Suggestions */}
      {showSuggestions && (
        <View style={styles.suggestionsContainer}>
          {suggestions.length > 0 ? (
            <FlatList
              data={suggestions}
              keyExtractor={(item): string => item.placeId}
              renderItem={renderSuggestionItem}
              ListEmptyComponent={renderEmptyComponent}
              nestedScrollEnabled
            />
          ) : (
            renderEmptyComponent()
          )}
        </View>
      )}
    </View>
  );
};

export default LocationSearchInput;