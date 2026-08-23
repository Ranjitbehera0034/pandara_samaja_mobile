// src/components/feed/RichVideoPlayer.tsx
import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEvent } from 'expo';

// Cycled on tap of the speed badge — native player controls (scrub/volume/
// fullscreen) don't expose a speed selector on either platform, so this is
// the one bit of custom chrome layered on top of them.
const SPEED_OPTIONS = [0.5, 1, 1.5, 2] as const;

interface Props {
  uri: string;
  maxWidth: number;
  maxHeight: number;
  // Whether this instance is allowed to play at all — false forces a pause
  // (used when paging past a video in a swipeable viewer).
  isActive?: boolean;
  // Auto-starts playback the moment isActive becomes true (viewer paging).
  // Feed cards default this off — a video mid-scroll shouldn't just start
  // playing itself.
  autoPlayWhenActive?: boolean;
  loop?: boolean;
  onPlay?: () => void;
}

export default function RichVideoPlayer({
  uri, maxWidth, maxHeight, isActive = true, autoPlayWhenActive = false, loop = false, onPlay,
}: Props) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = loop;
  });

  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });
  const { videoTrack } = useEvent(player, 'videoTrackChange', { videoTrack: player.videoTrack });
  const [speedIndex, setSpeedIndex] = useState(1); // 1x

  useEffect(() => {
    if (isPlaying) onPlay?.();
  }, [isPlaying, onPlay]);

  useEffect(() => {
    if (!isActive) {
      player.pause();
    } else if (autoPlayWhenActive) {
      player.play();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  // A video's own recorded dimensions decide whether it renders as a tall
  // portrait box or a wide landscape one — a fixed 16:9 box (the old
  // behavior) squeezed/letterboxed portrait phone-shot videos down to a
  // sliver. Falls back to a 16:9 guess until the track metadata loads.
  const size = videoTrack?.size;
  const aspectRatio = size && size.width && size.height ? size.width / size.height : 16 / 9;
  let width = maxWidth;
  let height = width / aspectRatio;
  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspectRatio;
  }

  const cycleSpeed = () => {
    const next = (speedIndex + 1) % SPEED_OPTIONS.length;
    setSpeedIndex(next);
    player.playbackRate = SPEED_OPTIONS[next];
  };

  return (
    <View style={{ width, height, alignSelf: 'center', backgroundColor: '#000' }}>
      <VideoView player={player} style={StyleSheet.absoluteFillObject} contentFit="contain" />
      <TouchableOpacity onPress={cycleSpeed} style={styles.speedBadge} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={styles.speedText}>{SPEED_OPTIONS[speedIndex]}x</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  speedBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  speedText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});
