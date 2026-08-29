// src/screens/admin/AdminJobSubmissionsScreen.tsx
// Review queue for member-submitted job postings. Mirrors
// AdminMatrimonyApplicationsScreen's structure, simplified to two terminal
// states (approve publishes into job_postings; reject requires a remark —
// no "correction needed" state for jobs). submitter_mobile is shown so
// admin can call and verify the posting before approving.
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, ScrollView, Modal, TextInput, Linking } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, X, Clock, XCircle, Phone } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as adminApi from '../../api/admin';
import { JobSubmission } from '../../api/admin';
import SkeletonBox from '../../components/common/SkeletonBox';
import EmptyState from '../../components/common/EmptyState';
import Button from '../../components/common/Button';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

const PAGE_SIZE = 30;
type StatusFilter = '' | 'pending' | 'rejected';

function StatusBadge({ status }: { status: JobSubmission['status'] }) {
  const { colors: C, spacing, radius, typography } = useTheme();
  const { t } = useLanguage();
  const map: Record<JobSubmission['status'], { color: string; label: string; Icon: any }> = {
    pending: { color: C.warning, label: t('admin', 'submissionStatusFilterPending'), Icon: Clock },
    rejected: { color: C.error, label: t('admin', 'submissionStatusFilterRejected'), Icon: XCircle },
  };
  const { color, label, Icon } = map[status] || map.pending;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: color + '15', borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 4 }}>
      <Icon size={12} color={color} />
      <Text style={{ color, ...typography.caption, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

function RemarkModal({ visible, onClose, onSubmit, submitting }: {
  visible: boolean; onClose: () => void; onSubmit: (remark: string) => void; submitting: boolean;
}) {
  const { colors: C, spacing, radius, typography, shadow } = useTheme();
  const { t } = useLanguage();
  const [remark, setRemark] = useState('');

  useEffect(() => { if (visible) setRemark(''); }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#00000080', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: C.card, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, ...shadow.raised }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg }}>
            <Text style={{ color: C.text, ...typography.title }}>{t('admin', 'confirmRejectSubmissionTitle')}</Text>
            <TouchableOpacity onPress={onClose}><X size={20} color={C.textMuted} /></TouchableOpacity>
          </View>
          <Text style={{ color: C.textMuted, marginBottom: spacing.xs, ...typography.caption }}>{t('admin', 'jobSubmissionRemarkLabel')}</Text>
          <TextInput
            value={remark}
            onChangeText={setRemark}
            placeholder={t('admin', 'jobSubmissionRemarkPlaceholder')}
            placeholderTextColor={C.textFaint}
            multiline
            style={{
              backgroundColor: C.bg, borderColor: C.border, borderWidth: 1, color: C.text, borderRadius: radius.md,
              paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, minHeight: 90, textAlignVertical: 'top',
              marginBottom: spacing.lg, ...typography.body,
            }}
          />
          <Button
            label={t('admin', 'jobSubmissionRejectButton')}
            variant="primary"
            loading={submitting}
            onPress={() => {
              if (!remark.trim()) {
                Alert.alert(t('common', 'errorTitle'), t('admin', 'jobSubmissionRemarkRequiredError'));
                return;
              }
              onSubmit(remark.trim());
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

function SubmissionDetailModal({ submission, onClose, onApprove, onReject, actingId }: {
  submission: JobSubmission | null; onClose: () => void;
  onApprove: (s: JobSubmission) => void; onReject: (s: JobSubmission) => void;
  actingId: string | number | null;
}) {
  const { colors: C, spacing, radius, typography } = useTheme();
  const { lang, t } = useLanguage();
  const fontBold = lang === 'od' ? 'NotoSansOriya-Bold' : undefined;
  const fontRegular = lang === 'od' ? 'NotoSansOriya' : undefined;

  if (!submission) return null;
  const isActing = actingId === submission.id;

  const Row = ({ label, value }: { label: string; value?: string | number | null }) => {
    if (value === undefined || value === null || value === '') return null;
    return (
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 0.5, borderBottomColor: C.border }}>
        <Text style={{ color: C.textMuted, ...typography.body }}>{label}</Text>
        <Text style={{ color: C.text, textAlign: 'right', flex: 1, marginLeft: spacing.xl - 4, fontFamily: fontRegular, ...typography.bodyEmphasis }}>{value}</Text>
      </View>
    );
  };

  return (
    <Modal visible={!!submission} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: C.border }}>
          <Text style={{ color: C.text, fontFamily: fontBold, ...typography.title }}>{t('admin', 'jobSubmissionDetailTitle')}</Text>
          <TouchableOpacity onPress={onClose}><X size={20} color={C.textMuted} /></TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
          <StatusBadge status={submission.status} />
          <Text style={{ color: C.text, fontFamily: fontBold, marginTop: spacing.md, ...typography.display }}>{submission.title}</Text>
          <Text style={{ color: C.textMuted, fontFamily: fontRegular, marginTop: 2, ...typography.bodyEmphasis }}>{submission.organization}</Text>

          <View style={{ marginTop: spacing.lg }}>
            <Row label={t('jobs', 'categoryLabel')} value={submission.category === 'govt' ? t('jobs', 'categoryGovt') : t('jobs', 'categoryPrivate')} />
            <Row label={t('jobs', 'locationLabel')} value={submission.location} />
            <Row
              label={submission.membership_no ? t('admin', 'jobSubmittedByPrefix') : t('admin', 'jobAutoDetectedLabel')}
              value={submission.submitter_name}
            />
            <Row label={t('admin', 'jobSubmittedOnPrefix')} value={new Date(submission.submitted_at).toLocaleString()} />
          </View>

          <Text style={{ color: C.text, fontFamily: fontRegular, marginTop: spacing.lg, ...typography.body, lineHeight: 22 }}>
            {submission.description}
          </Text>

          <View style={{ backgroundColor: C.card, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.lg, gap: spacing.sm }}>
            <Text style={{ color: C.textMuted, ...typography.label }}>{t('jobs', 'howToApplyLabel')}</Text>
            <Text style={{ color: C.text, fontFamily: fontRegular, ...typography.caption }}>{submission.application_info}</Text>
          </View>

          {!!submission.submitter_mobile && (
            <TouchableOpacity
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); Linking.openURL(`tel:${submission.submitter_mobile}`).catch(() => {}); }}
              style={{
                marginTop: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                gap: spacing.sm, backgroundColor: C.primary + '15', borderWidth: 1, borderColor: C.primary + '30',
                borderRadius: radius.md, paddingVertical: spacing.md,
              }}
            >
              <Phone size={16} color={C.primary} />
              <Text style={{ color: C.primary, ...typography.bodyEmphasis }}>{t('admin', 'jobContactPhoneLabel')}: {submission.submitter_mobile}</Text>
            </TouchableOpacity>
          )}

          {submission.admin_remarks ? (
            <View style={{ marginTop: spacing.lg, backgroundColor: C.warning + '15', borderRadius: radius.md, padding: spacing.md }}>
              <Text style={{ color: C.warning, ...typography.caption, fontWeight: '700', marginBottom: 2 }}>{t('matrimony', 'adminRemarkLabel')}</Text>
              <Text style={{ color: C.text, fontFamily: fontRegular, ...typography.caption }}>{submission.admin_remarks}</Text>
            </View>
          ) : null}

          {submission.status === 'pending' && (
            <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
              <Button
                label={t('admin', 'jobSubmissionApproveButton')}
                variant="primary"
                loading={isActing}
                onPress={() => onApprove(submission)}
              />
              <Button
                label={t('admin', 'jobSubmissionRejectButton')}
                variant="secondary"
                loading={isActing}
                onPress={() => onReject(submission)}
              />
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function AdminJobSubmissionsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors: C, spacing, radius, typography, shadow } = useTheme();
  const { lang, t } = useLanguage();
  const fontRegular = lang === 'od' ? 'NotoSansOriya' : undefined;
  const fontBold = lang === 'od' ? 'NotoSansOriya-Bold' : undefined;

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [submissions, setSubmissions] = useState<JobSubmission[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<JobSubmission | null>(null);
  const [actingId, setActingId] = useState<string | number | null>(null);
  const [rejectTarget, setRejectTarget] = useState<JobSubmission | null>(null);

  const fetchSubmissions = useCallback(async (pageNum: number, replace = false) => {
    try {
      const data = await adminApi.fetchAdminJobSubmissions({
        status: statusFilter || undefined,
        page: pageNum,
        limit: PAGE_SIZE,
      });
      if (data.success) {
        setSubmissions(prev => (replace ? data.submissions : [...prev, ...data.submissions]));
        setPage(data.page);
        setTotalPages(data.totalPages ?? 1);
      }
    } catch (e) {
      console.error('[ADMIN_JOB_SUBMISSIONS] Fetch failed:', e);
      Alert.alert(t('common', 'errorTitle'), t('admin', 'jobSubmissionsLoadError'));
    }
  }, [statusFilter, t]);

  useEffect(() => {
    setLoading(true);
    fetchSubmissions(1, true).finally(() => setLoading(false));
  }, [fetchSubmissions]);

  const onRefresh = () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    fetchSubmissions(1, true).finally(() => setRefreshing(false));
  };

  const onEndReached = () => {
    if (loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    fetchSubmissions(page + 1).finally(() => setLoadingMore(false));
  };

  const removeFromView = (id: string | number) => {
    setSubmissions(prev => prev.filter(s => s.id !== id));
  };

  const doApprove = async (submission: JobSubmission) => {
    setActingId(submission.id);
    try {
      const data = await adminApi.approveJobSubmission(submission.id);
      if (data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        removeFromView(submission.id);
        setSelected(null);
        Alert.alert(t('common', 'successTitle'), t('admin', 'jobSubmissionApprovedSuccessMessage'));
      } else {
        throw new Error(t('admin', 'jobSubmissionActionError'));
      }
    } catch (e: any) {
      console.error('[ADMIN_JOB_SUBMISSIONS] Approve failed:', e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common', 'errorTitle'), e.message || t('admin', 'jobSubmissionActionError'));
    } finally {
      setActingId(null);
    }
  };

  const handleApprove = (submission: JobSubmission) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      t('admin', 'confirmApproveJobTitle'),
      t('admin', 'confirmApproveJobMessage'),
      [
        { text: t('common', 'cancel'), style: 'cancel' },
        { text: t('admin', 'jobSubmissionApproveButton'), onPress: () => doApprove(submission) },
      ]
    );
  };

  const handleReject = (submission: JobSubmission) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setRejectTarget(submission);
  };

  const submitReject = async (remark: string) => {
    if (!rejectTarget) return;
    setActingId(rejectTarget.id);
    try {
      const data = await adminApi.rejectJobSubmission(rejectTarget.id, remark);
      if (data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        removeFromView(rejectTarget.id);
        setRejectTarget(null);
        setSelected(null);
        Alert.alert(t('common', 'successTitle'), t('admin', 'jobSubmissionRejectedSuccessMessage'));
      } else {
        throw new Error(t('admin', 'jobSubmissionActionError'));
      }
    } catch (e: any) {
      console.error('[ADMIN_JOB_SUBMISSIONS] Reject failed:', e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common', 'errorTitle'), e.message || t('admin', 'jobSubmissionActionError'));
    } finally {
      setActingId(null);
    }
  };

  const FILTERS: { value: StatusFilter; labelKey: string }[] = [
    { value: 'pending', labelKey: 'submissionStatusFilterPending' },
    { value: 'rejected', labelKey: 'submissionStatusFilterRejected' },
    { value: '', labelKey: 'submissionStatusFilterAll' },
  ];

  const renderSubmission = useCallback(({ item }: { item: JobSubmission }) => (
    <TouchableOpacity
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelected(item); }}
      style={{
        backgroundColor: C.card, borderColor: C.border, borderWidth: 1,
        borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadow.card,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Text style={{ color: C.text, fontFamily: fontBold, flex: 1, ...typography.bodyEmphasis }} numberOfLines={1}>{item.title}</Text>
        <StatusBadge status={item.status} />
      </View>
      <Text style={{ color: C.textMuted, fontFamily: fontRegular, marginTop: 4, ...typography.caption }} numberOfLines={1}>
        {item.organization} · {item.membership_no ? `${t('admin', 'jobSubmittedByPrefix')} ${item.submitter_name || '—'}` : t('admin', 'jobAutoDetectedLabel')}
      </Text>
      <Text style={{ color: C.textFaint, marginTop: 2, ...typography.caption }}>
        {new Date(item.submitted_at).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  ), [C, spacing, radius, typography, shadow, fontBold, fontRegular, t]);

  const keyExtractor = useCallback((item: JobSubmission) => String(item.id), []);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.goBack(); }} style={{ padding: spacing.xs, borderRadius: radius.full, backgroundColor: C.card }}>
          <ArrowLeft size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={{ color: C.text, fontFamily: fontBold, flex: 1, ...typography.heading }}>{t('admin', 'jobSubmissionsTitle')}</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.sm, paddingBottom: spacing.md, alignItems: 'center' }}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.value || 'all'}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setStatusFilter(f.value); }}
            style={{
              paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full,
              backgroundColor: statusFilter === f.value ? C.primary : C.card,
              borderWidth: 1, borderColor: statusFilter === f.value ? C.primary : C.border,
            }}
          >
            <Text style={{ color: statusFilter === f.value ? 'white' : C.textMuted, ...typography.caption, fontWeight: '700' }}>
              {t('admin', f.labelKey)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={{ flex: 1, paddingHorizontal: spacing.lg }}>
        {loading && submissions.length === 0 ? (
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
            data={submissions}
            keyExtractor={keyExtractor}
            renderItem={renderSubmission}
            ListEmptyComponent={
              <EmptyState emoji="📄" title={t('admin', 'jobSubmissionsEmptyTitle')} subtitle={t('admin', 'jobSubmissionsEmptySubtitle')} />
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

      <SubmissionDetailModal
        submission={selected}
        onClose={() => setSelected(null)}
        onApprove={handleApprove}
        onReject={handleReject}
        actingId={actingId}
      />
      <RemarkModal
        visible={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        onSubmit={submitReject}
        submitting={actingId === rejectTarget?.id}
      />
    </View>
  );
}
