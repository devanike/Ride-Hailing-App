import { useTheme } from '@/hooks/useTheme';
import * as Haptics from 'expo-haptics';
import { Delete, Fingerprint } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export interface PINPadProps {
  length?: number;
  onComplete: (pin: string) => void;
  onBiometric?: () => void;
  error?: boolean;
  loading?: boolean;
  showBiometric?: boolean;
  title?: string;
  subtitle?: string;
  disabled?: boolean;
}

export const PINPad: React.FC<PINPadProps> = ({
  length = 6,
  onComplete,
  onBiometric,
  error = false,
  loading = false,
  showBiometric = false,
  title = 'Enter PIN',
  subtitle,
  disabled = false,
}) => {
  const { colors, spacing, borderRadius, typography } = useTheme();
  const [pin, setPin] = useState('');
  const shakeAnimation = useRef(new Animated.Value(0)).current;

  // Shake animation on error
  useEffect(() => {
    if (error) {
      setPin(''); // Clear PIN on error
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      
      Animated.sequence([
        Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnimation, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnimation, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  const handleNumberPress = (num: string) => {
    if (disabled || loading || pin.length >= length) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newPin = pin + num;
    setPin(newPin);

    if (newPin.length === length) {
      onComplete(newPin);
    }
  };

  const handleBackspace = () => {
    if (disabled || loading || pin.length === 0) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPin(pin.slice(0, -1));
  };

  const handleBiometric = () => {
    if (disabled || loading || !onBiometric) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onBiometric();
  };

  const styles = StyleSheet.create({
    container: {
      alignItems: 'center',
      paddingVertical: spacing.xl,
    },
    header: {
      alignItems: 'center',
      marginBottom: spacing['2xl'],
    },
    title: {
      fontSize: typography.sizes['2xl'],
      fontFamily: typography.fonts.headingSemiBold,
      color: colors.text.primary,
      marginBottom: spacing.xs,
    },
    subtitle: {
      fontSize: typography.sizes.base,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.text.secondary,
      textAlign: 'center',
    },
    dotsContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: spacing.md,
      marginBottom: spacing['3xl'],
    },
    dot: {
      width: 16,
      height: 16,
      borderRadius: borderRadius.full,
      borderWidth: 2,
      borderColor: error ? colors.status.error : colors.border.medium,
    },
    dotFilled: {
      backgroundColor: error ? colors.status.error : colors.primary,
      borderColor: error ? colors.status.error : colors.primary,
    },
    keypad: {
      width: '100%',
      maxWidth: 300,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: spacing.base,
    },
    key: {
      width: 70,
      height: 70,
      borderRadius: borderRadius.full,
      backgroundColor: colors.surface.light,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border.light,
    },
    keyPressed: {
      backgroundColor: colors.background.gray,
    },
    keyText: {
      fontSize: typography.sizes['2xl'],
      fontFamily: typography.fonts.bodyMedium,
      color: colors.text.primary,
    },
    keyEmpty: {
      backgroundColor: 'transparent',
      borderWidth: 0,
    },
    keyIcon: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: borderRadius.lg,
    },
  });

  const renderKey = (value: string, icon?: React.ReactNode) => {
    const isEmpty = value === '';
    
    return (
      <TouchableOpacity
        key={value}
        style={[styles.key, isEmpty && styles.keyEmpty]}
        onPress={() => {
          if (value === 'backspace') {
            handleBackspace();
          } else if (value === 'biometric') {
            handleBiometric();
          } else if (!isEmpty) {
            handleNumberPress(value);
          }
        }}
        activeOpacity={isEmpty ? 1 : 0.7}
        disabled={disabled || loading || isEmpty}
      >
        {icon ? (
          <View style={styles.keyIcon}>{icon}</View>
        ) : (
          !isEmpty && <Text style={styles.keyText}>{value}</Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>

      {/* PIN Dots */}
      <Animated.View
        style={[
          styles.dotsContainer,
          { transform: [{ translateX: shakeAnimation }] },
        ]}
      >
        {Array.from({ length }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              index < pin.length && styles.dotFilled,
            ]}
          />
        ))}
      </Animated.View>

      {/* Keypad */}
      <View style={styles.keypad}>
        <View style={styles.row}>
          {renderKey('1')}
          {renderKey('2')}
          {renderKey('3')}
        </View>
        <View style={styles.row}>
          {renderKey('4')}
          {renderKey('5')}
          {renderKey('6')}
        </View>
        <View style={styles.row}>
          {renderKey('7')}
          {renderKey('8')}
          {renderKey('9')}
        </View>
        <View style={styles.row}>
          {showBiometric
            ? renderKey(
                'biometric',
                <Fingerprint size={24} color={colors.primary} />
              )
            : renderKey('')}
          {renderKey('0')}
          {renderKey(
            'backspace',
            <Delete size={24} color={colors.text.secondary} />
          )}
        </View>
      </View>

      {/* Loading Overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
    </View>
  );
};

export default PINPad;