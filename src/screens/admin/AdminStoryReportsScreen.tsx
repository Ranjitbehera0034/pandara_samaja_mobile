// src/screens/admin/AdminStoryReportsScreen.tsx
// Mirrors AdminReportsScreen.tsx exactly, for reported STORIES instead of
// posts — separate screen since stories have a different shape (one
// media item, no text_content) and their own moderation endpoints.
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Check, X as XIcon } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as adminApi from '../../api/admin';
import { ReportedStory } from '../../api/admin';
import Avatar from '../../components/common/Avatar';
import EmptyState from '../../components/common/EmptyState';
import Button from '../../components/common/Button';
import MediaGrid from '../../components/feed/MediaGrid';
import MediaViewerModal from '../../components/feed/MediaViewerModal';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

export default function AdminStoryReportsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors: C, spacing, radius, typography, shadow } = useTheme();
  const { lang, t } = useLanguage();
  const fontRegular = lang === 'od' ? 'NotoSansOriya' : undefined;
  const fontBold = lang === 'od' ? 'NotoSansOriya-Bold' : undefined;

  const [stories, setStories] = useState<ReportedStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [viewerStoryId, setViewerStoryId] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const data = await adminApi.fetchReportedStories();
      if (data.success) setStories(data.stories);
    } catch (e) {
      console.error('[ADMIN_STORY_REPORTS] Fetch failed:', e);
      Alert.alert(t('common', 'errorTitle'), t('admin', 'reportsLoadError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (storyId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setActingId(storyId);
    try {
      const data = await adminApi.approveReportedStory(storyId);
      if (data.success) {
        setStories(prev => prev.filter(s => s.id !== storyId));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e) {
      console.error('[ADMIN_STORY_REPORTS] Approve failed:', e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common', 'errorTitle'), t('admin', 'moderationActionError'));
    } finally {
      setActingId(null);
    }
  };

  const doReject = async (storyId: string) => {
    setActingId(storyId);
    try {
      const data = await adminApi.rejectReportedStory(storyId);
      if (data.success) {
        setStories(prev => prev.filter(s => s.id !== storyId));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e) {
      console.error('[ADMIN_STORY_REPORTS] Reject failed:', e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common', 'errorTitle'), t('admin', 'moderationActionError'));
    } finally {
      setActingId(null);
    }
  };

  const handleReject = (storyId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      t('admin', 'confirmRejectTitle'),
      t('admin', 'confirmRejectMessage'),
      [
        { text: t('common', 'cancel'), style: 'cancel' },
        { text: t('admin', 'rejectButton'), style: 'destructive', onPress: () => doReject(storyId) },
      ]
    );
  };

  const renderStory = useCallback(({ item }: { item: ReportedStory }) => {
    const isActing = actingId === item.id;
    return (
      <View style={{ backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.lg, ...shadow.card }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
          <Avatar name={item.authorName} photoUrl={item.authorAvatar} size={36} />
          <Text style={{ color: C.text, fontFamily: fontBold, flex: 1, ...typography.bodyEmphasis }} numberOfLines={1}>{item.authorName}</Text>
        </View>

        {!!item.textOverlay && (
          <Text style={{ color: C.text, fontFamily: fontRegular, marginBottom: spacing.md, ...typography.body }}>
            {item.textOverlay}
          </Text>
        )}

        <View style={{ marginBottom: spacing.md }}>
          <MediaGrid
            media={[{ url: item.mediaUrl, type: item.mediaType }]}
            onMediaPress={() => setViewerStoryId(item.id)}
          />
        </View>

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

  const keyExtractor = useCallback((item: ReportedStory) => item.id, []);
  const viewerStory = stories.find(s => s.id === viewerStoryId);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.goBack(); }} style={{ padding: spacing.xs, borderRadius: radius.full, backgroundColor: C.card }}>
          <ArrowLeft size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={{ color: C.text, fontFamily: fontBold, ...typography.heading }}>{t('admin', 'storyReportsTitle')}</Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : (
        <View style={{ flex: 1, paddingHorizontal: spacing.lg }}>
          <FlashList
            data={stories}
            keyExtractor={keyExtractor}
            renderItem={renderStory}
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
        visible={!!viewerStoryId}
        media={viewerStory ? [{ url: viewerStory.mediaUrl, type: viewerStory.mediaType }] : []}
        initialIndex={0}
        onClose={() => setViewerStoryId(null)}
      />
    </View>
  );
}
