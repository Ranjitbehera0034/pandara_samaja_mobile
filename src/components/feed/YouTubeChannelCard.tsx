// src/components/feed/YouTubeChannelCard.tsx
// A youtube.com/@handle (or /channel/, /c/, /user/) link has no single
// video to embed — same "page vs content" distinction FacebookEmbed makes
// for a bare Facebook Page link, just for YouTube channels instead.
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Image, Linking } from 'react-native';
import { ExternalLink, Video } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { fetchYouTubeChannelPreview } from '../../api/feed';

interface Props {
  url: string;
}

export default function YouTubeChannelCard({ url }: Props) {
  const { radius } = useTheme();
  const [title, setTitle] = useState<string | null>(null);
  const [image, setImage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchYouTubeChannelPreview(url)
      .then(res => {
        if (cancelled || !res.success || !res.preview) return;
        setTitle(res.preview.title);
        setImage(res.preview.image);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [url]);

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => Linking.openURL(url).catch(() => {})}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 10,
        borderRadius: radius.md, overflow: 'hidden', backgroundColor: '#FF0000',
        marginTop: 8, padding: 14,
      }}
    >
      {image ? (
        <Image source={{ uri: image }} style={{ width: 40, height: 40, borderRadius: 20 }} />
      ) : (
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
          <Video size={20} color="#fff" />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={{ color: '#fff', fontWeight: '600' }} numberOfLines={1}>{title || 'YouTube Channel'}</Text>
        <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 1 }}>Tap to view on YouTube</Text>
      </View>
      <ExternalLink size={18} color="#fff" />
    </TouchableOpacity>
  );
}
