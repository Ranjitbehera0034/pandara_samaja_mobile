// src/components/feed/RichContent.tsx
import React from 'react';
import { Text } from 'react-native';
import { censorText } from '../../utils/feedUtils';
import { useTheme } from '../../theme/ThemeContext';

interface Props {
  text: string;
}

export default function RichContent({ text }: Props) {
  const { colors } = useTheme();
  const censored = censorText(text);
  const parts = censored.split(/(#\w+|@\w+)/g);

  return (
    <Text style={{ color: colors.text }} className="text-sm leading-relaxed">
      {parts.map((part, i) => {
        if (part.startsWith('#')) {
          return (
            <Text key={i} style={{ color: colors.primaryLight }} className="font-medium">
              {part}
            </Text>
          );
        }
        if (part.startsWith('@')) {
          return (
            <Text key={i} style={{ color: colors.accent }} className="font-medium">
              {part}
            </Text>
          );
        }
        return <Text key={i}>{part}</Text>;
      })}
    </Text>
  );
}
