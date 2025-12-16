import { useTheme } from '@/hooks/useTheme';
import { AlertTriangle, Info, XCircle } from 'lucide-react-native';
import React from 'react';
import {
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';

export interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
  icon?: React.ReactNode;
  type?: 'error' | 'warning' | 'info';
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  message,
  onRetry,
  icon,
  type = 'error',
}) => {
  const { colors, spacing, borderRadius, typography, shadows } = useTheme();

  // Get colors based on type
  const backgroundColor =
    type === 'error' ? colors.status.errorLight :
    type === 'warning' ? colors.status.warningLight :
    colors.status.infoLight;

  const textColor =
    type === 'error' ? colors.status.error :
    type === 'warning' ? colors.status.warning :
    colors.status.info;

  // Default icons based on type
  const renderDefaultIcon = () => {
    if (type === 'error') {
      return <XCircle size={24} color={textColor} />;
    }
    if (type === 'warning') {
      return <AlertTriangle size={24} color={textColor} />;
    }
    return <Info size={24} color={textColor} />;
  };

  const styles = StyleSheet.create({
    container: {
      backgroundColor,
      padding: spacing.base,
      borderRadius: borderRadius.md,
      borderLeftWidth: 4,
      borderLeftColor: textColor,
      ...shadows.small,
    } as ViewStyle,
    
    content: {
      flexDirection: 'row',
      alignItems: 'center',
    } as ViewStyle,
    
    iconContainer: {
      marginRight: spacing.md,
    } as ViewStyle,
    
    textContainer: {
      flex: 1,
    } as ViewStyle,
    
    message: {
      fontSize: typography.sizes.base,
      color: textColor,
      fontFamily: typography.fonts.bodyMedium,
      lineHeight: typography.sizes.base * typography.lineHeights.normal,
    } as TextStyle,
    
    retryButton: {
      marginTop: spacing.sm,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.base,
      backgroundColor: textColor,
      borderRadius: borderRadius.sm,
      alignSelf: 'flex-start',
    } as ViewStyle,
    
    retryText: {
      fontSize: typography.sizes.sm,
      color: colors.text.inverse,
      fontWeight: '600',
    } as TextStyle,
  });

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          {icon || renderDefaultIcon()}
        </View>
        
        <View style={styles.textContainer}>
          <Text style={styles.message}>{message}</Text>
          
          {onRetry && (
            <TouchableOpacity
              style={styles.retryButton}
              onPress={onRetry}
              activeOpacity={0.7}
            >
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

export default ErrorMessage;