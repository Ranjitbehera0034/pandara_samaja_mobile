// src/components/matrimony/MatrimonySplash.tsx
// Plays a short real bride/groom video every time a member opens the
// Matrimony section, then auto-dismisses. Hosted on Firebase Storage
// (public, immutable-cached) rather than bundled locally via require() —
// this app has no other locally-bundled video assets, and bundling one
// would make every future OTA update ship this file's bytes to every
// device. Loading it as a URL keeps OTA payloads JS-only, matching how
// every other piece of media in this app already works.
import React, { useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';

const SPLASH_VIDEO_URL = 'https://storage.googleapis.com/nikhila-odisha-pandara-samaja.firebasestorage.app/app-assets/matrimony-splash.mp4';

interface Props {
  onFinish: () => void;
}

export default function MatrimonySplash({ onFinish }: Props) {
  const finishedRef = useRef(false);
  const [failed, setFailed] = useState(false);

  const finishOnce = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinish();
  };

  const handleStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded && status.didJustFinish) finishOnce();
  };

  if (failed) {
    // A failed load (offline, blocked request, etc.) shouldn't leave the
    // member stuck looking at a black screen — skip straight past it.
    finishOnce();
    return null;
  }

  return (
    <Video
      source={{ uri: SPLASH_VIDEO_URL }}
      style={StyleSheet.absoluteFill}
      resizeMode={ResizeMode.COVER}
      shouldPlay
      isLooping={false}
      isMuted
      useNativeControls={false}
      onPlaybackStatusUpdate={handleStatusUpdate}
      onError={() => setFailed(true)}
    />
  );
}
