// src/screens/admin/AdminTrackerScreen.tsx
// Activity/audit log tracker. Plain admins only ever see member activity
// (the backend silently forces actorType='member' for them), so the
// actor-type filter is only rendered for superadmins.
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as adminApi from '../../api/admin';
import { ActivityLogEntry } from '../../api/admin';
import { useAdminAuth } from '../../context/AdminAuthContext';
import EmptyState from '../../components/common/EmptyState';
import SkeletonBox from '../../components/common/SkeletonBox';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { timeAgoShort } from '../../utils/feedUtils';

const PAGE_SIZE = 30;

type ActorFilter = 'all' | 'member' | 'admin';

export default function AdminTrackerScreen() {
  const navigation = useNavigation<any>();
  const { adminUser } = useAdminAuth();
  const insets = useSafeAreaInsets();
  const { colors: C, spacing, radius, typography, shadow } = useTheme();
  const { lang, t } = useLanguage();
  const fontRegular = lang === 'od' ? 'NotoSansOriya' : undefined;
  const fontBold = lang === 'od' ? 'NotoSansOriya-Bold' : undefined;

  const isSuperAdmin = adminUser?.role === 'superadmin';

  const [filter, setFilter] = useState<ActorFilter>('all');
  const [activities, setActivities] = useState<ActivityLogEntry[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [migrationPending, setMigrationPending] = useState(false);
  const [expandedId, setExpandedId] = useState<string | number | null>(null);

  const fetchPage = useCallback(async (pageNum: number, replace = false) => {
    try {
      const data = await adminApi.fetchAdminActivity({
        page: pageNum,
        limit: PAGE_SIZE,
        actorType: isSuperAdmin && filter !== 'all' ? (filter as 'member' | 'admin') : undefined,
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
  }, [filter, isSuperAdmin]);

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

  const renderRow = useCallback(({ item }: { item: ActivityLogEntry }) => {
    const isExpanded = expandedId === item.id;
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setExpandedId(isExpanded ? null : item.id); }}
        style={{
          backgroundColor: C.card, borderColor: C.border, borderWidth: 1,
          borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadow.card,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <View style={{ flex: 1, marginRight: spacing.sm }}>
            <Text style={{ color: C.text, fontFamily: fontBold, ...typography.bodyEmphasis }} numberOfLines={1}>
              {item.actor_name || `#${item.actor_id}`}
              <Text style={{ color: C.textMuted, fontWeight: '400' }}> · {item.actor_type}</Text>
            </Text>
            <Text style={{ color: C.primary, fontFamily: fontRegular, marginTop: 2, ...typography.body }}>
              {actionLabel(item.action)}
            </Text>
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

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.goBack(); }} style={{ padding: spacing.xs, borderRadius: radius.full, backgroundColor: C.card }}>
          <ArrowLeft size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={{ color: C.text, fontFamily: fontBold, ...typography.heading }}>{t('admin', 'trackerTitle')}</Text>
      </View>

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
