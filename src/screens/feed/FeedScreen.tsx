// src/screens/feed/FeedScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ActivityIndicator, Alert, TouchableOpacity, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Megaphone, Bell } from 'lucide-react-native';
import { FlashList } from '@shopify/flash-list';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { Post, Story, Poll, MediaItem } from '../../types';
import CreatePost from '../../components/feed/CreatePost';
import StoryRing from '../../components/feed/StoryRing';
import StoryViewer from '../../components/feed/StoryViewer';
import PostCard from '../../components/feed/PostCard';
import GlobalSearch from '../../components/common/GlobalSearch';
import SkeletonBox from '../../components/common/SkeletonBox';
import EmptyState from '../../components/common/EmptyState';
import { useSocket } from '../../hooks/useSocket';
import * as feedApi from '../../api/feed';
import { mapPost, mapAnnouncement } from '../../utils/feedUtils';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

// Feed skeleton list loader
function FeedSkeleton({ colors }: { colors: ReturnType<typeof useTheme>['colors'] }) {
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 12, gap: 16 }}>
      {[1, 2, 3].map(i => (
        <View key={i} style={{ backgroundColor: colors.card, borderRadius: 16, padding: 16, gap: 12, borderWidth: 1, borderColor: colors.border }}>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <SkeletonBox width={40} height={40} borderRadius={20} />
            <View style={{ gap: 6, flex: 1 }}>
              <SkeletonBox width="65%" height={12} />
              <SkeletonBox width="45%" height={10} />
            </View>
          </View>
          <SkeletonBox width="100%" height={12} />
          <SkeletonBox width="85%" height={12} />
          <SkeletonBox width="100%" height={160} borderRadius={12} />
          <View style={{ flexDirection: 'row', gap: 16, marginTop: 4 }}>
            <SkeletonBox width={60} height={28} borderRadius={14} />
            <SkeletonBox width={60} height={28} borderRadius={14} />
          </View>
        </View>
      ))}
    </View>
  );
}

