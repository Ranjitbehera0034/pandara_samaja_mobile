// src/screens/admin/AdminAnalyticsScreen.tsx
// Aggregated member-activity analytics — stats & trends computed from the
// same `activity_log` table the raw AdminTrackerScreen browses, but this is
// a separate, higher-level insights view. AdminTrackerScreen.tsx stays
// exactly as it is; this screen does not replace it.
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Zap, CalendarDays, Calendar, UserX, TrendingUp, ChevronRight, LogIn, Eye, MousePointerClick, ClipboardList } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as adminApi from '../../api/admin';
import { AnalyticsData, DailyTrendPoint } from '../../api/admin';
import EmptyState from '../../components/common/EmptyState';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

// Lightweight bar chart built from plain Views — no charting library
// installed in this app, and 14-30 bars doesn't warrant adding one.
function BarChart({
  data, color, barHeight, showLabels,
}: { data: DailyTrendPoint[]; color: string; barHeight: number; showLabels?: boolean }) {
  const { colors: C, spacing } = useTheme();
  const max = Math.max(1, ...data.map(d => d.count));
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: barHeight, gap: 3 }}>
        {data.map(d => (
          <View key={d.date} style={{ flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
            <View
              style={{
                width: '100%',
                height: Math.max(3, (d.count / max) * (barHeight - 4)),
                backgroundColor: d.count > 0 ? color : C.border,
                borderRadius: 3,
              }}
            />
          </View>
        ))}
      </View>
      {showLabels && (
        <View style={{ flexDirection: 'row', marginTop: spacing.xs, gap: 3 }}>
          {data.map((d, i) => (
            <View key={d.date} style={{ flex: 1, alignItems: 'center' }}>
              {(i === 0 || i === data.length - 1 || i % 3 === 0) && (
                <Text style={{ color: C.textFaint, fontSize: 9 }}>{new Date(d.date).getDate()}</Text>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export default function AdminAnalyticsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors: C, spacing, radius, typography, shadow } = useTheme();
  const { lang, t } = useLanguage();
  const fontRegular = lang === 'od' ? 'NotoSansOriya' : undefined;
  const fontBold = lang === 'od' ? 'NotoSansOriya-Bold' : undefined;

  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [migrationPending, setMigrationPending] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await adminApi.fetchAdminAnalytics();
      if (data.success) {
        setAnalytics(data.analytics);
        setMigrationPending(!!data.migrationPending);
      }
    } catch (e) {
      console.error('[ADMIN_ANALYTICS] Fetch failed:', e);
      Alert.alert(t('common', 'errorTitle'), t('admin', 'analyticsLoadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const unsub = navigation.addListener('focus', () => load());
    return unsub;
  }, [navigation, load]);

  const onRefresh = () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    load().finally(() => setRefreshing(false));
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

  const statCards = analytics ? [
    { key: 'today', icon: <Zap size={22} color={C.primary} />, label: t('admin', 'analyticsActiveTodayLabel'), value: analytics.activeMembers.today, color: C.primary },
    { key: 'week', icon: <Calendar size={22} color={C.accent} />, label: t('admin', 'analyticsActiveWeekLabel'), value: analytics.activeMembers.last7Days, color: C.accent },
    { key: 'month', icon: <CalendarDays size={22} color={C.success} />, label: t('admin', 'analyticsActiveMonthLabel'), value: analytics.activeMembers.last30Days, color: C.success },
    { key: 'inactive', icon: <UserX size={22} color={C.warning} />, label: t('admin', 'analyticsInactiveLabel'), value: analytics.inactiveMembers, color: C.warning },
    { key: 'neverLoggedIn', icon: <LogIn size={22} color={C.error} />, label: t('admin', 'analyticsNeverLoggedInLabel'), value: analytics.neverLoggedIn, color: C.error },
    { key: 'justOpened', icon: <Eye size={22} color={C.textMuted} />, label: t('admin', 'analyticsJustOpenedLabel'), value: analytics.engagementDepthToday.justOpened, color: C.textMuted },
    { key: 'engaged', icon: <MousePointerClick size={22} color={C.accent} />, label: t('admin', 'analyticsEngagedLabel'), value: analytics.engagementDepthToday.engaged, color: C.accent },
  ] : [];

  const newSignupsTotal = analytics ? analytics.newSignupsTrend.reduce((sum, d) => sum + d.count, 0) : 0;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.goBack(); }} style={{ padding: spacing.xs, borderRadius: radius.full, backgroundColor: C.card }}>
          <ArrowLeft size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={{ color: C.text, fontFamily: fontBold, flex: 1, ...typography.heading }}>{t('admin', 'analyticsTitle')}</Text>
        <TouchableOpacity
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.navigate('AdminTracker'); }}
          style={{ width: 36, height: 36, borderRadius: radius.full, backgroundColor: C.primary + '15', alignItems: 'center', justifyContent: 'center' }}
        >
          <ClipboardList size={16} color={C.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : migrationPending ? (
        <EmptyState emoji="🛠️" title={t('admin', 'analyticsMigrationPendingTitle')} subtitle={t('admin', 'analyticsMigrationPendingSubtitle')} />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} colors={[C.primary]} progressBackgroundColor={C.card} />}
        >
          <Text style={{ color: C.textMuted, marginBottom: spacing.lg, fontFamily: fontRegular, ...typography.caption }}>
            {t('admin', 'analyticsSubtitle')}
          </Text>

          {/* Stat cards */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.xl }}>
            {statCards.map(stat => (
              <View
                key={stat.key}
                style={{
                  width: '47%', backgroundColor: C.card, borderColor: C.border, borderWidth: 1,
                  borderRadius: radius.lg, padding: spacing.lg, ...shadow.card,
                }}
              >
                <View style={{ width: 44, height: 44, borderRadius: radius.md, backgroundColor: stat.color + '15', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md }}>
                  {stat.icon}
                </View>
                <Text style={{ color: C.text, fontFamily: fontBold, ...typography.display }}>{stat.value}</Text>
                <Text style={{ color: C.textMuted, marginTop: 2, fontFamily: fontRegular, ...typography.caption }}>{stat.label}</Text>
              </View>
            ))}
          </View>

          {/* Daily active trend */}
          {analytics && (
            <View style={{ backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.xl, ...shadow.card }}>
              <Text style={{ color: C.text, fontFamily: fontBold, marginBottom: spacing.md, ...typography.bodyEmphasis }}>
                {t('admin', 'analyticsDailyTrendTitle')}
              </Text>
              <BarChart data={analytics.dailyActiveTrend} color={C.primary} barHeight={90} showLabels />
            </View>
          )}

          {/* Most active members */}
          <View style={{ marginBottom: spacing.xl }}>
            <Text style={{ color: C.text, fontFamily: fontBold, marginBottom: spacing.md, ...typography.bodyEmphasis }}>
              {t('admin', 'analyticsMostActiveTitle')}
            </Text>
            {analytics && analytics.mostActiveMembers.length === 0 ? (
              <EmptyState emoji="📊" title={t('admin', 'analyticsMostActiveEmptyTitle')} subtitle={t('admin', 'analyticsMostActiveEmptySubtitle')} />
            ) : (
              <View style={{ gap: spacing.sm }}>
                {analytics?.mostActiveMembers.map((m, i) => (
                  <TouchableOpacity
                    key={m.membership_no}
                    activeOpacity={0.8}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.navigate('AdminMemberDetail', { id: m.membership_no }); }}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: spacing.md,
                      backgroundColor: C.card, borderColor: C.border, borderWidth: 1,
                      borderRadius: radius.lg, padding: spacing.lg, ...shadow.card,
                    }}
                  >
                    <View style={{ width: 32, height: 32, borderRadius: radius.full, backgroundColor: C.primary + '15', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ color: C.primary, fontFamily: fontBold, ...typography.caption, fontWeight: '700' }}>{i + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: C.text, fontFamily: fontBold, ...typography.bodyEmphasis }} numberOfLines={1}>
                        {m.name || `#${m.membership_no}`}
                      </Text>
                      <Text style={{ color: C.textMuted, fontFamily: fontRegular, marginTop: 2, ...typography.caption }} numberOfLines={1}>
                        {[m.village, m.district].filter(Boolean).join(', ') || '—'}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ color: C.primary, fontFamily: fontBold, ...typography.bodyEmphasis }}>{m.activity_count}</Text>
                      <Text style={{ color: C.textFaint, ...typography.caption }}>{t('admin', 'analyticsActivityCountSuffix')}</Text>
                    </View>
                    <ChevronRight size={18} color={C.textFaint} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Action breakdown */}
          <View style={{ marginBottom: spacing.xl }}>
            <Text style={{ color: C.text, fontFamily: fontBold, marginBottom: spacing.md, ...typography.bodyEmphasis }}>
              {t('admin', 'analyticsActionBreakdownTitle')}
            </Text>
            {analytics && analytics.actionBreakdown.length === 0 ? (
              <EmptyState emoji="📋" title={t('admin', 'analyticsActionBreakdownEmptyTitle')} />
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                {analytics?.actionBreakdown.map(entry => (
                  <View
                    key={entry.action}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
                      backgroundColor: C.card, borderColor: C.border, borderWidth: 1,
                      borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
                    }}
                  >
                    <Text style={{ color: C.text, fontFamily: fontRegular, ...typography.caption }}>{actionLabel(entry.action)}</Text>
                    <View style={{ backgroundColor: C.primary + '15', borderRadius: radius.full, paddingHorizontal: spacing.sm, minWidth: 22, alignItems: 'center' }}>
                      <Text style={{ color: C.primary, fontFamily: fontBold, ...typography.caption, fontWeight: '700' }}>{entry.count}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* New signups */}
          {analytics && (
            <View style={{ backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, ...shadow.card }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
                <Text style={{ color: C.text, fontFamily: fontBold, ...typography.bodyEmphasis }}>
                  {t('admin', 'analyticsNewSignupsTitle')}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                  <TrendingUp size={16} color={C.success} />
                  <Text style={{ color: C.success, fontFamily: fontBold, ...typography.bodyEmphasis }}>{newSignupsTotal}</Text>
                </View>
              </View>
              <Text style={{ color: C.textMuted, marginBottom: spacing.md, fontFamily: fontRegular, ...typography.caption }}>
                {t('admin', 'analyticsNewSignupsTotalLabel')}
              </Text>
              <BarChart data={analytics.newSignupsTrend} color={C.success} barHeight={60} />
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}
