import { useTheme } from '@/hooks/useTheme';
import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  /** Custom style override */
  style?: ViewStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  icon,
  fullWidth = false,
  style,
}) => {
  const { colors, spacing, borderRadius, shadows, layout, typography } = useTheme();

  // Button height based on size
  const buttonHeight =
    size === 'small' ? layout.buttonHeightSmall :
    size === 'large' ? layout.buttonHeight + 8 :
    layout.buttonHeight;

  // Font size based on size
  const fontSize =
    size === 'small' ? typography.sizes.sm :
    size === 'large' ? typography.sizes.lg :
    typography.sizes.base;

  const styles = StyleSheet.create({
    button: {
      height: buttonHeight,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: variant === 'primary' ? borderRadius.none : borderRadius.md,
      paddingHorizontal: size === 'small' ? spacing.md : spacing.xl,
      ...(fullWidth && { width: '100%' }),
      ...(variant === 'primary' && {
        backgroundColor: colors.primary,
        ...shadows.primaryButton,
      }),
      ...(variant === 'secondary' && {
        backgroundColor: colors.accent,
        ...shadows.medium,
      }),
      ...(variant === 'outline' && {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: colors.primary,
      }),
      ...(variant === 'danger' && {
        backgroundColor: colors.status.error,
        ...shadows.medium,
      }),
      ...(disabled && {
        opacity: 0.5,
      }),
    } as ViewStyle,
    
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    } as ViewStyle,
    
    text: {
      fontSize,
      fontWeight: '600',
      color:
        variant === 'outline' ? colors.primary :
        colors.text.inverse,
    } as TextStyle,
  });

  return (
    <TouchableOpacity
      style={[styles.button, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator 
          color={variant === 'outline' ? colors.primary : colors.text.inverse} 
          size={size === 'small' ? 'small' : 'large'}
        />
      ) : (
        <View style={styles.content}>
          {icon && icon}
          <Text style={styles.text}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

export default Button;