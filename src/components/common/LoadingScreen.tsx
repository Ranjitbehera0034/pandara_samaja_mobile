// src/components/common/LoadingScreen.tsx
import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

export default function LoadingScreen() {
  const { colors } = useTheme();
  const { lang, t } = useLanguage();
  return (
    <View style={{ backgroundColor: colors.bg }} className="flex-1 items-center justify-center">
      <View style={{ backgroundColor: colors.primary }} className="w-16 h-16 rounded-2xl items-center justify-center mb-6 shadow-lg">
        <Text className="text-white font-bold text-3xl">P</Text>
      </View>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text
        style={{ color: colors.textMuted, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined }}
        className="text-sm mt-4"
      >
        {t('common', 'appName')}
      </Text>
    </View>
  );
}
