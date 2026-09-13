// src/screens/community/LessonPlayerScreen.tsx
// In-app YouTube lesson playback — the real youtube.com/embed iframe
// player (via YouTubeEmbed, already used in the feed), so seek bar,
// captions, quality and fullscreen are genuinely YouTube's own controls,
// ads included exactly as YouTube would normally show them. Reaching
// this screen at all is the "watch" action, so playback starts
// immediately rather than requiring a second tap-to-play.
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import YouTubeEmbed from '../../components/feed/YouTubeEmbed';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

export default function LessonPlayerScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { videoId, title } = route.params;
  const insets = useSafeAreaInsets();
  const { colors: C, spacing, radius, typography } = useTheme();
  const { lang } = useLanguage();
  const fontBold = lang === 'od' ? 'NotoSansOriya-Bold' : undefined;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.goBack(); }} style={{ padding: spacing.xs, borderRadius: radius.full, backgroundColor: C.card }}>
          <ArrowLeft size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={{ color: C.text, fontFamily: fontBold, flex: 1, ...typography.bodyEmphasis }} numberOfLines={1}>{title}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <YouTubeEmbed videoId={videoId} autoPlay />
      </ScrollView>
    </View>
  );
}
