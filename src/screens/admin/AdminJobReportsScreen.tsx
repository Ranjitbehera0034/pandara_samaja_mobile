// src/screens/admin/AdminJobReportsScreen.tsx
// Live job listings flagged by members as suspicious/fraudulent — mirrors
// AdminStoryReportsScreen.tsx exactly, reusing the same generic moderation
// i18n keys (approveButton/rejectButton/reasonLabel/etc) already shared by
// the posts and stories report queues. Approve restores the listing
// (report was unfounded); reject permanently deletes it.
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Check, X as XIcon, Phone } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as adminApi from '../../api/admin';
import { ReportedJob } from '../../api/admin';
import EmptyState from '../../components/common/EmptyState';
import Button from '../../components/common/Button';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

export default function AdminJobReportsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors: C, spacing, radius, typography, shadow } = useTheme();
  const { lang, t } = useLanguage();
  const fontRegular = lang === 'od' ? 'NotoSansOriya' : undefined;
  const fontBold = lang === 'od' ? 'NotoSansOriya-Bold' : undefined;

  const [jobs, setJobs] = useState<ReportedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actingId, setActingId] = useState<string | number | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const data = await adminApi.fetchReportedJobs();
      if (data.success) setJobs(data.jobs);
    } catch (e) {
      console.error('[ADMIN_JOB_REPORTS] Fetch failed:', e);
      Alert.alert(t('common', 'errorTitle'), t('admin', 'reportsLoadError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (id: string | number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setActingId(id);
    try {
      const data = await adminApi.approveReportedJob(id);
      if (data.success) {
        setJobs(prev => prev.filter(j => j.id !== id));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e) {
      console.error('[ADMIN_JOB_REPORTS] Approve failed:', e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common', 'errorTitle'), t('admin', 'moderationActionError'));
    } finally {
      setActingId(null);
    }
  };

  const doReject = async (id: string | number) => {
    setActingId(id);
    try {
      const data = await adminApi.rejectReportedJob(id);
      if (data.success) {
        setJobs(prev => prev.filter(j => j.id !== id));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e) {
      console.error('[ADMIN_JOB_REPORTS] Reject failed:', e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common', 'errorTitle'), t('admin', 'moderationActionError'));
    } finally {
      setActingId(null);
    }
  };

  const handleReject = (id: string | number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      t('admin', 'confirmRejectTitle'),
      t('admin', 'confirmRejectMessage'),
      [
        { text: t('common', 'cancel'), style: 'cancel' },
        { text: t('admin', 'rejectButton'), style: 'destructive', onPress: () => doReject(id) },
      ]
    );
  };

  const renderJob = useCallback(({ item }: { item: ReportedJob }) => {
    const isActing = actingId === item.id;
    return (
      <View style={{ backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.lg, ...shadow.card }}>
        <Text style={{ color: C.text, fontFamily: fontBold, ...typography.bodyEmphasis }} numberOfLines={1}>{item.title}</Text>
        <Text style={{ color: C.textMuted, fontFamily: fontRegular, marginTop: 2, ...typography.caption }} numberOfLines={1}>{item.organization}</Text>

        {!!item.contact_phone && (
          <TouchableOpacity
            onPress={() => Linking.openURL(`tel:${item.contact_phone}`).catch(() => {})}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.sm }}
          >
            <Phone size={12} color={C.primary} />
            <Text style={{ color: C.primary, ...typography.caption, fontWeight: '700' }}>{item.contact_phone}</Text>
          </TouchableOpacity>
        )}

        <View style={{ backgroundColor: C.bg, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md, marginBottom: spacing.md, gap: spacing.sm }}>
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

  const keyExtractor = useCallback((item: ReportedJob) => String(item.id), []);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.goBack(); }} style={{ padding: spacing.xs, borderRadius: radius.full, backgroundColor: C.card }}>
          <ArrowLeft size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={{ color: C.text, fontFamily: fontBold, ...typography.heading }}>{t('admin', 'jobReportsTitle')}</Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : (
        <View style={{ flex: 1, paddingHorizontal: spacing.lg }}>
          <FlashList
            data={jobs}
            keyExtractor={keyExtractor}
            renderItem={renderJob}
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
    </View>
  );
}
