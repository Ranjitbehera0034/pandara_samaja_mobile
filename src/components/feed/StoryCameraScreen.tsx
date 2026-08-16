// src/components/feed/StoryCameraScreen.tsx
import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, type CameraRef, useCameraDevice, useCameraPermission, usePhotoOutput } from 'react-native-vision-camera';
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
  onCapture: (uri: string, mediaType: 'image') => void;
}

export default function StoryCameraScreen({ visible, onClose, onCapture }: Props) {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const { hasPermission } = useCameraPermission();
  const [position, setPosition] = useState<'front' | 'back'>('back');
  const device = useCameraDevice(position);
  const photoOutput = usePhotoOutput();
  const cameraRef = useRef<CameraRef>(null);
  const [filterId, setFilterId] = useState('normal');
  const [capturing, setCapturing] = useState(false);

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
    if (capturing) return;
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
    } finally {
      setCapturing(false);
    }
  }, [capturing, photoOutput, applyFilterAndSave, onCapture, onClose]);

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {!hasPermission || !device ? (
          <View style={styles.center}>
            <ActivityIndicator color="#fff" />
          </View>
        ) : (
          <>
            <Camera
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              device={device}
              outputs={[photoOutput]}
              isActive={visible}
            />
            {FILTER_TINTS[filterId] && (
              <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: FILTER_TINTS[filterId] as string }]} />
            )}

            <View style={[styles.topBar, { top: insets.top + 12 }]}>
              <TouchableOpacity onPress={onClose} style={styles.iconButton}>
                <X size={24} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setPosition((p) => (p === 'back' ? 'front' : 'back'))} style={styles.iconButton}>
                <RotateCcw size={22} color="#fff" />
              </TouchableOpacity>
            </View>

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

            <View style={[styles.shutterRow, { bottom: insets.bottom + 36 }]}>
              <TouchableOpacity onPress={handleCapture} disabled={capturing} style={styles.shutterOuter}>
                {capturing ? <ActivityIndicator color="#fff" /> : <View style={styles.shutterInner} />}
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
  filterStrip: { position: 'absolute', bottom: 130, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.45)' },
  filterChipActive: { backgroundColor: '#fff' },
  filterChipText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  filterChipTextActive: { color: '#000' },
  shutterRow: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  shutterOuter: { width: 76, height: 76, borderRadius: 38, borderWidth: 4, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff' },
});
