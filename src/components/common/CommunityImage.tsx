// src/components/common/CommunityImage.tsx
import React, { useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '../../theme/ThemeContext';

interface Props {
  uri: string | null;
  style?: any;
  resizeMode?: 'cover' | 'contain' | 'center' | 'stretch';
  placeholderColor?: string;
}

export default function CommunityImage({ uri, style, resizeMode = 'cover', placeholderColor }: Props) {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const bgColor = placeholderColor ?? colors.border;

  if (!uri || error) {
    return <View style={[style, { backgroundColor: bgColor }]} />;
  }

  // Map react-native resizeMode to expo-image contentFit
  let contentFit: any = 'cover';
  if (resizeMode === 'contain') contentFit = 'contain';
  if (resizeMode === 'center') contentFit = 'center';
  if (resizeMode === 'stretch') contentFit = 'fill';

  return (
    <View style={style}>
      {loading && (
        <View style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: bgColor, zIndex: 1 }]}>
          <ActivityIndicator size="small" color={colors.primary} />
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
