/**
 * UI-Ride Design System
 * University of Ibadan Campus Transportation App
 * 
 * Color Palette: UI Blue (#002B7F) + Ibadan Gold (#C5A900)
 * Typography: Montserrat (headings) + Poppins (body)
 * Style: Modern, clean, minimalistic with Dark Mode Support
 */

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface ColorPalette {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  accent: string;
  accentLight: string;
  accentDark: string;
  background: {
    light: string;
    gray: string;
    dark: string;
  };
  surface: {
    light: string;
    gray: string;
    dark: string;
  };
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    inverse: string;
    link: string;
  };
  border: {
    light: string;
    medium: string;
    dark: string;
    focus: string;
  };
  status: {
    success: string;
    successLight: string;
    error: string;
    errorLight: string;
    warning: string;
    warningLight: string;
    info: string;
    infoLight: string;
  };
  overlay: string;
}

export interface Typography {
  fonts: {
    heading: string;
    headingSemiBold: string;
    headingRegular: string;
    body: string;
    bodyMedium: string;
    bodyRegular: string;
  };
  sizes: {
    xs: number;
    sm: number;
    md: number;
    base: number;
    lg: number;
    xl: number;
    '2xl': number;
    '3xl': number;
    '4xl': number;
    '5xl': number;
    '6xl': number;
  };
  weights: {
    regular: string;
    medium: string;
    semibold: string;
    bold: string;
  };
  lineHeights: {
    tight: number;
    normal: number;
    relaxed: number;
  };
  letterSpacing: {
    tight: number;
    normal: number;
    wide: number;
  };
}

export interface Spacing {
  xs: number;
  sm: number;
  md: number;
  base: number;
  lg: number;
  xl: number;
  '2xl': number;
  '3xl': number;
  '4xl': number;
  '5xl': number;
  screenPadding: number;
  cardPadding: number;
  buttonPadding: number;
  inputPadding: number;
  sectionSpacing: number;
  itemSpacing: number;
}

export interface BorderRadius {
  none: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  '2xl': number;
  full: number;
}

export interface Shadow {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
}

export interface Shadows {
  small: Shadow;
  medium: Shadow;
  large: Shadow;
  xlarge: Shadow;
  primaryButton: Shadow;
}

export interface Layout {
  maxWidth: number;
  buttonHeight: number;
  buttonHeightSmall: number;
  inputHeight: number;
  headerHeight: number;
  tabBarHeight: number;
  iconSize: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  avatarSize: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
}

export interface Theme {
  colors: ColorPalette;
  typography: Typography;
  spacing: Spacing;
  borderRadius: BorderRadius;
  shadows: Shadows;
  layout: Layout;
}

// ============================================
// LIGHT MODE COLORS
// ============================================
export const COLORS_LIGHT: ColorPalette = {
  // Brand Colors
  primary: '#002B7F',
  primaryLight: '#3B82F6',
  primaryDark: '#001F5C',
  
  accent: '#C5A900',
  accentLight: '#FCD34D',
  accentDark: '#B09600',
  
  // Backgrounds
  background: {
    light: '#FFFFFF',
    gray: '#F8FAFC',
    dark: '#0B1120',
  },
  
  // Surface (Cards, Modals)
  surface: {
    light: '#FFFFFF',
    gray: '#F8FAFC',
    dark: '#1E293B',
  },
  
  // Text Colors
  text: {
    primary: '#1A1A1A',
    secondary: '#6B7280',
    tertiary: '#94A3B8',
    inverse: '#FFFFFF',
    link: '#002B7F',
  },
  
  // Border Colors
  border: {
    light: '#E5E7EB',
    medium: '#D1D5DB',
    dark: '#334155',
    focus: '#002B7F',
  },
  
  // Status Colors
  status: {
    success: '#10B981',
    successLight: '#D1FAE5',
    error: '#EF4444',
    errorLight: '#FEE2E2',
    warning: '#F59E0B',
    warningLight: '#FEF3C7',
    info: '#3B82F6',
    infoLight: '#DBEAFE',
  },
  
  overlay: 'rgba(0, 0, 0, 0.5)',
};

