// src/components/feed/PostCard.tsx
import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, TextInput,
  Share, Modal, ScrollView, Alert, Pressable, Animated
} from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import {
  MessageSquare, Share2, MoreHorizontal, Bookmark,
  Flag, Trash2, Edit3, X, Send, ThumbsUp
} from 'lucide-react-native';
import { Post, Comment, ReactionType } from '../../types';
import { cleanPhoto, getInitial } from '../../utils/googleDriveUrl';
import { timeAgoShort, REACTIONS, mapComment, containsBannedContent, censorText } from '../../utils/feedUtils';
import { useAuth } from '../../context/AuthContext';
import MediaGrid from './MediaGrid';
import RichContent from './RichContent';
import PollDisplay from './PollDisplay';
import CommentItem from './CommentItem';
import * as feedApi from '../../api/feed';

interface Props {
  post: Post;
  onLike: (id: string) => void;
  onReact?: (id: string, reaction: ReactionType) => void;
  onComment: (id: string, text: string) => void;
  onReply?: (postId: string, parentCommentId: string, text: string) => void;
  onLikeComment: (postId: string, commentId: string) => void;
  onDelete?: (id: string) => void;
  onEdit?: (id: string, newContent: string) => void;
  onReport?: (id: string, reason: string) => void;
  onShare?: (id: string) => void;
  onBookmark?: (id: string) => void;
  onPollVote?: (postId: string, optionId: string) => void;
}

