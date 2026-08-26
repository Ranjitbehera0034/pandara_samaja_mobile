// src/components/matrimony/MatrimonySplash.tsx
// A brief (~4s) festive intro shown every time a member opens the
// Matrimony section — bride and groom figures meet under a jaimala
// garland, marigold petals falling throughout, closing on a blessing.
// Deliberately its own fixed festive palette (not theme-aware) — this is
// a decorative flourish, not a themed UI surface, same reasoning as any
// other celebratory graphic that doesn't need a dark-mode variant.
import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';
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
const SKIN = '#e8b894';
const HAIR = '#2b1c14';
const GROOM_GREEN = '#2f5233';
const BRIDE_WINE = '#7a1f3d';

// Original illustrated couple, hand-built in react-native-svg — not a copy
// of any reference image. A stock illustration a user shared for style
// direction was a watermarked, unlicensed Adobe Stock preview; tracing or
// closely replicating it would use someone else's copyrighted artwork
// without a license, so this only borrows the general chibi-couple /
// traditional-attire *idea* (big rounded heads, layered lehenga/sherwani,
// jewelry, bindi, mustache), built from scratch as plain shapes.
function GroomFigure() {
  return (
    <Svg width={58} height={96} viewBox="0 0 58 96">
      {/* sherwani coat */}
      <Path d="M16,38 Q29,33 42,38 L46,92 Q29,98 12,92 Z" fill={GROOM_GREEN} />
      {/* gold sash */}
      <Path d="M19,39 L25,39 L38,90 L32,90 Z" fill={GOLD} opacity={0.9} />
      {/* buttons */}
      {[46, 55, 64, 73, 82].map((y) => (
        <Circle key={y} cx={29} cy={y} r={1.4} fill={GOLD} />
      ))}
      {/* hair (peeks above head circle) */}
      <Ellipse cx={29} cy={16} rx={16} ry={13} fill={HAIR} />
      {/* head */}
      <Circle cx={29} cy={22} r={14.5} fill={SKIN} />
      {/* eyes */}
      <Circle cx={23.5} cy={22} r={1.3} fill={HAIR} />
      <Circle cx={34.5} cy={22} r={1.3} fill={HAIR} />
      {/* mustache */}
      <Path d="M22,28 Q29,32 36,28 Q29,31 22,28 Z" fill={HAIR} />
      {/* smile */}
      <Path d="M24,30.5 Q29,33 34,30.5" stroke={HAIR} strokeWidth={1} fill="none" strokeLinecap="round" />
    </Svg>
  );
}

function BrideFigure() {
  return (
    <Svg width={58} height={96} viewBox="0 0 58 96">
      {/* dupatta veil, behind head */}
      <Path d="M6,32 Q9,-2 29,0 Q49,-2 52,32 L45,48 Q29,40 13,48 Z" fill={GOLD} opacity={0.55} />
      {/* choli (bodice) */}
      <Path d="M18,38 Q29,34 40,38 L40,56 Q29,52 18,56 Z" fill={BRIDE_WINE} />
      {/* lehenga skirt */}
      <Path d="M16,56 Q29,52 42,56 L50,92 Q29,99 8,92 Z" fill={BRIDE_WINE} />
      {/* hem border */}
      <Path d="M11,86 Q29,80 47,86 L50,92 Q29,99 8,92 Z" fill={GOLD} opacity={0.85} />
      {/* floral accents on skirt */}
      {[[18, 68], [40, 72], [24, 82], [34, 88]].map(([cx, cy]) => (
        <Circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={1.6} fill={MARIGOLD} />
      ))}
      {/* diagonal dupatta drape */}
      <Path d="M37,39 L43,39 L30,88 L24,88 Z" fill={GOLD} opacity={0.75} />
      {/* side hair framing face */}
      <Ellipse cx={15} cy={26} rx={4} ry={9} fill={HAIR} />
      <Ellipse cx={43} cy={26} rx={4} ry={9} fill={HAIR} />
      {/* hair top */}
      <Ellipse cx={29} cy={15} rx={15} ry={12} fill={HAIR} />
      {/* head */}
      <Circle cx={29} cy={21} r={13.5} fill={SKIN} />
      {/* jhumka earrings */}
      <Circle cx={15.5} cy={28} r={2} fill={GOLD} />
      <Circle cx={42.5} cy={28} r={2} fill={GOLD} />
      {/* bindi */}
      <Circle cx={29} cy={12.5} r={1.6} fill={MAROON} />
      {/* eyes */}
      <Circle cx={24} cy={21} r={1.3} fill={HAIR} />
      <Circle cx={34} cy={21} r={1.3} fill={HAIR} />
      {/* smile */}
      <Path d="M24.5,26 Q29,28.5 33.5,26" stroke={HAIR} strokeWidth={1} fill="none" strokeLinecap="round" />
    </Svg>
  );
}

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
        <Animated.View style={groomStyle}>
          <GroomFigure />
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

        <Animated.View style={brideStyle}>
          <BrideFigure />
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
