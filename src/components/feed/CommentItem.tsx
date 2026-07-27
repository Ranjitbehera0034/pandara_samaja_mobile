// src/components/feed/CommentItem.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { Send } from 'lucide-react-native';
import { Comment } from '../../types';
import { censorText, timeAgoShort } from '../../utils/feedUtils';
import Avatar from '../common/Avatar';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

interface Props {
  comment: Comment;
  depth?: number;
  onReply: (parentId: string, text: string) => void;
  onLikeComment: (commentId: string) => void;
}

export default function CommentItem({ comment, depth = 0, onReply, onLikeComment }: Props) {
  const { colors, spacing, radius, typography } = useTheme();
  const { lang, t } = useLanguage();
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState('');
  const fontFamily = lang === 'od' ? 'NotoSansOriya' : undefined;

  const handleReply = () => {
    if (!replyText.trim()) return;
    onReply(comment.id, replyText);
    setReplyText('');
    setShowReply(false);
  };

  return (
    <View style={depth > 0 ? { marginLeft: spacing.xl, borderLeftWidth: 2, borderLeftColor: colors.border + '4d', paddingLeft: spacing.md } : undefined}>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {/* Avatar */}
        <Avatar name={comment.authorName} photoUrl={comment.authorAvatar} size={28} />

        <View style={{ flex: 1 }}>
          {/* Bubble */}
          <View style={{ backgroundColor: colors.border + '80', borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }}>
            <Text style={{ color: colors.text, fontFamily, marginBottom: 2, ...typography.caption }}>{comment.authorName}</Text>
            <Text style={{ color: colors.textMuted, fontFamily, ...typography.body }}>{censorText(comment.content)}</Text>
          </View>

          {/* Actions */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.xs, marginLeft: spacing.sm }}>
            <TouchableOpacity onPress={() => onLikeComment(comment.id)}>
              <Text style={{ color: comment.isLiked ? colors.primaryLight : colors.textFaint, fontFamily, ...typography.caption }}>
                {comment.isLiked ? t('feedComponents', 'likedLabel') : t('feedComponents', 'likeLabel')}{comment.likes > 0 ? ` (${comment.likes})` : ''}
              </Text>
            </TouchableOpacity>
            {depth < 2 && (
              <TouchableOpacity onPress={() => setShowReply(!showReply)}>
                <Text style={{ color: colors.textFaint, fontFamily, ...typography.caption }}>{t('feedComponents', 'replyLabel')}</Text>
              </TouchableOpacity>
            )}
            <Text style={{ color: colors.textFaint, ...typography.caption }}>{timeAgoShort(comment.timestamp)}</Text>
          </View>

          {/* Reply input */}
          {showReply && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm }}>
              <TextInput
                style={{
                  backgroundColor: colors.card + '80',
                  borderColor: colors.border + '80',
                  color: colors.text,
                  fontFamily,
                  flex: 1,
                  borderRadius: radius.full,
                  paddingHorizontal: spacing.md,
                  borderWidth: 1,
                  paddingVertical: spacing.xs,
                  ...typography.caption,
                }}
                placeholder={t('feedComponents', 'writeReplyPlaceholder')}
                placeholderTextColor={colors.textFaint}
                value={replyText}
                onChangeText={setReplyText}
                autoFocus
              />
              <TouchableOpacity onPress={handleReply} disabled={!replyText.trim()}>
                <Send size={16} color={replyText.trim() ? colors.primaryLight : colors.textFaint} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Nested replies */}
      {comment.replies && comment.replies.length > 0 && (
        <View style={{ marginTop: spacing.sm, gap: spacing.sm }}>
          {comment.replies.map(reply => (
            <CommentItem
              key={reply.id}
              comment={reply}
              depth={depth + 1}
              onReply={onReply}
              onLikeComment={onLikeComment}
            />
          ))}
        </View>
      )}
    </View>
  );
}
