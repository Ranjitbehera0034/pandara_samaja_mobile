// src/screens/members/MembersScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';
import { Search, Filter, X, RefreshCw } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Member } from '../../types';
import * as membersApi from '../../api/members';
import { useDebounce } from '../../hooks/useDebounce';
import MemberCard from '../../components/members/MemberCard';
import FilterModal from '../../components/members/FilterModal';
import SkeletonBox from '../../components/common/SkeletonBox';
import EmptyState from '../../components/common/EmptyState';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

const PAGE_SIZE = 30;

interface FilterState {
  district: string;
  taluka: string;
  panchayat: string;
  village: string;
  gender: string;
}

// Shimmer skeleton for member card list
function MemberCardSkeleton() {
  const { colors: C, spacing, radius } = useTheme();
  return (
    <View style={{ gap: spacing.md, paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
      {[1, 2, 3, 4].map(i => (
        <View key={i} style={{ backgroundColor: C.card, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm, borderWidth: 1, borderColor: C.border }}>
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <SkeletonBox width={56} height={56} borderRadius={28} />
            <View style={{ flex: 1, gap: spacing.sm, justifyContent: 'center' }}>
              <SkeletonBox width="75%" height={14} />
              <SkeletonBox width="50%" height={11} />
            </View>
          </View>
          <View style={{ height: 1, backgroundColor: C.border, marginVertical: spacing.xs }} />
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <SkeletonBox width="45%" height={10} />
            <SkeletonBox width="20%" height={10} />
            <SkeletonBox width="25%" height={10} />
          </View>
        </View>
      ))}
    </View>
  );
}

export default function MembersScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors: C, spacing, radius, typography } = useTheme();
  const { lang, t } = useLanguage();

  // Search + filter state
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 400);
  const [filters, setFilters] = useState<FilterState>({ district: '', taluka: '', panchayat: '', village: '', gender: '' });
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterOptions, setFilterOptions] = useState({ districts: [], talukas: {}, panchayats: {}, villages: {} });

  // Data state
  const [members, setMembers] = useState<Member[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [subscribing, setSubscribing] = useState<string | null>(null);

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  // Load filter options once
  useEffect(() => {
    membersApi.fetchMemberFilters()
      .then(d => { if (d.success) setFilterOptions(d.filters || {}); })
      .catch(() => {});
  }, []);

  // Core fetch — replace=true resets list, replace=false appends
  const fetchMembers = useCallback(async (pageNum: number, replace = false) => {
    try {
      const data = await membersApi.fetchMembers({
        page: pageNum,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
        district: filters.district || undefined,
        taluka: filters.taluka || undefined,
        panchayat: filters.panchayat || undefined,
        village: filters.village || undefined,
        gender: filters.gender || undefined,
      });

      if (data.success) {
        setMembers(prev => replace ? data.members : [...prev, ...data.members]);
        setPage(data.page);
        setTotal(data.total ?? 0);
        setTotalPages(data.totalPages ?? 1);
      }
    } catch (e) {
      console.error('[MEMBERS] Fetch failed:', e);
      Alert.alert(t('common', 'errorTitle'), t('members', 'loadError'));
    }
  }, [debouncedSearch, filters, t]);

  // Reload on search/filter change
  useEffect(() => {
    setLoading(true);
    fetchMembers(1, true).finally(() => setLoading(false));
  }, [fetchMembers]);

  const onRefresh = () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    fetchMembers(1, true).finally(() => setRefreshing(false));
  };

  const onEndReached = () => {
    if (loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    fetchMembers(page + 1).finally(() => setLoadingMore(false));
  };

  const handleSubscribe = async (memberId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSubscribing(memberId);
    try {
      const data = await membersApi.toggleSubscribe(memberId);
      if (data.success) {
        setMembers(prev => prev.map(m =>
          m.membership_no === memberId ? { ...m, is_subscribed: data.subscribed } : m
        ));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e) {
      console.error('[SUBSCRIBE] Toggle failed:', e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSubscribing(null);
    }
  };

  const handleFilterClick = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowFilterModal(true);
  };

  const handleFilterChange = (newFilters: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFilters(newFilters);
  };

  const renderMember = useCallback(({ item }: { item: Member }) => (
    <MemberCard
      member={item as any}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        navigation.navigate('MemberProfile', { id: item.membership_no });
      }}
      onSubscribe={() => handleSubscribe(item.membership_no)}
      onMessage={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        navigation.navigate('Chat', { withId: item.membership_no, withName: item.name });
      }}
      subscribing={subscribing === item.membership_no}
    />
  ), [navigation, subscribing]);

  const keyExtractor = useCallback((item: Member) => item.membership_no, []);

  const ListHeader = () => (
    <View style={{ paddingTop: spacing.md, paddingBottom: spacing.sm }}>
      {/* Title */}
      <View className="flex-row items-center justify-between" style={{ marginBottom: spacing.lg }}>
        <View>
          <Text
            style={{
              color: C.text,
              fontFamily: lang === 'od' ? 'NotoSansOriya-Bold' : undefined,
              fontSize: typography.heading.fontSize,
              lineHeight: typography.heading.lineHeight,
              fontWeight: typography.heading.fontWeight,
            }}
          >
            {t('members', 'title')}
          </Text>
          <Text
            style={{
              color: C.textMuted,
              fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined,
              fontSize: typography.caption.fontSize,
              lineHeight: typography.caption.lineHeight,
              fontWeight: typography.caption.fontWeight,
            }}
          >
            {members.length} / {total.toLocaleString()} {t('members', 'countSuffix')}
            {debouncedSearch ? ` ${t('members', 'matchingPrefix')} "${debouncedSearch}"` : ''}
          </Text>
        </View>
        {loading && members.length > 0 && (
          <ActivityIndicator size="small" color={C.primaryLight} />
        )}
      </View>

      {/* Search bar */}
      <View className="flex-row" style={{ gap: spacing.sm, marginBottom: spacing.md }}>
        <View
          style={{ backgroundColor: C.card, borderColor: C.border, borderRadius: radius.md, paddingHorizontal: spacing.md, gap: spacing.sm }}
          className="flex-1 flex-row items-center border"
        >
          <Search size={16} color={C.textMuted} />
          <TextInput
            style={{
              color: C.text,
              fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined,
              fontSize: typography.body.fontSize,
              lineHeight: typography.body.lineHeight,
              paddingVertical: spacing.sm,
            }}
            className="flex-1"
            placeholder={t('members', 'searchPlaceholder')}
            placeholderTextColor={C.textFaint}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={16} color={C.textFaint} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Filter button */}
        <TouchableOpacity
          onPress={handleFilterClick}
          style={{
            backgroundColor: activeFilterCount > 0 ? C.primary : C.card,
            borderColor: activeFilterCount > 0 ? C.primary : C.border,
            borderRadius: radius.md,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
          }}
          className="border items-center justify-center"
        >
          <Filter size={16} color={activeFilterCount > 0 ? 'white' : C.textMuted} />
          {activeFilterCount > 0 && (
            <View
              style={{ backgroundColor: C.error, borderRadius: radius.full }}
              className="absolute -top-1.5 -right-1.5 w-4 h-4 items-center justify-center"
            >
              <Text style={{ color: '#fff', fontSize: typography.caption.fontSize, fontWeight: '700' }}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Refresh */}
        <TouchableOpacity
          onPress={onRefresh}
          style={{ backgroundColor: C.card, borderColor: C.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }}
          className="border items-center justify-center"
        >
          <RefreshCw size={16} color={C.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Active filter chips */}
      {activeFilterCount > 0 && (
        <View className="flex-row flex-wrap" style={{ gap: spacing.sm, marginBottom: spacing.md }}>
          {filters.district ? (
            <View style={{ backgroundColor: C.primary + '1a', borderColor: C.primary + '33', borderRadius: radius.full, paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.xs }} className="flex-row items-center gap-1 border">
              <Text style={{ color: C.primaryLight, fontSize: typography.caption.fontSize, fontWeight: '600' }}>{filters.district}</Text>
              <TouchableOpacity onPress={() => handleFilterChange({ ...filters, district: '', taluka: '', panchayat: '', village: '' })}>
                <X size={16} color={C.primaryLight} />
              </TouchableOpacity>
            </View>
          ) : null}
          {filters.taluka ? (
            <View style={{ backgroundColor: C.primary + '1a', borderColor: C.primary + '33', borderRadius: radius.full, paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.xs }} className="flex-row items-center gap-1 border">
              <Text style={{ color: C.primaryLight, fontSize: typography.caption.fontSize, fontWeight: '600' }}>{filters.taluka}</Text>
              <TouchableOpacity onPress={() => handleFilterChange({ ...filters, taluka: '', panchayat: '', village: '' })}>
                <X size={16} color={C.primaryLight} />
              </TouchableOpacity>
            </View>
          ) : null}
          {filters.panchayat ? (
            <View style={{ backgroundColor: C.primary + '1a', borderColor: C.primary + '33', borderRadius: radius.full, paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.xs }} className="flex-row items-center gap-1 border">
              <Text style={{ color: C.primaryLight, fontSize: typography.caption.fontSize, fontWeight: '600' }}>{filters.panchayat}</Text>
              <TouchableOpacity onPress={() => handleFilterChange({ ...filters, panchayat: '', village: '' })}>
                <X size={16} color={C.primaryLight} />
              </TouchableOpacity>
            </View>
          ) : null}
          {filters.village ? (
            <View style={{ backgroundColor: C.primary + '1a', borderColor: C.primary + '33', borderRadius: radius.full, paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.xs }} className="flex-row items-center gap-1 border">
              <Text style={{ color: C.primaryLight, fontSize: typography.caption.fontSize, fontWeight: '600' }}>{filters.village}</Text>
              <TouchableOpacity onPress={() => handleFilterChange({ ...filters, village: '' })}>
                <X size={16} color={C.primaryLight} />
              </TouchableOpacity>
            </View>
          ) : null}
          {filters.gender ? (
            <View style={{ backgroundColor: C.primary + '1a', borderColor: C.primary + '33', borderRadius: radius.full, paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.xs }} className="flex-row items-center gap-1 border">
              <Text style={{ color: C.primaryLight, fontSize: typography.caption.fontSize, fontWeight: '600' }}>{filters.gender === 'male' ? t('members', 'maleHof') : t('members', 'femaleHof')}</Text>
              <TouchableOpacity onPress={() => handleFilterChange({ ...filters, gender: '' })}>
                <X size={16} color={C.primaryLight} />
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View className="flex-1" style={{ paddingHorizontal: spacing.lg }}>
        {loading && members.length === 0 ? (
          <View className="flex-1">
            <ListHeader />
            <MemberCardSkeleton />
          </View>
        ) : (
          <FlashList
            data={members}
            keyExtractor={keyExtractor}
            renderItem={renderMember}
            ListHeaderComponent={ListHeader}
            ListEmptyComponent={
              <EmptyState
                emoji="👥"
                title={t('members', 'noMembersTitle')}
                subtitle={t('members', 'noMembersSubtitle')}
              />
            }
            ListFooterComponent={
              <View className="items-center" style={{ paddingVertical: spacing.lg }}>
                {loadingMore && <ActivityIndicator size="small" color={C.primaryLight} />}
                {!loadingMore && page >= totalPages && members.length > 0 && (
                  <Text style={{ color: C.textFaint, fontSize: typography.caption.fontSize, lineHeight: typography.caption.lineHeight }}>
                    {t('members', 'allLoadedPrefix')} {total.toLocaleString()} {t('members', 'allLoadedSuffix')}
                  </Text>
                )}
              </View>
            }
            onEndReached={onEndReached}
            onEndReachedThreshold={0.3}
            contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={C.primary}
                colors={[C.primary]}
                progressBackgroundColor={C.card}
              />
            }
          />
        )}
      </View>

      {/* Filter Modal */}
      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        options={filterOptions as any}
        filters={filters}
        onChange={handleFilterChange}
        totalResults={total}
      />
    </View>
  );
}
