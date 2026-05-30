// src/screens/OnboardingScreen.tsx
import React, { useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, Dimensions,
  ScrollView, Animated
} from 'react-native';
import { storage } from '../utils/secureStorage';

const { width: W } = Dimensions.get('window');

const SLIDES = [
  {
    emoji: '🏛️',
    title: 'Welcome to Pandara Samaja',
    titleOdia: 'ପଣ୍ଡାର ସମାଜ',
    body: 'Connect with 10,000+ members of the Nikhila Odisha Pandara Samaja community across Odisha.',
    accent: '#2563eb',
  },
  {
    emoji: '👨👩👧👦',
    title: 'Your Family, Connected',
    titleOdia: 'ଆପଣଙ୍କ ପରିବାର',
    body: 'Explore the community member directory. Follow, message, and stay connected with your people.',
    accent: '#4f46e5',
  },
  {
    emoji: '📢',
    title: 'Stay Informed',
    titleOdia: 'ଖବର ଓ ଘୋଷଣା',
    body: 'Get community announcements, event updates, leader news, and matrimony listings — all in one place.',
    accent: '#ec4899',
  },
  {
    emoji: '🔒',
    title: 'Members Only',
    titleOdia: 'ସୁରକ୍ଷିତ ପ୍ରବେଶ',
    body: 'Login with your registered mobile number. Your data is secure and only visible to community members.',
    accent: '#22c55e',
  },
];

export default function OnboardingScreen({ onComplete }: { onComplete: () => void }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

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
    <View style={{ flex: 1, backgroundColor: '#0f172a' }}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {SLIDES.map((s, i) => (
          <View key={i} style={{ width: W, flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
            <View style={{
              width: 120, height: 120, borderRadius: 32,
              backgroundColor: s.accent + '20',
              borderWidth: 1, borderColor: s.accent + '40',
              alignItems: 'center', justifyContent: 'center',
              marginBottom: 32,
            }}>
              <Text style={{ fontSize: 56 }}>{s.emoji}</Text>
            </View>
            <Text style={{ color: '#f8fafc', fontSize: 24, fontWeight: '800', textAlign: 'center', marginBottom: 6 }}>
              {s.title}
            </Text>
            <Text style={{ color: s.accent, fontSize: 14, marginBottom: 16, opacity: 0.8 }}>
              {s.titleOdia}
            </Text>
            <Text style={{ color: '#94a3b8', fontSize: 15, textAlign: 'center', lineHeight: 22 }}>
              {s.body}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* Dots */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 24 }}>
        {SLIDES.map((_, i) => (
          <View key={i} style={{
            width: activeIndex === i ? 20 : 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: activeIndex === i ? slide.accent : '#334155',
          }} />
        ))}
      </View>

      {/* Actions */}
      <View style={{ paddingHorizontal: 24, paddingBottom: 40, flexDirection: 'row', gap: 12 }}>
        {activeIndex < SLIDES.length - 1 ? (
          <>
            <TouchableOpacity onPress={finish} style={{ flex: 1, paddingVertical: 14, alignItems: 'center' }}>
              <Text style={{ color: '#64748b', fontSize: 15 }}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => goTo(activeIndex + 1)}
              style={{ flex: 2, backgroundColor: slide.accent, paddingVertical: 14, borderRadius: 16, alignItems: 'center' }}
            >
              <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>Next →</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            onPress={finish}
            style={{ flex: 1, backgroundColor: slide.accent, paddingVertical: 14, borderRadius: 16, alignItems: 'center' }}
          >
            <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>Get Started</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
