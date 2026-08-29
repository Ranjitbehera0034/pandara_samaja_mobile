// src/components/matrimony/MatrimonySplash.tsx
// Plays a short real bride/groom video every time a member opens the
// Matrimony section, then auto-dismisses. Hosted on Firebase Storage
// (public, immutable-cached) rather than bundled locally via require() —
// this app has no other locally-bundled video assets, and bundling one
// would make every future OTA update ship this file's bytes to every
// device. Loading it as a URL keeps OTA payloads JS-only, matching how
// every other piece of media in this app already works.
//
// The first time any member ever opens Matrimony, this still has to
// stream ~2.4MB over the network before playback can start (a few
// seconds on a typical connection) — unavoidable for a remote asset.
// From then on it plays from a local disk cache instead, so every
// subsequent open (the overwhelming majority in practice) starts
// instantly. A spinner covers whatever wait remains either way, so a
// slow network reads as "loading," not "frozen."
import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { File, Paths } from 'expo-file-system';

// v2: true 9:16 vertical (720x1280), replacing the original 16:9 landscape
// clip that needed cropping to fill a portrait screen. Uploaded to a new
// path rather than overwriting the old one — both are cached
// "immutable, max-age=1yr", so overwriting risks a stale CDN/client copy
// persisting for up to a year instead of picking up the replacement.
const SPLASH_VIDEO_URL = 'https://storage.googleapis.com/nikhila-odisha-pandara-samaja.firebasestorage.app/app-assets/matrimony-splash-v2.mp4';
const cachedFile = new File(Paths.cache, 'matrimony-splash-v2.mp4');

interface Props {
  onFinish: () => void;
}

export default function MatrimonySplash({ onFinish }: Props) {
  const finishedRef = useRef(false);
  const [failed, setFailed] = useState(false);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [buffering, setBuffering] = useState(true);

  useEffect(() => {
    if (cachedFile.exists) {
      setVideoUri(cachedFile.uri);
      return;
    }
    // Not cached yet — play directly from the network now, and download a
    // local copy in the background so next time skips this wait entirely.
    // Best-effort: if the download fails, it just streams from the
    // network again next time too. idempotent:true since another concurrent
    // open (e.g. two family members on one shared device) could already be
    // mid-download to the same path.
    setVideoUri(SPLASH_VIDEO_URL);
    File.downloadFileAsync(SPLASH_VIDEO_URL, cachedFile, { idempotent: true }).catch(() => {});
  }, []);

  const finishOnce = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinish();
  };

  const handleStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    setBuffering(status.isBuffering);
    if (status.didJustFinish) finishOnce();
  };

  if (failed) {
    // A failed load (offline, blocked request, etc.) shouldn't leave the
    // member stuck looking at a black screen — skip straight past it.
    finishOnce();
    return null;
  }

  return (
    <View style={[StyleSheet.absoluteFill, styles.container]}>
      {videoUri && (
        <Video
          source={{ uri: videoUri }}
          style={StyleSheet.absoluteFill}
          resizeMode={ResizeMode.COVER}
          shouldPlay
          isLooping={false}
          isMuted
          useNativeControls={false}
          onPlaybackStatusUpdate={handleStatusUpdate}
          onError={() => setFailed(true)}
        />
      )}
      {(!videoUri || buffering) && (
        <View style={[StyleSheet.absoluteFill, styles.loadingOverlay]}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
  },
  loadingOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
