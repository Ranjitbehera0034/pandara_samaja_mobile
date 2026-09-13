// src/screens/common/InAppWebViewScreen.tsx
// Generic in-app browser — used for course lessons on platforms with no
// embeddable video player (Udemy/Coursera/etc. provide no public API for
// arbitrary paywalled/DRM content), so the member stays inside the app
// shell instead of being handed off to the system browser. This is just
// their own page rendered in a WebView, same as any browser tab would —
// no ad-blocking, no interference with the page's own content or ads.
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { WebView } from 'react-native-webview';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, ExternalLink } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';

export default function InAppWebViewScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { url, title } = route.params;
  const insets = useSafeAreaInsets();
  const { colors: C, spacing, radius, typography } = useTheme();
  const [loading, setLoading] = useState(true);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.goBack(); }} style={{ padding: spacing.xs, borderRadius: radius.full, backgroundColor: C.card }}>
          <ArrowLeft size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={{ color: C.text, flex: 1, ...typography.bodyEmphasis }} numberOfLines={1}>{title}</Text>
        <TouchableOpacity
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); Linking.openURL(url).catch(() => {}); }}
          style={{ padding: spacing.xs, borderRadius: radius.full, backgroundColor: C.card }}
        >
          <ExternalLink size={18} color={C.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1 }}>
        <WebView
          source={{ uri: url }}
          style={{ flex: 1 }}
          onLoadEnd={() => setLoading(false)}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
        />
        {loading && (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg }}>
            <ActivityIndicator size="large" color={C.primary} />
          </View>
        )}
      </View>
    </View>
  );
}
