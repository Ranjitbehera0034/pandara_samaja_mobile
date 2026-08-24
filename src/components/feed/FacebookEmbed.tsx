// src/components/feed/FacebookEmbed.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { WebView } from 'react-native-webview';
import { Play, ExternalLink } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';

interface Props {
  url: string;
}

// Meta's oEmbed only works tokenless on these two endpoints (confirmed
// live — instagram_oembed requires an app access token even post the
// "tokenless" change some blog posts describe for a different embed
// mechanism). A /share/xxx/ link gives no clue whether it's a text/photo
// post or a video, so try post first and fall back to video rather than
// guess from the URL shape.
const OEMBED_ENDPOINTS = [
  (url: string) => `https://graph.facebook.com/v21.0/oembed_post?url=${encodeURIComponent(url)}`,
  (url: string) => `https://graph.facebook.com/v21.0/oembed_video?url=${encodeURIComponent(url)}`,
];

async function fetchEmbedHtml(url: string): Promise<string | null> {
  for (const buildEndpoint of OEMBED_ENDPOINTS) {
    try {
      const res = await fetch(buildEndpoint(url));
      if (!res.ok) continue;
      const data = await res.json();
      if (data?.html) return data.html as string;
    } catch {
      // try the next endpoint
    }
  }
  return null;
}

// Meta's own JS renders a real <iframe> inside the fb-video/fb-post div on
// success; on failure (privacy-restricted, geo-blocked, re-shared content
// the sharer doesn't have distribution rights to — all real, common, and
// entirely Facebook's call, not something fixable client-side) it renders
// its own "video isn't available" page instead, with no iframe at all and
// no reliable event to listen for. Polling for the iframe's presence a few
// seconds after load is what actually distinguishes the two cases.
const DETECT_SCRIPT = `
(function () {
  var attempts = 0;
  var timer = setInterval(function () {
    attempts++;
    var hasIframe = !!document.querySelector('.fb-video iframe, .fb-post iframe');
    if (hasIframe) {
      clearInterval(timer);
      window.ReactNativeWebView.postMessage('success');
    } else if (attempts >= 6) {
      clearInterval(timer);
      window.ReactNativeWebView.postMessage('unavailable');
    }
  }, 1000);
  true;
})();
`;

function wrapperHtml(oembedHtml: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <style>body,html{margin:0;padding:0;background:#000;display:flex;align-items:center;justify-content:center;}</style>
</head>
<body>${oembedHtml}</body>
</html>`;
}

// Facebook's oEmbed gives no thumbnail without an app token (confirmed —
// requesting extra fields to get one demands a valid app id), so unlike
// YouTubeEmbed there's no cheap real preview image to show up front.
// Same "don't load N WebViews at once in a feed" principle still applies:
// show a plain placeholder, only fetch + render the real embed on tap.
export default function FacebookEmbed({ url }: Props) {
  const { colors, radius } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [html, setHtml] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  // Set once the in-page detection script reports no real video/post
  // iframe ever appeared — Facebook's own error page is still sitting
  // underneath, just not shown.
  const [renderFailed, setRenderFailed] = useState(false);

  const openInFacebook = () => {
    Linking.openURL(url).catch(() => {});
  };

  const handleExpand = async () => {
    setExpanded(true);
    setLoading(true);
    const result = await fetchEmbedHtml(url);
    if (result) {
      setHtml(result);
    } else {
      setFailed(true);
    }
    setLoading(false);
  };

  if (expanded && html && !renderFailed) {
    return (
      <View style={{ minHeight: 300, borderRadius: radius.md, overflow: 'hidden', backgroundColor: '#000', marginTop: 8 }}>
        <WebView
          source={{ html: wrapperHtml(html), baseUrl: 'https://www.facebook.com' }}
          style={{ flex: 1, backgroundColor: '#000' }}
          allowsFullscreenVideo
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled
          domStorageEnabled
          scalesPageToFit
          injectedJavaScript={DETECT_SCRIPT}
          onMessage={(event) => {
            if (event.nativeEvent.data === 'unavailable') setRenderFailed(true);
          }}
        />
        <TouchableOpacity
          onPress={openInFacebook}
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
      onPress={failed || renderFailed ? openInFacebook : handleExpand}
      style={{
        aspectRatio: 16 / 9,
        borderRadius: radius.md,
        overflow: 'hidden',
        backgroundColor: '#0866FF',
        marginTop: 8,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : failed || renderFailed ? (
        <View style={{ alignItems: 'center', gap: 8 }}>
          <ExternalLink size={28} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '600' }}>Couldn't load preview — open in Facebook</Text>
        </View>
      ) : (
        <View style={{ alignItems: 'center', gap: 8 }}>
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
            <Play size={26} color="#fff" fill="#fff" style={{ marginLeft: 3 }} />
          </View>
          <Text style={{ color: '#fff', fontWeight: '600' }}>View on Facebook</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
