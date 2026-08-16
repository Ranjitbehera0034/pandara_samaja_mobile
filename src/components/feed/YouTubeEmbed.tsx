// src/components/feed/YouTubeEmbed.tsx
import React, { useState } from 'react';
import { View, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { Play } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';

interface Props {
  videoId: string;
}

// Embeds the real youtube.com/embed iframe player (via WebView) rather than
// a custom-built one, so seek bar, captions, quality and fullscreen are all
// genuinely YouTube's own controls. Thumbnail-first so a feed full of posts
// doesn't load a WebView per video up front.
export default function YouTubeEmbed({ videoId }: Props) {
  const { radius } = useTheme();
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);

  return (
    <View
      style={{
        aspectRatio: 16 / 9,
        borderRadius: radius.md,
        overflow: 'hidden',
        backgroundColor: '#000',
        marginTop: 8,
      }}
    >
      {playing ? (
        <>
          <WebView
            source={{ uri: `https://www.youtube.com/embed/${videoId}?playsinline=1&autoplay=1&rel=0` }}
            style={{ flex: 1, backgroundColor: '#000' }}
            allowsFullscreenVideo
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            javaScriptEnabled
            domStorageEnabled
            onLoadEnd={() => setLoading(false)}
          />
          {loading && (
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator color="#fff" />
            </View>
          )}
        </>
      ) : (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => { setPlaying(true); setLoading(true); }}
          style={{ flex: 1 }}
        >
          <Image
            source={{ uri: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` }}
            style={{ flex: 1 }}
            resizeMode="cover"
          />
          <View
            style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              alignItems: 'center', justifyContent: 'center',
              backgroundColor: '#00000033',
            }}
          >
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#ff0000e6', alignItems: 'center', justifyContent: 'center' }}>
              <Play size={26} color="#fff" fill="#fff" style={{ marginLeft: 3 }} />
            </View>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}
