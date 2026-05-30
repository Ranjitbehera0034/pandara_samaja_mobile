// src/components/common/CommunityImage.tsx
import React, { useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';

interface Props {
  uri: string | null;
  style?: any;
  resizeMode?: 'cover' | 'contain' | 'center' | 'stretch';
  placeholderColor?: string;
}

export default function CommunityImage({ uri, style, resizeMode = 'cover', placeholderColor = '#334155' }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  if (!uri || error) {
    return <View style={[style, { backgroundColor: placeholderColor }]} />;
  }

  // Map react-native resizeMode to expo-image contentFit
  let contentFit: any = 'cover';
  if (resizeMode === 'contain') contentFit = 'contain';
  if (resizeMode === 'center') contentFit = 'center';
  if (resizeMode === 'stretch') contentFit = 'fill';

  return (
    <View style={style}>
      {loading && (
        <View style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: placeholderColor, zIndex: 1 }]}>
          <ActivityIndicator size="small" color="#2563eb" />
        </View>
      )}
      <Image
        source={{ uri }}
        style={{ width: '100%', height: '100%' }}
        contentFit={contentFit}
        onLoadEnd={() => setLoading(false)}
        onError={() => { setError(true); setLoading(false); }}
      />
    </View>
  );
}
