// src/screens/admin/AdminMatrimonyHistoryScreen.tsx
// Simple list of archived/matched candidates — once admin confirms a
// marriage/engagement (see AdminMatrimonyFormScreen's "Confirm Match"),
// the candidate is removed from the active directory but preserved here.
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, Linking } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, FileText, Heart } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as adminApi from '../../api/admin';
import { MatrimonyCandidate, resolveMediaUrl } from '../../api/admin';
import SkeletonBox from '../../components/common/SkeletonBox';
import EmptyState from '../../components/common/EmptyState';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

const PAGE_SIZE = 30;

export default function AdminMatrimonyHistoryScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors: C, spacing, radius, typography, shadow } = useTheme();
  const { lang, t } = useLanguage();
  const fontRegular = lang === 'od' ? 'NotoSansOriya' : undefined;
  const fontBold = lang === 'od' ? 'NotoSansOriya-Bold' : undefined;

  const [candidates, setCandidates] = useState<MatrimonyCandidate[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = useCallback(async (pageNum: number, replace = false) => {
    try {
      const data = await adminApi.fetchMatrimonyHistory({ page: pageNum, limit: PAGE_SIZE });
      if (data.success) {
        setCandidates(prev => (replace ? data.candidates : [...prev, ...data.candidates]));
        setPage(data.page);
        setTotalPages(data.totalPages ?? 1);
      }
    } catch (e) {
      console.error('[ADMIN_MATRIMONY_HISTORY] Fetch failed:', e);
      Alert.alert(t('common', 'errorTitle'), t('admin', 'matrimonyHistoryLoadError'));
    }
  }, [t]);

  useEffect(() => {
    setLoading(true);
    fetchHistory(1, true).finally(() => setLoading(false));
  }, [fetchHistory]);

  const onRefresh = () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    fetchHistory(1, true).finally(() => setRefreshing(false));
  };

  const onEndReached = () => {
    if (loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    fetchHistory(page + 1).finally(() => setLoadingMore(false));
  };

  const renderCandidate = useCallback(({ item }: { item: MatrimonyCandidate }) => {
    const evidenceUrl = resolveMediaUrl(item.match_evidence_url);
    return (
      <View style={{
        backgroundColor: C.card, borderColor: C.border, borderWidth: 1,
        borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadow.card,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Text style={{ color: C.text, fontFamily: fontBold, flex: 1, ...typography.bodyEmphasis }} numberOfLines={1}>{item.name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.success + '15', borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 4 }}>
            <Heart size={12} color={C.success} />
            <Text style={{ color: C.success, ...typography.caption, fontWeight: '700' }}>{item.matched_status || 'Married'}</Text>
          </View>
        </View>
        <Text style={{ color: C.textMuted, fontFamily: fontRegular, marginTop: 4, ...typography.caption }} numberOfLines={1}>
          {t('admin', 'matchedWithPrefix')} {item.matched_partner_name || '—'}
        </Text>
        {item.match_date ? (
          <Text style={{ color: C.textFaint, marginTop: 2, ...typography.caption }}>
            {t('admin', 'matchDateColumnLabel')}: {new Date(item.match_date).toLocaleDateString()}
          </Text>
        ) : null}
        {evidenceUrl ? (
          <TouchableOpacity
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); Linking.openURL(evidenceUrl).catch(() => {}); }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm }}
          >
            <FileText size={14} color={C.primary} />
            <Text style={{ color: C.primary, ...typography.caption, fontWeight: '700' }}>{t('admin', 'viewEvidenceButton')}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }, [C, spacing, radius, typography, shadow, fontBold, fontRegular, t]);

  const keyExtractor = useCallback((item: MatrimonyCandidate) => String(item.id), []);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.goBack(); }} style={{ padding: spacing.xs, borderRadius: radius.full, backgroundColor: C.card }}>
          <ArrowLeft size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={{ color: C.text, fontFamily: fontBold, flex: 1, ...typography.heading }}>{t('admin', 'matrimonyHistoryTitle')}</Text>
      </View>

      <View style={{ flex: 1, paddingHorizontal: spacing.lg }}>
        {loading && candidates.length === 0 ? (
          <View style={{ gap: spacing.md }}>
            {[1, 2, 3, 4].map(i => (
              <View key={i} style={{ padding: spacing.lg, backgroundColor: C.card, borderRadius: radius.lg, borderWidth: 1, borderColor: C.border, gap: spacing.sm }}>
                <SkeletonBox width="50%" height={14} />
                <SkeletonBox width="30%" height={11} />
              </View>
            ))}
          </View>
        ) : (
          <FlashList
            data={candidates}
            keyExtractor={keyExtractor}
            renderItem={renderCandidate}
            ListEmptyComponent={
              <EmptyState emoji="💍" title={t('admin', 'matrimonyHistoryEmptyTitle')} subtitle={t('admin', 'matrimonyHistoryEmptySubtitle')} />
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
