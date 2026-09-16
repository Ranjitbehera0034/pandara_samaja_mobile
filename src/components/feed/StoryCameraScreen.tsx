// src/components/feed/StoryCameraScreen.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ScreenOrientation from 'expo-screen-orientation';
import {
  Camera,
  type CameraRef,
  type Recorder,
  useCameraDevice,
  useCameraPermission,
  useMicrophonePermission,
  usePhotoOutput,
  useVideoOutput,
} from 'react-native-vision-camera';
import { ImageFormat, Skia } from '@shopify/react-native-skia';
import { File, Paths } from 'expo-file-system';
import { X, RotateCcw } from 'lucide-react-native';
import { STORY_FILTERS } from '../../utils/storyFilters';
import { useLanguage } from '../../context/LanguageContext';

// Plain color overlays approximating each filter's mood in the live
// viewfinder — cheap and good enough for framing a shot. The real,
// mathematically-correct ColorMatrix filter is what actually gets baked
// into the captured photo in applyFilterAndSave below, so what gets posted
// always matches the chosen filter exactly even though the live preview is
// only an approximation (vision-camera v5 doesn't expose a way to run a
// custom per-frame Skia filter over the live camera feed).
const FILTER_TINTS: Record<string, string | null> = {
  normal: null,
  bw: 'rgba(80,80,80,0.28)',
  vintage: 'rgba(122,82,48,0.22)',
  warm: 'rgba(255,140,66,0.16)',
  cool: 'rgba(66,135,245,0.16)',
  vivid: 'rgba(255,196,64,0.10)',
};

interface Props {
  visible: boolean;
  onClose: () => void;
  onCapture: (uri: string, mediaType: 'image' | 'video') => void;
}

