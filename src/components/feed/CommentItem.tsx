// src/components/feed/CommentItem.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, Image } from 'react-native';
import { Send } from 'lucide-react-native';
import { Comment } from '../../types';
import { cleanPhoto, getInitial } from '../../utils/googleDriveUrl';
import { censorText, timeAgoShort } from '../../utils/feedUtils';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

interface Props {
  comment: Comment;
  depth?: number;
  onReply: (parentId: string, text: string) => void;
  onLikeComment: (commentId: string) => void;
}

export default function CommentItem({ comment, depth = 0, onReply, onLikeComment }: Props) {
  const { colors } = useTheme();
  const { lang, t } = useLanguage();
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState('');
  const photo = cleanPhoto(comment.authorAvatar);
  const fontFamily = lang === 'od' ? 'NotoSansOriya' : undefined;

  const handleReply = () => {
    if (!replyText.trim()) return;
    onReply(comment.id, replyText);
    setReplyText('');
    setShowReply(false);
  };

  return (
    <View style={depth > 0 ? { marginLeft: 32, borderLeftWidth: 2, borderLeftColor: colors.border + '4d', paddingLeft: 12 } : undefined}>
      <View className="flex-row gap-2.5">
        {/* Avatar */}
        <View style={{ backgroundColor: colors.primary }} className="w-7 h-7 rounded-full items-center justify-center overflow-hidden shrink-0">
          {photo ? (
            <Image source={{ uri: photo }} className="w-full h-full" resizeMode="cover" />
          ) : (
            <Text className="text-white text-xs font-bold">{getInitial(comment.authorName)}</Text>
          )}
        </View>

        <View className="flex-1">
          {/* Bubble */}
          <View style={{ backgroundColor: colors.border + '80' }} className="rounded-2xl px-3 py-2">
            <Text style={{ color: colors.text, fontFamily }} className="text-xs font-semibold mb-0.5">{comment.authorName}</Text>
            <Text style={{ color: colors.textMuted, fontFamily }} className="text-sm">{censorText(comment.content)}</Text>
          </View>

          {/* Actions */}
          <View className="flex-row items-center gap-3 mt-1 ml-2">
            <TouchableOpacity onPress={() => onLikeComment(comment.id)}>
              <Text style={{ color: comment.isLiked ? colors.primaryLight : colors.textFaint, fontFamily }} className="text-xs font-medium">
                {comment.isLiked ? t('feedComponents', 'likedLabel') : t('feedComponents', 'likeLabel')}{comment.likes > 0 ? ` (${comment.likes})` : ''}
              </Text>
            </TouchableOpacity>
            {depth < 2 && (
              <TouchableOpacity onPress={() => setShowReply(!showReply)}>
                <Text style={{ color: colors.textFaint, fontFamily }} className="text-xs font-medium">{t('feedComponents', 'replyLabel')}</Text>
              </TouchableOpacity>
            )}
            <Text style={{ color: colors.textFaint }} className="text-xs">{timeAgoShort(comment.timestamp)}</Text>
          </View>

          {/* Reply input */}
          {showReply && (
            <View className="flex-row items-center gap-2 mt-2">
              <TextInput
                style={{ backgroundColor: colors.card + '80', borderColor: colors.border + '80', color: colors.text, fontFamily }}
                className="flex-1 rounded-full px-3 py-1.5 text-xs border"
                placeholder={t('feedComponents', 'writeReplyPlaceholder')}
                placeholderTextColor={colors.textFaint}
                value={replyText}
                onChangeText={setReplyText}
                autoFocus
              />
              <TouchableOpacity onPress={handleReply} disabled={!replyText.trim()}>
                <Send size={14} color={replyText.trim() ? colors.primaryLight : colors.textFaint} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Nested replies */}
      {comment.replies && comment.replies.length > 0 && (
        <View className="mt-2 gap-2">
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
