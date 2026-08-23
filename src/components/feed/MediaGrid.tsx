// src/components/feed/MediaGrid.tsx
import React from 'react';
import { View, Text, Dimensions, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { MediaItem } from '../../types';
import { cleanPhoto } from '../../utils/googleDriveUrl';
import { useTheme } from '../../theme/ThemeContext';
import RichVideoPlayer from './RichVideoPlayer';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MEDIA_WIDTH = SCREEN_WIDTH - 32; // 16px padding each side

interface Props {
  media: MediaItem[];
  onVideoPlay?: () => void;
  onMediaPress?: (index: number) => void;
}

export default function MediaGrid({ media, onVideoPlay, onMediaPress }: Props) {
  const { colors, spacing, radius, typography } = useTheme();
  if (!media || media.length === 0) return null;

  // Single media
  if (media.length === 1) {
    const item = media[0];
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => onMediaPress?.(0)}
        style={{ backgroundColor: colors.bg, marginTop: spacing.md, borderRadius: radius.md, overflow: 'hidden' }}
      >
        {item.type === 'video' ? (
          <RichVideoPlayer
            uri={cleanPhoto(item.url) || item.url}
            maxWidth={MEDIA_WIDTH}
            maxHeight={SCREEN_HEIGHT * 0.6}
            onPlay={onVideoPlay}
          />
        ) : (
          <Image
            source={{ uri: cleanPhoto(item.url) || item.url }}
            style={{ width: MEDIA_WIDTH, height: MEDIA_WIDTH * 0.6 }}
            contentFit="cover"
            transition={200}
          />
        )}
      </TouchableOpacity>
    );
  }

  // 2-image grid
  if (media.length === 2) {
    const half = (MEDIA_WIDTH - 2) / 2;
    return (
      <View style={{ marginTop: spacing.md, flexDirection: 'row', gap: 2, borderRadius: radius.md, overflow: 'hidden' }}>
        {media.map((item, i) => (
          <TouchableOpacity key={i} activeOpacity={0.9} onPress={() => onMediaPress?.(i)}>
            <Image
              source={{ uri: cleanPhoto(item.url) || item.url }}
              style={{ width: half, height: half * 0.9 }}
              contentFit="cover"
              transition={200}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  // 3-image grid: first image full width top, two below
  if (media.length === 3) {
    const half = (MEDIA_WIDTH - 2) / 2;
    return (
      <View style={{ marginTop: spacing.md, borderRadius: radius.md, overflow: 'hidden', gap: 2 }}>
        <TouchableOpacity activeOpacity={0.9} onPress={() => onMediaPress?.(0)}>
          <Image
            source={{ uri: cleanPhoto(media[0].url) || media[0].url }}
            style={{ width: MEDIA_WIDTH, height: MEDIA_WIDTH * 0.5 }}
            contentFit="cover"
            transition={200}
          />
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', gap: 2 }}>
          {media.slice(1, 3).map((item, i) => (
            <TouchableOpacity key={i} activeOpacity={0.9} onPress={() => onMediaPress?.(i + 1)}>
              <Image
                source={{ uri: cleanPhoto(item.url) || item.url }}
                style={{ width: half, height: half * 0.7 }}
                contentFit="cover"
                transition={200}
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  // 4+ images: 2x2 grid, last one shows +N overlay
  const quarter = (MEDIA_WIDTH - 2) / 2;
  return (
    <View style={{ marginTop: spacing.md, borderRadius: radius.md, overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', gap: 2, marginBottom: 2 }}>
        {media.slice(0, 2).map((item, i) => (
          <TouchableOpacity key={i} activeOpacity={0.9} onPress={() => onMediaPress?.(i)}>
            <Image
              source={{ uri: cleanPhoto(item.url) || item.url }}
              style={{ width: quarter, height: quarter * 0.8 }}
              contentFit="cover"
              transition={200}
            />
          </TouchableOpacity>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 2 }}>
        {media.slice(2, 4).map((item, i) => (
          <TouchableOpacity
            key={i}
            activeOpacity={0.9}
            onPress={() => onMediaPress?.(i + 2)}
            style={{ width: quarter, height: quarter * 0.8 }}
          >
            <Image
              source={{ uri: cleanPhoto(item.url) || item.url }}
              style={{ width: quarter, height: quarter * 0.8 }}
              contentFit="cover"
              transition={200}
            />
            {i === 1 && media.length > 4 && (
              <View style={{ backgroundColor: 'rgba(0,0,0,0.6)', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#fff', ...typography.display }}>+{media.length - 4}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
