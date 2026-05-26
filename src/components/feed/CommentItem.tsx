// src/components/feed/CommentItem.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, Image } from 'react-native';
import { Send } from 'lucide-react-native';
import { Comment } from '../../types';
import { cleanPhoto, getInitial } from '../../utils/googleDriveUrl';
import { censorText, timeAgoShort } from '../../utils/feedUtils';

interface Props {
  comment: Comment;
  depth?: number;
  onReply: (parentId: string, text: string) => void;
  onLikeComment: (commentId: string) => void;
}

export default function CommentItem({ comment, depth = 0, onReply, onLikeComment }: Props) {
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState('');
  const photo = cleanPhoto(comment.authorAvatar);

  const handleReply = () => {
    if (!replyText.trim()) return;
    onReply(comment.id, replyText);
    setReplyText('');
    setShowReply(false);
  };

  return (
    <View className={depth > 0 ? 'ml-8 border-l-2 border-slate-700/30 pl-3' : ''}>
      <View className="flex-row gap-2.5">
        {/* Avatar */}
        <View className="w-7 h-7 rounded-full bg-slate-700 items-center justify-center overflow-hidden shrink-0">
          {photo ? (
            <Image source={{ uri: photo }} className="w-full h-full" resizeMode="cover" />
          ) : (
            <Text className="text-white text-xs font-bold">{getInitial(comment.authorName)}</Text>
          )}
        </View>

        <View className="flex-1">
          {/* Bubble */}
          <View className="bg-slate-700/50 rounded-2xl px-3 py-2">
            <Text className="text-slate-200 text-xs font-semibold mb-0.5">{comment.authorName}</Text>
            <Text className="text-slate-300 text-sm">{censorText(comment.content)}</Text>
          </View>

          {/* Actions */}
          <View className="flex-row items-center gap-3 mt-1 ml-2">
            <TouchableOpacity onPress={() => onLikeComment(comment.id)}>
              <Text className={`text-xs font-medium ${comment.isLiked ? 'text-blue-400' : 'text-slate-500'}`}>
                {comment.isLiked ? 'Liked' : 'Like'}{comment.likes > 0 ? ` (${comment.likes})` : ''}
              </Text>
            </TouchableOpacity>
            {depth < 2 && (
              <TouchableOpacity onPress={() => setShowReply(!showReply)}>
                <Text className="text-slate-500 text-xs font-medium">Reply</Text>
              </TouchableOpacity>
            )}
            <Text className="text-slate-600 text-xs">{timeAgoShort(comment.timestamp)}</Text>
          </View>

          {/* Reply input */}
          {showReply && (
            <View className="flex-row items-center gap-2 mt-2">
              <TextInput
                className="flex-1 bg-slate-800/50 border border-slate-700/50 rounded-full px-3 py-1.5 text-white text-xs"
                placeholder="Write a reply..."
                placeholderTextColor="#64748b"
                value={replyText}
                onChangeText={setReplyText}
                autoFocus
              />
              <TouchableOpacity onPress={handleReply} disabled={!replyText.trim()}>
                <Send size={14} color={replyText.trim() ? '#3b82f6' : '#475569'} />
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
