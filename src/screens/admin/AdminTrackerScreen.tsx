// src/screens/admin/AdminTrackerScreen.tsx
// Activity/audit log tracker. Plain admins only ever see member activity
// (the backend silently forces actorType='member' for them), so the
// actor-type filter is only rendered for superadmins.
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator, RefreshControl, TextInput,
  Modal, ScrollView, Alert,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { ArrowLeft, ChevronDown, ChevronUp, Search, X as XIcon, Download, BarChart3, AlertTriangle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as adminApi from '../../api/admin';
import { ActivityLogEntry } from '../../api/admin';
import { useAdminAuth } from '../../context/AdminAuthContext';
import EmptyState from '../../components/common/EmptyState';
import SkeletonBox from '../../components/common/SkeletonBox';
import Button from '../../components/common/Button';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { timeAgoShort } from '../../utils/feedUtils';
import { groupActionsByCategory, ACTIVITY_CATEGORIES, isHighStakesAction } from '../../utils/activityCategories';

const PAGE_SIZE = 30;

type ActorFilter = 'all' | 'member' | 'admin';
type DateRangeKey = 'all' | 'today' | 'last7' | 'last30' | 'custom';

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function AdminTrackerScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { adminUser } = useAdminAuth();
  const insets = useSafeAreaInsets();
  const { colors: C, spacing, radius, typography, shadow } = useTheme();
  const { lang, t } = useLanguage();
  const fontRegular = lang === 'od' ? 'NotoSansOriya' : undefined;
  const fontBold = lang === 'od' ? 'NotoSansOriya-Bold' : undefined;

  const isSuperAdmin = adminUser?.role === 'superadmin';

  const [filter, setFilter] = useState<ActorFilter>('all');
  const [actorId, setActorId] = useState<string | undefined>(route.params?.actorId);
  const [actorName, setActorName] = useState<string | undefined>(route.params?.actorName);

  const [allActions, setAllActions] = useState<string[]>([]);
  const [actionFilter, setActionFilter] = useState<string>('');
  const [actionPickerOpen, setActionPickerOpen] = useState(false);

  const [dateRange, setDateRange] = useState<DateRangeKey>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const [activities, setActivities] = useState<ActivityLogEntry[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [migrationPending, setMigrationPending] = useState(false);
  const [expandedId, setExpandedId] = useState<string | number | null>(null);
  const [exporting, setExporting] = useState(false);

  // Re-apply an incoming actorId filter every time this screen is focused
  // with new params (e.g. tapping "View activity" on a different admin row
  // while already on the Tracker).
  useFocusEffect(
    useCallback(() => {
      if (route.params?.actorId !== undefined && route.params.actorId !== actorId) {
        setActorId(route.params.actorId);
        setActorName(route.params.actorName);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [route.params?.actorId])
  );

  useEffect(() => {
    adminApi.fetchActivityActions().then(data => {
      if (data.success) setAllActions(data.actions);
    }).catch(e => console.error('[ADMIN_TRACKER] Fetch actions failed:', e));
  }, []);

  // Debounce free-text search.
  useEffect(() => {
    const handle = setTimeout(() => setSearch(searchInput.trim()), 400);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const dateBounds = useMemo((): { startDate?: string; endDate?: string } => {
    const now = new Date();
    if (dateRange === 'today') {
      const d = isoDate(now);
      return { startDate: d, endDate: d };
    }
    if (dateRange === 'last7') {
      const from = new Date(now);
      from.setDate(from.getDate() - 6);
      return { startDate: isoDate(from), endDate: isoDate(now) };
    }
    if (dateRange === 'last30') {
      const from = new Date(now);
      from.setDate(from.getDate() - 29);
      return { startDate: isoDate(from), endDate: isoDate(now) };
    }
    if (dateRange === 'custom') {
      return { startDate: customFrom || undefined, endDate: customTo || undefined };
    }
    return {};
  }, [dateRange, customFrom, customTo]);

  const fetchPage = useCallback(async (pageNum: number, replace = false) => {
    try {
      const data = await adminApi.fetchAdminActivity({
        page: pageNum,
        limit: PAGE_SIZE,
        actorType: isSuperAdmin && filter !== 'all' ? (filter as 'member' | 'admin') : undefined,
        actorId,
        action: actionFilter || undefined,
        search: search || undefined,
        ...dateBounds,
      });
      if (data.success) {
        setMigrationPending(!!data.migrationPending);
        setActivities(prev => replace ? data.activities : [...prev, ...data.activities]);
        setPage(data.page);
        setTotalPages(data.totalPages ?? 1);
      }
    } catch (e) {
      console.error('[ADMIN_TRACKER] Fetch failed:', e);
    }
  }, [filter, isSuperAdmin, actorId, actionFilter, search, dateBounds]);

  useEffect(() => {
    setLoading(true);
    // Clear immediately (not just after the fetch resolves) — otherwise the
    // previous tab's rows stay on screen during the fetch, since the
    // skeleton loader only shows when activities is already empty.
    setActivities([]);
    fetchPage(1, true).finally(() => setLoading(false));
  }, [fetchPage]);

  const onRefresh = () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    fetchPage(1, true).finally(() => setRefreshing(false));
  };

  const onEndReached = () => {
    if (loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    fetchPage(page + 1).finally(() => setLoadingMore(false));
  };

  const actionLabel = (action: string) => {
    const known = t('admin', `action_${action}`);
    // t() falls back to the raw key string when not found — detect that and
    // synthesize a readable label instead of showing "action_xyz" verbatim.
    if (known === `action_${action}`) {
      return action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }
    return known;
  };

  const categoryLabel = (categoryKey: string) => {
    const cat = ACTIVITY_CATEGORIES.find(c => c.key === categoryKey);
    return cat ? t('admin', cat.labelKey) : categoryKey;
  };

  const groupedActions = useMemo(() => groupActionsByCategory(allActions), [allActions]);

  const clearActorFilter = () => {
    setActorId(undefined);
    setActorName(undefined);
    navigation.setParams({ actorId: undefined, actorName: undefined });
  };

  const handleExport = async () => {
    if (activities.length === 0) {
      Alert.alert(t('common', 'errorTitle'), t('admin', 'trackerExportEmptyError'));
      return;
    }
    setExporting(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const csv = await adminApi.exportActivityCsv({
        actorType: isSuperAdmin && filter !== 'all' ? (filter as 'member' | 'admin') : undefined,
        actorId,
        action: actionFilter || undefined,
        search: search || undefined,
        ...dateBounds,
      });
      const file = new File(Paths.cache, 'activity_log.csv');
      if (file.exists) file.delete();
      file.create();
      file.write(csv);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: 'activity_log.csv', UTI: 'public.comma-separated-values-text' });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.error('[ADMIN_TRACKER] Export failed:', e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common', 'errorTitle'), t('admin', 'trackerExportError'));
    } finally {
      setExporting(false);
    }
  };

  const renderRow = useCallback(({ item }: { item: ActivityLogEntry }) => {
    const isExpanded = expandedId === item.id;
    const highStakes = isHighStakesAction(item.action);
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setExpandedId(isExpanded ? null : item.id); }}
        style={{
          backgroundColor: C.card, borderColor: highStakes ? C.error : C.border, borderWidth: highStakes ? 1.5 : 1,
          borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadow.card,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <View style={{ flex: 1, marginRight: spacing.sm }}>
            <Text style={{ color: C.text, fontFamily: fontBold, ...typography.bodyEmphasis }} numberOfLines={1}>
              {item.actor_name || `#${item.actor_id}`}
              <Text style={{ color: C.textMuted, fontWeight: '400' }}> · {item.actor_type}</Text>
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
              {highStakes && <AlertTriangle size={12} color={C.error} />}
              <Text style={{ color: highStakes ? C.error : C.primary, fontFamily: fontRegular, ...typography.body }}>
                {actionLabel(item.action)}
              </Text>
            </View>
            {(item.target_type || item.target_id) && (
              <Text style={{ color: C.textMuted, fontFamily: fontRegular, marginTop: 2, ...typography.caption }} numberOfLines={1}>
                {t('admin', 'trackerTargetLabel')}: {item.target_type} #{item.target_id}
              </Text>
            )}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: C.textFaint, ...typography.caption }}>{timeAgoShort(item.created_at)}</Text>
            {isExpanded ? <ChevronUp size={16} color={C.textFaint} style={{ marginTop: spacing.xs }} /> : <ChevronDown size={16} color={C.textFaint} style={{ marginTop: spacing.xs }} />}
          </View>
        </View>

        {isExpanded && (
          <View style={{ marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: C.border, gap: spacing.xs }}>
            <Text style={{ color: C.textMuted, fontFamily: fontRegular, ...typography.caption }}>
              {t('admin', 'trackerIpLabel')}: {item.ip_address || '—'}
            </Text>
            <Text style={{ color: C.textMuted, fontFamily: fontRegular, ...typography.caption }} numberOfLines={2}>
              {t('admin', 'trackerDeviceLabel')}: {item.user_agent || '—'}
            </Text>
            {item.metadata && (
              <Text style={{ color: C.textMuted, fontFamily: fontRegular, ...typography.caption }} numberOfLines={3}>
                {JSON.stringify(item.metadata)}
              </Text>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  }, [expandedId, C, spacing, radius, typography, shadow, fontBold, fontRegular, t]);

  const keyExtractor = useCallback((item: ActivityLogEntry) => String(item.id), []);

  const tabs: { key: ActorFilter; label: string }[] = [
    { key: 'all', label: t('admin', 'trackerFilterAll') },
    { key: 'member', label: t('admin', 'trackerFilterMembers') },
    { key: 'admin', label: t('admin', 'trackerFilterAdmins') },
  ];

  const dateOptions: { key: DateRangeKey; label: string }[] = [
    { key: 'all', label: t('admin', 'trackerDateAll') },
    { key: 'today', label: t('admin', 'trackerDateToday') },
    { key: 'last7', label: t('admin', 'trackerDateLast7') },
    { key: 'last30', label: t('admin', 'trackerDateLast30') },
    { key: 'custom', label: t('admin', 'trackerDateCustom') },
  ];

  const dateFilterLabel = dateOptions.find(o => o.key === dateRange)?.label || '';

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.goBack(); }} style={{ padding: spacing.xs, borderRadius: radius.full, backgroundColor: C.card }}>
          <ArrowLeft size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={{ color: C.text, fontFamily: fontBold, flex: 1, ...typography.heading }}>{t('admin', 'trackerTitle')}</Text>
        <TouchableOpacity
          onPress={handleExport}
          disabled={exporting}
          style={{ width: 36, height: 36, borderRadius: radius.full, backgroundColor: C.primary + '15', alignItems: 'center', justifyContent: 'center' }}
        >
          {exporting ? <ActivityIndicator size="small" color={C.primary} /> : <Download size={16} color={C.primary} />}
        </TouchableOpacity>
        {isSuperAdmin && (
          <TouchableOpacity
            onPress={() => navigation.navigate('AdminAnalytics')}
            style={{ width: 36, height: 36, borderRadius: radius.full, backgroundColor: C.primary + '15', alignItems: 'center', justifyContent: 'center' }}
          >
            <BarChart3 size={16} color={C.primary} />
          </TouchableOpacity>
        )}
      </View>

      {actorId && (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.primary + '15', marginHorizontal: spacing.lg, marginBottom: spacing.md, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }}>
          <Text style={{ color: C.primary, fontFamily: fontRegular, flex: 1, ...typography.caption, fontWeight: '700' }} numberOfLines={1}>
            {t('admin', 'trackerFilteredByActorBanner').replace('{name}', actorName || `#${actorId}`)}
          </Text>
          <TouchableOpacity onPress={clearActorFilter}>
            <Text style={{ color: C.primary, ...typography.caption, fontWeight: '700' }}>{t('admin', 'trackerClearActorFilter')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {isSuperAdmin && (
        <View style={{ flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, marginBottom: spacing.md }}>
          {tabs.map(tab => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setFilter(tab.key); }}
              style={{
                flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: radius.md,
                borderWidth: 1, borderColor: filter === tab.key ? C.primary : C.border,
                backgroundColor: filter === tab.key ? C.primary + '15' : C.card,
              }}
            >
              <Text style={{ color: filter === tab.key ? C.primary : C.textMuted, fontFamily: fontBold, ...typography.caption, fontWeight: '700' }}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.md, gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md }}>
          <Search size={16} color={C.textFaint} />
          <TextInput
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder={t('admin', 'trackerSearchPlaceholder')}
            placeholderTextColor={C.textFaint}
            style={{ flex: 1, color: C.text, paddingVertical: spacing.sm, fontFamily: fontRegular, ...typography.body }}
          />
          {searchInput.length > 0 && (
            <TouchableOpacity onPress={() => setSearchInput('')}>
              <XIcon size={16} color={C.textFaint} />
            </TouchableOpacity>
          )}
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <TouchableOpacity
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActionPickerOpen(true); }}
            style={{
              flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md,
              borderWidth: 1, borderColor: actionFilter ? C.primary : C.border,
              backgroundColor: actionFilter ? C.primary + '15' : C.card,
            }}
          >
            <Text style={{ color: actionFilter ? C.primary : C.textMuted, ...typography.caption, fontWeight: '700' }} numberOfLines={1}>
              {actionFilter ? actionLabel(actionFilter) : t('admin', 'trackerActionFilterLabel')}
            </Text>
            <ChevronDown size={14} color={actionFilter ? C.primary : C.textFaint} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setDatePickerOpen(true); }}
            style={{
              flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md,
              borderWidth: 1, borderColor: dateRange !== 'all' ? C.primary : C.border,
              backgroundColor: dateRange !== 'all' ? C.primary + '15' : C.card,
            }}
          >
            <Text style={{ color: dateRange !== 'all' ? C.primary : C.textMuted, ...typography.caption, fontWeight: '700' }} numberOfLines={1}>
              {dateFilterLabel}
            </Text>
            <ChevronDown size={14} color={dateRange !== 'all' ? C.primary : C.textFaint} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Action-type picker, grouped by category */}
      <Modal visible={actionPickerOpen} animationType="slide" transparent onRequestClose={() => setActionPickerOpen(false)}>
        <TouchableOpacity activeOpacity={1} onPress={() => setActionPickerOpen(false)} style={{ flex: 1, backgroundColor: '#00000080', justifyContent: 'flex-end' }}>
          <TouchableOpacity activeOpacity={1} style={{ backgroundColor: C.card, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, maxHeight: '75%', paddingBottom: insets.bottom + spacing.lg }}>
            <Text style={{ color: C.text, fontFamily: fontBold, padding: spacing.lg, ...typography.title }}>
              {t('admin', 'trackerActionFilterLabel')}
            </Text>
            <ScrollView>
              <TouchableOpacity
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActionFilter(''); setActionPickerOpen(false); }}
                style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 0.5, borderBottomColor: C.border }}
              >
                <Text style={{ color: !actionFilter ? C.primary : C.text, fontFamily: !actionFilter ? fontBold : fontRegular, ...typography.body, fontWeight: !actionFilter ? '700' : '400' }}>
                  {t('admin', 'trackerCategoryAll')}
                </Text>
              </TouchableOpacity>
              {groupedActions.map(group => (
                <View key={group.category}>
                  <Text style={{ color: C.textFaint, fontFamily: fontBold, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xs, ...typography.caption, fontWeight: '700', textTransform: 'uppercase' }}>
                    {categoryLabel(group.category)}
                  </Text>
                  {group.actions.map(action => (
                    <TouchableOpacity
                      key={action}
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActionFilter(action); setActionPickerOpen(false); }}
                      style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 0.5, borderBottomColor: C.border }}
                    >
                      <Text style={{ color: actionFilter === action ? C.primary : C.text, fontFamily: actionFilter === action ? fontBold : fontRegular, ...typography.body, fontWeight: actionFilter === action ? '700' : '400' }}>
                        {actionLabel(action)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Date range picker */}
      <Modal visible={datePickerOpen} animationType="slide" transparent onRequestClose={() => setDatePickerOpen(false)}>
        <TouchableOpacity activeOpacity={1} onPress={() => setDatePickerOpen(false)} style={{ flex: 1, backgroundColor: '#00000080', justifyContent: 'flex-end' }}>
          <TouchableOpacity activeOpacity={1} style={{ backgroundColor: C.card, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingBottom: insets.bottom + spacing.lg }}>
            <Text style={{ color: C.text, fontFamily: fontBold, padding: spacing.lg, ...typography.title }}>
              {t('admin', 'trackerDateAll')}
            </Text>
            {dateOptions.map(opt => (
              <TouchableOpacity
                key={opt.key}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setDateRange(opt.key);
                  if (opt.key !== 'custom') setDatePickerOpen(false);
                }}
                style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 0.5, borderBottomColor: C.border }}
              >
                <Text style={{ color: dateRange === opt.key ? C.primary : C.text, fontFamily: dateRange === opt.key ? fontBold : fontRegular, ...typography.body, fontWeight: dateRange === opt.key ? '700' : '400' }}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
            {dateRange === 'custom' && (
              <View style={{ padding: spacing.lg, gap: spacing.sm }}>
                <TextInput
                  value={customFrom}
                  onChangeText={setCustomFrom}
                  placeholder={t('admin', 'trackerDateFrom')}
                  placeholderTextColor={C.textFaint}
                  style={{ color: C.text, borderWidth: 1, borderColor: C.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontFamily: fontRegular, ...typography.body }}
                />
                <TextInput
                  value={customTo}
                  onChangeText={setCustomTo}
                  placeholder={t('admin', 'trackerDateTo')}
                  placeholderTextColor={C.textFaint}
                  style={{ color: C.text, borderWidth: 1, borderColor: C.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontFamily: fontRegular, ...typography.body }}
                />
                <Button label={t('admin', 'trackerApplyButton')} onPress={() => setDatePickerOpen(false)} />
              </View>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <View style={{ flex: 1, paddingHorizontal: spacing.lg }}>
        {loading && activities.length === 0 ? (
          <View style={{ gap: spacing.md }}>
            {[1, 2, 3, 4].map(i => (
              <View key={i} style={{ padding: spacing.lg, backgroundColor: C.card, borderRadius: radius.lg, borderWidth: 1, borderColor: C.border, gap: spacing.sm }}>
                <SkeletonBox width="50%" height={14} />
                <SkeletonBox width="70%" height={12} />
              </View>
            ))}
          </View>
        ) : migrationPending ? (
          <EmptyState emoji="🛠️" title={t('admin', 'trackerMigrationPendingTitle')} subtitle={t('admin', 'trackerMigrationPendingSubtitle')} />
        ) : (
          <FlashList
            maintainVisibleContentPosition={{ disabled: true }}
            data={activities}
            keyExtractor={keyExtractor}
            renderItem={renderRow}
            ListEmptyComponent={
              <EmptyState emoji="📋" title={t('admin', 'trackerEmptyTitle')} subtitle={t('admin', 'trackerEmptySubtitle')} />
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