export default function PostCard({
  post, onLike, onComment, onReply, onLikeComment,
  onDelete, onEdit, onReport, onShare, onBookmark, onPollVote
}: Props) {
  const { member, user } = useAuth();
  const [showComments, setShowComments] = useState(false);
  const [localComments, setLocalComments] = useState<Comment[]>(post.comments || []);
  const [loadingComments, setLoadingComments] = useState(false);
  const [hasMoreComments, setHasMoreComments] = useState(false);
  const [commentsPage, setCommentsPage] = useState(1);
  const [commentText, setCommentText] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [bookmarked, setBookmarked] = useState(post.isBookmarked || false);
  const [myReaction, setMyReaction] = useState<ReactionType | null>(
    post.myReaction || (post.isLiked ? 'like' : null)
  );
  const [localReactions, setLocalReactions] = useState(
    post.reactions || { like: post.likes, love: 0, haha: 0, wow: 0, sad: 0, angry: 0 }
  );
  const [likeScale] = useState(new Animated.Value(1));

  const isAuthor = member && (
    member.membership_no === post.authorId
  );
  const totalReactions = Object.values(localReactions).reduce((a, b) => a + b, 0);
  const topReactions = REACTIONS.filter(r => localReactions[r.type as ReactionType] > 0)
    .sort((a, b) => localReactions[b.type as ReactionType] - localReactions[a.type as ReactionType])
    .slice(0, 3);
  const currentReaction = REACTIONS.find(r => r.type === myReaction);
  const photo = cleanPhoto(post.authorAvatar);

  // Like Animation Bounce
  const animateLike = () => {
    likeScale.setValue(0.7);
    Animated.spring(likeScale, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true
    }).start();
  };

  // ── Reaction handler ──
  const handleReaction = (type: ReactionType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    animateLike();
    if (myReaction === type) {
      setLocalReactions(prev => ({ ...prev, [type]: Math.max(0, prev[type] - 1) }));
      setMyReaction(null);
    } else {
      if (myReaction) {
        setLocalReactions(prev => ({ ...prev, [myReaction]: Math.max(0, prev[myReaction] - 1) }));
      }
      setLocalReactions(prev => ({ ...prev, [type]: prev[type] + 1 }));
      setMyReaction(type);
    }
    setShowReactions(false);
    onLike(post.id);
  };

  // ── Load comments ──
  const loadComments = useCallback(async (page = 1) => {
    try {
      setLoadingComments(true);
      const data = await feedApi.fetchComments(post.id, page, 5);
      if (data.success) {
        const mapped = data.comments.map(mapComment);
        if (page === 1) setLocalComments(mapped);
        else setLocalComments(prev => [...prev, ...mapped]);
        setHasMoreComments(data.total > page * 5);
        setCommentsPage(page);
      }
    } catch (e) {
      console.error('[COMMENTS] Failed to load:', e);
    } finally {
      setLoadingComments(false);
    }
  }, [post.id]);

  const toggleComments = () => {
    const next = !showComments;
    setShowComments(next);
    if (next && localComments.length === 0) loadComments(1);
  };

  // ── Submit comment ──
  const handleCommentSubmit = async () => {
    if (!commentText.trim()) return;
    if (containsBannedContent(commentText)) {
      Alert.alert('Warning', 'Your comment contains inappropriate content.');
      return;
    }
    const newComment: Comment = {
      id: Date.now().toString(),
      authorId: member?.membership_no || 'me',
      authorName: user?.name || member?.name || 'Me',
      authorAvatar: user?.profile_photo_url,
      content: commentText,
      timestamp: new Date().toISOString(),
      replies: [],
      likes: 0,
      isLiked: false,
    };
    setLocalComments(prev => [...prev, newComment]);
    onComment(post.id, commentText);
    setCommentText('');
  };

  // ── Reply to comment ──
  const handleReplyComment = (parentId: string, text: string) => {
    if (onReply) onReply(post.id, parentId, text);
  };

  // ── Share ──
  const handleShare = async () => {
    try {
      await Share.share({
        message: `${post.authorName}: ${post.content.substring(0, 100)}`,
        title: `Post by ${post.authorName}`,
      });
      if (onShare) onShare(post.id);
    } catch (e) {
      console.error('[SHARE] Error:', e);
    }
  };

  // ── Delete ──
  const handleDelete = () => {
    Alert.alert('Delete Post', 'Are you sure you want to delete this post?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: () => {
          if (onDelete) onDelete(post.id);
          setShowMenu(false);
        }
      },
    ]);
  };

  // ── Report ──
  const REPORT_REASONS = [
    'Adult / Sexual content', 'Harassment or bullying', 'Hate speech',
    'Spam or misleading', 'Violence or dangerous content', 'False information', 'Other'
  ];

  // Build nested comment tree
  const buildCommentTree = (parentId?: string): Comment[] => {
    return localComments
      .filter(c => c.parentId === parentId)
      .map(c => ({ ...c, replies: buildCommentTree(c.id) }));
  };
  const nestedComments = buildCommentTree(undefined);

  return (
    <View className="bg-slate-800/80 rounded-2xl border border-slate-700/50 p-4 mb-4 shadow-lg">

      {/* ── Header ── */}
      <View className="flex-row justify-between items-start mb-3">
        <View className="flex-row items-center gap-3">
          {/* Avatar with ring */}
          <View className="w-10 h-10 rounded-full bg-slate-900 border border-slate-700 overflow-hidden items-center justify-center">
            {photo ? (
              <Image source={{ uri: photo }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={200} />
            ) : (
              <Text className="text-white font-bold text-sm">{getInitial(post.authorName)}</Text>
            )}
          </View>
          <View>
            <View className="flex-row items-center gap-1.5">
              <Text className="text-white font-semibold text-sm">{post.authorName}</Text>
              {post.authorVerified && <Text className="text-blue-500 text-xs">✓</Text>}
            </View>
            <Text className="text-slate-500 text-xs">
              {timeAgoShort(post.timestamp)}
              {post.location ? ` · ${post.location}` : ''}
            </Text>
          </View>
        </View>

        {/* Three-dot menu */}
        <TouchableOpacity onPress={() => setShowMenu(true)} className="p-1.5">
          <MoreHorizontal size={18} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      {/* ── Content ── */}
      <View className="mb-3">
        {isEditing ? (
          <View className="gap-2">
            <TextInput
              className="bg-slate-900/50 text-white rounded-xl px-4 py-3 border border-slate-700 text-sm"
              value={editContent}
              onChangeText={setEditContent}
              multiline
              autoFocus
            />
            <View className="flex-row justify-end gap-2">
              <TouchableOpacity onPress={() => setIsEditing(false)} className="px-3 py-1.5">
                <Text className="text-slate-400 text-sm">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { if (onEdit && editContent.trim()) { onEdit(post.id, editContent); } setIsEditing(false); }}
                className="px-4 py-1.5 bg-blue-600 rounded-lg"
              >
                <Text className="text-white text-sm font-medium">Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <RichContent text={post.content} />
        )}
      </View>

      {/* ── Media Grid ── */}
      {((post.media?.length ?? 0) > 0 || (post.images?.length ?? 0) > 0) && (
        <MediaGrid
          media={post.media?.length ? post.media : (post.images?.map(url => ({ url, type: 'image' as const })) || [])}
        />
      )}

      {/* ── Poll ── */}
      {post.poll && (
        <PollDisplay
          poll={post.poll}
          onVote={(optionId) => onPollVote?.(post.id, optionId)}
        />
      )}

      {/* ── Reaction summary ── */}
      {(totalReactions > 0 || (post.commentsCount ?? 0) > 0) && (
        <View className="flex-row items-center justify-between px-1 py-2">
          <View className="flex-row items-center gap-1">
            {topReactions.map(r => (
              <Text key={r.type} className="text-base">{r.emoji}</Text>
            ))}
            {totalReactions > 0 && (
              <Text className="text-slate-400 text-xs ml-1">{totalReactions}</Text>
            )}
          </View>
          {(post.commentsCount ?? 0) > 0 && (
            <TouchableOpacity onPress={toggleComments}>
              <Text className="text-slate-400 text-xs hover:text-white">
                {post.commentsCount} comment{post.commentsCount === 1 ? '' : 's'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── Action buttons ── */}
      <View className="flex-row items-center justify-between border-t border-slate-700/50 pt-3 mt-1">
        <View className="flex-row items-center gap-1 flex-1">

          {/* Like / Reaction button */}
          <TouchableOpacity
            onPress={() => handleReaction('like')}
            onLongPress={() => setShowReactions(true)}
            className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-lg ${myReaction ? 'bg-blue-500/10' : ''}`}
          >
            <Animated.View style={{ transform: [{ scale: likeScale }], flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {myReaction ? (
                <Text className="text-lg leading-none">{currentReaction?.emoji}</Text>
              ) : (
                <ThumbsUp size={18} color="#94a3b8" />
              )}
              <Text className={`text-sm font-medium ${myReaction ? 'text-blue-500' : 'text-slate-400'}`}>
                {myReaction ? currentReaction?.label : 'Like'}
              </Text>
            </Animated.View>
          </TouchableOpacity>

          {/* Comment button */}
          <TouchableOpacity
            onPress={toggleComments}
            className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-lg ${showComments ? 'bg-blue-500/10' : ''}`}
          >
            <MessageSquare size={18} color={showComments ? '#3b82f6' : '#94a3b8'} />
            {(post.commentsCount ?? 0) > 0 && (
              <Text className="text-slate-400 text-sm">{post.commentsCount}</Text>
            )}
          </TouchableOpacity>

          {/* Share button */}
          <TouchableOpacity
            onPress={handleShare}
            className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-lg"
          >
            <Share2 size={18} color="#94a3b8" />
            {(post.shareCount ?? 0) > 0 && (
              <Text className="text-slate-400 text-sm">{post.shareCount}</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Bookmark */}
        <TouchableOpacity
          onPress={() => { setBookmarked(!bookmarked); if (onBookmark) onBookmark(post.id); }}
          className="p-1.5 rounded-lg"
        >
          <Bookmark size={18} color={bookmarked ? '#f59e0b' : '#94a3b8'} fill={bookmarked ? '#f59e0b' : 'none'} />
        </TouchableOpacity>
      </View>

      {/* ── Reaction picker popup ── */}
      {showReactions && (
        <Pressable
          className="absolute inset-0 z-50"
          onPress={() => setShowReactions(false)}
        >
          <View className="absolute bottom-16 left-4 flex-row gap-1 bg-slate-800 border border-slate-700 rounded-full px-2 py-1.5 shadow-2xl z-50">
            {REACTIONS.map(r => (
              <TouchableOpacity
                key={r.type}
                onPress={() => handleReaction(r.type as ReactionType)}
                className={`p-1 rounded-full ${myReaction === r.type ? 'bg-slate-700' : ''}`}
              >
                <Text className="text-2xl">{r.emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      )}

      {/* ── Comments section ── */}
      {showComments && (
        <View className="mt-3 pt-3 border-t border-slate-700/30">
          <ScrollView className="max-h-64" showsVerticalScrollIndicator={false}>
            <View className="gap-3 mb-4">
              {nestedComments.length === 0 && !loadingComments && (
                <Text className="text-center text-slate-500 text-sm py-2">No comments yet</Text>
              )}
              {nestedComments.map(comment => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  onReply={handleReplyComment}
                  onLikeComment={(cId) => onLikeComment(post.id, cId)}
                />
              ))}
              {hasMoreComments && (
                <TouchableOpacity
                  onPress={() => loadComments(commentsPage + 1)}
                  className="py-2 bg-blue-500/10 rounded-lg items-center"
                >
                  <Text className="text-blue-400 text-sm font-medium">Load more comments</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>

          {/* Comment input */}
          <View className="flex-row items-center gap-2">
            <View className="w-8 h-8 rounded-full bg-blue-600 items-center justify-center overflow-hidden shrink-0">
              {user?.profile_photo_url ? (
                <Image source={{ uri: cleanPhoto(user.profile_photo_url) || '' }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={200} />
              ) : (
                <Text className="text-white text-xs font-bold">{getInitial(user?.name || member?.name)}</Text>
              )}
            </View>
            <TextInput
              className="flex-1 bg-slate-900/50 border border-slate-700/50 rounded-full px-4 py-2 text-white text-sm"
              placeholder="Write a comment..."
              placeholderTextColor="#64748b"
              value={commentText}
              onChangeText={setCommentText}
              returnKeyType="send"
              onSubmitEditing={handleCommentSubmit}
            />
            <TouchableOpacity onPress={handleCommentSubmit} disabled={!commentText.trim()}>
              <Send size={18} color={commentText.trim() ? '#3b82f6' : '#475569'} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Three-dot menu modal ── */}
      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <Pressable className="flex-1 bg-black/60" onPress={() => setShowMenu(false)}>
          <View className="absolute bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 rounded-t-3xl p-4 pb-8">
            {isAuthor && (
              <>
                <TouchableOpacity
                  onPress={() => { setIsEditing(true); setShowMenu(false); }}
                  className="flex-row items-center gap-3 px-4 py-3"
                >
                  <Edit3 size={18} color="#94a3b8" />
                  <Text className="text-slate-300 text-sm">Edit Post</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleDelete}
                  className="flex-row items-center gap-3 px-4 py-3"
                >
                  <Trash2 size={18} color="#f87171" />
                  <Text className="text-red-400 text-sm">Delete Post</Text>
                </TouchableOpacity>
                <View className="border-t border-slate-700/50 my-1" />
              </>
            )}
            <TouchableOpacity
              onPress={() => { setBookmarked(!bookmarked); if (onBookmark) onBookmark(post.id); setShowMenu(false); }}
              className="flex-row items-center gap-3 px-4 py-3"
            >
              <Bookmark size={18} color="#94a3b8" />
              <Text className="text-slate-300 text-sm">{bookmarked ? 'Unsave Post' : 'Save Post'}</Text>
            </TouchableOpacity>
            {!isAuthor && (
              <TouchableOpacity
                onPress={() => { setShowReportModal(true); setShowMenu(false); }}
                className="flex-row items-center gap-3 px-4 py-3"
              >
                <Flag size={18} color="#f87171" />
                <Text className="text-red-400 text-sm">Report Post</Text>
              </TouchableOpacity>
            )}
          </View>
        </Pressable>
      </Modal>

      {/* ── Report modal ── */}
      <Modal
        visible={showReportModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReportModal(false)}
      >
        <Pressable className="flex-1 bg-black/70" onPress={() => setShowReportModal(false)}>
          <View className="absolute bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 rounded-t-3xl p-6 pb-10">
            <View className="flex-row items-center justify-between mb-5">
              <Text className="text-white font-bold text-lg">Report Post</Text>
              <TouchableOpacity onPress={() => setShowReportModal(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            <Text className="text-slate-400 text-sm mb-4">Why are you reporting this post?</Text>
            <View className="gap-2 mb-5">
              {REPORT_REASONS.map(reason => (
                <TouchableOpacity
                  key={reason}
                  onPress={() => setReportReason(reason)}
                  className={`px-4 py-2.5 rounded-xl border ${reportReason === reason
                    ? 'bg-red-500/20 border-red-500/30'
                    : 'bg-slate-700/30 border-transparent'
                    }`}
                >
                  <Text className={reportReason === reason ? 'text-red-300 text-sm' : 'text-slate-300 text-sm'}>
                    {reason}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setShowReportModal(false)}
                className="flex-1 py-2.5 bg-slate-700 rounded-xl items-center"
              >
                <Text className="text-white text-sm font-medium">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  if (!reportReason) return;
                  if (onReport) onReport(post.id, reportReason);
                  setShowReportModal(false);
                  setReportReason('');
                }}
                disabled={!reportReason}
                className={`flex-1 py-2.5 rounded-xl items-center ${reportReason ? 'bg-red-600' : 'bg-red-900/50'}`}
              >
                <Text className="text-white text-sm font-medium">Submit Report</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
