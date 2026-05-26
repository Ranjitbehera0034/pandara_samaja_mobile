import React from 'react';
import { View, Text } from 'react-native';

export default function AnnouncementsScreen() {
  return (
    <View className="flex-1 bg-slate-900 items-center justify-center">
      <Text className="text-white text-lg font-semibold">Announcements</Text>
      <Text className="text-slate-400 text-sm mt-2">Coming in Phase 2</Text>
    </View>
  );
}
