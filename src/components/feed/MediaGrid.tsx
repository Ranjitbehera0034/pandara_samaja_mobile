// src/components/feed/MediaGrid.tsx
import React from 'react';
import { View, Text, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Video, ResizeMode } from 'expo-av';
import { MediaItem } from '../../types';
import { cleanPhoto } from '../../utils/googleDriveUrl';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MEDIA_WIDTH = SCREEN_WIDTH - 32; // 16px padding each side

interface Props {
  media: MediaItem[];
  onVideoPlay?: () => void;
}

export default function MediaGrid({ media, onVideoPlay }: Props) {
  if (!media || media.length === 0) return null;

  // Single media
  if (media.length === 1) {
    const item = media[0];
    return (
      <View className="mt-3 rounded-xl overflow-hidden bg-slate-900">
        {item.type === 'video' ? (
          <Video
            source={{ uri: cleanPhoto(item.url) || item.url }}
            style={{ width: MEDIA_WIDTH, height: MEDIA_WIDTH * 0.56 }}
            useNativeControls
            resizeMode={ResizeMode.CONTAIN}
            onPlaybackStatusUpdate={(status) => {
              if (status.isLoaded && status.isPlaying && onVideoPlay) {
                onVideoPlay();
              }
            }}
          />
        ) : (
          <Image
            source={{ uri: cleanPhoto(item.url) || item.url }}
            style={{ width: MEDIA_WIDTH, height: MEDIA_WIDTH * 0.6 }}
            contentFit="cover"
            transition={200}
          />
        )}
      </View>
    );
  }

  // 2-image grid
  if (media.length === 2) {
    const half = (MEDIA_WIDTH - 2) / 2;
    return (
      <View className="mt-3 flex-row gap-0.5 rounded-xl overflow-hidden">
        {media.map((item, i) => (
          <Image
            key={i}
            source={{ uri: cleanPhoto(item.url) || item.url }}
            style={{ width: half, height: half * 0.9 }}
            contentFit="cover"
            transition={200}
          />
        ))}
      </View>
    );
  }

  // 3-image grid: first image full width top, two below
  if (media.length === 3) {
    const half = (MEDIA_WIDTH - 2) / 2;
    return (
      <View className="mt-3 rounded-xl overflow-hidden gap-0.5">
        <Image
          source={{ uri: cleanPhoto(media[0].url) || media[0].url }}
          style={{ width: MEDIA_WIDTH, height: MEDIA_WIDTH * 0.5 }}
          contentFit="cover"
          transition={200}
        />
        <View className="flex-row gap-0.5">
          {media.slice(1, 3).map((item, i) => (
            <Image
              key={i}
              source={{ uri: cleanPhoto(item.url) || item.url }}
              style={{ width: half, height: half * 0.7 }}
              contentFit="cover"
              transition={200}
            />
          ))}
        </View>
      </View>
    );
  }

  // 4+ images: 2x2 grid, last one shows +N overlay
  const quarter = (MEDIA_WIDTH - 2) / 2;
  return (
    <View className="mt-3 rounded-xl overflow-hidden">
      <View className="flex-row gap-0.5 mb-0.5">
        {media.slice(0, 2).map((item, i) => (
          <Image
            key={i}
            source={{ uri: cleanPhoto(item.url) || item.url }}
            style={{ width: quarter, height: quarter * 0.8 }}
            contentFit="cover"
            transition={200}
          />
        ))}
      </View>
      <View className="flex-row gap-0.5">
        {media.slice(2, 4).map((item, i) => (
          <View key={i} style={{ width: quarter, height: quarter * 0.8 }}>
            <Image
              source={{ uri: cleanPhoto(item.url) || item.url }}
              style={{ width: quarter, height: quarter * 0.8 }}
              contentFit="cover"
              transition={200}
            />
            {i === 1 && media.length > 4 && (
              <View className="absolute inset-0 bg-black/60 items-center justify-center">
                <Text className="text-white text-2xl font-bold">+{media.length - 4}</Text>
              </View>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}
