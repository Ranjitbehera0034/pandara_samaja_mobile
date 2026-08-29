// src/screens/admin/AdminPostsScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';
import { Search, X, ArrowLeft, EyeOff, Eye, Trash2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDebounce } from '../../hooks/useDebounce';
import * as adminApi from '../../api/admin';
import { AdminPost } from '../../api/admin';
import Avatar from '../../components/common/Avatar';
import SkeletonBox from '../../components/common/SkeletonBox';
import EmptyState from '../../components/common/EmptyState';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { timeAgoShort } from '../../utils/feedUtils';

const PAGE_SIZE = 20;

export default function AdminPostsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors: C, spacing, radius, typography, shadow } = useTheme();
  const { lang, t } = useLanguage();
  const fontRegular = lang === 'od' ? 'NotoSansOriya' : undefined;
  const fontBold = lang === 'od' ? 'NotoSansOriya-Bold' : undefined;

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 400);

  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);

  const fetchPosts = useCallback(async (pageNum: number, replace = false) => {
    try {
      const data = await adminApi.fetchAdminPosts({ page: pageNum, limit: PAGE_SIZE, search: debouncedSearch || undefined });
      if (data.success) {
        setPosts(prev => replace ? data.posts : [...prev, ...data.posts]);
        setPage(data.page);
        setTotalPages(data.totalPages ?? 1);
      }
    } catch (e) {
      console.error('[ADMIN_POSTS] Fetch failed:', e);
      Alert.alert(t('common', 'errorTitle'), t('admin', 'postsLoadError'));
    }
  }, [debouncedSearch, t]);

  useEffect(() => {
    setLoading(true);
    fetchPosts(1, true).finally(() => setLoading(false));
  }, [fetchPosts]);

  const onRefresh = () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    fetchPosts(1, true).finally(() => setRefreshing(false));
  };

  const onEndReached = () => {
    if (loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    fetchPosts(page + 1).finally(() => setLoadingMore(false));
  };

  const doToggleHide = async (post: AdminPost) => {
    const hidden = post.moderation_status !== 'hidden_pending_review';
    setActingId(post.id);
    try {
      const data = await adminApi.setAdminPostHidden(post.id, hidden);
      if (data.success) {
        setPosts(prev => prev.map(p => p.id === post.id ? { ...p, moderation_status: hidden ? 'hidden_pending_review' : 'visible' } : p));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        throw new Error(data.message || t('admin', 'postActionError'));
      }
    } catch (e: any) {
      console.error('[ADMIN_POSTS] Hide toggle failed:', e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common', 'errorTitle'), e.message || t('admin', 'postActionError'));
    } finally {
      setActingId(null);
    }
  };

  const doDelete = async (post: AdminPost) => {
    setActingId(post.id);
    try {
      const data = await adminApi.deleteAdminPost(post.id);
      if (data.success) {
        setPosts(prev => prev.filter(p => p.id !== post.id));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        throw new Error(data.message || t('admin', 'postDeleteError'));
      }
    } catch (e: any) {
      console.error('[ADMIN_POSTS] Delete failed:', e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common', 'errorTitle'), e.message || t('admin', 'postDeleteError'));
    } finally {
      setActingId(null);
    }
  };

  const handleDelete = (post: AdminPost) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      t('admin', 'confirmDeletePostTitle'),
      t('admin', 'confirmDeletePostMessage'),
      [
        { text: t('common', 'cancel'), style: 'cancel' },
        { text: t('common', 'delete'), style: 'destructive', onPress: () => doDelete(post) },
      ]
    );
  };

  const renderPost = useCallback(({ item }: { item: AdminPost }) => {
    const isHidden = item.moderation_status === 'hidden_pending_review';
    const isActing = actingId === item.id;
    return (
      <View style={{ backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadow.card }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
          <Avatar name={item.author_name} photoUrl={item.author_photo} size={32} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.text, fontFamily: fontBold, ...typography.bodyEmphasis }} numberOfLines={1}>{item.author_name}</Text>
            <Text style={{ color: C.textFaint, ...typography.caption }}>{timeAgoShort(item.created_at)}</Text>
          </View>
          <View style={{
            backgroundColor: (isHidden ? C.warning : C.success) + '15', borderRadius: radius.full,
            paddingHorizontal: spacing.sm, paddingVertical: 4,
          }}>
            <Text style={{ color: isHidden ? C.warning : C.success, ...typography.caption, fontWeight: '700' }}>
              {isHidden ? t('admin', 'postHiddenBadge') : t('admin', 'postVisibleBadge')}
            </Text>
          </View>
        </View>

        {!!item.text_content && (
          <Text style={{ color: C.text, fontFamily: fontRegular, marginBottom: spacing.md, ...typography.body }} numberOfLines={3}>
            {item.text_content}
          </Text>
        )}

        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <TouchableOpacity
            onPress={() => doToggleHide(item)}
            disabled={isActing}
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, borderWidth: 1, borderColor: C.border, borderRadius: radius.md, paddingVertical: spacing.sm }}
          >
            {isActing ? <ActivityIndicator size="small" color={C.text} /> : (isHidden ? <Eye size={14} color={C.text} /> : <EyeOff size={14} color={C.text} />)}
            <Text style={{ color: C.text, ...typography.caption, fontWeight: '700' }}>
              {isHidden ? t('admin', 'unhideButton') : t('admin', 'hideButton')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleDelete(item)}
            disabled={isActing}
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, backgroundColor: C.error + '15', borderRadius: radius.md, paddingVertical: spacing.sm }}
          >
            <Trash2 size={14} color={C.error} />
            <Text style={{ color: C.error, ...typography.caption, fontWeight: '700' }}>{t('common', 'delete')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [actingId, C, spacing, radius, typography, shadow, fontBold, fontRegular, t]);

  const keyExtractor = useCallback((item: AdminPost) => item.id, []);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.goBack(); }} style={{ padding: spacing.xs, borderRadius: radius.full, backgroundColor: C.card }}>
          <ArrowLeft size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={{ color: C.text, fontFamily: fontBold, ...typography.heading }}>{t('admin', 'postsTitle')}</Text>
      </View>

      <View style={{ paddingHorizontal: spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, marginBottom: spacing.md }}>
          <Search size={16} color={C.textMuted} />
          <TextInput
            style={{ flex: 1, color: C.text, fontFamily: fontRegular, paddingVertical: spacing.sm, ...typography.body }}
            placeholder={t('admin', 'postsSearchPlaceholder')}
            placeholderTextColor={C.textFaint}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={16} color={C.textFaint} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <View style={{ flex: 1, paddingHorizontal: spacing.lg }}>
        {loading && posts.length === 0 ? (
          <View style={{ gap: spacing.md }}>
            {[1, 2, 3].map(i => (
              <View key={i} style={{ padding: spacing.lg, backgroundColor: C.card, borderRadius: radius.lg, borderWidth: 1, borderColor: C.border, gap: spacing.sm }}>
                <SkeletonBox width="50%" height={14} />
                <SkeletonBox width="90%" height={40} />
              </View>
            ))}
          </View>
        ) : (
          <FlashList
            maintainVisibleContentPosition={{ disabled: true }}
            data={posts}
            keyExtractor={keyExtractor}
            renderItem={renderPost}
            ListEmptyComponent={
              <EmptyState emoji="📰" title={t('admin', 'postsEmptyTitle')} subtitle={t('admin', 'postsEmptySubtitle')} />
            }
            ListFooterComponent={
              <View style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
                {loadingMore && <ActivityIndicator size="small" color={C.primaryLight} />}
              </View>
            }
            onEndReached={onEndReached}
            onEndReachedThreshold={0.3}
            contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} colors={[C.primary]} progressBackgroundColor={C.card} />
            }
          />
        )}
      </View>
    </View>
  );
}
