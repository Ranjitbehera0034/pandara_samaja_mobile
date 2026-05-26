// src/screens/feed/FeedScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, ActivityIndicator, Alert, SafeAreaView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Megaphone } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { Post, Story, Poll, MediaItem } from '../../types';
import CreatePost from '../../components/feed/CreatePost';
import StoryRing from '../../components/feed/StoryRing';
import StoryViewer from '../../components/feed/StoryViewer';
import PostCard from '../../components/feed/PostCard';
import { useSocket } from '../../hooks/useSocket';
import * as feedApi from '../../api/feed';
import { mapPost, mapAnnouncement } from '../../utils/feedUtils';

export default function FeedScreen() {
  const navigation = useNavigation<any>();
  const { member } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
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
  });

  // ── Post actions ──
  const handleLikePost = async (id: string) => {
    try {
      await feedApi.likePost(id);
    } catch (e) {
      console.error('[LIKE] Error:', e);
    }
  };

  const handleCommentPost = async (id: string, text: string) => {
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
  };

  const handleReplyPost = async (postId: string, parentCommentId: string, text: string) => {
    try {
      await feedApi.addComment(postId, text, parentCommentId);
    } catch (e) {
      console.error('[REPLY] Error:', e);
      Alert.alert('Error', 'Failed to submit reply.');
    }
  };

  const handleLikeComment = async (postId: string, commentId: string) => {
    try {
      await feedApi.likeComment(commentId);
    } catch (e) {
      console.error('[LIKE_COMMENT] Error:', e);
    }
  };

  const handleCreatePost = async (content: string, media?: MediaItem[], files?: any[], poll?: Poll, location?: string) => {
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
      }
    } catch (e: any) {
      console.error('[CREATE_POST] Error:', e);
      Alert.alert('Error', e.message || 'Failed to submit post.');
    }
  };

  const handleDeletePost = async (id: string) => {
    try {
      const res = await feedApi.deletePost(id);
      if (res.success) {
        setPosts(prev => prev.filter(p => p.id !== id));
      }
    } catch (e) {
      console.error('[DELETE_POST] Error:', e);
      Alert.alert('Error', 'Failed to delete post.');
    }
  };

  const handleEditPost = async (id: string, text: string) => {
    try {
      const res = await feedApi.editPost(id, text);
      if (res.success) {
        setPosts(prev => prev.map(p => p.id === id ? { ...p, content: text } : p));
      }
    } catch (e) {
      console.error('[EDIT_POST] Error:', e);
      Alert.alert('Error', 'Failed to update post.');
    }
  };

  const handleReportPost = async (id: string, reason: string) => {
    try {
      const res = await feedApi.reportPost(id, reason);
      if (res.success) {
        Alert.alert('Report Submitted', 'Thank you for keeping our community safe. We will review this post.');
      }
    } catch (e) {
      console.error('[REPORT_POST] Error:', e);
      Alert.alert('Error', 'Failed to submit report.');
    }
  };

  const handlePollVote = async (postId: string, optionId: string) => {
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
    } catch (e) {
      console.error('[VOTE] Error:', e);
    }
  };

  // ── Story actions ──
  const handleAddStory = async (mediaUri: string, mediaType: 'image' | 'video') => {
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
  };

  const handleViewStory = (authorId: string) => {
    setSelectedStoryAuthor(authorId);
    setShowStoryViewer(true);
  };

  const selectedAuthorStories = selectedStoryAuthor
    ? stories.filter(s => s.authorId === selectedStoryAuthor)
    : [];

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      {/* Top Header */}
      <View className="px-4 py-3 border-b border-slate-800 flex-row justify-between items-center bg-slate-900">
        <Text className="text-white font-bold text-xl tracking-wide">Community Feed</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('Announcements')}
          className="p-2 bg-slate-800 rounded-full flex-row items-center justify-center border border-slate-700/50"
        >
          <Megaphone size={18} color="#3b82f6" />
        </TouchableOpacity>
      </View>

      {isLoading && !isRefreshing ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
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
          )}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
          refreshing={isRefreshing}
          onRefresh={() => loadFeedData(true)}
          ListHeaderComponent={
            <View>
              <CreatePost onPostCreate={handleCreatePost} />
              <StoryRing
                stories={stories}
                onAddStory={handleAddStory}
                onViewStory={handleViewStory}
              />
            </View>
          }
        />
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
    </SafeAreaView>
  );
}
