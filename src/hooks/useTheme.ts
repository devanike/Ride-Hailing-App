import { createGlobalStyles } from '@/styles/globalStyles';
import { getTheme } from '@/styles/theme';
import { useMemo } from 'react';
// import { useColorScheme } from './use-color-scheme';

export const useTheme = () => {
  // const colorScheme = useColorScheme();
  // const isDark = colorScheme === 'dark';
  const isDark = false;

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