export default function StoryCameraScreen({ visible, onClose, onCapture }: Props) {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const { hasPermission } = useCameraPermission();
  const { hasPermission: hasMicPermission, requestPermission: requestMicPermission } = useMicrophonePermission();
  const [position, setPosition] = useState<'front' | 'back'>('back');
  const device = useCameraDevice(position);
  const photoOutput = usePhotoOutput();
  // Audio is only enabled once mic permission is actually granted — video
  // recording must never be fully blocked by a denied/not-yet-granted mic
  // permission (previously it was: handleStartRecording silently returned
  // if the permission prompt was denied, so every subsequent hold-to-
  // record attempt no-op'd forever with zero visible feedback — a real
  // "video story doesn't work" report traced to exactly this). Recording
  // without audio is a legitimate fallback; doing nothing at all isn't.
  const videoOutput = useVideoOutput({ enableAudio: hasMicPermission });
  const cameraRef = useRef<CameraRef>(null);
  const [filterId, setFilterId] = useState('normal');
  const [capturing, setCapturing] = useState(false);
  // Explicit Photo/Video mode toggle, tap-shutter-to-start/stop in Video
  // mode — same convention as the OS's own Camera app. An earlier version
  // used press-and-hold-to-record (Instagram/WhatsApp's convention), but
  // that turned out to not be discoverable here: reports kept coming back
  // as "selecting video just takes a photo instead" — an explicit mode
  // switch removes the ambiguity, and requesting mic permission right when
  // Video mode is chosen (see handleSelectVideoMode) makes the permission
  // prompt visibly tied to that action instead of a background request on
  // screen-open that looked like it wasn't asking for permission at all.
  const [mode, setMode] = useState<'photo' | 'video'>('photo');
  // recordingRef mirrors isRecording so callbacks (closed over at render
  // time) always see the current value rather than a stale one.
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const recorderRef = useRef<Recorder | null>(null);
  const recordingRef = useRef(false);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // useCameraDevice() can legitimately never resolve to a device — no
  // camera hardware at all (every simulator), or a real device where
  // enumeration fails for some other reason. Previously this left the
  // screen on an unconditional spinner with no close button anywhere in
  // that branch — a genuine dead end with no way out except force-
  // quitting the app (confirmed directly: reproduced on the iOS
  // Simulator, swipe-to-dismiss does nothing, no visible button). A
  // timeout distinguishes "still initializing" from "never going to
  // resolve" so there's always a way out.
  const [deviceTimedOut, setDeviceTimedOut] = useState(false);
  useEffect(() => {
    if (device) return;
    setDeviceTimedOut(false);
    const timer = setTimeout(() => setDeviceTimedOut(true), 4000);
    return () => clearTimeout(timer);
  }, [device]);

  // Camera sensor orientation doesn't follow UI rotation the way flexbox
  // layouts do — most apps (Instagram, WhatsApp) keep their camera screens
  // portrait-locked even when the rest of the app rotates freely, since a
  // live viewfinder rotating mid-shot is both hard to get right and rarely
  // useful (on-screen controls have a fixed layout either way). This app
  // now supports rotation everywhere else, so lock just this screen while
  // it's open and hand rotation back once it closes.
  useEffect(() => {
    if (visible) {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    } else {
      ScreenOrientation.unlockAsync().catch(() => {});
    }
    return () => {
      ScreenOrientation.unlockAsync().catch(() => {});
    };
  }, [visible]);

  const activeFilter = STORY_FILTERS.find((f) => f.id === filterId) ?? STORY_FILTERS[0];

  const applyFilterAndSave = useCallback(async (tempPath: string) => {
    const uri = tempPath.startsWith('file://') ? tempPath : `file://${tempPath}`;
    const data = await Skia.Data.fromURI(uri);
    const source = Skia.Image.MakeImageFromEncoded(data);
    if (!source) throw new Error('Could not decode captured photo');

    const surface = Skia.Surface.Make(source.width(), source.height());
    if (!surface) throw new Error('Could not create render surface');
    const canvas = surface.getCanvas();
    const paint = Skia.Paint();
    paint.setColorFilter(Skia.ColorFilter.MakeMatrix(activeFilter.matrix));
    canvas.drawImage(source, 0, 0, paint);
    surface.flush();
    const filtered = surface.makeImageSnapshot();
    const bytes = filtered.encodeToBytes(ImageFormat.JPEG, 0.92);

    const file = new File(Paths.cache, `story_${Date.now()}.jpg`);
    file.write(bytes);
    return file.uri;
  }, [activeFilter]);

  const handleCapture = useCallback(async () => {
    if (capturing || recordingRef.current) return;
    setCapturing(true);
    try {
      const photo = await photoOutput.capturePhoto({}, {});
      const tempPath = await photo.saveToTemporaryFileAsync();
      photo.dispose();
      const finalUri = await applyFilterAndSave(tempPath);
      onCapture(finalUri, 'image');
      onClose();
    } catch (e) {
      console.error('[STORY_CAMERA] Capture failed:', e);
      Alert.alert(t('common', 'errorTitle'), t('feed', 'storyCameraCaptureFailedMessage'));
    } finally {
      setCapturing(false);
    }
  }, [capturing, photoOutput, applyFilterAndSave, onCapture, onClose, t]);

  const stopRecordTimer = useCallback(() => {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    setRecordSeconds(0);
  }, []);

  // Requesting mic permission here (rather than a background request on
  // screen-open) ties the OS prompt visibly to the moment the user chose
  // Video — a prior version requested it invisibly on mount, which read
  // as "not asking for permission at all" since nothing on screen
  // correlated with it.
  const handleSelectVideoMode = useCallback(() => {
    if (isRecording || capturing) return;
    setMode('video');
    if (!hasMicPermission) {
      requestMicPermission().catch(() => {});
    }
  }, [isRecording, capturing, hasMicPermission, requestMicPermission]);

  // No filter is baked into recorded video (unlike photos, via
  // applyFilterAndSave) — vision-camera v5 doesn't expose a way to run a
  // custom per-frame filter over recorded output, only the live preview
  // tint (see FILTER_TINTS above), same limitation noted there.
  //
  // Deliberately does NOT gate on hasMicPermission — videoOutput already
  // tracks it (enableAudio: hasMicPermission), so recording always
  // proceeds; it just comes out silent if mic permission was denied. A
  // previous version returned early here when permission wasn't granted,
  // which meant a denied prompt made every future record attempt silently
  // do nothing — the actual "video story doesn't work" bug.
  const handleStartRecording = useCallback(async () => {
    if (capturing || recordingRef.current) return;
    try {
      const recorder = await videoOutput.createRecorder({});
      recorderRef.current = recorder;
      recordingRef.current = true;
      setIsRecording(true);
      setRecordSeconds(0);
      recordTimerRef.current = setInterval(() => setRecordSeconds((s) => s + 1), 1000);

      await recorder.startRecording(
        (filePath) => {
          recordingRef.current = false;
          recorderRef.current = null;
          setIsRecording(false);
          stopRecordTimer();
          const uri = filePath.startsWith('file://') ? filePath : `file://${filePath}`;
          onCapture(uri, 'video');
          onClose();
        },
        (error) => {
          console.error('[STORY_CAMERA] Video recording failed:', error);
          recordingRef.current = false;
          recorderRef.current = null;
          setIsRecording(false);
          stopRecordTimer();
          Alert.alert(t('common', 'errorTitle'), t('feed', 'storyVideoRecordingFailedMessage'));
        }
      );
    } catch (e) {
      console.error('[STORY_CAMERA] Failed to start video recording:', e);
      recordingRef.current = false;
      recorderRef.current = null;
      setIsRecording(false);
      stopRecordTimer();
      Alert.alert(t('common', 'errorTitle'), t('feed', 'storyVideoRecordingFailedMessage'));
    }
  }, [capturing, videoOutput, onCapture, onClose, stopRecordTimer, t]);

  const handleStopRecording = useCallback(async () => {
    if (!recordingRef.current || !recorderRef.current) return;
    try {
      await recorderRef.current.stopRecording();
    } catch (e) {
      console.error('[STORY_CAMERA] Failed to stop video recording:', e);
      recordingRef.current = false;
      recorderRef.current = null;
      setIsRecording(false);
      stopRecordTimer();
      Alert.alert(t('common', 'errorTitle'), t('feed', 'storyVideoRecordingFailedMessage'));
    }
  }, [stopRecordTimer, t]);

  const handleShutterPress = useCallback(() => {
    if (mode === 'photo') {
      handleCapture();
    } else if (isRecording) {
      handleStopRecording();
    } else {
      handleStartRecording();
    }
  }, [mode, isRecording, handleCapture, handleStopRecording, handleStartRecording]);

  const handleClose = useCallback(async () => {
    if (recordingRef.current && recorderRef.current) {
      try {
        await recorderRef.current.cancelRecording();
      } catch (e) {
        console.error('[STORY_CAMERA] Failed to cancel in-progress recording:', e);
      }
      recordingRef.current = false;
      recorderRef.current = null;
      setIsRecording(false);
      stopRecordTimer();
    }
    onClose();
  }, [onClose, stopRecordTimer]);

  useEffect(() => () => stopRecordTimer(), [stopRecordTimer]);

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {!hasPermission || !device ? (
          <View style={styles.center}>
            {deviceTimedOut ? (
              <>
                <Text style={styles.unavailableText}>{t('feed', 'storyCameraUnavailableMessage')}</Text>
              </>
            ) : (
              <ActivityIndicator color="#fff" />
            )}
            <View style={[styles.topBar, { top: insets.top + 12, justifyContent: 'flex-start' }]}>
              <TouchableOpacity onPress={handleClose} style={styles.iconButton}>
                <X size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            <Camera
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              device={device}
              outputs={[photoOutput, videoOutput]}
              isActive={visible}
            />
            {FILTER_TINTS[filterId] && (
              <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: FILTER_TINTS[filterId] as string }]} />
            )}

            <View style={[styles.topBar, { top: insets.top + 12 }]}>
              <TouchableOpacity onPress={handleClose} style={styles.iconButton}>
                <X size={24} color="#fff" />
              </TouchableOpacity>
              {isRecording && (
                <View style={styles.recordingBadge}>
                  <View style={styles.recordingDot} />
                  <Text style={styles.recordingText}>
                    {`${Math.floor(recordSeconds / 60).toString().padStart(2, '0')}:${(recordSeconds % 60).toString().padStart(2, '0')}`}
                  </Text>
                </View>
              )}
              <TouchableOpacity
                onPress={() => setPosition((p) => (p === 'back' ? 'front' : 'back'))}
                disabled={isRecording}
                style={[styles.iconButton, isRecording && styles.iconButtonDisabled]}
              >
                <RotateCcw size={22} color="#fff" />
              </TouchableOpacity>
            </View>

            {mode === 'photo' && !isRecording && (
              <View style={styles.filterStrip}>
                {STORY_FILTERS.map((f) => (
                  <TouchableOpacity
                    key={f.id}
                    onPress={() => setFilterId(f.id)}
                    style={[styles.filterChip, filterId === f.id && styles.filterChipActive]}
                  >
                    <Text style={[styles.filterChipText, filterId === f.id && styles.filterChipTextActive]}>
                      {t('feed', f.labelKey)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {!isRecording && (
              <View style={[styles.modeToggleRow, { top: insets.top + 64 }]}>
                <TouchableOpacity
                  onPress={() => setMode('photo')}
                  style={[styles.modeButton, mode === 'photo' && styles.modeButtonActive]}
                >
                  <Text style={[styles.modeButtonText, mode === 'photo' && styles.modeButtonTextActive]}>
                    {t('feed', 'storyCameraPhotoModeLabel')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSelectVideoMode}
                  style={[styles.modeButton, mode === 'video' && styles.modeButtonActive]}
                >
                  <Text style={[styles.modeButtonText, mode === 'video' && styles.modeButtonTextActive]}>
                    {t('feed', 'storyCameraVideoModeLabel')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={[styles.shutterRow, { bottom: insets.bottom + 36 }]}>
              <TouchableOpacity
                onPress={handleShutterPress}
                disabled={capturing}
                style={[styles.shutterOuter, mode === 'video' && styles.shutterOuterVideoMode]}
              >
                {capturing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <View style={[styles.shutterInner, isRecording && styles.shutterInnerRecording]} />
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topBar: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20 },
  iconButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  iconButtonDisabled: { opacity: 0.4 },
  recordingBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6 },
  recordingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ff3b30' },
  recordingText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  filterStrip: { position: 'absolute', bottom: 130, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.45)' },
  filterChipActive: { backgroundColor: '#fff' },
  filterChipText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  filterChipTextActive: { color: '#000' },
  modeToggleRow: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 10 },
  modeButton: { paddingHorizontal: 18, paddingVertical: 7, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.45)' },
  modeButtonActive: { backgroundColor: '#fff' },
  modeButtonText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  modeButtonTextActive: { color: '#000' },
  shutterRow: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  shutterOuter: { width: 76, height: 76, borderRadius: 38, borderWidth: 4, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  shutterOuterVideoMode: { borderColor: '#ff3b30' },
  shutterInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff' },
  shutterInnerRecording: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#ff3b30' },
  unavailableText: { color: '#fff', fontSize: 15, textAlign: 'center', paddingHorizontal: 32, lineHeight: 22 },
});
