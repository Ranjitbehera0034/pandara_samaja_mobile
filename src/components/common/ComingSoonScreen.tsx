// src/components/common/ComingSoonScreen.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

interface Props {
  titleEn: string;
  titleOd: string;
}

export default function ComingSoonScreen({ titleEn, titleOd }: Props) {
  const { colors } = useTheme();
  const { lang, t } = useLanguage();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600', fontFamily: lang === 'od' ? 'NotoSansOriya-Bold' : undefined }}>
        {lang === 'od' ? titleOd : titleEn}
      </Text>
      <Text style={{ color: colors.textMuted, fontSize: 14, marginTop: 8, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined }}>
        {t('common', 'comingSoon')}
      </Text>
    </View>
  );
}
