export interface ColorPalette {
  primary: string;
  accent: string;
  background: string;
  backgroundAlt: string;
  surface: string;
  surfaceAlt: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  textLink: string;
  border: string;
  borderStrong: string;
  borderFocus: string;
  success: string;
  successBackground: string;
  error: string;
  errorBackground: string;
  warning: string;
  warningBackground: string;
  info: string;
  infoBackground: string;
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
    "2xl": number;
    "3xl": number;
    "4xl": number;
    "5xl": number;
    "6xl": number;
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
  lg: number;
  xl: number;
  xxl: number;
  screenPadding: number;
  cardPadding: number;
  buttonPadding: number;
  inputPadding: number;
  sectionSpacing: number;
  itemSpacing: number;
}

export interface BorderRadius {
  sm: number;
  md: number;
  lg: number;
  xl: number;
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
