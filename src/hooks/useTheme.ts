import { createGlobalStyles } from '@/styles/globalStyles';
import { getTheme } from '@/styles/theme';
import { useMemo } from 'react';
import { useColorScheme } from './use-color-scheme';

/**
 * Custom hook to get the current theme and global styles
 * Automatically updates when device theme changes
 * 
 * @returns Object containing theme, colors, isDark, and globalStyles
 * 
 * @example
 * ```tsx
 * const MyComponent = () => {
 *   const { theme, colors, isDark, globalStyles } = useTheme();
 * 
 *   return (
 *     <View style={[globalStyles.screenContainer, { backgroundColor: colors.background.light }]}>
 *       <Text style={globalStyles.h1}>Hello World</Text>
 *       {isDark && <Text>Dark mode is on!</Text>}
 *     </View>
 *   );
 * };
 * ```
 */
export const useTheme = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Memoize theme to prevent unnecessary recalculations
  const theme = useMemo(() => getTheme(isDark), [isDark]);
  
  // Memoize global styles to prevent unnecessary recalculations
  const globalStyles = useMemo(() => createGlobalStyles(theme), [theme]);

  return {
    theme,
    colors: theme.colors,
    typography: theme.typography,
    spacing: theme.spacing,
    borderRadius: theme.borderRadius,
    shadows: theme.shadows,
    layout: theme.layout,
    isDark,
    globalStyles,
  };
};

/**
 * Type for the return value of useTheme hook
 */
export type UseThemeReturn = ReturnType<typeof useTheme>;