// src/components/feed/RichContent.tsx
import React from 'react';
import { Text } from 'react-native';
import { censorText } from '../../utils/feedUtils';

interface Props {
  text: string;
}

export default function RichContent({ text }: Props) {
  const censored = censorText(text);
  const parts = censored.split(/(#\w+|@\w+)/g);

  return (
    <Text className="text-slate-200 text-sm leading-relaxed">
      {parts.map((part, i) => {
        if (part.startsWith('#')) {
          return (
            <Text key={i} className="text-blue-400 font-medium">
              {part}
            </Text>
          );
        }
        if (part.startsWith('@')) {
          return (
            <Text key={i} className="text-purple-400 font-medium">
              {part}
            </Text>
          );
        }
        return <Text key={i}>{part}</Text>;
      })}
    </Text>
  );
}
