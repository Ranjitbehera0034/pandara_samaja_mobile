import React, { useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';
import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

SplashScreen.preventAutoHideAsync();

export default function AnimatedSplash({ onFinish }: { onFinish: () => void }) {
  const { colors } = useTheme();
  const { lang, t } = useLanguage();
  const fontRegular = lang === 'od' ? 'NotoSansOriya' : undefined;
  const fontBold = lang === 'od' ? 'NotoSansOriya-Bold' : undefined;

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
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
      {/* Glow effect */}
      <Animated.View
        style={{
          position: 'absolute',
          width: 200,
          height: 200,
          borderRadius: 100,
          backgroundColor: colors.primary,
          opacity: glowOpacity.interpolate({ inputRange: [0, 1], outputRange: [0, 0.15] }),
          // blur via shadow on iOS
          shadowColor: colors.primary,
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
        <View style={{
          width: 112, height: 112, borderRadius: 56,
          alignItems: 'center', justifyContent: 'center',
          shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 },
          shadowRadius: 20, shadowOpacity: 0.4,
        }}>
          <Image
            source={require('../../assets/logo.png')}
            style={{ width: 112, height: 112, borderRadius: 56 }}
            contentFit="cover"
          />
        </View>

        <Text style={{ color: colors.text, fontSize: 22, fontWeight: '700', marginTop: 20, letterSpacing: 0.5, fontFamily: fontBold }}>
          {t('common', 'appName')}
        </Text>
        <Animated.Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 6, opacity: taglineOpacity, fontFamily: fontRegular }}>
          {t('settings', 'footerName')}
        </Animated.Text>
      </Animated.View>
    </View>
  );
}
