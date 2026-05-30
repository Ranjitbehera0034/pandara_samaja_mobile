// src/screens/SplashScreen.tsx
import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Dimensions } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

const { width } = Dimensions.get('window');

export default function AnimatedSplash({ onFinish }: { onFinish: () => void }) {
  const logoScale = useRef(new Animated.Value(0.7)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    SplashScreen.hideAsync();

    Animated.sequence([
      // Logo appears
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      // Tagline fades in
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 400,
        delay: 200,
        useNativeDriver: true,
      }),
      // Hold
      Animated.delay(800),
      // Fade out
      Animated.timing(logoOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => onFinish());
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center' }}>
      {/* Glow effect */}
      <Animated.View
        style={{
          position: 'absolute',
          width: 200,
          height: 200,
          borderRadius: 100,
          backgroundColor: '#2563eb',
          opacity: glowOpacity.interpolate({ inputRange: [0, 1], outputRange: [0, 0.15] }),
          // blur via shadow on iOS
          shadowColor: '#2563eb',
          shadowOffset: { width: 0, height: 0 },
          shadowRadius: 60,
          shadowOpacity: 0.6,
        }}
      />

      <Animated.View
        style={{
          opacity: logoOpacity,
          transform: [{ scale: logoScale }],
          alignItems: 'center',
        }}
      >
        {/* P logo — replace with actual Image if asset exists */}
        <View style={{
          width: 96, height: 96, borderRadius: 24,
          backgroundColor: '#1e293b',
          borderWidth: 1, borderColor: '#334155',
          alignItems: 'center', justifyContent: 'center',
          shadowColor: '#2563eb', shadowOffset: { width: 0, height: 4 },
          shadowRadius: 20, shadowOpacity: 0.4,
        }}>
          <Text style={{ fontSize: 48, fontWeight: '900', color: '#2563eb' }}>P</Text>
        </View>

        <Text style={{ color: '#f8fafc', fontSize: 22, fontWeight: '700', marginTop: 20, letterSpacing: 0.5 }}>
          Pandara Samaja
        </Text>
        <Animated.Text style={{ color: '#94a3b8', fontSize: 13, marginTop: 6, opacity: taglineOpacity }}>
          ନିଖିଳ ଓଡ଼ିଶା ପଣ୍ଡାର ସମାଜ
        </Animated.Text>
      </Animated.View>
    </View>
  );
}
