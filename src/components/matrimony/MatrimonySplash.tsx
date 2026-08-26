// src/components/matrimony/MatrimonySplash.tsx
// A brief (~4s) festive intro shown every time a member opens the
// Matrimony section — bride and groom figures meet under a jaimala
// garland, marigold petals falling throughout, closing on a blessing.
// Deliberately its own fixed festive palette (not theme-aware) — this is
// a decorative flourish, not a themed UI surface, same reasoning as any
// other celebratory graphic that doesn't need a dark-mode variant.
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withDelay, withSequence, Easing, runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useLanguage } from '../../context/LanguageContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const TOTAL_DURATION = 4200;
const FADE_OUT_DURATION = 500;

const MAROON = '#8c1f2e';
const GOLD = '#cf9d3f';
const MARIGOLD = '#e2932f';
const BLUSH = '#c9647a';

const PETALS: { left: `${number}%`; delay: number; color: string }[] = [
  { left: '12%', delay: 100, color: '#d9702f' },
  { left: '30%', delay: 700, color: MARIGOLD },
  { left: '52%', delay: 300, color: BLUSH },
  { left: '70%', delay: 1000, color: MARIGOLD },
  { left: '86%', delay: 150, color: '#d9702f' },
];

function Petal({ left, delay, color }: { left: `${number}%`; delay: number; color: string }) {
  const translateY = useSharedValue(-30);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const fallDistance = SCREEN_HEIGHT * 0.5;
    translateY.value = withDelay(delay, withTiming(fallDistance, { duration: 3000, easing: Easing.linear }));
    rotate.value = withDelay(delay, withTiming(220, { duration: 3000, easing: Easing.linear }));
    opacity.value = withDelay(delay, withSequence(
      withTiming(0.9, { duration: 300 }),
      withTiming(0.9, { duration: 2100 }),
      withTiming(0, { duration: 600 })
    ));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { rotate: `${rotate.value}deg` }],
  }));

  return <Animated.View style={[styles.petal, { left, backgroundColor: color }, style]} />;
}

interface Props {
  onFinish: () => void;
}

export default function MatrimonySplash({ onFinish }: Props) {
  const { lang, t } = useLanguage();

  const overlayOpacity = useSharedValue(1);
  const figureOpacity = useSharedValue(0);
  const groomX = useSharedValue(-90);
  const brideX = useSharedValue(90);
  const garlandOpacity = useSharedValue(0);
  const garlandScale = useSharedValue(0.5);
  const textOpacity = useSharedValue(0);
  const textY = useSharedValue(8);

  useEffect(() => {
    figureOpacity.value = withDelay(150, withTiming(1, { duration: 400 }));
    groomX.value = withDelay(150, withTiming(0, { duration: 700, easing: Easing.out(Easing.cubic) }));
    brideX.value = withDelay(150, withTiming(0, { duration: 700, easing: Easing.out(Easing.cubic) }));

    garlandOpacity.value = withDelay(950, withTiming(1, { duration: 400 }));
    garlandScale.value = withDelay(950, withTiming(1, { duration: 450, easing: Easing.out(Easing.back(1.4)) }));

    textOpacity.value = withDelay(1750, withTiming(1, { duration: 500 }));
    textY.value = withDelay(1750, withTiming(0, { duration: 500 }));

    overlayOpacity.value = withDelay(
      TOTAL_DURATION - FADE_OUT_DURATION,
      withTiming(0, { duration: FADE_OUT_DURATION }, (finished) => {
        if (finished) runOnJS(onFinish)();
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));
  const groomStyle = useAnimatedStyle(() => ({
    opacity: figureOpacity.value,
    transform: [{ translateX: groomX.value }],
  }));
  const brideStyle = useAnimatedStyle(() => ({
    opacity: figureOpacity.value,
    transform: [{ translateX: brideX.value }],
  }));
  const garlandStyle = useAnimatedStyle(() => ({
    opacity: garlandOpacity.value,
    transform: [{ scale: garlandScale.value }],
  }));
  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textY.value }],
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, overlayStyle]} pointerEvents="none">
      <LinearGradient colors={['#fdf3df', '#f6d99a', MARIGOLD]} style={StyleSheet.absoluteFill} />

      {PETALS.map((p, i) => <Petal key={i} {...p} />)}

      <View style={styles.figuresRow}>
        <Animated.View style={[styles.figureBody, styles.groomBody, groomStyle]}>
          <View style={styles.groomTurban} />
          <View style={styles.groomSash} />
        </Animated.View>

        <Animated.View style={[styles.garland, garlandStyle]}>
          {Array.from({ length: 6 }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.garlandBead,
                { backgroundColor: i % 2 === 0 ? MAROON : GOLD, marginTop: i % 2 === 0 ? 0 : 7 },
              ]}
            />
          ))}
        </Animated.View>

        <Animated.View style={[styles.figureBody, styles.brideBody, brideStyle]}>
          <View style={styles.brideVeil} />
          <View style={styles.brideBindi} />
          <View style={[styles.brideJewel, { left: -4 }]} />
          <View style={[styles.brideJewel, { right: -4 }]} />
        </Animated.View>
      </View>

      <Animated.Text
        style={[
          styles.blessingText,
          { fontFamily: lang === 'od' ? 'NotoSansOriya-Bold' : undefined },
          textStyle,
        ]}
      >
        {t('matrimony', 'splashBlessing')}
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  petal: {
    position: 'absolute',
    top: '-4%',
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  figuresRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: '32%',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  figureBody: {
    width: 52,
    height: 80,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  groomBody: {
    backgroundColor: MAROON,
    marginRight: 6,
    alignItems: 'center',
  },
  groomTurban: {
    position: 'absolute',
    top: -16,
    width: 34,
    height: 20,
    borderTopLeftRadius: 17,
    borderTopRightRadius: 17,
    backgroundColor: GOLD,
  },
  groomSash: {
    position: 'absolute',
    top: 10,
    bottom: 6,
    width: 4,
    borderRadius: 2,
    backgroundColor: '#e8c98a',
    opacity: 0.85,
  },
  brideBody: {
    backgroundColor: BLUSH,
    marginLeft: 6,
  },
  brideVeil: {
    position: 'absolute',
    top: -10,
    left: -9,
    right: -9,
    height: 30,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: GOLD,
    opacity: 0.55,
  },
  brideBindi: {
    position: 'absolute',
    top: 6,
    left: '50%',
    marginLeft: -3,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: MAROON,
  },
  brideJewel: {
    position: 'absolute',
    top: 16,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: GOLD,
  },
  garland: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 30,
  },
  garlandBead: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  blessingText: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: '14%',
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    color: MAROON,
  },
});
