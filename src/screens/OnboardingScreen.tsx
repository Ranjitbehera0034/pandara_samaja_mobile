// src/screens/OnboardingScreen.tsx
import React, { useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, useWindowDimensions,
  ScrollView, Animated
} from 'react-native';
import { storage } from '../utils/secureStorage';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

const SLIDE_META = [
  { emoji: '🏛️', titleKey: 'slide1Title', bodyKey: 'slide1Body', accentKey: 'primary' as const },
  { emoji: '👨👩👧👦', titleKey: 'slide2Title', bodyKey: 'slide2Body', accentKey: 'accent' as const },
  { emoji: '📢', titleKey: 'slide3Title', bodyKey: 'slide3Body', accentKey: 'female' as const },
  { emoji: '🔒', titleKey: 'slide4Title', bodyKey: 'slide4Body', accentKey: 'success' as const },
];

export default function OnboardingScreen({ onComplete }: { onComplete: () => void }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const { width: W } = useWindowDimensions();
  const { colors, spacing, radius, typography } = useTheme();
  const { lang, t } = useLanguage();
  const fontRegular = lang === 'od' ? 'NotoSansOriya' : undefined;
  const fontBold = lang === 'od' ? 'NotoSansOriya-Bold' : undefined;

  const SLIDES = SLIDE_META.map((m) => ({
    emoji: m.emoji,
    title: t('onboarding', m.titleKey),
    body: t('onboarding', m.bodyKey),
    accent: colors[m.accentKey],
  }));

  const goTo = (index: number) => {
    scrollRef.current?.scrollTo({ x: W * index, animated: true });
    setActiveIndex(index);
  };

  const handleScroll = (e: any) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / W);
    setActiveIndex(index);
  };

  const finish = async () => {
    await storage.setItem('onboardingComplete', 'true');
    onComplete();
  };

  const slide = SLIDES[activeIndex];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {SLIDES.map((s, i) => (
          <View key={i} style={{ width: W, flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xxl }}>
            <View style={{
              width: 120, height: 120, borderRadius: radius.xl,
              backgroundColor: s.accent + '20',
              borderWidth: 1, borderColor: s.accent + '40',
              alignItems: 'center', justifyContent: 'center',
              marginBottom: spacing.xxl,
            }}>
              <Text style={{ fontSize: 56 }}>{s.emoji}</Text>
            </View>
            <Text style={{ color: colors.text, textAlign: 'center', marginBottom: spacing.sm, fontFamily: fontBold, ...typography.display }}>
              {s.title}
            </Text>
            <Text style={{ color: colors.textMuted, textAlign: 'center', fontFamily: fontRegular, ...typography.body }}>
              {s.body}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* Dots */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.xs + 2, marginBottom: spacing.xl }}>
        {SLIDES.map((_, i) => (
          <View key={i} style={{
            width: activeIndex === i ? 20 : 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: activeIndex === i ? slide.accent : colors.border,
          }} />
        ))}
      </View>

      {/* Actions */}
      <View style={{ paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl + spacing.sm, flexDirection: 'row', gap: spacing.md }}>
        {activeIndex < SLIDES.length - 1 ? (
          <>
            <TouchableOpacity onPress={finish} style={{ flex: 1, paddingVertical: spacing.md + 2, alignItems: 'center' }}>
              <Text style={{ color: colors.textFaint, fontFamily: fontRegular, ...typography.body }}>
                {t('onboarding', 'skip')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => goTo(activeIndex + 1)}
              style={{ flex: 2, backgroundColor: slide.accent, paddingVertical: spacing.md + 2, borderRadius: radius.lg, alignItems: 'center' }}
            >
              <Text style={{ color: 'white', fontFamily: fontBold, ...typography.label, fontWeight: '700' }}>
                {t('onboarding', 'next')}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            onPress={finish}
            style={{ flex: 1, backgroundColor: slide.accent, paddingVertical: spacing.md + 2, borderRadius: radius.lg, alignItems: 'center' }}
          >
            <Text style={{ color: 'white', fontFamily: fontBold, ...typography.label, fontWeight: '700' }}>
              {t('onboarding', 'getStarted')}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
