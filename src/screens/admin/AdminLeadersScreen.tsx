// src/screens/admin/AdminLeadersScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';
import { Search, X, ArrowLeft, Plus, MapPin } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDebounce } from '../../hooks/useDebounce';
import * as adminApi from '../../api/admin';
import { Leader } from '../../api/admin';
import Avatar from '../../components/common/Avatar';
import SkeletonBox from '../../components/common/SkeletonBox';
import EmptyState from '../../components/common/EmptyState';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

const PAGE_SIZE = 30;

// Same level vocabulary as the member-facing src/screens/community/LeadersScreen.tsx
// and src/api/leaders.ts's LeaderLevel type.
const LEVELS = ['State', 'District', 'Taluka', 'Panchayat'] as const;
type LevelFilter = '' | typeof LEVELS[number];

export default function AdminLeadersScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors: C, spacing, radius, typography, shadow } = useTheme();
  const { lang, t } = useLanguage();
  const fontRegular = lang === 'od' ? 'NotoSansOriya' : undefined;
  const fontBold = lang === 'od' ? 'NotoSansOriya-Bold' : undefined;

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 400);
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('');

  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLeaders = useCallback(async (pageNum: number, replace = false) => {
    try {
      const data = await adminApi.fetchAdminLeaders({
        page: pageNum,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
        level: levelFilter || undefined,
      });
      if (data.success) {
        setLeaders(prev => replace ? data.leaders : [...prev, ...data.leaders]);
        setPage(data.page);
        setTotalPages(data.totalPages ?? 1);
      }
    } catch (e) {
      console.error('[ADMIN_LEADERS] Fetch failed:', e);
    }
  }, [debouncedSearch, levelFilter]);

  useEffect(() => {
    setLoading(true);
    fetchLeaders(1, true).finally(() => setLoading(false));
  }, [fetchLeaders]);

  useEffect(() => {
    const unsub = navigation.addListener('focus', () => fetchLeaders(1, true));
    return unsub;
  }, [navigation, fetchLeaders]);

  const onRefresh = () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    fetchLeaders(1, true).finally(() => setRefreshing(false));
  };

  const onEndReached = () => {
    if (loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    fetchLeaders(page + 1).finally(() => setLoadingMore(false));
  };

  const handleLevelChip = (level: LevelFilter) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLevelFilter(level === levelFilter ? '' : level);
  };

  const renderLeader = useCallback(({ item }: { item: Leader }) => (
    <TouchableOpacity
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        navigation.navigate('AdminLeaderForm', { id: item.id, leader: item });
      }}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: spacing.md,
        backgroundColor: C.card, borderColor: C.border, borderWidth: 1,
        borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadow.card,
      }}
    >
      <Avatar name={item.name} photoUrl={item.image_url} size={48} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: C.text, fontFamily: fontBold, ...typography.bodyEmphasis }} numberOfLines={1}>{item.name}</Text>
        <Text style={{ color: C.textMuted, fontFamily: fontRegular, marginTop: 2, ...typography.caption }} numberOfLines={1}>
          {item.role_or || item.role}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
          <View style={{ backgroundColor: C.primary + '15', borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 2 }}>
            <Text style={{ color: C.primaryLight, ...typography.caption, fontSize: 10, fontWeight: '700' }}>{item.level}</Text>
          </View>
          {!!item.location && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <MapPin size={10} color={C.textFaint} />
              <Text style={{ color: C.textFaint, ...typography.caption, fontSize: 10 }} numberOfLines={1}>{item.location}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  ), [navigation, C, spacing, radius, typography, shadow, fontBold, fontRegular]);

  const keyExtractor = useCallback((item: Leader) => String(item.id), []);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.goBack(); }} style={{ padding: spacing.xs, borderRadius: radius.full, backgroundColor: C.card }}>
          <ArrowLeft size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={{ color: C.text, fontFamily: fontBold, flex: 1, ...typography.heading }}>{t('admin', 'leadersTitle')}</Text>
        <TouchableOpacity
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.navigate('AdminLeaderForm', {}); }}
          style={{ width: 36, height: 36, borderRadius: radius.full, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' }}
        >
          <Plus size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={{ paddingHorizontal: spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, marginBottom: spacing.md }}>
          <Search size={16} color={C.textMuted} />
          <TextInput
            style={{ flex: 1, color: C.text, fontFamily: fontRegular, paddingVertical: spacing.sm, ...typography.body }}
            placeholder={t('admin', 'leadersSearchPlaceholder')}
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

        {/* Level filter chips */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md }}>
          {LEVELS.map(level => {
            const active = levelFilter === level;
            return (
              <TouchableOpacity
                key={level}
                onPress={() => handleLevelChip(level)}
                style={{
                  backgroundColor: active ? C.primary : C.card,
                  borderColor: active ? C.primary : C.border,
                  borderRadius: radius.full,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.xs,
                }}
                className="border"
              >
                <Text style={{ color: active ? '#fff' : C.textMuted, ...typography.caption, fontWeight: '700' }}>{level}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={{ flex: 1, paddingHorizontal: spacing.lg }}>
        {loading && leaders.length === 0 ? (
          <View style={{ gap: spacing.md }}>
            {[1, 2, 3, 4].map(i => (
              <View key={i} style={{ flexDirection: 'row', gap: spacing.md, padding: spacing.lg, backgroundColor: C.card, borderRadius: radius.lg, borderWidth: 1, borderColor: C.border }}>
                <SkeletonBox width={48} height={48} borderRadius={24} />
                <View style={{ flex: 1, gap: spacing.sm, justifyContent: 'center' }}>
                  <SkeletonBox width="60%" height={14} />
                  <SkeletonBox width="40%" height={11} />
                </View>
              </View>
            ))}
          </View>
        ) : (
          <FlashList
            data={leaders}
            keyExtractor={keyExtractor}
            renderItem={renderLeader}
            ListEmptyComponent={
              <EmptyState emoji="🏆" title={t('admin', 'leadersEmptyTitle')} subtitle={t('admin', 'leadersEmptySubtitle')} />
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
