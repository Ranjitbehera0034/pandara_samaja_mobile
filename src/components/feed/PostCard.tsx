// src/components/feed/PostCard.tsx
import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, TextInput,
  Share, Modal, ScrollView, Alert, Pressable, Animated
} from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  MessageSquare, Share2, MoreHorizontal, Bookmark,
  Flag, Trash2, Edit3, X, Send, ThumbsUp
} from 'lucide-react-native';
import { Post, Comment, ReactionType } from '../../types';
import { timeAgoShort, REACTIONS, mapComment, containsBannedContent, censorText } from '../../utils/feedUtils';
import { useAuth } from '../../context/AuthContext';
import MediaGrid from './MediaGrid';
import RichContent from './RichContent';
import PollDisplay from './PollDisplay';
import CommentItem from './CommentItem';
import Avatar from '../common/Avatar';
import * as feedApi from '../../api/feed';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

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
  const { colors, spacing, radius, typography, shadow } = useTheme();
  const { lang, t } = useLanguage();
  const fontFamily = lang === 'od' ? 'NotoSansOriya' : undefined;
  const fontFamilyBold = lang === 'od' ? 'NotoSansOriya-Bold' : undefined;
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
      Alert.alert(t('feedComponents', 'warningTitle'), t('feedComponents', 'inappropriateCommentMessage'));
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
        title: `${t('feedComponents', 'sharePostTitlePrefix')} ${post.authorName}`,
      });
      if (onShare) onShare(post.id);
    } catch (e) {
      console.error('[SHARE] Error:', e);
    }
  };

  // ── Delete ──
  const handleDelete = () => {
    Alert.alert(t('feedComponents', 'deletePostConfirmTitle'), t('feedComponents', 'deletePostConfirmMessage'), [
      { text: t('feedComponents', 'cancelButtonLabel'), style: 'cancel' },
      {
        text: t('feedComponents', 'deleteButtonLabel'), style: 'destructive', onPress: () => {
          if (onDelete) onDelete(post.id);
          setShowMenu(false);
        }
      },
    ]);
  };

  // ── Report ──
  const REPORT_REASONS = [
    t('feedComponents', 'reportReasonAdult'),
    t('feedComponents', 'reportReasonHarassment'),
    t('feedComponents', 'reportReasonHateSpeech'),
    t('feedComponents', 'reportReasonSpam'),
    t('feedComponents', 'reportReasonViolence'),
    t('feedComponents', 'reportReasonFalseInfo'),
    t('feedComponents', 'reportReasonOther'),
  ];

  // Build nested comment tree
  const buildCommentTree = (parentId?: string): Comment[] => {
    return localComments
      .filter(c => c.parentId === parentId)
      .map(c => ({ ...c, replies: buildCommentTree(c.id) }));
  };
  const nestedComments = buildCommentTree(undefined);

  return (
    <View
      style={{
        backgroundColor: colors.card + 'cc',
        borderColor: colors.border + '80',
        borderRadius: radius.lg,
        borderWidth: 1,
        padding: spacing.lg,
        marginBottom: spacing.lg,
        ...shadow.card,
      }}
    >

      {/* ── Header ── */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          {/* Avatar with ring */}
          <Avatar name={post.authorName} photoUrl={post.authorAvatar} size={40} />
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <Text style={{ color: colors.text, fontFamily: fontFamilyBold, ...typography.label }}>{post.authorName}</Text>
              {post.authorVerified && <Text style={{ color: colors.primaryLight, ...typography.caption }}>✓</Text>}
            </View>
            <Text style={{ color: colors.textFaint, ...typography.caption }}>
              {timeAgoShort(post.timestamp)}
              {post.location ? ` · ${post.location}` : ''}
            </Text>
          </View>
        </View>

        {/* Three-dot menu */}
        <TouchableOpacity onPress={() => setShowMenu(true)} style={{ padding: spacing.xs }}>
          <MoreHorizontal size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* ── Content ── */}
      <View style={{ marginBottom: spacing.md }}>
        {isEditing ? (
          <View style={{ gap: spacing.sm }}>
            <TextInput
              style={{
                backgroundColor: colors.bg + '80',
                color: colors.text,
                borderColor: colors.border,
                fontFamily,
                borderRadius: radius.md,
                borderWidth: 1,
                paddingHorizontal: spacing.lg,
                paddingVertical: spacing.md,
                ...typography.body,
              }}
              value={editContent}
              onChangeText={setEditContent}
              multiline
              autoFocus
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm }}>
              <TouchableOpacity onPress={() => setIsEditing(false)} style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.xs }}>
                <Text style={{ color: colors.textMuted, fontFamily, ...typography.body }}>{t('feedComponents', 'cancelButtonLabel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { if (onEdit && editContent.trim()) { onEdit(post.id, editContent); } setIsEditing(false); }}
                style={{ backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.xs, borderRadius: radius.md }}
              >
                <Text style={{ fontFamily, color: '#fff', ...typography.bodyEmphasis }}>{t('feedComponents', 'saveButtonLabel')}</Text>
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
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xs, paddingVertical: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            {topReactions.map(r => (
              <Text key={r.type} style={{ fontSize: 16 }}>{r.emoji}</Text>
            ))}
            {totalReactions > 0 && (
              <Text style={{ color: colors.textMuted, marginLeft: spacing.xs, ...typography.caption }}>{totalReactions}</Text>
            )}
          </View>
          {(post.commentsCount ?? 0) > 0 && (
            <TouchableOpacity onPress={toggleComments}>
              <Text style={{ color: colors.textMuted, fontFamily, ...typography.caption }}>
                {post.commentsCount} {post.commentsCount === 1 ? t('feedComponents', 'commentWord') : t('feedComponents', 'commentsWordPlural')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── Action buttons ── */}
      <View style={{ borderColor: colors.border + '80', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, paddingTop: spacing.md, marginTop: spacing.xs }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flex: 1 }}>

          {/* Like / Reaction button */}
          <TouchableOpacity
            onPress={() => handleReaction('like')}
            onLongPress={() => setShowReactions(true)}
            style={{
              backgroundColor: myReaction ? colors.primary + '1a' : 'transparent',
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.xs,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.xs,
              borderRadius: radius.md,
            }}
          >
            <Animated.View style={{ transform: [{ scale: likeScale }], flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              {myReaction ? (
                <Text style={{ fontSize: 18, lineHeight: 18 }}>{currentReaction?.emoji}</Text>
              ) : (
                <ThumbsUp size={20} color={colors.textMuted} />
              )}
              <Text style={{ color: myReaction ? colors.primaryLight : colors.textMuted, fontFamily, ...typography.bodyEmphasis }}>
                {myReaction ? currentReaction?.label : t('feedComponents', 'likeLabel')}
              </Text>
            </Animated.View>
          </TouchableOpacity>

          {/* Comment button */}
          <TouchableOpacity
            onPress={toggleComments}
            style={{
              backgroundColor: showComments ? colors.primary + '1a' : 'transparent',
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.xs,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.xs,
              borderRadius: radius.md,
            }}
          >
            <MessageSquare size={20} color={showComments ? colors.primaryLight : colors.textMuted} />
            {(post.commentsCount ?? 0) > 0 && (
              <Text style={{ color: colors.textMuted, ...typography.body }}>{post.commentsCount}</Text>
            )}
          </TouchableOpacity>

          {/* Share button */}
          <TouchableOpacity
            onPress={handleShare}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.md }}
          >
            <Share2 size={20} color={colors.textMuted} />
            {(post.shareCount ?? 0) > 0 && (
              <Text style={{ color: colors.textMuted, ...typography.body }}>{post.shareCount}</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Bookmark */}
        <TouchableOpacity
          onPress={() => { setBookmarked(!bookmarked); if (onBookmark) onBookmark(post.id); }}
          style={{ padding: spacing.xs, borderRadius: radius.md }}
        >
          <Bookmark size={20} color={bookmarked ? colors.amber : colors.textMuted} fill={bookmarked ? colors.amber : 'none'} />
        </TouchableOpacity>
      </View>

      {/* ── Reaction picker popup ── */}
      {showReactions && (
        <Pressable
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50 }}
          onPress={() => setShowReactions(false)}
        >
          <View
            style={{
              backgroundColor: colors.card,
              borderColor: colors.border,
              position: 'absolute',
              bottom: 64,
              left: spacing.lg,
              flexDirection: 'row',
              gap: spacing.xs,
              borderWidth: 1,
              borderRadius: radius.full,
              paddingHorizontal: spacing.sm,
              paddingVertical: spacing.xs,
              zIndex: 50,
              ...shadow.raised,
            }}
          >
            {REACTIONS.map(r => (
              <TouchableOpacity
                key={r.type}
                onPress={() => handleReaction(r.type as ReactionType)}
                style={{ backgroundColor: myReaction === r.type ? colors.border : 'transparent', padding: spacing.xs, borderRadius: radius.full }}
              >
                <Text style={{ fontSize: 24 }}>{r.emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      )}

      {/* ── Comments section ── */}
      {showComments && (
        <View style={{ borderColor: colors.border + '4d', marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1 }}>
          <ScrollView style={{ maxHeight: 256 }} showsVerticalScrollIndicator={false}>
            <View style={{ gap: spacing.md, marginBottom: spacing.lg }}>
              {nestedComments.length === 0 && !loadingComments && (
                <Text style={{ color: colors.textFaint, fontFamily, textAlign: 'center', paddingVertical: spacing.sm, ...typography.body }}>{t('feedComponents', 'noCommentsYetText')}</Text>
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
                  style={{ backgroundColor: colors.primary + '1a', paddingVertical: spacing.sm, borderRadius: radius.md, alignItems: 'center' }}
                >
                  <Text style={{ color: colors.primaryLight, fontFamily, ...typography.bodyEmphasis }}>{t('feedComponents', 'loadMoreCommentsLabel')}</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>

          {/* Comment input */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Avatar name={user?.name || member?.name} photoUrl={user?.profile_photo_url} size={28} />
            <TextInput
              style={{
                backgroundColor: colors.bg + '80',
                borderColor: colors.border + '80',
                color: colors.text,
                fontFamily,
                flex: 1,
                borderRadius: radius.full,
                paddingHorizontal: spacing.lg,
                paddingVertical: spacing.sm,
                borderWidth: 1,
                ...typography.body,
              }}
              placeholder={t('feedComponents', 'writeCommentPlaceholder')}
              placeholderTextColor={colors.textFaint}
              value={commentText}
              onChangeText={setCommentText}
              returnKeyType="send"
              onSubmitEditing={handleCommentSubmit}
            />
            <TouchableOpacity onPress={handleCommentSubmit} disabled={!commentText.trim()}>
              <Send size={20} color={commentText.trim() ? colors.primaryLight : colors.border} />
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
        <Pressable style={{ backgroundColor: '#00000099', flex: 1 }} onPress={() => setShowMenu(false)}>
          <View
            style={{
              backgroundColor: colors.card,
              borderColor: colors.border,
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              borderTopWidth: 1,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
              padding: spacing.lg,
              paddingBottom: spacing.xl,
            }}
          >
            {isAuthor && (
              <>
                <TouchableOpacity
                  onPress={() => { setIsEditing(true); setShowMenu(false); }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}
                >
                  <Edit3 size={20} color={colors.textMuted} />
                  <Text style={{ color: colors.textMuted, fontFamily, ...typography.body }}>{t('feedComponents', 'editPostLabel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleDelete}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}
                >
                  <Trash2 size={20} color={colors.error} />
                  <Text style={{ color: colors.error, fontFamily, ...typography.body }}>{t('feedComponents', 'deletePostLabel')}</Text>
                </TouchableOpacity>
                <View style={{ borderColor: colors.border + '80', borderTopWidth: 1, marginVertical: spacing.xs }} />
              </>
            )}
            <TouchableOpacity
              onPress={() => { setBookmarked(!bookmarked); if (onBookmark) onBookmark(post.id); setShowMenu(false); }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}
            >
              <Bookmark size={20} color={colors.textMuted} />
              <Text style={{ color: colors.textMuted, fontFamily, ...typography.body }}>{bookmarked ? t('feedComponents', 'unsavePostLabel') : t('feedComponents', 'savePostLabel')}</Text>
            </TouchableOpacity>
            {!isAuthor && (
              <TouchableOpacity
                onPress={() => { setShowReportModal(true); setShowMenu(false); }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}
              >
                <Flag size={20} color={colors.error} />
                <Text style={{ color: colors.error, fontFamily, ...typography.body }}>{t('feedComponents', 'reportPostLabel')}</Text>
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
        <Pressable style={{ backgroundColor: '#000000b3', flex: 1 }} onPress={() => setShowReportModal(false)}>
          <View
            style={{
              backgroundColor: colors.card,
              borderColor: colors.border,
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              borderTopWidth: 1,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
              padding: spacing.xl,
              paddingBottom: spacing.xxl,
              ...shadow.raised,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg }}>
              <Text style={{ color: colors.text, fontFamily: fontFamilyBold, ...typography.title }}>{t('feedComponents', 'reportPostModalTitle')}</Text>
              <TouchableOpacity onPress={() => setShowReportModal(false)}>
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={{ color: colors.textMuted, fontFamily, marginBottom: spacing.md, ...typography.body }}>{t('feedComponents', 'reportPostPrompt')}</Text>
            <View style={{ gap: spacing.sm, marginBottom: spacing.lg }}>
              {REPORT_REASONS.map(reason => (
                <TouchableOpacity
                  key={reason}
                  onPress={() => setReportReason(reason)}
                  style={{
                    backgroundColor: reportReason === reason ? colors.error + '33' : colors.border + '4d',
                    borderColor: reportReason === reason ? colors.error + '4d' : 'transparent',
                    paddingHorizontal: spacing.lg,
                    paddingVertical: spacing.sm + 2,
                    borderRadius: radius.md,
                    borderWidth: 1,
                  }}
                >
                  <Text style={{ color: reportReason === reason ? colors.error : colors.textMuted, fontFamily, ...typography.body }}>
                    {reason}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <TouchableOpacity
                onPress={() => setShowReportModal(false)}
                style={{ backgroundColor: colors.border, flex: 1, paddingVertical: spacing.sm + 2, borderRadius: radius.md, alignItems: 'center' }}
              >
                <Text style={{ color: colors.text, fontFamily, ...typography.bodyEmphasis }}>{t('feedComponents', 'cancelButtonLabel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  if (!reportReason) return;
                  if (onReport) onReport(post.id, reportReason);
                  setShowReportModal(false);
                  setReportReason('');
                }}
                disabled={!reportReason}
                style={{ backgroundColor: reportReason ? colors.error : colors.error + '80', flex: 1, paddingVertical: spacing.sm + 2, borderRadius: radius.md, alignItems: 'center' }}
              >
                <Text style={{ fontFamily, color: '#fff', ...typography.bodyEmphasis }}>{t('feedComponents', 'submitReportLabel')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
