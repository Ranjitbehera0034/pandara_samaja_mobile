// src/components/common/Button.tsx
import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, GestureResponderEvent } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

type ButtonVariant = 'primary' | 'secondary' | 'pill' | 'icon';

interface ButtonProps {
  label?: string;
  onPress: (e: GestureResponderEvent) => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  haptics?: boolean;
}

export default function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  icon,
  fullWidth = true,
  haptics = true,
}: ButtonProps) {
  const { colors, spacing, radius, typography } = useTheme();
  const { lang } = useLanguage();
  const isDisabled = disabled || loading;

  const handlePress = (e: GestureResponderEvent) => {
    if (isDisabled) return;
    if (haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress(e);
  };

  if (variant === 'icon') {
    return (
      <TouchableOpacity
        onPress={handlePress}
        disabled={isDisabled}
        style={{
          width: 44,
          height: 44,
          borderRadius: radius.full,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isDisabled ? colors.border : colors.primary,
          opacity: isDisabled ? 0.6 : 1,
        }}
      >
        {loading ? <ActivityIndicator size="small" color="#fff" /> : icon}
      </TouchableOpacity>
    );
  }

  const isPill = variant === 'pill';
  const isSecondary = variant === 'secondary';

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={isDisabled}
      style={{
        width: fullWidth && !isPill ? '100%' : undefined,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingVertical: isPill ? spacing.sm : spacing.md,
        paddingHorizontal: isPill ? spacing.lg : spacing.md,
        borderRadius: isPill ? radius.full : radius.lg,
        backgroundColor: isSecondary ? 'transparent' : isDisabled ? colors.border : colors.primary,
        borderWidth: isSecondary ? 1 : 0,
        borderColor: colors.border,
        opacity: isDisabled && !isSecondary ? 0.6 : 1,
      }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={isSecondary ? colors.primary : '#fff'} />
      ) : (
        <>
          {icon}
          {label ? (
            <Text
              style={{
                color: isSecondary ? colors.text : '#fff',
                fontSize: isPill ? typography.bodyEmphasis.fontSize : typography.label.fontSize,
                fontWeight: isPill ? typography.bodyEmphasis.fontWeight : '700',
                fontFamily: lang === 'od' ? 'NotoSansOriya-Bold' : undefined,
              }}
            >
              {label}
            </Text>
          ) : null}
        </>
      )}
    </TouchableOpacity>
  );
}
