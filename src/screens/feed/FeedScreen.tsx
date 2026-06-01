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

// Feed skeleton list loader
function FeedSkeleton() {
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 12, gap: 16 }}>
      {[1, 2, 3].map(i => (
        <View key={i} style={{ backgroundColor: '#1e293b', borderRadius: 16, padding: 16, gap: 12, borderWidth: 1, borderColor: '#334155/50' }}>
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
      Alert.alert('Error', 'Failed to load community feed.');
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
      Alert.alert('Error', 'Failed to submit comment.');
    }
  }, []);

  const handleReplyPost = useCallback(async (postId: string, parentCommentId: string, text: string) => {
    try {
      await feedApi.addComment(postId, text, parentCommentId);
    } catch (e) {
      console.error('[REPLY] Error:', e);
      Alert.alert('Error', 'Failed to submit reply.');
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
      Alert.alert('Error', e.message || 'Failed to submit post.');
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
      Alert.alert('Error', 'Failed to delete post.');
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
      Alert.alert('Error', 'Failed to update post.');
    }
  }, []);

  const handleReportPost = useCallback(async (id: string, reason: string) => {
    try {
      const res = await feedApi.reportPost(id, reason);
      if (res.success) {
        Alert.alert('Report Submitted', 'Thank you for keeping our community safe. We will review this post.');
      }
    } catch (e) {
      console.error('[REPORT_POST] Error:', e);
      Alert.alert('Error', 'Failed to submit report.');
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
        Alert.alert('Success', 'Story uploaded successfully!');
        loadFeedData();
      }
    } catch (e) {
      console.error('[ADD_STORY] Error:', e);
      Alert.alert('Error', 'Failed to upload story.');
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
    <View style={{ flex: 1, backgroundColor: '#0f172a', paddingTop: insets.top }}>
      {/* Polished Top Header */}
      <View className="px-4 py-3 border-b border-slate-800 flex-row justify-between items-center bg-slate-900">
        <View className="flex-row items-center gap-2">
          {/* Logo representation */}
          <View className="w-8 h-8 rounded-lg bg-blue-600 items-center justify-center border border-blue-500/20">
            <Text className="text-white font-extrabold text-lg leading-none">P</Text>
          </View>
          <Text className="text-white font-extrabold text-lg tracking-wide">Pandara Samaja</Text>
        </View>
        <View className="flex-row items-center gap-2.5">
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate('Announcements');
            }}
            className="p-2.5 bg-slate-800 rounded-full flex-row items-center justify-center border border-slate-700/50"
          >
            <Megaphone size={18} color="#3b82f6" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate('Notifications');
              setUnreadCount(0); // clear count
            }}
            className="p-2.5 bg-slate-800 rounded-full flex-row items-center justify-center border border-slate-700/50"
          >
            <Bell size={18} color="#f8fafc" />
            {unreadCount > 0 && (
              <View className="absolute -top-1.5 -right-1.5 bg-rose-500 rounded-full min-w-5 h-5 items-center justify-center px-1 border border-slate-900">
                <Text className="text-white text-[9px] font-bold leading-none">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Global Search Component inside the header flow */}
      <View className="px-4 pt-3 pb-1 bg-slate-900">
        <GlobalSearch />
      </View>

      {isLoading && !isRefreshing ? (
        <FeedSkeleton />
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
                tintColor="#2563eb"
                colors={['#2563eb']}
                progressBackgroundColor="#1e293b"
              />
            }
            ListHeaderComponent={ListHeader}
            ListEmptyComponent={
              <EmptyState
                emoji="📰"
                title="No posts yet"
                subtitle="Be the first to share something"
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
