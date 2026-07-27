// src/components/feed/StoryViewer.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, Image, Modal, TouchableOpacity,
  Dimensions, Animated, Pressable
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { X } from 'lucide-react-native';
import { Story } from '../../types';
import { cleanPhoto, getInitial } from '../../utils/googleDriveUrl';
import { timeAgoShort } from '../../utils/feedUtils';
import { useTheme } from '../../theme/ThemeContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const STORY_DURATION = 5000; // 5 seconds per story

interface Props {
  visible: boolean;
  stories: Story[];
  onClose: () => void;
  onStoryViewed?: (storyId: string) => void;
}

export default function StoryViewer({ visible, stories, onClose, onStoryViewed }: Props) {
  const { colors } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const activeStory = stories[currentIndex];

  const timerRef = useRef<any>(null);
  const startTimeRef = useRef<number>(0);
  const elapsedBeforePauseRef = useRef<number>(0);

  // Triggered when current story index changes
  useEffect(() => {
    if (!visible || stories.length === 0) return;

    // Mark story as viewed
    if (activeStory && onStoryViewed && !activeStory.viewed) {
      onStoryViewed(activeStory.id);
    }

    startProgress();

    return () => {
      clearTimer();
    };
  }, [currentIndex, visible, stories]);

  const startProgress = (resumeFrom = 0) => {
    clearTimer();
    progressAnim.setValue(resumeFrom);

    const remainingTime = STORY_DURATION * (1 - resumeFrom);
    startTimeRef.current = Date.now();
    elapsedBeforePauseRef.current = resumeFrom * STORY_DURATION;

    Animated.timing(progressAnim, {
      toValue: 1,
      duration: remainingTime,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        handleNext();
      }
    });
  };

  const pauseProgress = () => {
    progressAnim.stopAnimation((value) => {
      setIsPaused(true);
      elapsedBeforePauseRef.current = value * STORY_DURATION;
    });
  };

  const resumeProgress = () => {
    setIsPaused(false);
    const progressPercent = elapsedBeforePauseRef.current / STORY_DURATION;
    startProgress(progressPercent);
  };

  const clearTimer = () => {
    progressAnim.stopAnimation();
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  };

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else {
      // Re-start current first story
      startProgress(0);
    }
  };

  const handleTap = (evt: any) => {
    const x = evt.nativeEvent.locationX;
    if (x < SCREEN_WIDTH * 0.3) {
      handlePrev();
    } else {
      handleNext();
    }
  };

  if (!visible || !activeStory) return null;

  const photo = cleanPhoto(activeStory.authorAvatar);
  const mediaUrl = cleanPhoto(activeStory.mediaUrl) || activeStory.mediaUrl;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {/* Story viewer is an immersive full-bleed overlay — background stays black in both themes */}
      <View className="flex-1 bg-black justify-between relative">
        {/* Touch zones */}
        <Pressable
          delayLongPress={200}
          onLongPress={pauseProgress}
          onPressOut={() => {
            if (isPaused) resumeProgress();
          }}
          onPress={handleTap}
          style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
          className="absolute inset-0 z-10"
        />

        {/* Media Background */}
        <View className="absolute inset-0">
          {activeStory.mediaType === 'video' ? (
            <Video
              source={{ uri: mediaUrl }}
              style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
              resizeMode={ResizeMode.COVER}
              shouldPlay={!isPaused}
              isLooping={false}
              onError={(e) => console.log('Video error:', e)}
            />
          ) : (
            <Image
              source={{ uri: mediaUrl }}
              style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
              resizeMode="cover"
            />
          )}
        </View>

        {/* Top Overlay Controls */}
        <View className="z-30 p-4 pt-10 bg-gradient-to-b from-black/60 to-transparent">
          {/* Progress Indicators */}
          <View className="flex-row gap-1 mb-4">
            {stories.map((story, i) => {
              let widthPercent: any = '0%';
              if (i < currentIndex) widthPercent = '100%';
              else if (i === currentIndex) {
                // Map anim to style
                return (
                  <View key={story.id} className="flex-1 h-[2px] bg-white/30 rounded-full overflow-hidden">
                    <Animated.View
                      className="h-full bg-white"
                      style={{
                        width: progressAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0%', '100%'],
                        }),
                      }}
                    />
                  </View>
                );
              }
              return (
                <View key={story.id} className="flex-1 h-[2px] bg-white/30 rounded-full overflow-hidden">
                  <View className="h-full bg-white" style={{ width: widthPercent }} />
                </View>
              );
            })}
          </View>

          {/* Author Header */}
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <View style={{ backgroundColor: colors.primary }} className="w-9 h-9 rounded-full border border-white/20 overflow-hidden items-center justify-center">
                {photo ? (
                  <Image source={{ uri: photo }} className="w-full h-full" />
                ) : (
                  <Text className="text-white font-bold text-xs">
                    {getInitial(activeStory.authorName)}
                  </Text>
                )}
              </View>
              <View>
                <Text className="text-white font-bold text-sm">{activeStory.authorName}</Text>
                <Text className="text-white/60 text-xs">{timeAgoShort(activeStory.timestamp)}</Text>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} className="p-2 z-40">
              <X size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Story Text Overlay */}
        {activeStory.textOverlay ? (
          <View
            className="absolute left-6 right-6 z-20 items-center"
            style={{
              bottom: activeStory.textPosition === 'bottom' ? 80 : activeStory.textPosition === 'top' ? 180 : SCREEN_HEIGHT / 2 - 40,
            }}
          >
            <Text
              style={{ color: activeStory.textColor || 'white' }}
              className="text-lg font-bold text-center bg-black/40 px-4 py-2 rounded-xl"
            >
              {activeStory.textOverlay}
            </Text>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}
