// src/components/common/Chip.tsx
// Single reusable selectable pill for filter rows (Jobs category/sector,
// Courses category) and admin category pickers. Centralizes the
// flexShrink:0 + numberOfLines=1 guard a horizontal chip row needs —
// without it, a chip inside a horizontal ScrollView can get squeezed
// narrow enough that its text wraps, and radius.full (9999px) then
// rounds the resulting near-square box into a blob instead of a pill.
// Every new chip row gets that guard for free instead of copy-pasting
// the bug again.
import React from 'react';
import { TouchableOpacity, Text, GestureResponderEvent } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: (e: GestureResponderEvent) => void;
  haptics?: boolean;
}

export default function Chip({ label, selected, onPress, haptics = true }: ChipProps) {
  const { colors, spacing, radius, typography } = useTheme();
  const { lang } = useLanguage();

  const handlePress = (e: GestureResponderEvent) => {
    if (haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress(e);
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={{
        flexShrink: 0,
        alignSelf: 'flex-start',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radius.full,
        backgroundColor: selected ? colors.primary : colors.card,
        borderWidth: 1,
        borderColor: selected ? colors.primary : colors.border,
      }}
    >
      <Text
        numberOfLines={1}
        style={{
          color: selected ? '#fff' : colors.textMuted,
          fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined,
          ...typography.caption,
          fontWeight: '700',
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
