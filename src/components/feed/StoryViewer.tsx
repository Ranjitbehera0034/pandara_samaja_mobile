// src/components/feed/StoryViewer.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, Image, Modal, TouchableOpacity, TextInput,
  useWindowDimensions, Animated, Pressable, FlatList, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { X, Trash2, Eye, Heart, MessageCircle, Flag, Send } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Story } from '../../types';
import { cleanPhoto } from '../../utils/googleDriveUrl';
import { timeAgoShort } from '../../utils/feedUtils';
import * as feedApi from '../../api/feed';
import { StoryViewer as StoryViewerRow, StoryComment } from '../../api/feed';
import Avatar from '../common/Avatar';
import EmptyState from '../common/EmptyState';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

const STORY_DURATION = 5000; // 5 seconds per story

interface Props {
  visible: boolean;
  stories: Story[];
  currentMemberId?: string;
  onClose: () => void;
  onStoryViewed?: (storyId: string) => void;
  onStoryDeleted?: (storyId: string) => void;
  onStoryLiked?: (storyId: string, liked: boolean, likesCount: number) => void;
}

export default function StoryViewer({ visible, stories, currentMemberId, onClose, onStoryViewed, onStoryDeleted, onStoryLiked }: Props) {
  const { colors: C, spacing, radius, typography } = useTheme();
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
  const { lang, t } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showViewers, setShowViewers] = useState(false);
  const [viewersLoading, setViewersLoading] = useState(false);
  const [viewers, setViewers] = useState<StoryViewerRow[]>([]);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [commentsCount, setCommentsCount] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [comments, setComments] = useState<StoryComment[]>([]);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const activeStory = stories[currentIndex];
  const isOwnStory = !!activeStory && !!currentMemberId && activeStory.authorId === currentMemberId;
  const fontRegular = lang === 'od' ? 'NotoSansOriya' : undefined;
  const fontBold = lang === 'od' ? 'NotoSansOriya-Bold' : undefined;

  const timerRef = useRef<any>(null);
  const startTimeRef = useRef<number>(0);
  const elapsedBeforePauseRef = useRef<number>(0);

  // Triggered when current story index changes
  useEffect(() => {
    if (!visible || stories.length === 0) return;

    // Mark story as viewed — locally (for the ring/indicator) and, unless
    // this is your own story, record it server-side so the author can see
    // who viewed it.
    if (activeStory && !activeStory.viewed) {
      if (onStoryViewed) onStoryViewed(activeStory.id);
      if (!isOwnStory) {
        feedApi.recordStoryView(activeStory.id).catch(() => { /* best-effort, non-blocking */ });
      }
    }

    startProgress();

    return () => {
      clearTimer();
    };
  }, [currentIndex, visible, stories]);

  // Reset local like/comment state to match whichever story is now active
  useEffect(() => {
    if (!activeStory) return;
    setLiked(!!activeStory.isLiked);
    setLikesCount(activeStory.likesCount || 0);
    setCommentsCount(activeStory.commentsCount || 0);
    setShowComments(false);
    setCommentText('');
  }, [activeStory?.id]);

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

  const doDelete = async () => {
    if (!activeStory) return;
    setDeleting(true);
    try {
      const data = await feedApi.deleteStory(activeStory.id);
      if (data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onStoryDeleted?.(activeStory.id);
        // The parent will remove this story from the `stories` array it
        // passes back down, which shifts every later index down by one —
        // so the item that will end up AT `currentIndex` after that
        // re-render is already the correct "next" story. Don't also
        // advance the index (that would skip one), and only close/clamp
        // for the edge case of deleting the last item in the list.
        if (stories.length <= 1) {
          onClose();
        } else if (currentIndex >= stories.length - 1) {
          setCurrentIndex(currentIndex - 1);
        }
      } else {
        throw new Error(data.message);
      }
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common', 'errorTitle'), t('feed', 'storyDeleteError'));
    } finally {
      setDeleting(false);
    }
  };

  const handleDeletePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    pauseProgress();
    Alert.alert(
      t('feed', 'confirmDeleteStoryTitle'),
      t('feed', 'confirmDeleteStoryMessage'),
      [
        { text: t('common', 'cancel'), style: 'cancel', onPress: resumeProgress },
        { text: t('common', 'delete'), style: 'destructive', onPress: doDelete },
      ]
    );
  };

  const openViewers = async () => {
    if (!activeStory) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    pauseProgress();
    setShowViewers(true);
    setViewersLoading(true);
    try {
      const data = await feedApi.fetchStoryViewers(activeStory.id);
      if (data.success) setViewers(data.viewers);
    } catch {
      setViewers([]);
    } finally {
      setViewersLoading(false);
    }
  };

  const closeViewers = () => {
    setShowViewers(false);
    resumeProgress();
  };

  const handleToggleLike = async () => {
    if (!activeStory) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const wasLiked = liked;
    // Optimistic update
    const optimisticLiked = !wasLiked;
    const optimisticCount = Math.max(0, likesCount + (wasLiked ? -1 : 1));
    setLiked(optimisticLiked);
    setLikesCount(optimisticCount);
    onStoryLiked?.(activeStory.id, optimisticLiked, optimisticCount);
    try {
      const data = await feedApi.likeStory(activeStory.id);
      if (data.success) {
        setLiked(data.liked);
        setLikesCount(data.likes_count);
        onStoryLiked?.(activeStory.id, data.liked, data.likes_count);
      }
    } catch {
      // Revert on failure
      setLiked(wasLiked);
      setLikesCount(likesCount);
      onStoryLiked?.(activeStory.id, wasLiked, likesCount);
    }
  };

  const openComments = async () => {
    if (!activeStory) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    pauseProgress();
    setShowComments(true);
    setCommentsLoading(true);
    try {
      const data = await feedApi.fetchStoryComments(activeStory.id);
      if (data.success) setComments(data.comments);
    } catch {
      setComments([]);
    } finally {
      setCommentsLoading(false);
    }
  };

  const closeComments = () => {
    setShowComments(false);
    resumeProgress();
  };

  const handleSendComment = async () => {
    if (!activeStory || !commentText.trim() || sendingComment) return;
    const text = commentText.trim();
    setSendingComment(true);
    try {
      const data = await feedApi.addStoryComment(activeStory.id, text);
      if (data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setCommentText('');
        setCommentsCount((c) => c + 1);
        setComments((prev) => [...prev, data.comment]);
      }
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common', 'errorTitle'), t('feed', 'storyCommentError'));
    } finally {
      setSendingComment(false);
    }
  };

  const handleReportPress = () => {
    if (!activeStory) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    pauseProgress();
    Alert.alert(
      t('feed', 'confirmReportStoryTitle'),
      t('feed', 'confirmReportStoryMessage'),
      [
        { text: t('common', 'cancel'), style: 'cancel', onPress: resumeProgress },
        {
          text: t('feed', 'reportButton'),
          style: 'destructive',
          onPress: async () => {
            try {
              await feedApi.reportStory(activeStory.id, 'Reported from story viewer');
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert(t('common', 'successTitle'), t('feed', 'reportSuccessMessage'));
              onClose();
            } catch {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert(t('common', 'errorTitle'), t('feed', 'storyReportError'));
              resumeProgress();
            }
          },
        },
      ]
    );
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

            <View className="flex-row items-center" style={{ gap: spacing.xs }}>
              {isOwnStory ? (
                <TouchableOpacity onPress={handleDeletePress} disabled={deleting} className="z-40" style={{ padding: spacing.sm }}>
                  {deleting ? <ActivityIndicator size="small" color="white" /> : <Trash2 size={18} color="white" />}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={handleReportPress} className="z-40" style={{ padding: spacing.sm }}>
                  <Flag size={18} color="white" />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onClose} className="z-40" style={{ padding: spacing.sm }}>
                <X size={20} color="white" />
              </TouchableOpacity>
            </View>
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

        {/* Like / comment-count row + "Seen by" (own story only) */}
        <View className="absolute z-30" style={{ left: 0, right: 0, bottom: 78, paddingHorizontal: spacing.lg }}>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center" style={{ gap: spacing.xl }}>
              <TouchableOpacity onPress={handleToggleLike} className="flex-row items-center" style={{ gap: spacing.xs }}>
                <Heart size={24} color={liked ? '#ef4444' : 'white'} fill={liked ? '#ef4444' : 'transparent'} />
                {likesCount > 0 && (
                  <Text className="text-white" style={{ fontFamily: fontBold, ...typography.caption, fontWeight: '700' }}>{likesCount}</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={openComments} className="flex-row items-center" style={{ gap: spacing.xs }}>
                <MessageCircle size={24} color="white" />
                {commentsCount > 0 && (
                  <Text className="text-white" style={{ fontFamily: fontBold, ...typography.caption, fontWeight: '700' }}>{commentsCount}</Text>
                )}
              </TouchableOpacity>
            </View>

            {isOwnStory && (
              <TouchableOpacity onPress={openViewers} className="flex-row items-center" style={{ gap: spacing.xs }}>
                <Eye size={16} color="white" />
                <Text className="text-white" style={{ fontFamily: fontBold, ...typography.caption, fontWeight: '700' }}>
                  {t('feed', 'seenByPrefix')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Comment input bar, pinned to the bottom */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="absolute z-30"
          style={{ left: 0, right: 0, bottom: 0 }}
        >
          <View className="flex-row items-center" style={{ gap: spacing.sm, padding: spacing.lg }}>
            <TextInput
              value={commentText}
              onChangeText={setCommentText}
              onFocus={pauseProgress}
              onBlur={resumeProgress}
              placeholder={t('feed', 'storyCommentPlaceholder')}
              placeholderTextColor="rgba(255,255,255,0.6)"
              style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: radius.full, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, color: '#fff' }}
              onSubmitEditing={handleSendComment}
            />
            {!!commentText.trim() && (
              <TouchableOpacity onPress={handleSendComment} disabled={sendingComment} style={{ backgroundColor: C.primary, borderRadius: radius.full, padding: spacing.sm + 2 }}>
                {sendingComment ? <ActivityIndicator size="small" color="#fff" /> : <Send size={18} color="#fff" />}
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>

      {/* Viewers list bottom sheet */}
      <Modal visible={showViewers} transparent animationType="slide" onRequestClose={closeViewers}>
        <Pressable style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' }} onPress={closeViewers}>
          <Pressable
            style={{
              backgroundColor: C.card, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
              maxHeight: SCREEN_HEIGHT * 0.6, padding: spacing.xl,
            }}
          >
            <View className="flex-row items-center justify-between" style={{ marginBottom: spacing.lg }}>
              <Text style={{ color: C.text, fontFamily: fontBold, ...typography.title }}>
                {viewersLoading ? t('feed', 'viewersTitle') : `${t('feed', 'viewersTitle')} (${viewers.length})`}
              </Text>
              <TouchableOpacity onPress={closeViewers}>
                <X size={20} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            {viewersLoading ? (
              <ActivityIndicator size="large" color={C.primary} style={{ paddingVertical: spacing.xl }} />
            ) : viewers.length === 0 ? (
              <EmptyState emoji="👀" title={t('feed', 'noViewersTitle')} subtitle={t('feed', 'noViewersSubtitle')} />
            ) : (
              <FlatList
                data={viewers}
                keyExtractor={(v) => v.membershipNo}
                renderItem={({ item }) => (
                  <View className="flex-row items-center" style={{ gap: spacing.md, paddingVertical: spacing.sm }}>
                    <Avatar name={item.name} photoUrl={item.photo} size={40} />
                    <View className="flex-1">
                      <Text style={{ color: C.text, fontFamily: fontBold, ...typography.bodyEmphasis }}>{item.name}</Text>
                    </View>
                    <Text style={{ color: C.textFaint, fontFamily: fontRegular, ...typography.caption }}>
                      {timeAgoShort(item.viewedAt)}
                    </Text>
                  </View>
                )}
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Comments list bottom sheet */}
      <Modal visible={showComments} transparent animationType="slide" onRequestClose={closeComments}>
        <Pressable style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' }} onPress={closeComments}>
          <Pressable
            style={{
              backgroundColor: C.card, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
              maxHeight: SCREEN_HEIGHT * 0.6, padding: spacing.xl,
            }}
          >
            <View className="flex-row items-center justify-between" style={{ marginBottom: spacing.lg }}>
              <Text style={{ color: C.text, fontFamily: fontBold, ...typography.title }}>
                {commentsLoading ? t('feed', 'commentsTitle') : `${t('feed', 'commentsTitle')} (${comments.length})`}
              </Text>
              <TouchableOpacity onPress={closeComments}>
                <X size={20} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            {commentsLoading ? (
              <ActivityIndicator size="large" color={C.primary} style={{ paddingVertical: spacing.xl }} />
            ) : comments.length === 0 ? (
              <EmptyState emoji="💬" title={t('feed', 'noStoryCommentsTitle')} subtitle={t('feed', 'noStoryCommentsSubtitle')} />
            ) : (
              <FlatList
                data={comments}
                keyExtractor={(c) => c.id}
                renderItem={({ item }) => (
                  <View className="flex-row items-start" style={{ gap: spacing.md, paddingVertical: spacing.sm }}>
                    <Avatar name={item.authorName} photoUrl={item.authorPhoto} size={36} />
                    <View className="flex-1">
                      <Text style={{ color: C.text, fontFamily: fontBold, ...typography.bodyEmphasis }}>{item.authorName}</Text>
                      <Text style={{ color: C.textMuted, fontFamily: fontRegular, marginTop: 2, ...typography.body }}>{item.text}</Text>
                      <Text style={{ color: C.textFaint, marginTop: 2, ...typography.caption }}>{timeAgoShort(item.createdAt)}</Text>
                    </View>
                  </View>
                )}
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </Modal>
  );
}
