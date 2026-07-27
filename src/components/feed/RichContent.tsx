// src/components/feed/RichContent.tsx
import React from 'react';
import { Text } from 'react-native';
import { censorText } from '../../utils/feedUtils';
import { useTheme } from '../../theme/ThemeContext';

interface Props {
  text: string;
}

export default function RichContent({ text }: Props) {
  const { colors, typography } = useTheme();
  const censored = censorText(text);
  const parts = censored.split(/(#\w+|@\w+)/g);

  return (
    <Text style={{ color: colors.text, ...typography.body }}>
      {parts.map((part, i) => {
        if (part.startsWith('#')) {
          return (
            <Text key={i} style={{ color: colors.primaryLight, fontWeight: '500' }}>
              {part}
            </Text>
          );
        }
        if (part.startsWith('@')) {
          return (
            <Text key={i} style={{ color: colors.accent, fontWeight: '500' }}>
              {part}
            </Text>
          );
        }
        return <Text key={i}>{part}</Text>;
      })}
    </Text>
  );
}
