// src/screens/community/JobsScreen.tsx
// Job board — published postings only. Category filter (All/Govt/Private),
// tap a card to see full details, "+" to submit a posting for review.
// "Apply" always happens outside the app (see JobDetailScreen) — there's
// no in-app application tracking.
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Plus, MapPin, Clock, Briefcase } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as jobsApi from '../../api/jobs';
import { JobPosting } from '../../api/jobs';
import EmptyState from '../../components/common/EmptyState';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

type CategoryFilter = '' | 'govt' | 'private';
const PAGE_SIZE = 20;

export default function JobsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors: C, spacing, radius, typography, shadow } = useTheme();
  const { lang, t } = useLanguage();
  const fontRegular = lang === 'od' ? 'NotoSansOriya' : undefined;
  const fontBold = lang === 'od' ? 'NotoSansOriya-Bold' : undefined;

  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('');
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (pageNum: number, replace = false) => {
    try {
      const data = await jobsApi.fetchJobs({
        category: categoryFilter || undefined,
        page: pageNum,
        limit: PAGE_SIZE,
      });
      if (data.success) {
        setJobs(prev => (replace ? data.jobs : [...prev, ...data.jobs]));
        setPage(data.page);
        setHasMore(data.jobs.length === PAGE_SIZE);
      }
    } catch (e) {
      console.error('[JOBS] Fetch failed:', e);
      Alert.alert(t('common', 'errorTitle'), t('jobs', 'loadError'));
    }
  }, [categoryFilter, t]);

  useEffect(() => {
    setLoading(true);
    load(1, true).finally(() => setLoading(false));
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    load(1, true).finally(() => setRefreshing(false));
  };

  const onEndReached = () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    load(page + 1).finally(() => setLoadingMore(false));
  };

  const FILTERS: { value: CategoryFilter; labelKey: string }[] = [
    { value: '', labelKey: 'filterAll' },
    { value: 'govt', labelKey: 'filterGovt' },
    { value: 'private', labelKey: 'filterPrivate' },
  ];

  const renderJob = useCallback(({ item }: { item: JobPosting }) => {
    const isGovt = item.category === 'govt';
    const badgeColor = isGovt ? C.primary : C.textMuted;
    return (
      <TouchableOpacity
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          navigation.navigate('JobDetail', { id: item.id });
        }}
        style={{
          backgroundColor: C.card, borderColor: C.border, borderWidth: 1,
          borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadow.card,
        }}
      >
        <Text style={{ alignSelf: 'flex-start', color: badgeColor, backgroundColor: badgeColor + '15', borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 3, ...typography.caption, fontWeight: '700' }}>
          {isGovt ? t('jobs', 'categoryGovt') : t('jobs', 'categoryPrivate')}
        </Text>
        <Text style={{ color: C.text, fontFamily: fontBold, marginTop: spacing.sm, ...typography.bodyEmphasis }} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={{ color: C.textMuted, fontFamily: fontRegular, marginTop: 2, ...typography.caption }} numberOfLines={1}>
          {item.organization}
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm }}>
          {!!item.location && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <MapPin size={11} color={C.textFaint} />
              <Text style={{ color: C.textFaint, ...typography.caption }}>{item.location}</Text>
            </View>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <Clock size={11} color={C.textFaint} />
            <Text style={{ color: C.textFaint, ...typography.caption }}>{new Date(item.created_at).toLocaleDateString()}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [C, spacing, radius, typography, shadow, fontBold, fontRegular, t, navigation]);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.goBack(); }} style={{ padding: spacing.xs, borderRadius: radius.full, backgroundColor: C.card }}>
          <ArrowLeft size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={{ color: C.text, fontFamily: fontBold, flex: 1, ...typography.heading }}>{t('jobs', 'title')}</Text>
        <TouchableOpacity
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.navigate('JobSubmit'); }}
          style={{ width: 36, height: 36, borderRadius: radius.full, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' }}
        >
          <Plus size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.value || 'all'}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setCategoryFilter(f.value); }}
            style={{
              paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full,
              backgroundColor: categoryFilter === f.value ? C.primary : C.card,
              borderWidth: 1, borderColor: categoryFilter === f.value ? C.primary : C.border,
            }}
          >
            <Text style={{ color: categoryFilter === f.value ? '#fff' : C.textMuted, ...typography.caption, fontWeight: '700' }}>
              {t('jobs', f.labelKey)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderJob}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + spacing.xl, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            <EmptyState emoji="💼" title={t('jobs', 'emptyTitle')} subtitle={t('jobs', 'emptySubtitle')} />
          }
          ListFooterComponent={
            loadingMore ? <View style={{ paddingVertical: spacing.lg, alignItems: 'center' }}><ActivityIndicator size="small" color={C.primaryLight} /></View> : null
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} colors={[C.primary]} progressBackgroundColor={C.card} />
          }
        />
      )}
    </View>
  );
}
