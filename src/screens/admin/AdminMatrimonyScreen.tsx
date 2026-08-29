// src/screens/admin/AdminMatrimonyScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';
import { Search, X, ArrowLeft, Ban, CheckCircle2, Plus, ClipboardList, History } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDebounce } from '../../hooks/useDebounce';
import * as adminApi from '../../api/admin';
import { MatrimonyCandidate } from '../../api/admin';
import SkeletonBox from '../../components/common/SkeletonBox';
import EmptyState from '../../components/common/EmptyState';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

const PAGE_SIZE = 30;

export default function AdminMatrimonyScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors: C, spacing, radius, typography, shadow } = useTheme();
  const { lang, t } = useLanguage();
  const fontRegular = lang === 'od' ? 'NotoSansOriya' : undefined;
  const fontBold = lang === 'od' ? 'NotoSansOriya-Bold' : undefined;

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 400);

  const [candidates, setCandidates] = useState<MatrimonyCandidate[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCandidates = useCallback(async (pageNum: number, replace = false) => {
    try {
      const data = await adminApi.fetchAdminMatrimonyCandidates({ page: pageNum, limit: PAGE_SIZE, search: debouncedSearch || undefined });
      if (data.success) {
        setCandidates(prev => replace ? data.candidates : [...prev, ...data.candidates]);
        setPage(data.page);
        setTotalPages(data.totalPages ?? 1);
      }
    } catch (e) {
      console.error('[ADMIN_MATRIMONY] Fetch failed:', e);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    setLoading(true);
    fetchCandidates(1, true).finally(() => setLoading(false));
  }, [fetchCandidates]);

  useEffect(() => {
    const unsub = navigation.addListener('focus', () => fetchCandidates(1, true));
    return unsub;
  }, [navigation, fetchCandidates]);

  const onRefresh = () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    fetchCandidates(1, true).finally(() => setRefreshing(false));
  };

  const onEndReached = () => {
    if (loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    fetchCandidates(page + 1).finally(() => setLoadingMore(false));
  };

  const renderCandidate = useCallback(({ item }: { item: MatrimonyCandidate }) => {
    const isBanned = item.status === 'banned';
    return (
      <TouchableOpacity
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          navigation.navigate('AdminMatrimonyForm', { id: item.id });
        }}
        style={{
          flexDirection: 'row', alignItems: 'center', gap: spacing.md,
          backgroundColor: C.card, borderColor: C.border, borderWidth: 1,
          borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadow.card,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.text, fontFamily: fontBold, ...typography.bodyEmphasis }} numberOfLines={1}>{item.name}</Text>
          <Text style={{ color: C.textMuted, fontFamily: fontRegular, marginTop: 2, ...typography.caption }} numberOfLines={1}>
            {item.gender} · {item.age ?? '—'} {t('admin', 'matrimonyAgeSuffix')}
          </Text>
        </View>
        {isBanned ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.error + '15', borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 4 }}>
            <Ban size={12} color={C.error} />
            <Text style={{ color: C.error, ...typography.caption, fontWeight: '700' }}>{t('admin', 'bannedBadge')}</Text>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.success + '15', borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 4 }}>
            <CheckCircle2 size={12} color={C.success} />
            <Text style={{ color: C.success, ...typography.caption, fontWeight: '700' }}>{t('admin', 'matrimonyApprovedBadge')}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }, [navigation, C, spacing, radius, typography, shadow, fontBold, fontRegular, t]);

  const keyExtractor = useCallback((item: MatrimonyCandidate) => String(item.id), []);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.goBack(); }} style={{ padding: spacing.xs, borderRadius: radius.full, backgroundColor: C.card }}>
          <ArrowLeft size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={{ color: C.text, fontFamily: fontBold, flex: 1, ...typography.heading }}>{t('admin', 'matrimonyTitle')}</Text>
        <TouchableOpacity
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.navigate('AdminMatrimonyForm', {}); }}
          style={{ width: 36, height: 36, borderRadius: radius.full, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' }}
        >
          <Plus size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <TouchableOpacity
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.navigate('AdminMatrimonyApplications'); }}
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.sm, borderRadius: radius.md, backgroundColor: C.card, borderWidth: 1, borderColor: C.border }}
        >
          <ClipboardList size={14} color={C.primary} />
          <Text style={{ color: C.primary, ...typography.caption, fontWeight: '700' }}>{t('admin', 'matrimonyReviewQueueButton')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.navigate('AdminMatrimonyHistory'); }}
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.sm, borderRadius: radius.md, backgroundColor: C.card, borderWidth: 1, borderColor: C.border }}
        >
          <History size={14} color={C.primary} />
          <Text style={{ color: C.primary, ...typography.caption, fontWeight: '700' }}>{t('admin', 'matrimonyHistoryButton')}</Text>
        </TouchableOpacity>
      </View>

      <View style={{ paddingHorizontal: spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, marginBottom: spacing.md }}>
          <Search size={16} color={C.textMuted} />
          <TextInput
            style={{ flex: 1, color: C.text, fontFamily: fontRegular, paddingVertical: spacing.sm, ...typography.body }}
            placeholder={t('admin', 'matrimonySearchPlaceholder')}
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
            maintainVisibleContentPosition={{ disabled: true }}
            data={candidates}
            keyExtractor={keyExtractor}
            renderItem={renderCandidate}
            ListEmptyComponent={
              <EmptyState emoji="💞" title={t('admin', 'matrimonyEmptyTitle')} subtitle={t('admin', 'matrimonyEmptySubtitle')} />
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
