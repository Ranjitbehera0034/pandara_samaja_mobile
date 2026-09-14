import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Sun, Flag, Landmark, Sparkles, Heart, Music, BookOpen, Gift, PartyPopper, Flame,
} from 'lucide-react-native';
import Reanimated, {
  useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, withDelay, Easing,
} from 'react-native-reanimated';
import * as SplashScreen from 'expo-splash-screen';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { getTodayFestival, FestivalIcon, FESTIVAL_ACCENT_COLOR } from '../data/odiaFestivals';
import { FESTIVAL_IMAGES } from '../data/festivalImages';
import FallingPetals from '../components/common/FestiveDecoration';

SplashScreen.preventAutoHideAsync();

// Same icon set/mapping as OdiaCalendarView — a festival not yet given a
// real photo (see festivalImages.ts's own "missing" note) still gets a
// recognizable badge instead of nothing.
const ICONS: Record<FestivalIcon, React.ComponentType<any>> = {
  Sun, Flag, Landmark, Sparkles, Heart, Music, BookOpen, Gift, PartyPopper, Flame,
};

// Slow ambient drift — small scale/position float, looping forever for as
// long as this screen is mounted (a few seconds). Purely decorative depth
// behind the logo on an ordinary (non-festival) day.
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
  const { colors } = useTheme();
  const { height: screenHeight } = useWindowDimensions();
  const { lang, t } = useLanguage();
  // The one place SplashScreen/WelcomeModal/the Feed header all agree on
  // "is today a festival" — see odiaFestivals.ts's getTodayFestival.
  const festival = getTodayFestival();
  const festivalImage = festival?.imageKey ? FESTIVAL_IMAGES[festival.imageKey] : null;
  const FestivalIconComp = festival ? ICONS[festival.icon] : null;
  const accent = festival?.color || FESTIVAL_ACCENT_COLOR;
  const fontRegular = lang === 'od' ? 'NotoSansOriya' : undefined;
  const fontBold = lang === 'od' ? 'NotoSansOriya-Bold' : undefined;

  const logoScale = useRef(new Animated.Value(0.7)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    SplashScreen.hideAsync();

    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      Animated.timing(taglineOpacity, { toValue: 1, duration: 400, delay: 200, useNativeDriver: true }),
      Animated.delay(800),
      Animated.timing(logoOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => onFinish());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Festival day with a real photo — full-bleed hero image ──
  if (festivalImage) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <Image source={festivalImage} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} contentFit="cover" />
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.85)']} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '55%' }} />
        <FallingPetals height={screenHeight} count={10} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 72 }}>
          <Animated.View style={{ opacity: logoOpacity, transform: [{ scale: logoScale }], alignItems: 'center' }}>
            <Image
              source={require('../../assets/logo.png')}
              style={{ width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: 'rgba(255,255,255,0.85)', marginBottom: 12 }}
              contentFit="cover"
            />
            <Text style={{ color: '#fff', fontFamily: fontBold, fontSize: 22, fontWeight: '700', letterSpacing: 0.5 }}>
              {t('common', 'appName')}
            </Text>
            <Text style={{ color: '#fff', fontFamily: 'NotoSansOriya-Bold', fontSize: 17, marginTop: 6, textAlign: 'center' }}>
              {festival!.or}
            </Text>
            <Animated.Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 6, opacity: taglineOpacity, fontFamily: fontRegular }}>
              {t('settings', 'footerName')}
            </Animated.Text>
          </Animated.View>
        </View>
      </View>
    );
  }

  const blobColors = festival ? [accent, accent, accent] : [colors.primary, colors.accent, colors.primary];

  return (
    <LinearGradient
      colors={festival ? [colors.bg, accent + '1f', colors.bg] : [colors.bg, colors.primary + '14', colors.bg]}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
    >
      <FloatingBlob color={blobColors[0] + '2e'} size={190} style={{ position: 'absolute', top: '16%', left: '6%' }} duration={3200} delay={0} />
      <FloatingBlob color={blobColors[2] + '26'} size={150} style={{ position: 'absolute', bottom: '18%', right: '8%' }} duration={2800} delay={350} />
      <FloatingBlob color={blobColors[1] + '20'} size={110} style={{ position: 'absolute', top: '30%', right: '14%' }} duration={2400} delay={700} />
      {festival && <FallingPetals height={screenHeight} count={10} />}

      <Animated.View style={{ opacity: logoOpacity, transform: [{ scale: logoScale }], alignItems: 'center' }}>
        {festival ? (
          <View style={{
            width: 128, height: 128, borderRadius: 64, borderWidth: 4, borderColor: accent,
            alignItems: 'center', justifyContent: 'center', backgroundColor: accent + '15',
            shadowColor: accent, shadowOffset: { width: 0, height: 4 }, shadowRadius: 20, shadowOpacity: 0.5,
          }}>
            {FestivalIconComp && <FestivalIconComp size={48} color={accent} />}
          </View>
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
        {festival && (
          <Text style={{ color: accent, fontFamily: 'NotoSansOriya-Bold', fontSize: 16, marginTop: 6, textAlign: 'center' }}>
            {festival.or}
          </Text>
        )}
        <Animated.Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 6, opacity: taglineOpacity, fontFamily: fontRegular }}>
          {t('settings', 'footerName')}
        </Animated.Text>
      </Animated.View>
    </LinearGradient>
  );
}
