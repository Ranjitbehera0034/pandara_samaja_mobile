// src/screens/admin/AdminReportsScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Check, X as XIcon } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as adminApi from '../../api/admin';
import { ReportedPost } from '../../api/admin';
import Avatar from '../../components/common/Avatar';
import EmptyState from '../../components/common/EmptyState';
import Button from '../../components/common/Button';
import MediaGrid from '../../components/feed/MediaGrid';
import MediaViewerModal from '../../components/feed/MediaViewerModal';
import { urlsToMedia } from '../../utils/media';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

export default function AdminReportsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors: C, spacing, radius, typography, shadow } = useTheme();
  const { lang, t } = useLanguage();
  const fontRegular = lang === 'od' ? 'NotoSansOriya' : undefined;
  const fontBold = lang === 'od' ? 'NotoSansOriya-Bold' : undefined;

  const [posts, setPosts] = useState<ReportedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [viewerPostId, setViewerPostId] = useState<string | null>(null);
  const [viewerIndex, setViewerIndex] = useState(0);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const data = await adminApi.fetchReportedPosts();
      if (data.success) setPosts(data.posts);
    } catch (e) {
      console.error('[ADMIN_REPORTS] Fetch failed:', e);
      Alert.alert(t('common', 'errorTitle'), t('admin', 'reportsLoadError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (postId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setActingId(postId);
    try {
      const data = await adminApi.approveReportedPost(postId);
      if (data.success) {
        setPosts(prev => prev.filter(p => p.id !== postId));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e) {
      console.error('[ADMIN_REPORTS] Approve failed:', e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common', 'errorTitle'), t('admin', 'moderationActionError'));
    } finally {
      setActingId(null);
    }
  };

  const doReject = async (postId: string) => {
    setActingId(postId);
    try {
      const data = await adminApi.rejectReportedPost(postId);
      if (data.success) {
        setPosts(prev => prev.filter(p => p.id !== postId));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e) {
      console.error('[ADMIN_REPORTS] Reject failed:', e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common', 'errorTitle'), t('admin', 'moderationActionError'));
    } finally {
      setActingId(null);
    }
  };

  const handleReject = (postId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      t('admin', 'confirmRejectTitle'),
      t('admin', 'confirmRejectMessage'),
      [
        { text: t('common', 'cancel'), style: 'cancel' },
        { text: t('admin', 'rejectButton'), style: 'destructive', onPress: () => doReject(postId) },
      ]
    );
  };

  const renderPost = useCallback(({ item }: { item: ReportedPost }) => {
    const isActing = actingId === item.id;
    return (
      <View style={{ backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.lg, ...shadow.card }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
          <Avatar name={item.author_name} photoUrl={item.author_photo} size={36} />
          <Text style={{ color: C.text, fontFamily: fontBold, flex: 1, ...typography.bodyEmphasis }} numberOfLines={1}>{item.author_name}</Text>
        </View>

        {!!item.text_content && (
          <Text style={{ color: C.text, fontFamily: fontRegular, marginBottom: spacing.md, ...typography.body }}>
            {item.text_content}
          </Text>
        )}

        {Array.isArray(item.images) && item.images.length > 0 && (
          <View style={{ marginBottom: spacing.md }}>
            <MediaGrid
              media={urlsToMedia(item.images)}
              onMediaPress={(index) => {
                setViewerPostId(item.id);
                setViewerIndex(index);
              }}
            />
          </View>
        )}

        <View style={{ backgroundColor: C.bg, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md, gap: spacing.sm }}>
          <Text style={{ color: C.textMuted, fontFamily: fontBold, ...typography.caption, fontWeight: '700' }}>
            {t('admin', 'reasonLabel')} ({item.reports?.length ?? 0})
          </Text>
          {(item.reports || []).map((r, idx) => (
            <Text key={idx} style={{ color: C.textMuted, fontFamily: fontRegular, ...typography.caption }}>
              • {r.reason || '—'}
            </Text>
          ))}
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Button
              variant="secondary"
              label={t('admin', 'approveButton')}
              icon={<Check size={16} color={C.text} />}
              onPress={() => handleApprove(item.id)}
              loading={isActing}
              haptics={false}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              variant="primary"
              label={t('admin', 'rejectButton')}
              icon={<XIcon size={16} color="#fff" />}
              onPress={() => handleReject(item.id)}
              loading={isActing}
              haptics={false}
            />
          </View>
        </View>
      </View>
    );
  }, [actingId, C, spacing, radius, typography, shadow, fontBold, fontRegular, t]);

  const keyExtractor = useCallback((item: ReportedPost) => item.id, []);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.goBack(); }} style={{ padding: spacing.xs, borderRadius: radius.full, backgroundColor: C.card }}>
          <ArrowLeft size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={{ color: C.text, fontFamily: fontBold, ...typography.heading }}>{t('admin', 'reportsTitle')}</Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : (
        <View style={{ flex: 1, paddingHorizontal: spacing.lg }}>
          <FlashList
            data={posts}
            keyExtractor={keyExtractor}
            renderItem={renderPost}
            ListEmptyComponent={
              <EmptyState emoji="✅" title={t('admin', 'reportsEmptyTitle')} subtitle={t('admin', 'reportsEmptySubtitle')} />
            }
            contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={C.primary} colors={[C.primary]} progressBackgroundColor={C.card} />
            }
          />
        </View>
      )}

      <MediaViewerModal
        visible={!!viewerPostId}
        media={urlsToMedia(posts.find(p => p.id === viewerPostId)?.images)}
        initialIndex={viewerIndex}
        onClose={() => setViewerPostId(null)}
      />
    </View>
  );
}
