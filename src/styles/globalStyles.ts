import { Theme } from "@/types/theme";
import { StyleSheet, TextStyle, ViewStyle } from "react-native";
import { BORDER_RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from "./theme";

export const createGlobalStyles = (theme: Theme) => {
  const { colors } = theme;

  return StyleSheet.create({
    // ============================================
    // CONTAINERS
    // ============================================
    screenContainer: {
      flex: 1,
      backgroundColor: colors.backgroundAlt,
      paddingHorizontal: SPACING.screenPadding,
    } as ViewStyle,

    screenContainerWhite: {
      flex: 1,
      backgroundColor: colors.background,
      paddingHorizontal: SPACING.screenPadding,
    } as ViewStyle,

    centerContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    } as ViewStyle,

    // ============================================
    // FLEXBOX HELPERS
    // ============================================
    row: {
      flexDirection: "row",
      alignItems: "center",
    } as ViewStyle,

    rowBetween: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    } as ViewStyle,

    rowCenter: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
    } as ViewStyle,

    // ============================================
    // TEXT STYLES
    // ============================================
    h1: {
      fontSize: TYPOGRAPHY.sizes["5xl"],
      fontFamily: TYPOGRAPHY.fonts.heading,
      color: colors.textPrimary,
      lineHeight: TYPOGRAPHY.sizes["5xl"] * TYPOGRAPHY.lineHeights.tight,
    } as TextStyle,

    h2: {
      fontSize: TYPOGRAPHY.sizes["3xl"],
      fontFamily: TYPOGRAPHY.fonts.heading,
      color: colors.textPrimary,
      lineHeight: TYPOGRAPHY.sizes["3xl"] * TYPOGRAPHY.lineHeights.tight,
    } as TextStyle,

    h3: {
      fontSize: TYPOGRAPHY.sizes["2xl"],
      fontFamily: TYPOGRAPHY.fonts.headingSemiBold,
      color: colors.textPrimary,
      lineHeight: TYPOGRAPHY.sizes["2xl"] * TYPOGRAPHY.lineHeights.normal,
    } as TextStyle,

    bodyLarge: {
      fontSize: TYPOGRAPHY.sizes.lg,
      fontFamily: TYPOGRAPHY.fonts.bodyRegular,
      color: colors.textPrimary,
      lineHeight: TYPOGRAPHY.sizes.lg * TYPOGRAPHY.lineHeights.normal,
    } as TextStyle,

    body: {
      fontSize: TYPOGRAPHY.sizes.base,
      fontFamily: TYPOGRAPHY.fonts.bodyRegular,
      color: colors.textPrimary,
      lineHeight: TYPOGRAPHY.sizes.base * TYPOGRAPHY.lineHeights.normal,
    } as TextStyle,

    bodyMedium: {
      fontSize: TYPOGRAPHY.sizes.base,
      fontFamily: TYPOGRAPHY.fonts.bodyMedium,
      color: colors.textPrimary,
      lineHeight: TYPOGRAPHY.sizes.base * TYPOGRAPHY.lineHeights.normal,
    } as TextStyle,

    bodySemiBold: {
      fontSize: TYPOGRAPHY.sizes.base,
      fontFamily: TYPOGRAPHY.fonts.body,
      color: colors.textPrimary,
      lineHeight: TYPOGRAPHY.sizes.base * TYPOGRAPHY.lineHeights.normal,
    } as TextStyle,

    caption: {
      fontSize: TYPOGRAPHY.sizes.sm,
      fontFamily: TYPOGRAPHY.fonts.bodyRegular,
      color: colors.textSecondary,
      lineHeight: TYPOGRAPHY.sizes.sm * TYPOGRAPHY.lineHeights.normal,
    } as TextStyle,

    captionMedium: {
      fontSize: TYPOGRAPHY.sizes.sm,
      fontFamily: TYPOGRAPHY.fonts.bodyMedium,
      color: colors.textSecondary,
      lineHeight: TYPOGRAPHY.sizes.sm * TYPOGRAPHY.lineHeights.normal,
    } as TextStyle,

    // ============================================
    // CARDS
    // ============================================
    card: {
      backgroundColor: colors.surface,
      borderRadius: BORDER_RADIUS.lg,
      padding: SPACING.cardPadding,
      borderWidth: 1,
      borderColor: colors.border,
      ...SHADOWS.medium,
    } as ViewStyle,

    cardNoBorder: {
      backgroundColor: colors.surface,
      borderRadius: BORDER_RADIUS.lg,
      padding: SPACING.cardPadding,
      ...SHADOWS.medium,
    } as ViewStyle,

    // ============================================
    // SHADOWS
    // ============================================
    shadowSmall: SHADOWS.small as ViewStyle,
    shadowMedium: SHADOWS.medium as ViewStyle,
    shadowLarge: SHADOWS.large as ViewStyle,

    // ============================================
    // SPACING HELPERS
    // ============================================
    mb4: { marginBottom: SPACING.xs } as ViewStyle,
    mb8: { marginBottom: SPACING.sm } as ViewStyle,
    mb16: { marginBottom: SPACING.md } as ViewStyle,
    mb24: { marginBottom: SPACING.lg } as ViewStyle,
    mb32: { marginBottom: SPACING.xl } as ViewStyle,

    mt4: { marginTop: SPACING.xs } as ViewStyle,
    mt8: { marginTop: SPACING.sm } as ViewStyle,
    mt16: { marginTop: SPACING.md } as ViewStyle,
    mt24: { marginTop: SPACING.lg } as ViewStyle,
    mt32: { marginTop: SPACING.xl } as ViewStyle,

    // ============================================
    // BORDERS
    // ============================================
    borderBottom: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    } as ViewStyle,

    borderTop: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
    } as ViewStyle,
  });
};
