// src/components/common/EmptyState.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

interface Props {
  emoji: string;
  title: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void };
}

export default function EmptyState({ emoji, title, subtitle, action }: Props) {
  const { colors, spacing, radius, typography } = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: spacing.xxl + spacing.xxl - spacing.xs, paddingHorizontal: spacing.xxl }}>
      <Text style={{ fontSize: 56, marginBottom: spacing.lg }}>{emoji}</Text>
      <Text style={{ color: colors.text, textAlign: 'center', marginBottom: spacing.sm, ...typography.title }}>
        {title}
      </Text>
      {subtitle && (
        <Text style={{ color: colors.textFaint, textAlign: 'center', ...typography.body }}>
          {subtitle}
        </Text>
      )}
      {action && (
        <TouchableOpacity
          onPress={action.onPress}
          style={{ marginTop: spacing.xl - 4, backgroundColor: colors.primary, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm + 2, borderRadius: radius.md }}
        >
          <Text style={{ color: 'white', ...typography.bodyEmphasis }}>{action.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
