// src/components/common/UpdateBanner.tsx
//
// Checks for an EAS Update (OTA JS bundle update) on launch and whenever the
// app returns to the foreground, and shows a small "tap to update" banner
// instead of silently applying it on next cold start. Only ever active in a
// real EAS build — Updates.isEnabled is false in Expo Go / a bare dev
// client, so this is a safe no-op there.
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, AppState } from 'react-native';
import * as Updates from 'expo-updates';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

export default function UpdateBanner() {
  const insets = useSafeAreaInsets();
  const { colors, spacing, radius, typography, shadow } = useTheme();
  const { lang, t } = useLanguage();
  const fontRegular = lang === 'od' ? 'NotoSansOriya' : undefined;
  const fontBold = lang === 'od' ? 'NotoSansOriya-Bold' : undefined;

  const [available, setAvailable] = useState(false);
  const [applying, setApplying] = useState(false);
  const checking = useRef(false);

  const checkForUpdate = async () => {
    if (!Updates.isEnabled || checking.current) return;
    checking.current = true;
    try {
      const result = await Updates.checkForUpdateAsync();
      if (result.isAvailable) setAvailable(true);
    } catch {
      // No network, or check failed — fail silently, try again next time.
    } finally {
      checking.current = false;
    }
  };

  useEffect(() => {
    checkForUpdate();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') checkForUpdate();
    });
    return () => sub.remove();
  }, []);

  const handleUpdate = async () => {
    setApplying(true);
    try {
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    } catch {
      setApplying(false);
    }
  };

  if (!available) return null;

  return (
    <View
      style={{
        position: 'absolute', top: insets.top, left: spacing.md, right: spacing.md, zIndex: 999,
        flexDirection: 'row', alignItems: 'center', gap: spacing.md,
        backgroundColor: colors.primary, borderRadius: radius.lg, padding: spacing.md, ...shadow.raised,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ color: '#fff', fontFamily: fontBold, ...typography.bodyEmphasis }}>
          {t('common', 'updateAvailableTitle')}
        </Text>
        <Text style={{ color: '#ffffffcc', fontFamily: fontRegular, marginTop: 2, ...typography.caption }}>
          {t('common', 'updateAvailableSubtitle')}
        </Text>
      </View>
      <TouchableOpacity
        onPress={handleUpdate}
        disabled={applying}
        style={{ backgroundColor: '#ffffff2a', borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }}
      >
        {applying ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={{ color: '#fff', fontFamily: fontBold, ...typography.caption, fontWeight: '700' }}>
            {t('common', 'updateNowButton')}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}