// ============================================
// DARK MODE COLORS
// ============================================
export const COLORS_DARK: ColorPalette = {
  // Brand Colors (adjusted for dark mode)
  primary: '#3B82F6',
  primaryLight: '#60A5FA',
  primaryDark: '#2563EB',
  
  accent: '#FCD34D',
  accentLight: '#FDE68A',
  accentDark: '#F59E0B',
  
  // Backgrounds
  background: {
    light: '#0B1120',
    gray: '#1E293B',
    dark: '#000000',
  },
  
  // Surface (Cards, Modals)
  surface: {
    light: '#1E293B',
    gray: '#334155',
    dark: '#0F172A',
  },
  
  // Text Colors
  text: {
    primary: '#F8FAFC',
    secondary: '#94A3B8',
    tertiary: '#64748B',
    inverse: '#1A1A1A',
    link: '#60A5FA',
  },
  
  // Border Colors
  border: {
    light: '#334155',
    medium: '#475569',
    dark: '#64748B',
    focus: '#3B82F6',
  },
  
  // Status Colors
  status: {
    success: '#10B981',
    successLight: '#065F46',
    error: '#EF4444',
    errorLight: '#7F1D1D',
    warning: '#F59E0B',
    warningLight: '#78350F',
    info: '#3B82F6',
    infoLight: '#1E3A8A',
  },
  
  overlay: 'rgba(0, 0, 0, 0.7)',
};

// ============================================
// TYPOGRAPHY (same for both modes)
// ============================================
export const TYPOGRAPHY: Typography = {
  fonts: {
    heading: 'Montserrat_700Bold',
    headingSemiBold: 'Montserrat_600SemiBold',
    headingRegular: 'Montserrat_400Regular',
    body: 'Poppins_600SemiBold',
    bodyMedium: 'Poppins_500Medium',
    bodyRegular: 'Poppins_400Regular',
  },
  
  sizes: {
    xs: 10,
    sm: 12,
    md: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 28,
    '4xl': 32,
    '5xl': 36,
    '6xl': 48,
  },
  
  weights: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.7,
  },
  
  letterSpacing: {
    tight: -0.02,
    normal: 0,
    wide: 0.05,
  },
};

// ============================================
// SPACING (same for both modes)
// ============================================
export const SPACING: Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
  
  screenPadding: 20,
  cardPadding: 16,
  buttonPadding: 16,
  inputPadding: 14,
  sectionSpacing: 24,
  itemSpacing: 12,
};

// ============================================
// BORDER RADIUS (same for both modes)
// ============================================
export const BORDER_RADIUS: BorderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  full: 9999,
};

// ============================================
// SHADOWS (same for both modes)
// ============================================
export const SHADOWS: Shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
  
  xlarge: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  
  primaryButton: {
    shadowColor: '#002B7F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
};

// ============================================
// LAYOUT (same for both modes)
// ============================================
export const LAYOUT: Layout = {
  maxWidth: 600,
  buttonHeight: 56,
  buttonHeightSmall: 40,
  inputHeight: 56,
  headerHeight: 60,
  tabBarHeight: 60,
  
  iconSize: {
    xs: 16,
    sm: 20,
    md: 24,
    lg: 28,
    xl: 32,
  },
  
  avatarSize: {
    xs: 24,
    sm: 32,
    md: 40,
    lg: 56,
    xl: 80,
  },
};

// ============================================
// THEME OBJECTS
// ============================================
export const lightTheme: Theme = {
  colors: COLORS_LIGHT,
  typography: TYPOGRAPHY,
  spacing: SPACING,
  borderRadius: BORDER_RADIUS,
  shadows: SHADOWS,
  layout: LAYOUT,
};

export const darkTheme: Theme = {
  colors: COLORS_DARK,
  typography: TYPOGRAPHY,
  spacing: SPACING,
  borderRadius: BORDER_RADIUS,
  shadows: SHADOWS,
  layout: LAYOUT,
};

// ============================================
// HELPER FUNCTION
// ============================================
export const getTheme = (isDark: boolean): Theme => {
  return isDark ? darkTheme : lightTheme;
};

// ============================================
// DEFAULT EXPORT
// ============================================
export default {
  light: lightTheme,
  dark: darkTheme,
  getTheme,
};