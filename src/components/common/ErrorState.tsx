// src/components/common/ErrorState.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

export default function ErrorState({ onRetry }: { onRetry: () => void }) {
  const { colors, spacing, radius, typography } = useTheme();
  const { t } = useLanguage();
  return (
    <View style={{ alignItems: 'center', paddingVertical: spacing.xxl + spacing.xxl - spacing.xs }}>
      <Text style={{ fontSize: 48, marginBottom: spacing.lg }}>⚠️</Text>
      <Text style={{ color: colors.text, marginBottom: spacing.sm, ...typography.title }}>
        {t('common', 'error')}
      </Text>
      <Text style={{ color: colors.textFaint, marginBottom: spacing.xl, textAlign: 'center', paddingHorizontal: spacing.xxl, ...typography.body }}>
        {t('common', 'loadErrorMessage')}
      </Text>
      <TouchableOpacity
        onPress={onRetry}
        style={{ backgroundColor: colors.primary, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm + 2, borderRadius: radius.md }}
      >
        <Text style={{ color: 'white', ...typography.bodyEmphasis }}>{t('common', 'retry')}</Text>
      </TouchableOpacity>
    </View>
  );
}
