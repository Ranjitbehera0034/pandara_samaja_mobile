// src/components/common/EmptyState.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

interface Props {
  emoji: string;
  title: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void };
}

export default function EmptyState({ emoji, title, subtitle, action }: Props) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32 }}>
      <Text style={{ fontSize: 56, marginBottom: 16 }}>{emoji}</Text>
      <Text style={{ color: '#f8fafc', fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 8 }}>
        {title}
      </Text>
      {subtitle && (
        <Text style={{ color: '#64748b', fontSize: 14, textAlign: 'center', lineHeight: 20 }}>
          {subtitle}
        </Text>
      )}
      {action && (
        <TouchableOpacity
          onPress={action.onPress}
          style={{ marginTop: 20, backgroundColor: '#2563eb', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12 }}
        >
          <Text style={{ color: 'white', fontWeight: '600' }}>{action.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
