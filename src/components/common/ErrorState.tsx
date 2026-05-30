// src/components/common/ErrorState.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

export default function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 60 }}>
      <Text style={{ fontSize: 48, marginBottom: 16 }}>⚠️</Text>
      <Text style={{ color: '#f8fafc', fontSize: 18, fontWeight: '700', marginBottom: 8 }}>
        Something went wrong
      </Text>
      <Text style={{ color: '#64748b', fontSize: 14, marginBottom: 24, textAlign: 'center', paddingHorizontal: 32 }}>
        Could not load content. Check your connection and try again.
      </Text>
      <TouchableOpacity
        onPress={onRetry}
        style={{ backgroundColor: '#2563eb', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12 }}
      >
        <Text style={{ color: 'white', fontWeight: '600' }}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );
}
