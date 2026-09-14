// src/components/common/FestiveDecoration.tsx
// Ambient "falling flower petals" layer used on festival days (see
// data/odiaFestivals.ts) — pure emoji + Reanimated, no image asset needed,
// so it ships via OTA like everything else here. Each petal is driven by
// a single looping 0→1 progress value;
// position/rotation/opacity are all derived from that one value per frame
// rather than several independently-repeating animations, so they can
// never drift out of sync with each other across loops.
import React, { useEffect, useMemo } from 'react';
import { View } from 'react-native';
import Reanimated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, withDelay, Easing,
} from 'react-native-reanimated';

const PETAL_EMOJIS = ['🌸', '🪷', '🌼'];

function Petal({ left, size, duration, delay, fallDistance, emoji }: {
  left: `${number}%`; size: number; duration: number; delay: number; fallDistance: number; emoji: string;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(delay, withRepeat(
      withTiming(1, { duration, easing: Easing.linear }),
      -1, false
    ));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => {
    const translateY = -40 + progress.value * (fallDistance + 80);
    const translateX = Math.sin(progress.value * Math.PI * 2) * 14; // gentle sideways sway
    const rotate = progress.value * 480;
    const opacity = progress.value < 0.1 ? progress.value * 9 : progress.value > 0.85 ? (1 - progress.value) * 6.67 : 0.9;
    return {
      transform: [{ translateY }, { translateX }, { rotate: `${rotate}deg` }],
      opacity,
    };
  });

  return (
    <Reanimated.Text style={[{ position: 'absolute', top: 0, left, fontSize: size }, style]}>
      {emoji}
    </Reanimated.Text>
  );
}

// `height` is the fall distance (roughly the visible area behind/around
// the content) — pass the screen height for a full-bleed splash, or a
// smaller value for a compact area like the welcome modal's card.
export default function FallingPetals({ height, count = 8 }: { height: number; count?: number }) {
  const petals = useMemo(() => Array.from({ length: count }).map((_, i) => ({
    left: `${6 + i * (88 / count) + (i % 2 === 0 ? 0 : 3)}%` as `${number}%`,
    size: 15 + (i % 3) * 4,
    duration: 3200 + (i % 4) * 650,
    delay: i * 300,
    emoji: PETAL_EMOJIS[i % PETAL_EMOJIS.length],
  })), [count]);

  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height, overflow: 'hidden' }}>
      {petals.map((p, i) => (
        <Petal key={i} {...p} fallDistance={height} />
      ))}
    </View>
  );
}