export default function FeedScreen() {
  const navigation = useNavigation<any>();
  const { member } = useAuth();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [posts, setPosts] = useState<Post[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(2); // Start with mock unread count
  
  // Story viewer state
  const [selectedStoryAuthor, setSelectedStoryAuthor] = useState<string | null>(null);
  const [showStoryViewer, setShowStoryViewer] = useState(false);

  // ── Fetch all feed data ──
  const loadFeedData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      // Fetch posts, announcements, stories in parallel
      const [postsRes, anncRes, storiesRes] = await Promise.allSettled([
        feedApi.fetchFeedPosts(),
        feedApi.fetchAnnouncements(),
        feedApi.fetchStories()
      ]);

      let parsedPosts: Post[] = [];
      let parsedAnnc: Post[] = [];
      let parsedStories: Story[] = [];

      if (postsRes.status === 'fulfilled' && postsRes.value.success) {
        parsedPosts = postsRes.value.posts.map(mapPost);
      }
      if (anncRes.status === 'fulfilled' && anncRes.value.success) {
        parsedAnnc = anncRes.value.posts.map(mapAnnouncement);
      }
      if (storiesRes.status === 'fulfilled' && storiesRes.value.success) {
        parsedStories = storiesRes.value.stories;
      }

      // Merge and sort descending by timestamp
      const merged = [...parsedPosts, ...parsedAnnc].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setPosts(merged);
      setStories(parsedStories);
    } catch (e) {
      console.error('[FEED] Failed to load feed data:', e);
      Alert.alert(t('common', 'errorTitle'), t('feed', 'loadError'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadFeedData();
  }, [loadFeedData]);

  // ── Socket realtime event handlers ──
  useSocket({
    onNewPost: (rawPost) => {
      const mapped = mapPost(rawPost);
      setPosts(prev => [mapped, ...prev]);
    },
    onLikeUpdated: ({ postId, likes }) => {
      setPosts(prev =>
        prev.map(p =>
          p.id === postId
            ? { ...p, likes, reactions: { ...p.reactions, like: likes } }
            : p
        )
      );
    },
    onNewComment: ({ postId }) => {
      setPosts(prev =>
        prev.map(p =>
          p.id === postId
            ? { ...p, commentsCount: (p.commentsCount ?? 0) + 1 }
            : p
        )
      );
    },
    onNotificationCount: ({ count }) => {
      setUnreadCount(count);
    }
  });

  // ── Post actions ──
  const handleLikePost = useCallback(async (id: string) => {
    try {
      await feedApi.likePost(id);
    } catch (e) {
      console.error('[LIKE] Error:', e);
    }
  }, []);

  const handleCommentPost = useCallback(async (id: string, text: string) => {
    try {
      await feedApi.addComment(id, text);
      setPosts(prev =>
        prev.map(p =>
          p.id === id ? { ...p, commentsCount: (p.commentsCount ?? 0) + 1 } : p
        )
      );
    } catch (e) {
      console.error('[COMMENT] Error:', e);
      Alert.alert(t('common', 'errorTitle'), t('feed', 'commentError'));
    }
  }, []);

  const handleReplyPost = useCallback(async (postId: string, parentCommentId: string, text: string) => {
    try {
      await feedApi.addComment(postId, text, parentCommentId);
    } catch (e) {
      console.error('[REPLY] Error:', e);
      Alert.alert(t('common', 'errorTitle'), t('feed', 'replyError'));
    }
  }, []);

  const handleLikeComment = useCallback(async (postId: string, commentId: string) => {
    try {
      await feedApi.likeComment(commentId);
    } catch (e) {
      console.error('[LIKE_COMMENT] Error:', e);
    }
  }, []);

  const handleCreatePost = useCallback(async (content: string, media?: MediaItem[], files?: any[], poll?: Poll, location?: string) => {
    try {
      const formData = new FormData();
      formData.append('text_content', content);
      if (location) formData.append('location', location);
      if (poll) formData.append('poll', JSON.stringify(poll));
      
      if (files && files.length > 0) {
        files.forEach((file) => {
          // @ts-ignore
          formData.append('media', file);
        });
      }

      const res = await feedApi.createPost(formData);
      if (res.success) {
        const mapped = mapPost(res.post);
        setPosts(prev => [mapped, ...prev]);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e: any) {
      console.error('[CREATE_POST] Error:', e);
      Alert.alert(t('common', 'errorTitle'), e.message || t('feed', 'postError'));
    }
  }, []);

  const handleDeletePost = useCallback(async (id: string) => {
    try {
      const res = await feedApi.deletePost(id);
      if (res.success) {
        setPosts(prev => prev.filter(p => p.id !== id));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e) {
      console.error('[DELETE_POST] Error:', e);
      Alert.alert(t('common', 'errorTitle'), t('feed', 'deleteError'));
    }
  }, []);

  const handleEditPost = useCallback(async (id: string, text: string) => {
    try {
      const res = await feedApi.editPost(id, text);
      if (res.success) {
        setPosts(prev => prev.map(p => p.id === id ? { ...p, content: text } : p));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e) {
      console.error('[EDIT_POST] Error:', e);
      Alert.alert(t('common', 'errorTitle'), t('feed', 'editError'));
    }
  }, []);

  const handleReportPost = useCallback(async (id: string, reason: string) => {
    try {
      const res = await feedApi.reportPost(id, reason);
      if (res.success) {
        Alert.alert(t('feed', 'reportSuccessTitle'), t('feed', 'reportSuccessMessage'));
      }
    } catch (e) {
      console.error('[REPORT_POST] Error:', e);
      Alert.alert(t('common', 'errorTitle'), t('feed', 'reportError'));
    }
  }, []);

  const handlePollVote = useCallback(async (postId: string, optionId: string) => {
    try {
      await feedApi.sharePost(postId); // Share endpoint used as vote submitter
      // Update local poll vote count
      setPosts(prev =>
        prev.map(p => {
          if (p.id === postId && p.poll) {
            const updatedOpts = p.poll.options.map(o =>
              o.id === optionId ? { ...o, votes: o.votes + 1 } : o
            );
            return {
              ...p,
              poll: {
                ...p.poll,
                options: updatedOpts,
                totalVotes: p.poll.totalVotes + 1,
                myVote: optionId,
              },
            };
          }
          return p;
        })
      );
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {
      console.error('[VOTE] Error:', e);
    }
  }, []);

  // ── Story actions ──
  const handleAddStory = useCallback(async (mediaUri: string, mediaType: 'image' | 'video') => {
    try {
      const formData = new FormData();
      const uriParts = mediaUri.split('/');
      const fileName = uriParts[uriParts.length - 1];
      const fileType = mediaType === 'video' ? 'video/mp4' : 'image/jpeg';
      
      // @ts-ignore
      formData.append('media', {
        uri: mediaUri,
        name: fileName,
        type: fileType,
      });
      formData.append('mediaType', mediaType);

      const res = await feedApi.createStory(formData);
      if (res.success) {
        Alert.alert(t('common', 'successTitle'), t('feed', 'storySuccessMessage'));
        loadFeedData();
      }
    } catch (e) {
      console.error('[ADD_STORY] Error:', e);
      Alert.alert(t('common', 'errorTitle'), t('feed', 'storyError'));
    }
  }, [loadFeedData]);

  const handleViewStory = useCallback((authorId: string) => {
    setSelectedStoryAuthor(authorId);
    setShowStoryViewer(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const selectedAuthorStories = selectedStoryAuthor
    ? stories.filter(s => s.authorId === selectedStoryAuthor)
    : [];

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await loadFeedData(true);
    } finally {
      setIsRefreshing(false);
    }
  }, [loadFeedData]);

  const renderPost = useCallback(({ item }: { item: Post }) => (
    <PostCard
      post={item}
      onLike={handleLikePost}
      onComment={handleCommentPost}
      onReply={handleReplyPost}
      onLikeComment={handleLikeComment}
      onDelete={handleDeletePost}
      onEdit={handleEditPost}
      onReport={handleReportPost}
      onPollVote={handlePollVote}
    />
  ), [handleLikePost, handleCommentPost, handleReplyPost, handleLikeComment, handleDeletePost, handleEditPost, handleReportPost, handlePollVote]);

  const keyExtractor = useCallback((item: Post) => item.id, []);

  const ListHeader = useCallback(() => (
    <View>
      <CreatePost onPostCreate={handleCreatePost} />
      <StoryRing
        stories={stories}
        onAddStory={handleAddStory}
        onViewStory={handleViewStory}
      />
    </View>
  ), [stories, handleCreatePost, handleAddStory, handleViewStory]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      {/* Polished Top Header */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.bg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {/* Logo representation */}
          <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.primaryLight }}>
            <Text style={{ color: colors.text, fontWeight: '800', fontSize: 18, lineHeight: 18 }}>P</Text>
          </View>
          <Text style={{ color: colors.text, fontWeight: '800', fontSize: 18, letterSpacing: 0.3 }}>{t('common', 'appName')}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate('Announcements');
            }}
            style={{ padding: 10, backgroundColor: colors.card, borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border }}
          >
            <Megaphone size={18} color={colors.primaryLight} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate('Notifications');
              setUnreadCount(0); // clear count
            }}
            style={{ padding: 10, backgroundColor: colors.card, borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border }}
          >
            <Bell size={18} color={colors.text} />
            {unreadCount > 0 && (
              <View style={{ position: 'absolute', top: -6, right: -6, backgroundColor: colors.error, borderRadius: 999, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 1, borderColor: colors.bg }}>
                <Text style={{ color: '#ffffff', fontSize: 9, fontWeight: '700', lineHeight: 9 }}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Global Search Component inside the header flow */}
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, backgroundColor: colors.bg }}>
        <GlobalSearch />
      </View>

      {isLoading && !isRefreshing ? (
        <FeedSkeleton colors={colors} />
      ) : (
        <View style={{ flex: 1 }}>
          <FlashList
            data={posts}
            keyExtractor={keyExtractor}
            renderItem={renderPost}
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 80 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={colors.primary}
                colors={[colors.primary]}
                progressBackgroundColor={colors.card}
              />
            }
            ListHeaderComponent={ListHeader}
            ListEmptyComponent={
              <EmptyState
                emoji="📰"
                title={t('feed', 'noPostsTitle')}
                subtitle={t('feed', 'noPostsSubtitle')}
              />
            }
          />
        </View>
      )}

      {/* Story Viewer Overlay */}
      {showStoryViewer && selectedStoryAuthor && (
        <StoryViewer
          visible={showStoryViewer}
          stories={selectedAuthorStories}
          onClose={() => {
            setShowStoryViewer(false);
            setSelectedStoryAuthor(null);
          }}
          onStoryViewed={(storyId) => {
            // Mark locally viewed
            setStories(prev =>
              prev.map(s => s.id === storyId ? { ...s, viewed: true } : s)
            );
          }}
        />
      )}
    </View>
  );
}
