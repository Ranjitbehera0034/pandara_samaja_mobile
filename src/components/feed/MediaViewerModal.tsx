// src/components/feed/MediaViewerModal.tsx
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Modal, TouchableOpacity, useWindowDimensions, FlatList, ViewToken,
} from 'react-native';
import { Image } from 'expo-image';
import { Video, ResizeMode } from 'expo-av';
import {
  GestureHandlerRootView, Gesture, GestureDetector,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming,
} from 'react-native-reanimated';
import { X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MediaItem } from '../../types';
import { cleanPhoto } from '../../utils/googleDriveUrl';
import { useTheme } from '../../theme/ThemeContext';

const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;

interface Props {
  visible: boolean;
  media: MediaItem[];
  initialIndex: number;
  onClose: () => void;
}

export default function MediaViewerModal({ visible, media, initialIndex, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { spacing, radius } = useTheme();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const flatListRef = useRef<FlatList<MediaItem>>(null);

  // Re-sync starting index whenever the viewer is (re)opened
  useEffect(() => {
    if (visible) setCurrentIndex(initialIndex);
  }, [visible, initialIndex]);

  // A rotation mid-view changes screenWidth, but the FlatList's existing
  // scroll offset was computed for the OLD width — without resnapping, the
  // paged view lands between pages (partially showing two photos at once).
  // Skip the very first render (mount) since there's nothing to resnap yet.
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    flatListRef.current?.scrollToIndex({ index: currentIndex, animated: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenWidth]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems.find((v) => v.isViewable);
      if (first && first.index != null) {
        setCurrentIndex(first.index);
      }
    }
  ).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

  const getItemLayout = useCallback(
    (_: ArrayLike<MediaItem> | null | undefined, index: number) => ({
      length: screenWidth,
      offset: screenWidth * index,
      index,
    }),
    [screenWidth]
  );

  // Fully unmount (and reset all internal state) when closed — mirrors StoryViewer's pattern
  if (!visible || !media || media.length === 0) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        {/* Fullscreen media viewer is an immersive overlay — background stays black in both themes */}
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <FlatList
            ref={flatListRef}
            data={media}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={initialIndex}
            getItemLayout={getItemLayout}
            keyExtractor={(_, i) => `media-${i}`}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            renderItem={({ item, index }: { item: MediaItem; index: number }) => (
              <MediaPage item={item} isActive={index === currentIndex} width={screenWidth} height={screenHeight} />
            )}
          />

          {media.length > 1 && (
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                bottom: insets.bottom + spacing.lg,
                left: 0,
                right: 0,
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              {media.map((_, i) => (
                <View
                  key={i}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: radius.full,
                    marginHorizontal: 3,
                    backgroundColor: i === currentIndex ? '#fff' : 'rgba(255,255,255,0.4)',
                  }}
                />
              ))}
            </View>
          )}

          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{
              position: 'absolute',
              top: insets.top + spacing.sm,
              right: spacing.md,
              padding: spacing.sm,
              borderRadius: radius.full,
              backgroundColor: 'rgba(0,0,0,0.4)',
            }}
          >
            <X size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

function MediaPage({ item, isActive, width, height }: { item: MediaItem; isActive: boolean; width: number; height: number }) {
  const uri = cleanPhoto(item.url) || item.url;

  if (item.type === 'video') {
    return (
      <View style={{ width, height, alignItems: 'center', justifyContent: 'center' }}>
        <Video
          source={{ uri }}
          style={{ width, height }}
          useNativeControls
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay={isActive}
          isLooping={false}
        />
      </View>
    );
  }

  return <ZoomableImage uri={uri} isActive={isActive} width={width} height={height} />;
}

function ZoomableImage({ uri, isActive, width, height }: { uri: string; isActive: boolean; width: number; height: number }) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const reset = useCallback(() => {
    scale.value = withTiming(1);
    savedScale.value = 1;
    translateX.value = withTiming(0);
    translateY.value = withTiming(0);
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset zoom/pan whenever this page stops being the active one (swiped away),
  // so a zoomed-in image never carries its zoom state to the next photo.
  useEffect(() => {
    if (!isActive) {
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.max(1, Math.min(savedScale.value * e.scale, MAX_SCALE));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value <= 1) {
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      }
    });

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (savedScale.value > 1) {
        translateX.value = savedTranslateX.value + e.translationX;
        translateY.value = savedTranslateY.value + e.translationY;
      }
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1) {
        scale.value = withTiming(1);
        savedScale.value = 1;
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        scale.value = withTiming(DOUBLE_TAP_SCALE);
        savedScale.value = DOUBLE_TAP_SCALE;
      }
    });

  const zoomPanGesture = Gesture.Simultaneous(pinchGesture, panGesture);
  const composedGesture = Gesture.Simultaneous(zoomPanGesture, doubleTapGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <View style={{ width, height, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={[{ width, height }, animatedStyle]}>
          <Image
            source={{ uri }}
            style={{ width: '100%', height: '100%' }}
            contentFit="contain"
          />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
