// src/components/feed/YouTubeEmbed.tsx
import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { WebView } from 'react-native-webview';
import { Play, ExternalLink } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';

interface Props {
  videoId: string;
}

// Navigating a WebView's top-level page directly to youtube.com/embed/ID
// with no Referer header gets rejected by YouTube's player (error 153).
// Wrapping it in a local HTML page with a referrerpolicy attribute
// (tried first) downgrades that to error 152-4 ("video not available")
// instead of fixing it — a synthetic HTML string loaded via source.html
// has no real origin of its own for a referrer policy to inherit from,
// so the browser still sends no Referer. Forcing a genuine Referer
// header via source.headers on a direct URI request is the fix that
// actually produces a real HTTP header on the request YouTube checks.
function embedUri(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}?playsinline=1&autoplay=1&rel=0`;
}

// Embeds the real youtube.com/embed iframe player (via WebView) rather than
// a custom-built one, so seek bar, captions, quality and fullscreen are all
// genuinely YouTube's own controls. Thumbnail-first so a feed full of posts
// doesn't load a WebView per video up front.
export default function YouTubeEmbed({ videoId }: Props) {
  const { radius } = useTheme();
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);

  // Some videos have embedding disabled by their owner — no client-side
  // fix can play those inline, that's YouTube enforcing the uploader's
  // choice server-side. Rather than leave someone staring at a broken
  // player with no way forward, always offer a guaranteed-working path
  // to the real video.
  const openInYouTube = () => {
    Linking.openURL(`https://www.youtube.com/watch?v=${videoId}`).catch(() => {});
  };

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
            source={{ uri: embedUri(videoId), headers: { Referer: 'https://www.youtube.com/' } }}
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
          <TouchableOpacity
            onPress={openInYouTube}
            style={{
              position: 'absolute', top: 8, right: 8,
              flexDirection: 'row', alignItems: 'center', gap: 4,
              backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingVertical: 5,
              borderRadius: 6,
            }}
          >
            <ExternalLink size={12} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>YouTube</Text>
          </TouchableOpacity>
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
