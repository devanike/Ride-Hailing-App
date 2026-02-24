import {
  BorderRadius,
  ColorPalette,
  Layout,
  Shadows,
  Spacing,
  Theme,
  Typography,
} from "@/types/theme";

/**
 * UI-Ride Design System
 * University of Ibadan Campus Transportation App
 *
 * Brand: UI Blue (#002B7F) + Ibadan Gold (#C5A900)
 * Typography: Montserrat (headings) + Poppins (body)
 */

export const COLORS: ColorPalette = {
  primary: "#002B7F",
  accent: "#C5A900",
  background: "#FFFFFF",
  backgroundAlt: "#F8FAFC",
  surface: "#FFFFFF",
  surfaceAlt: "#F8FAFC",
  textPrimary: "#1A1A1A",
  textSecondary: "#6B7280",
  textMuted: "#94A3B8",
  textInverse: "#FFFFFF",
  textLink: "#002B7F",
  border: "#E5E7EB",
  borderStrong: "#D1D5DB",
  borderFocus: "#002B7F",
  success: "#10B981",
  successBackground: "#D1FAE5",
  error: "#EF4444",
  errorBackground: "#FEE2E2",
  warning: "#F59E0B",
  warningBackground: "#FEF3C7",
  info: "#3B82F6",
  infoBackground: "#DBEAFE",
  overlay: "rgba(0, 0, 0, 0.5)",
};

export const TYPOGRAPHY: Typography = {
  fonts: {
    heading: "Montserrat_700Bold",
    headingSemiBold: "Montserrat_600SemiBold",
    headingRegular: "Montserrat_400Regular",
    body: "Poppins_600SemiBold",
    bodyMedium: "Poppins_500Medium",
    bodyRegular: "Poppins_400Regular",
  },
  sizes: {
    xs: 10,
    sm: 12,
    md: 14,
    base: 16,
    lg: 18,
    xl: 20,
    "2xl": 24,
    "3xl": 28,
    "4xl": 32,
    "5xl": 36,
    "6xl": 48,
  },
  weights: {
    regular: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
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

export const SPACING: Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  screenPadding: 20,
  cardPadding: 16,
  buttonPadding: 16,
  inputPadding: 14,
  sectionSpacing: 24,
  itemSpacing: 12,
};

export const BORDER_RADIUS: BorderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

export const SHADOWS: Shadows = {
  small: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  medium: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  large: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
};

export const LAYOUT: Layout = {
  maxWidth: 600,
  buttonHeight: 56,
  buttonHeightSmall: 40,
  inputHeight: 56,
  headerHeight: 60,
  tabBarHeight: 60,
  iconSize: { xs: 16, sm: 20, md: 24, lg: 28, xl: 32 },
  avatarSize: { xs: 24, sm: 32, md: 40, lg: 56, xl: 80 },
};

export const theme: Theme = {
  colors: COLORS,
  typography: TYPOGRAPHY,
  spacing: SPACING,
  borderRadius: BORDER_RADIUS,
  shadows: SHADOWS,
  layout: LAYOUT,
};

export default theme;
