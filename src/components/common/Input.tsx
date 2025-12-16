import { useTheme } from '@/hooks/useTheme';
import { AlertCircle } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';

export interface InputProps extends Omit<TextInputProps, 'style'> {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  keyboardType?: TextInputProps['keyboardType'];
  /** Hide text (for passwords) */
  secureTextEntry?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  /** Multiline input */
  multiline?: boolean;
  /** Number of lines (if multiline) */
  numberOfLines?: number;
  disabled?: boolean;
  containerStyle?: ViewStyle;
}

export const Input: React.FC<InputProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  keyboardType = 'default',
  secureTextEntry = false,
  leftIcon,
  rightIcon,
  multiline = false,
  numberOfLines = 1,
  disabled = false,
  containerStyle,
  ...rest
}) => {
  const { colors, spacing, borderRadius, typography } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  const styles = StyleSheet.create({
    container: {
      marginBottom: spacing.base,
    } as ViewStyle,
    
    label: {
      fontSize: typography.sizes.sm,
      fontWeight: '500',
      color: colors.text.secondary,
      marginBottom: spacing.xs,
    } as TextStyle,
    
    inputContainer: {
      flexDirection: 'row',
      alignItems: multiline ? 'flex-start' : 'center',
      backgroundColor: colors.surface.light,
      borderWidth: 1,
      borderColor: error 
        ? colors.status.error 
        : isFocused 
        ? colors.border.focus 
        : colors.border.light,
      borderRadius: borderRadius.md,
      paddingHorizontal: spacing.base,
      paddingVertical: multiline ? spacing.md : spacing.inputPadding,
      ...(disabled && {
        backgroundColor: colors.background.gray,
        opacity: 0.6,
      }),
    } as ViewStyle,
    
    leftIconContainer: {
      marginRight: spacing.sm,
      ...(multiline && { marginTop: spacing.xs }),
    } as ViewStyle,
    
    input: {
      flex: 1,
      fontSize: typography.sizes.base,
      color: colors.text.primary,
      fontFamily: typography.fonts.bodyRegular,
      ...(multiline && {
        minHeight: numberOfLines * 20,
        textAlignVertical: 'top',
      }),
    } as TextStyle,
    
    rightIconContainer: {
      marginLeft: spacing.sm,
      ...(multiline && { marginTop: spacing.xs }),
    } as ViewStyle,
    
    errorContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: spacing.xs,
    } as ViewStyle,
    
    errorIcon: {
      marginRight: spacing.xs,
    } as ViewStyle,
    
    error: {
      fontSize: typography.sizes.sm,
      color: colors.status.error,
      flex: 1,
    } as TextStyle,
  });

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={styles.label}>{label}</Text>
      
      <View style={styles.inputContainer}>
        {leftIcon && (
          <View style={styles.leftIconContainer}>
            {leftIcon}
          </View>
        )}
        
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.text.tertiary}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          multiline={multiline}
          numberOfLines={numberOfLines}
          editable={!disabled}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...rest}
        />
        
        {rightIcon && (
          <TouchableOpacity style={styles.rightIconContainer}>
            {rightIcon}
          </TouchableOpacity>
        )}
      </View>
      
      {error && (
        <View style={styles.errorContainer}>
          <View style={styles.errorIcon}>
            <AlertCircle size={16} color={colors.status.error} />
          </View>
          <Text style={styles.error}>{error}</Text>
        </View>
      )}
    </View>
  );
};

export default Input;