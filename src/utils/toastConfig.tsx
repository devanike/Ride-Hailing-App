import { BORDER_RADIUS, COLORS_LIGHT, SHADOWS, SPACING, TYPOGRAPHY } from '@/styles/theme';
import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { BaseToast, ErrorToast, InfoToast } from 'react-native-toast-message';

const colors = COLORS_LIGHT;

export const toastConfig = {

  success: (props: any) => (
    <BaseToast
      {...props}
      style={[
        styles.baseToast,
        {
          borderLeftColor: colors.status.success,
          backgroundColor: colors.surface.light,
        },
      ]}
      contentContainerStyle={styles.contentContainer}
      text1Style={[styles.text1, { color: colors.text.primary }]}
      text2Style={[styles.text2, { color: colors.text.secondary }]}
      text1NumberOfLines={2}
      text2NumberOfLines={2}
      renderLeadingIcon={() => (
        <View style={styles.iconContainer}>
          <CheckCircle size={24} color={colors.status.success} />
        </View>
      )}
    />
  ),

  error: (props: any) => (
    <ErrorToast
      {...props}
      style={[
        styles.baseToast,
        {
          borderLeftColor: colors.status.error,
          backgroundColor: colors.surface.light,
        },
      ]}
      contentContainerStyle={styles.contentContainer}
      text1Style={[styles.text1, { color: colors.text.primary }]}
      text2Style={[styles.text2, { color: colors.text.secondary }]}
      text1NumberOfLines={2}
      text2NumberOfLines={2}
      renderLeadingIcon={() => (
        <View style={styles.iconContainer}>
          <XCircle size={24} color={colors.status.error} />
        </View>
      )}
    />
  ),

  info: (props: any) => (
    <InfoToast
      {...props}
      style={[
        styles.baseToast,
        {
          borderLeftColor: colors.status.info,
          backgroundColor: colors.surface.light,
        },
      ]}
      contentContainerStyle={styles.contentContainer}
      text1Style={[styles.text1, { color: colors.text.primary }]}
      text2Style={[styles.text2, { color: colors.text.secondary }]}
      text1NumberOfLines={2}
      text2NumberOfLines={2}
      renderLeadingIcon={() => (
        <View style={styles.iconContainer}>
          <Info size={24} color={colors.status.info} />
        </View>
      )}
    />
  ),

  warning: (props: any) => (
    <ErrorToast
      {...props}
      style={[
        styles.baseToast,
        {
          borderLeftColor: colors.status.warning,
          backgroundColor: colors.surface.light,
        },
      ]}
      contentContainerStyle={styles.contentContainer}
      text1Style={[styles.text1, { color: colors.text.primary }]}
      text2Style={[styles.text2, { color: colors.text.secondary }]}
      text1NumberOfLines={2}
      text2NumberOfLines={2}
      renderLeadingIcon={() => (
        <View style={styles.iconContainer}>
          <AlertTriangle size={24} color={colors.status.warning} />
        </View>
      )}
    />
  ),
};

const styles = StyleSheet.create({
  baseToast: {
    borderLeftWidth: 5,
    borderRadius: BORDER_RADIUS.lg,
    height: undefined,
    minHeight: 60,
    paddingVertical: SPACING.md,
    ...SHADOWS.medium,
  },
  contentContainer: {
    paddingHorizontal: SPACING.base,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: SPACING.md,
  },
  text1: {
    fontSize: TYPOGRAPHY.sizes.base,
    fontWeight: '600',
    fontFamily: TYPOGRAPHY.fonts.bodyMedium,
  },
  text2: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontFamily: TYPOGRAPHY.fonts.bodyRegular,
    marginTop: 2,
  },
});