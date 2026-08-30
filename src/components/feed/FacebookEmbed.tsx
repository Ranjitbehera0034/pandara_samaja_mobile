// src/components/feed/FacebookEmbed.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Image, ActivityIndicator, Linking } from 'react-native';
import { WebView } from 'react-native-webview';
import { ExternalLink, Users, Play } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { isFacebookPageUrl } from '../../utils/facebook';
import { fetchFacebookContent, FacebookContent } from '../../api/feed';

interface Props {
  url: string;
}

// facebook.com/share/... links are wrapper redirects, and Meta's oEmbed
// API can't reliably tell a post apart from a video for the wrapper shape
// itself — oembed_post fails outright on it (confirmed live, error code
// 100 regardless of actual content), and oembed_video "succeeds" against
// it but Facebook then refuses to actually play the video (its own "video
// isn't available" error renders in place of the player). The backend
// resolves the wrapper to its canonical URL first (facebook.com/reel/... or
// .../videos/...) and only then requests the embed — confirmed live that
// THAT is what actually plays. Anything that doesn't resolve to a
// canonical video/reel path (plain posts, photos) gets a WhatsApp-style
// Open Graph link preview instead, the same approach WhatsApp/Telegram
// use — no oEmbed guessing needed for those.
function openInFacebook(url: string) {
  Linking.openURL(url).catch(() => {});
}

function wrapperHtml(oembedHtml: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <style>
    body,html{margin:0;padding:0;background:#000;height:100%;}
    .fb-video, .fb-video iframe, .fb-video span, .fb-video iframe span {
      width:100% !important;
      height:100% !important;
    }
  </style>
</head>
<body>${oembedHtml}</body>
</html>`;
}

function FacebookPageCard({ url, label }: { url: string; label: string }) {
  const { radius } = useTheme();
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
        <Text style={{ color: '#fff', fontWeight: '600' }}>{label}</Text>
        <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 1 }}>Tap to view on Facebook</Text>
      </View>
      <ExternalLink size={18} color="#fff" />
    </TouchableOpacity>
  );
}

// Thumbnail-first, tap to load the real WebView — same "don't load N
// WebViews in a feed at once" principle YouTubeEmbed already uses. Always
// shows a persistent "Open in Facebook" corner button rather than trying
// to auto-detect embed failure: a cross-origin iframe's content can't be
// inspected from injected JS, so there's no reliable way to tell a real
// player apart from Facebook's own error page from the outside — offering
// a guaranteed-working way out is more honest than pretending we can.
function FacebookVideoEmbed({ url, embedHtml, image }: { url: string; embedHtml: string; image: string | null }) {
  const { colors, radius } = useTheme();
  const [playing, setPlaying] = useState(false);
  const isReel = /\/share\/r\//i.test(url);

  if (playing) {
    return (
      <View style={{ aspectRatio: isReel ? 9 / 16 : 16 / 9, maxHeight: 500, borderRadius: radius.md, overflow: 'hidden', backgroundColor: '#000', marginTop: 8 }}>
        <WebView
          source={{ html: wrapperHtml(embedHtml), baseUrl: 'https://www.facebook.com' }}
          style={{ flex: 1, backgroundColor: '#000' }}
          allowsFullscreenVideo
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled
          domStorageEnabled
        />
        <TouchableOpacity
          onPress={() => openInFacebook(url)}
          style={{
            position: 'absolute', top: 8, right: 8,
            flexDirection: 'row', alignItems: 'center', gap: 4,
            backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingVertical: 5,
            borderRadius: 6,
          }}
        >
          <ExternalLink size={12} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>Facebook</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => setPlaying(true)}
      style={{
        aspectRatio: isReel ? 9 / 16 : 16 / 9, maxHeight: 500,
        borderRadius: radius.md, overflow: 'hidden', backgroundColor: '#000',
        marginTop: 8, alignItems: 'center', justifyContent: 'center',
      }}
    >
      {image && (
        <Image source={{ uri: image }} style={{ position: 'absolute', width: '100%', height: '100%' }} resizeMode="cover" />
      )}
      <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}>
        <Play size={26} color="#fff" fill="#fff" style={{ marginLeft: 3 }} />
      </View>
    </TouchableOpacity>
  );
}

export default function FacebookEmbed({ url }: Props) {
  const { colors, radius, spacing, typography } = useTheme();
  const [content, setContent] = useState<FacebookContent | null>(null);
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
    fetchFacebookContent(url)
      .then(res => {
        if (cancelled) return;
        if (res.success && res.content) {
          setContent(res.content);
        } else {
          setFailed(true);
        }
      })
      .catch(() => { if (!cancelled) setFailed(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [url]);

  // A bare page/profile link has no single post to preview — show a
  // distinct, honest card up front rather than fetch anything for it.
  if (isFacebookPageUrl(url)) {
    return <FacebookPageCard url={url} label="Facebook Page" />;
  }

  if (loading) {
    return (
      <View style={{ borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, marginTop: 8, padding: spacing.lg, alignItems: 'center' }}>
        <ActivityIndicator color={colors.textMuted} />
      </View>
    );
  }

  // Fetch failed, or Facebook returned no usable data — degrade to a
  // plain "open in Facebook" card rather than show nothing.
  if (failed || !content) {
    return <FacebookPageCard url={url} label="Couldn't load preview" />;
  }

  if (content.type === 'video') {
    return <FacebookVideoEmbed url={url} embedHtml={content.embedHtml} image={content.image} />;
  }

  const { preview } = content;
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
