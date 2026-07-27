// src/components/feed/StoryViewer.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, Image, Modal, TouchableOpacity,
  Dimensions, Animated, Pressable
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { X } from 'lucide-react-native';
import { Story } from '../../types';
import { cleanPhoto } from '../../utils/googleDriveUrl';
import { timeAgoShort } from '../../utils/feedUtils';
import Avatar from '../common/Avatar';
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
  const { spacing, radius, typography } = useTheme();
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
        <View className="z-30 bg-gradient-to-b from-black/60 to-transparent" style={{ padding: spacing.lg, paddingTop: 40 }}>
          {/* Progress Indicators */}
          <View className="flex-row" style={{ gap: spacing.xs, marginBottom: spacing.lg }}>
            {stories.map((story, i) => {
              let widthPercent: any = '0%';
              if (i < currentIndex) widthPercent = '100%';
              else if (i === currentIndex) {
                // Map anim to style
                return (
                  <View key={story.id} className="flex-1 bg-white/30 overflow-hidden" style={{ height: 2, borderRadius: radius.full }}>
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
                <View key={story.id} className="flex-1 bg-white/30 overflow-hidden" style={{ height: 2, borderRadius: radius.full }}>
                  <View className="h-full bg-white" style={{ width: widthPercent }} />
                </View>
              );
            })}
          </View>

          {/* Author Header */}
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center" style={{ gap: spacing.md }}>
              <View className="border border-white/20 overflow-hidden items-center justify-center" style={{ borderRadius: radius.full }}>
                <Avatar name={activeStory.authorName} photoUrl={activeStory.authorAvatar} size={36} />
              </View>
              <View>
                <Text className="text-white" style={{ ...typography.label }}>{activeStory.authorName}</Text>
                <Text className="text-white/60" style={{ ...typography.caption }}>{timeAgoShort(activeStory.timestamp)}</Text>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} className="z-40" style={{ padding: spacing.sm }}>
              <X size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Story Text Overlay */}
        {activeStory.textOverlay ? (
          <View
            className="absolute z-20 items-center"
            style={{
              left: spacing.xxl,
              right: spacing.xxl,
              bottom: activeStory.textPosition === 'bottom' ? 80 : activeStory.textPosition === 'top' ? 180 : SCREEN_HEIGHT / 2 - 40,
            }}
          >
            <Text
              className="text-center bg-black/40"
              style={{ color: activeStory.textColor || 'white', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.md, ...typography.title }}
            >
              {activeStory.textOverlay}
            </Text>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}
