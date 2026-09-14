import React, { useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Reanimated, {
  useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, withDelay, Easing,
} from 'react-native-reanimated';
import * as SplashScreen from 'expo-splash-screen';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { getActiveOccasion } from '../theme/occasions';

SplashScreen.preventAutoHideAsync();

// Slow ambient drift — small scale/position float, looping forever for as
// long as this screen is mounted (a few seconds). Purely decorative depth
// behind the logo; replaces the old single static glow circle.
function FloatingBlob({ color, size, style, duration, delay }: {
  color: string; size: number; style: any; duration: number; delay: number;
}) {
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    translateY.value = withDelay(delay, withRepeat(
      withSequence(
        withTiming(-18, { duration, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration, easing: Easing.inOut(Easing.sin) })
      ),
      -1, true
    ));
    scale.value = withDelay(delay, withRepeat(
      withSequence(
        withTiming(1.1, { duration: duration * 1.15, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: duration * 1.15, easing: Easing.inOut(Easing.sin) })
      ),
      -1, true
    ));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  return (
    <Reanimated.View
      style={[style, animStyle, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]}
    />
  );
}

export default function AnimatedSplash({ onFinish }: { onFinish: () => void }) {
  const { colors, shadow } = useTheme();
  const { lang, t } = useLanguage();
  // A festival day gets its own gradient/ring/emoji treatment here too —
  // the same occasion data already driving the Feed header tint and logo
  // ring, so the app's very first screen matches instead of only picking
  // up the festive look once you're past login.
  const occasion = getActiveOccasion();
  const fontRegular = lang === 'od' ? 'NotoSansOriya' : undefined;
  const fontBold = lang === 'od' ? 'NotoSansOriya-Bold' : undefined;

  const logoScale = useRef(new Animated.Value(0.7)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const blobColors = occasion ? occasion.ringColors : [colors.primary, colors.accent, colors.primary];

  return (
    <LinearGradient
      colors={occasion ? [colors.bg, occasion.accentColor + '1f', colors.bg] : [colors.bg, colors.primary + '14', colors.bg]}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
    >
      <FloatingBlob color={blobColors[0] + '2e'} size={190} style={{ position: 'absolute', top: '16%', left: '6%' }} duration={3200} delay={0} />
      <FloatingBlob color={blobColors[2] + '26'} size={150} style={{ position: 'absolute', bottom: '18%', right: '8%' }} duration={2800} delay={350} />
      <FloatingBlob color={blobColors[1] + '20'} size={110} style={{ position: 'absolute', top: '30%', right: '14%' }} duration={2400} delay={700} />

      <Animated.View
        style={{
          opacity: logoOpacity,
          transform: [{ scale: logoScale }],
          alignItems: 'center',
        }}
      >
        {occasion ? (
          <LinearGradient
            colors={occasion.ringColors}
            style={{
              width: 128, height: 128, borderRadius: 64, padding: 4,
              alignItems: 'center', justifyContent: 'center',
              shadowColor: occasion.accentColor, shadowOffset: { width: 0, height: 4 }, shadowRadius: 20, shadowOpacity: 0.5,
            }}
          >
            <Image
              source={require('../../assets/logo.png')}
              style={{ width: 120, height: 120, borderRadius: 60 }}
              contentFit="cover"
            />
          </LinearGradient>
        ) : (
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
        )}

        <Text style={{ color: colors.text, fontSize: 22, fontWeight: '700', marginTop: 20, letterSpacing: 0.5, fontFamily: fontBold }}>
          {t('common', 'appName')}
        </Text>
        {occasion && (
          <Text style={{ fontSize: 26, marginTop: 6 }} numberOfLines={1} adjustsFontSizeToFit>{occasion.emoji}</Text>
        )}
        <Animated.Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 6, opacity: taglineOpacity, fontFamily: fontRegular }}>
          {t('settings', 'footerName')}
        </Animated.Text>
      </Animated.View>
    </LinearGradient>
  );
}
