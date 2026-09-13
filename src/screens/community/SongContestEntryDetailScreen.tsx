// src/screens/community/SongContestEntryDetailScreen.tsx
// One contest entry: video playback, like toggle, comments. The entry
// object itself arrives via navigation params (already fetched by the
// contest detail screen's entries list) — only comments and the live
// like state are fetched here.
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, TextInput, FlatList, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Video, ResizeMode } from 'expo-av';
import { ArrowLeft, Heart, Users } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as songContestApi from '../../api/songContest';
import { SongContestEntry, SongContestComment } from '../../api/songContest';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

export default function SongContestEntryDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const entry: SongContestEntry = route.params.entry;
  const insets = useSafeAreaInsets();
  const { colors: C, spacing, radius, typography } = useTheme();
  const { lang, t } = useLanguage();
  const fontRegular = lang === 'od' ? 'NotoSansOriya' : undefined;
  const fontBold = lang === 'od' ? 'NotoSansOriya-Bold' : undefined;

  const [liked, setLiked] = useState(!!entry.liked_by_me);
  const [likeCount, setLikeCount] = useState(entry.like_count ?? 0);
  const [comments, setComments] = useState<SongContestComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [posting, setPosting] = useState(false);

  const loadComments = useCallback(async () => {
    try {
      const data = await songContestApi.fetchComments(entry.id);
      if (data.success) setComments(data.comments);
    } catch (e) {
      console.error('[SONG_CONTEST_ENTRY] Fetch comments failed:', e);
    } finally {
      setLoadingComments(false);
    }
  }, [entry.id]);

  useEffect(() => { loadComments(); }, [loadComments]);

  const toggleLike = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount(prev => prev + (wasLiked ? -1 : 1));
    try {
      if (wasLiked) await songContestApi.unlikeEntry(entry.id);
      else await songContestApi.likeEntry(entry.id);
    } catch (e) {
      console.error('[SONG_CONTEST_ENTRY] Like toggle failed:', e);
      setLiked(wasLiked);
      setLikeCount(prev => prev + (wasLiked ? 1 : -1));
    }
  };

  const postComment = async () => {
    if (!commentText.trim()) return;
    setPosting(true);
    try {
      const data = await songContestApi.addComment(entry.id, commentText.trim());
      if (data.success) {
        setComments(prev => [...prev, data.comment]);
        setCommentText('');
      }
    } catch (e) {
      console.error('[SONG_CONTEST_ENTRY] Post comment failed:', e);
      Alert.alert(t('common', 'errorTitle'), t('common', 'error'));
    } finally {
      setPosting(false);
    }
  };

  const renderComment = useCallback(({ item }: { item: SongContestComment }) => (
    <View style={{ paddingVertical: spacing.sm, borderBottomWidth: 0.5, borderBottomColor: C.border }}>
      <Text style={{ color: C.text, fontFamily: fontBold, ...typography.caption, fontWeight: '700' }}>{item.author_name || item.membership_no}</Text>
      <Text style={{ color: C.textMuted, fontFamily: fontRegular, marginTop: 2, ...typography.caption }}>{item.content}</Text>
    </View>
  ), [C, spacing, typography, fontBold, fontRegular]);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ flex: 1, paddingTop: insets.top }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
          <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.goBack(); }} style={{ padding: spacing.xs, borderRadius: radius.full, backgroundColor: C.card }}>
            <ArrowLeft size={20} color={C.text} />
          </TouchableOpacity>
          <Text style={{ color: C.text, fontFamily: fontBold, flex: 1, ...typography.bodyEmphasis }} numberOfLines={1}>{entry.entry_name}</Text>
        </View>

        <FlatList
          data={comments}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderComment}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.lg }}
          ListHeaderComponent={
            <View>
              <View style={{ width: '100%', aspectRatio: 9 / 16, maxHeight: 480, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: '#000', marginBottom: spacing.md }}>
                <Video
                  source={{ uri: entry.video_url }}
                  style={{ flex: 1 }}
                  useNativeControls
                  resizeMode={ResizeMode.CONTAIN}
                />
              </View>

              {entry.entry_type === 'group' && !!entry.village && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: spacing.sm }}>
                  <Users size={13} color={C.textFaint} />
                  <Text style={{ color: C.textFaint, ...typography.caption }}>{entry.village}</Text>
                </View>
              )}
              {!!entry.participant_names && (
                <Text style={{ color: C.textMuted, fontFamily: fontRegular, marginBottom: spacing.md, ...typography.caption }}>{entry.participant_names}</Text>
              )}

              <TouchableOpacity onPress={toggleLike} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.lg }}>
                <Heart size={22} color={liked ? C.error : C.textMuted} fill={liked ? C.error : 'none'} />
                <Text style={{ color: C.textMuted, ...typography.bodyEmphasis, fontWeight: '700' }}>{likeCount}</Text>
              </TouchableOpacity>

              <Text style={{ color: C.textMuted, marginBottom: spacing.sm, ...typography.label }}>{t('songContest', 'commentsLabel')}</Text>
              {loadingComments && <ActivityIndicator size="small" color={C.primaryLight} />}
            </View>
          }
          ListEmptyComponent={!loadingComments ? (
            <Text style={{ color: C.textFaint, ...typography.caption }}>{t('songContest', 'noCommentsYet')}</Text>
          ) : null}
        />

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: C.border, paddingBottom: insets.bottom + spacing.sm }}>
          <TextInput
            value={commentText}
            onChangeText={setCommentText}
            placeholder={t('songContest', 'addCommentPlaceholder')}
            placeholderTextColor={C.textFaint}
            style={{ flex: 1, backgroundColor: C.card, borderRadius: radius.full, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, color: C.text, fontFamily: fontRegular, ...typography.body }}
          />
          <TouchableOpacity onPress={postComment} disabled={posting || !commentText.trim()} style={{ opacity: posting || !commentText.trim() ? 0.5 : 1 }}>
            {posting ? <ActivityIndicator size="small" color={C.primary} /> : (
              <Text style={{ color: C.primary, ...typography.bodyEmphasis, fontWeight: '700' }}>{t('songContest', 'postCommentButton')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
