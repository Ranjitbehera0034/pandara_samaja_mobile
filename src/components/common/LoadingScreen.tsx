// src/components/common/LoadingScreen.tsx
import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

export default function LoadingScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const { lang, t } = useLanguage();
  return (
    <View style={{ backgroundColor: colors.bg }} className="flex-1 items-center justify-center">
      <Image
        source={require('../../../assets/logo.png')}
        style={{ width: 64, height: 64, borderRadius: radius.full, marginBottom: spacing.xl }}
        contentFit="cover"
      />
      <ActivityIndicator size="large" color={colors.primary} />
      <Text
        style={{ color: colors.textMuted, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined, marginTop: spacing.lg, ...typography.body }}
      >
        {t('common', 'appName')}
      </Text>
    </View>
  );
}
