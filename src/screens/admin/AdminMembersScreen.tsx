// src/screens/admin/AdminMembersScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';
import { Search, X, ArrowLeft, Ban, CheckCircle2, Filter } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDebounce } from '../../hooks/useDebounce';
import * as adminApi from '../../api/admin';
import { AdminMember, AdminMemberFilterOptions } from '../../api/admin';
import Avatar from '../../components/common/Avatar';
import SkeletonBox from '../../components/common/SkeletonBox';
import EmptyState from '../../components/common/EmptyState';
import FilterModal from '../../components/members/FilterModal';
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
const EMPTY_FILTERS: FilterState = { district: '', taluka: '', panchayat: '', village: '', gender: '' };

export default function AdminMembersScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors: C, spacing, radius, typography, shadow } = useTheme();
  const { lang, t } = useLanguage();
  const fontRegular = lang === 'od' ? 'NotoSansOriya' : undefined;
  const fontBold = lang === 'od' ? 'NotoSansOriya-Bold' : undefined;

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 400);
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterOptions, setFilterOptions] = useState<AdminMemberFilterOptions>({ districts: [], talukas: {}, panchayats: {}, villages: {} });
  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const [members, setMembers] = useState<AdminMember[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    adminApi.fetchAdminMemberFilters()
      .then(d => { if (d.success) setFilterOptions(d.filters); })
      .catch(() => {});
  }, []);

  const fetchMembers = useCallback(async (pageNum: number, replace = false) => {
    try {
      const data = await adminApi.fetchAdminMembers({
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
      console.error('[ADMIN_MEMBERS] Fetch failed:', e);
      Alert.alert(t('common', 'errorTitle'), t('admin', 'membersLoadError'));
    }
  }, [debouncedSearch, filters, t]);

  useEffect(() => {
    setLoading(true);
    fetchMembers(1, true).finally(() => setLoading(false));
  }, [fetchMembers]);

  const handleFilterChange = (newFilters: FilterState) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFilters(newFilters);
  };

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

  const renderMember = useCallback(({ item }: { item: AdminMember }) => {
    const isBanned = !!item.is_banned;
    return (
      <TouchableOpacity
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          navigation.navigate('AdminMemberDetail', { id: item.membership_no });
        }}
        style={{
          flexDirection: 'row', alignItems: 'center', gap: spacing.md,
          backgroundColor: C.card, borderColor: C.border, borderWidth: 1,
          borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadow.card,
        }}
      >
        <Avatar name={item.name} photoUrl={item.profile_photo_url} gender={item.head_gender} size={48} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.text, fontFamily: fontBold, ...typography.bodyEmphasis }} numberOfLines={1}>{item.name}</Text>
          <Text style={{ color: C.textMuted, fontFamily: fontRegular, marginTop: 2, ...typography.caption }} numberOfLines={1}>
            #{item.membership_no} · {item.village || item.district || '—'}
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
            <Text style={{ color: C.success, ...typography.caption, fontWeight: '700' }}>{t('admin', 'activeBadge')}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }, [navigation, C, spacing, radius, typography, shadow, fontBold, fontRegular, t]);

  const keyExtractor = useCallback((item: AdminMember) => item.membership_no, []);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.goBack(); }} style={{ padding: spacing.xs, borderRadius: radius.full, backgroundColor: C.card }}>
          <ArrowLeft size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={{ color: C.text, fontFamily: fontBold, ...typography.heading }}>{t('admin', 'membersTitle')}</Text>
      </View>

      <View style={{ paddingHorizontal: spacing.lg }}>
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md }}>
            <Search size={16} color={C.textMuted} />
            <TextInput
              style={{ flex: 1, color: C.text, fontFamily: fontRegular, paddingVertical: spacing.sm, ...typography.body }}
              placeholder={t('admin', 'membersSearchPlaceholder')}
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

          <TouchableOpacity
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowFilterModal(true); }}
            style={{
              backgroundColor: activeFilterCount > 0 ? C.primary : C.card,
              borderColor: activeFilterCount > 0 ? C.primary : C.border,
              borderRadius: radius.md, paddingHorizontal: spacing.md, alignItems: 'center', justifyContent: 'center',
            }}
            className="border"
          >
            <Filter size={16} color={activeFilterCount > 0 ? '#fff' : C.textMuted} />
            {activeFilterCount > 0 && (
              <View style={{ position: 'absolute', top: -6, right: -6, backgroundColor: C.error, borderRadius: radius.full, width: 16, height: 16, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {activeFilterCount > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md }}>
            {(['district', 'taluka', 'panchayat', 'village'] as const).map(key => filters[key] ? (
              <View key={key} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.primary + '1a', borderColor: C.primary + '33', borderRadius: radius.full, paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.xs }} className="border">
                <Text style={{ color: C.primaryLight, fontSize: 12, fontWeight: '600' }}>{filters[key]}</Text>
                <TouchableOpacity onPress={() => handleFilterChange(key === 'district' ? { ...filters, district: '', taluka: '', panchayat: '', village: '' } : key === 'taluka' ? { ...filters, taluka: '', panchayat: '', village: '' } : key === 'panchayat' ? { ...filters, panchayat: '', village: '' } : { ...filters, village: '' })}>
                  <X size={14} color={C.primaryLight} />
                </TouchableOpacity>
              </View>
            ) : null)}
            {filters.gender ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.primary + '1a', borderColor: C.primary + '33', borderRadius: radius.full, paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.xs }} className="border">
                <Text style={{ color: C.primaryLight, fontSize: 12, fontWeight: '600' }}>{filters.gender}</Text>
                <TouchableOpacity onPress={() => handleFilterChange({ ...filters, gender: '' })}>
                  <X size={14} color={C.primaryLight} />
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        )}
      </View>

      <View style={{ flex: 1, paddingHorizontal: spacing.lg }}>
        {loading && members.length === 0 ? (
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
            maintainVisibleContentPosition={{ disabled: true }}
            data={members}
            keyExtractor={keyExtractor}
            renderItem={renderMember}
            ListEmptyComponent={
              <EmptyState emoji="🔍" title={t('admin', 'membersEmptyTitle')} subtitle={t('admin', 'membersEmptySubtitle')} />
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

      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        options={filterOptions}
        filters={filters}
        onChange={handleFilterChange}
        totalResults={total}
      />
    </View>
  );
}
