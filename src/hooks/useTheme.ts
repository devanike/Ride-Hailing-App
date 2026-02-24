import { createGlobalStyles } from "@/styles/globalStyles";
import { theme } from "@/styles/theme";
import { useMemo } from "react";

export const useTheme = () => {
  const globalStyles = useMemo(() => createGlobalStyles(theme), []);

  return {
    theme,
    colors: theme.colors,
    typography: theme.typography,
    spacing: theme.spacing,
    borderRadius: theme.borderRadius,
    shadows: theme.shadows,
    layout: theme.layout,
    globalStyles,
  };
};

export type UseThemeReturn = ReturnType<typeof useTheme>;
