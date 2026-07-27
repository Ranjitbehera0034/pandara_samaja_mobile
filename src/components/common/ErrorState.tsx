// src/components/common/ErrorState.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

export default function ErrorState({ onRetry }: { onRetry: () => void }) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  return (
    <View style={{ alignItems: 'center', paddingVertical: 60 }}>
      <Text style={{ fontSize: 48, marginBottom: 16 }}>⚠️</Text>
      <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 8 }}>
        {t('common', 'error')}
      </Text>
      <Text style={{ color: colors.textFaint, fontSize: 14, marginBottom: 24, textAlign: 'center', paddingHorizontal: 32 }}>
        {t('common', 'loadErrorMessage')}
      </Text>
      <TouchableOpacity
        onPress={onRetry}
        style={{ backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12 }}
      >
        <Text style={{ color: 'white', fontWeight: '600' }}>{t('common', 'retry')}</Text>
      </TouchableOpacity>
    </View>
  );
}
