// src/components/common/LoadingScreen.tsx
import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';

export default function LoadingScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-slate-900">
      <View className="w-16 h-16 rounded-2xl bg-blue-600 items-center justify-center mb-6 shadow-lg">
        <Text className="text-white font-bold text-3xl">P</Text>
      </View>
      <ActivityIndicator size="large" color="#2563eb" />
      <Text className="text-slate-400 text-sm mt-4">Pandara Samaja</Text>
    </View>
  );
}
