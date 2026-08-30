// src/components/feed/FacebookEmbed.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Image, ActivityIndicator, Linking } from 'react-native';
import { ExternalLink, Users } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { isFacebookPageUrl } from '../../utils/facebook';
import { fetchFacebookLinkPreview, FacebookLinkPreview } from '../../api/feed';

interface Props {
  url: string;
}

// Meta's oEmbed API can't reliably tell a post apart from a video for
// facebook.com/share/... links — oembed_post fails outright on the
// generic share-link shape (confirmed live, error code 100 regardless of
// what the content actually is), so every share link fell through to
// oembed_video, which "succeeds" even for plain text/photo posts by
// returning a generic fb-video wrapper pointed at content that isn't a
// video. Rendering that wrapper in a WebView just shows Facebook's own
// "video isn't available" error page — which itself renders inside an
// <iframe>, so the old iframe-presence detection script couldn't tell
// that apart from a real working embed either. Confirmed live: a plain
// text post from a Facebook Page rendered exactly this way.
//
// Scraping Open Graph tags (title/description/image) instead — the same
// approach WhatsApp/Telegram/iMessage link previews use — sidesteps the
// whole problem: it doesn't need to know whether the link is a video, a
// photo, or a text post, and Facebook always fills in those tags
// regardless of content type.
function openInFacebook(url: string) {
  Linking.openURL(url).catch(() => {});
}

export default function FacebookEmbed({ url }: Props) {
  const { colors, radius, spacing, typography } = useTheme();
  const [preview, setPreview] = useState<FacebookLinkPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (isFacebookPageUrl(url)) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setFailed(false);
    fetchFacebookLinkPreview(url)
      .then(res => {
        if (cancelled) return;
        if (res.success && res.preview) {
          setPreview(res.preview);
        } else {
          setFailed(true);
        }
      })
      .catch(() => { if (!cancelled) setFailed(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [url]);

  // A bare page/profile link has no single post to preview — show a
  // distinct, honest card up front rather than fetch a preview for it.
  if (isFacebookPageUrl(url)) {
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => openInFacebook(url)}
        style={{
          flexDirection: 'row', alignItems: 'center', gap: 10,
          borderRadius: radius.md, overflow: 'hidden', backgroundColor: '#0866FF',
          marginTop: 8, padding: 14,
        }}
      >
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
          <Users size={20} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#fff', fontWeight: '600' }}>Facebook Page</Text>
          <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 1 }}>Tap to view on Facebook</Text>
        </View>
        <ExternalLink size={18} color="#fff" />
      </TouchableOpacity>
    );
  }

  if (loading) {
    return (
      <View style={{ borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, marginTop: 8, padding: spacing.lg, alignItems: 'center' }}>
        <ActivityIndicator color={colors.textMuted} />
      </View>
    );
  }

  // Preview fetch failed, or Facebook returned no usable Open Graph data —
  // degrade to a plain "open in Facebook" card rather than show nothing.
  if (failed || !preview) {
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => openInFacebook(url)}
        style={{
          flexDirection: 'row', alignItems: 'center', gap: 10,
          borderRadius: radius.md, overflow: 'hidden', backgroundColor: '#0866FF',
          marginTop: 8, padding: 14,
        }}
      >
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
          <ExternalLink size={20} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#fff', fontWeight: '600' }}>Couldn't load preview</Text>
          <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 1 }}>Tap to view on Facebook</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => openInFacebook(url)}
      style={{
        borderRadius: radius.md, overflow: 'hidden', borderWidth: 1, borderColor: colors.border,
        backgroundColor: colors.card, marginTop: 8,
      }}
    >
      {preview.image && (
        <Image source={{ uri: preview.image }} style={{ width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000' }} resizeMode="cover" />
      )}
      <View style={{ padding: spacing.md, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={{ color: colors.textFaint, ...typography.caption, textTransform: 'uppercase' }}>
            {preview.siteName || 'facebook.com'}
          </Text>
        </View>
        {preview.title && (
          <Text style={{ color: colors.text, ...typography.body, fontWeight: '700' }} numberOfLines={2}>
            {preview.title}
          </Text>
        )}
        {preview.description && (
          <Text style={{ color: colors.textMuted, ...typography.caption }} numberOfLines={2}>
            {preview.description}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}
