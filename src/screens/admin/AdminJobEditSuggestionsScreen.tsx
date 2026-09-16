// src/screens/admin/AdminJobEditSuggestionsScreen.tsx
// Review queue for member-suggested corrections to already-published job
// postings (see backend routes/jobs.ts's POST /jobs/:id/edit-suggestions).
// Only fields the member actually proposed a change for are shown, each
// as a current-value -> suggested-value row. Approve applies every
// proposed field to the live posting immediately; reject just discards
// the suggestion. An admin editing the posting directly via
// AdminJobsScreen's own edit form is a separate path, untouched by this
// queue — see backend ARCHITECTURE.md's "Jobs shape" note.
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as adminApi from '../../api/admin';
import { JobEditSuggestion } from '../../api/admin';
import SkeletonBox from '../../components/common/SkeletonBox';
import EmptyState from '../../components/common/EmptyState';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { jobSectorLabel } from '../../data/jobSectors';

const PAGE_SIZE = 30;

const DIFF_FIELDS: { key: keyof JobEditSuggestion; labelKey: string }[] = [
  { key: 'title', labelKey: 'jobTitleLabel' },
  { key: 'organization', labelKey: 'organizationLabel' },
  { key: 'sector', labelKey: 'sectorLabel' },
  { key: 'no_of_vacancies', labelKey: 'noOfVacanciesLabel' },
  { key: 'registration_start_date', labelKey: 'registrationStartLabel' },
  { key: 'last_date', labelKey: 'lastDateLabel' },
  { key: 'application_fee', labelKey: 'applicationFeeLabel' },
  { key: 'location', labelKey: 'locationDetailLabel' },
  { key: 'application_info', labelKey: 'howToApplyLabel' },
  { key: 'eligibility', labelKey: 'eligibilityLabel' },
  { key: 'description', labelKey: 'descriptionLabel' },
];

export default function AdminJobEditSuggestionsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors: C, spacing, radius, typography, shadow } = useTheme();
  const { lang, t } = useLanguage();
  const fontBold = lang === 'od' ? 'NotoSansOriya-Bold' : undefined;
  const fontRegular = lang === 'od' ? 'NotoSansOriya' : undefined;

  const [suggestions, setSuggestions] = useState<JobEditSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actingId, setActingId] = useState<string | number | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const data = await adminApi.fetchJobEditSuggestions({ status: 'pending', limit: PAGE_SIZE });
      if (data.success) setSuggestions(data.suggestions);
    } catch (e) {
      console.error('[ADMIN_JOB_EDIT_SUGGESTIONS] Fetch failed:', e);
      Alert.alert(t('common', 'errorTitle'), t('admin', 'jobEditSuggestionsLoadError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  const removeFromView = (id: string | number) => setSuggestions(prev => prev.filter(s => s.id !== id));

  const doApprove = async (s: JobEditSuggestion) => {
    setActingId(s.id);
    try {
      const data = await adminApi.approveJobEditSuggestion(s.id);
      if (data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        removeFromView(s.id);
      } else {
        throw new Error(t('admin', 'jobEditSuggestionActionError'));
      }
    } catch (e: any) {
      console.error('[ADMIN_JOB_EDIT_SUGGESTIONS] Approve failed:', e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common', 'errorTitle'), e.message || t('admin', 'jobEditSuggestionActionError'));
    } finally {
      setActingId(null);
    }
  };

  const handleApprove = (s: JobEditSuggestion) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      t('admin', 'confirmApproveJobEditTitle'),
      t('admin', 'confirmApproveJobEditMessage'),
      [
        { text: t('common', 'cancel'), style: 'cancel' },
        { text: t('admin', 'jobSubmissionApproveButton'), onPress: () => doApprove(s) },
      ]
    );
  };

  const handleReject = (s: JobEditSuggestion) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      t('admin', 'confirmRejectJobEditTitle'),
      s.note,
      [
        { text: t('common', 'cancel'), style: 'cancel' },
        {
          text: t('common', 'reject'),
          style: 'destructive',
          onPress: async () => {
            setActingId(s.id);
            try {
              const data = await adminApi.rejectJobEditSuggestion(s.id);
              if (data.success) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                removeFromView(s.id);
              }
            } catch (e) {
              console.error('[ADMIN_JOB_EDIT_SUGGESTIONS] Reject failed:', e);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert(t('common', 'errorTitle'), t('admin', 'jobEditSuggestionActionError'));
            } finally {
              setActingId(null);
            }
          },
        },
      ]
    );
  };

  const formatValue = (key: keyof JobEditSuggestion, value: any) => {
    if (key === 'sector') return jobSectorLabel(value, lang);
    return String(value);
  };

  const renderItem = useCallback(({ item }: { item: JobEditSuggestion }) => {
    const changedFields = DIFF_FIELDS.filter(f => item[f.key] !== null && item[f.key] !== undefined);
    return (
      <View style={{ backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadow.card }}>
        <Text style={{ color: C.text, fontFamily: fontBold, ...typography.bodyEmphasis }} numberOfLines={1}>{item.current_title}</Text>
        <Text style={{ color: C.textMuted, fontFamily: fontRegular, marginTop: 2, ...typography.caption }} numberOfLines={1}>
          {item.current_organization} · {t('admin', 'jobSubmittedByPrefix')} {item.suggester_name || item.suggested_by}
        </Text>

        <View style={{ backgroundColor: C.bg, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md }}>
          <Text style={{ color: C.textMuted, ...typography.caption, fontWeight: '700' }}>{t('admin', 'jobEditNoteLabel')}</Text>
          <Text style={{ color: C.text, fontFamily: fontRegular, marginTop: 2, ...typography.caption }}>{item.note}</Text>
        </View>

        {changedFields.length > 0 && (
          <View style={{ marginTop: spacing.md }}>
            {changedFields.map(f => (
              <View key={String(f.key)} style={{ marginBottom: spacing.sm }}>
                <Text style={{ color: C.textFaint, ...typography.caption, fontWeight: '700' }}>{t('jobs', f.labelKey)}</Text>
                <Text style={{ color: C.text, fontFamily: fontRegular, ...typography.caption }} numberOfLines={3}>
                  {formatValue(f.key, item[f.key])}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
          <TouchableOpacity
            onPress={() => handleReject(item)}
            disabled={actingId === item.id}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.error, borderRadius: radius.md, paddingVertical: spacing.sm }}
          >
            <Text style={{ color: C.error, ...typography.caption, fontWeight: '700' }}>{t('common', 'reject')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleApprove(item)}
            disabled={actingId === item.id}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.primary, borderRadius: radius.md, paddingVertical: spacing.sm }}
          >
            {actingId === item.id ? <ActivityIndicator size="small" color="#fff" /> : (
              <Text style={{ color: '#fff', ...typography.caption, fontWeight: '700' }}>{t('admin', 'jobSubmissionApproveButton')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [C, spacing, radius, typography, shadow, fontBold, fontRegular, t, lang, actingId]);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.goBack(); }} style={{ padding: spacing.xs, borderRadius: radius.full, backgroundColor: C.card }}>
          <ArrowLeft size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={{ color: C.text, fontFamily: fontBold, flex: 1, ...typography.heading }}>{t('admin', 'jobEditSuggestionsTitle')}</Text>
      </View>

      {loading ? (
        <View style={{ paddingHorizontal: spacing.lg }}>
          {[1, 2, 3].map(i => <SkeletonBox key={i} height={160} style={{ marginBottom: spacing.md, borderRadius: radius.lg }} />)}
        </View>
      ) : (
        <FlatList
          data={suggestions}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + spacing.xl, flexGrow: 1 }}
          ListEmptyComponent={<EmptyState emoji="✏️" title={t('admin', 'jobEditSuggestionsEmptyTitle')} subtitle={t('admin', 'jobEditSuggestionsEmptySubtitle')} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={C.primary} colors={[C.primary]} progressBackgroundColor={C.card} />}
        />
      )}
    </View>
  );
}
