// src/screens/admin/AdminMatrimonyApplicationsScreen.tsx
// Review queue for member-submitted matrimony applications (the redesigned
// document-upload-and-review flow). Defaults to the Pending filter since
// that's the actionable queue; admin can switch to see every status.
// Tapping a row opens a detail sheet with the uploaded form + Approve /
// Request Correction / Reject actions (the latter two require a remark).
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, ScrollView, Modal, TextInput, Linking } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, FileText, X, Clock, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as adminApi from '../../api/admin';
import { MatrimonyApplication } from '../../api/admin';
import SkeletonBox from '../../components/common/SkeletonBox';
import EmptyState from '../../components/common/EmptyState';
import Button from '../../components/common/Button';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

const PAGE_SIZE = 30;
type StatusFilter = '' | 'pending' | 'correction_needed' | 'approved' | 'rejected';

function StatusBadge({ status }: { status: MatrimonyApplication['status'] }) {
  const { colors: C, spacing, radius, typography } = useTheme();
  const { t } = useLanguage();
  const map: Record<MatrimonyApplication['status'], { color: string; label: string; Icon: any }> = {
    pending: { color: C.warning, label: t('admin', 'applicationStatusFilterPending'), Icon: Clock },
    correction_needed: { color: C.warning, label: t('admin', 'applicationStatusFilterCorrection'), Icon: AlertTriangle },
    approved: { color: C.success, label: t('admin', 'applicationStatusFilterApproved'), Icon: CheckCircle2 },
    rejected: { color: C.error, label: t('admin', 'applicationStatusFilterRejected'), Icon: XCircle },
  };
  const { color, label, Icon } = map[status] || map.pending;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: color + '15', borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 4 }}>
      <Icon size={12} color={color} />
      <Text style={{ color, ...typography.caption, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

// Bottom-sheet remark prompt, used for both "Request Correction" and "Reject".
function RemarkModal({ visible, title, onClose, onSubmit, submitLabel, submitting }: {
  visible: boolean; title: string; onClose: () => void; onSubmit: (remark: string) => void;
  submitLabel: string; submitting: boolean;
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
            <Text style={{ color: C.text, ...typography.title }}>{title}</Text>
            <TouchableOpacity onPress={onClose}><X size={20} color={C.textMuted} /></TouchableOpacity>
          </View>
          <Text style={{ color: C.textMuted, marginBottom: spacing.xs, ...typography.caption }}>{t('admin', 'applicationRemarkLabel')}</Text>
          <TextInput
            value={remark}
            onChangeText={setRemark}
            placeholder={t('admin', 'applicationRemarkPlaceholder')}
            placeholderTextColor={C.textFaint}
            multiline
            style={{
              backgroundColor: C.bg, borderColor: C.border, borderWidth: 1, color: C.text, borderRadius: radius.md,
              paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, minHeight: 90, textAlignVertical: 'top',
              marginBottom: spacing.lg, ...typography.body,
            }}
          />
          <Button
            label={submitLabel}
            variant="primary"
            loading={submitting}
            onPress={() => {
              if (!remark.trim()) {
                Alert.alert(t('common', 'errorTitle'), t('admin', 'applicationRemarkRequiredError'));
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

function ApplicationDetailModal({ application, onClose, onApprove, onRequestCorrection, onReject, actingId }: {
  application: MatrimonyApplication | null; onClose: () => void;
  onApprove: (a: MatrimonyApplication) => void;
  onRequestCorrection: (a: MatrimonyApplication) => void;
  onReject: (a: MatrimonyApplication) => void;
  actingId: string | number | null;
}) {
  const { colors: C, spacing, radius, typography } = useTheme();
  const { lang, t } = useLanguage();
  const fontBold = lang === 'od' ? 'NotoSansOriya-Bold' : undefined;
  const fontRegular = lang === 'od' ? 'NotoSansOriya' : undefined;

  if (!application) return null;
  const isActing = actingId === application.id;
  const isPending = application.status === 'pending';

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
    <Modal visible={!!application} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: C.border }}>
          <Text style={{ color: C.text, fontFamily: fontBold, ...typography.title }}>{t('admin', 'applicationDetailTitle')}</Text>
          <TouchableOpacity onPress={onClose}><X size={20} color={C.textMuted} /></TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
          <StatusBadge status={application.status} />
          <Text style={{ color: C.text, fontFamily: fontBold, marginTop: spacing.md, ...typography.display }}>{application.member_name}</Text>

          <View style={{ marginTop: spacing.lg }}>
            <Row label={t('admin', 'applicationRelationLabel')} value={application.relation_to_hof} />
            <Row label={t('admin', 'applicationSubmittedByPrefix')} value={application.uploaded_by_name} />
            <Row label={t('admin', 'matrimonyPhoneLabel')} value={application.uploaded_by_mobile || application.member_mobile} />
            <Row label={t('admin', 'applicationSubmittedOnPrefix')} value={new Date(application.submitted_at).toLocaleString()} />
          </View>

          {application.admin_remarks ? (
            <View style={{ marginTop: spacing.lg, backgroundColor: C.warning + '15', borderRadius: radius.md, padding: spacing.md }}>
              <Text style={{ color: C.warning, ...typography.caption, fontWeight: '700', marginBottom: 2 }}>{t('matrimony', 'adminRemarkLabel')}</Text>
              <Text style={{ color: C.text, fontFamily: fontRegular, ...typography.caption }}>{application.admin_remarks}</Text>
            </View>
          ) : null}

          {application.uploaded_file_url ? (
            <TouchableOpacity
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); Linking.openURL(application.uploaded_file_url).catch(() => {}); }}
              style={{
                marginTop: spacing.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                gap: spacing.sm, backgroundColor: C.primary + '15', borderWidth: 1, borderColor: C.primary + '30',
                borderRadius: radius.md, paddingVertical: spacing.md,
              }}
            >
              <FileText size={18} color={C.primary} />
              <Text style={{ color: C.primary, ...typography.bodyEmphasis }}>{t('admin', 'applicationViewFormButton')}</Text>
            </TouchableOpacity>
          ) : null}

          {(isPending || application.status === 'correction_needed') && (
            <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
              <Button
                label={t('admin', 'applicationApproveButton')}
                variant="primary"
                loading={isActing}
                onPress={() => onApprove(application)}
              />
              <Button
                label={t('admin', 'applicationRequestCorrectionButton')}
                variant="secondary"
                loading={isActing}
                onPress={() => onRequestCorrection(application)}
              />
              <Button
                label={t('admin', 'applicationRejectButton')}
                variant="secondary"
                loading={isActing}
                onPress={() => onReject(application)}
              />
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function AdminMatrimonyApplicationsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors: C, spacing, radius, typography, shadow } = useTheme();
  const { lang, t } = useLanguage();
  const fontRegular = lang === 'od' ? 'NotoSansOriya' : undefined;
  const fontBold = lang === 'od' ? 'NotoSansOriya-Bold' : undefined;

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [applications, setApplications] = useState<MatrimonyApplication[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<MatrimonyApplication | null>(null);
  const [actingId, setActingId] = useState<string | number | null>(null);
  const [correctionTarget, setCorrectionTarget] = useState<MatrimonyApplication | null>(null);
  const [rejectTarget, setRejectTarget] = useState<MatrimonyApplication | null>(null);

  const fetchApplications = useCallback(async (pageNum: number, replace = false) => {
    try {
      const data = await adminApi.fetchAdminMatrimonyApplications({
        status: statusFilter || undefined,
        page: pageNum,
        limit: PAGE_SIZE,
      });
      if (data.success) {
        setApplications(prev => (replace ? data.applications : [...prev, ...data.applications]));
        setPage(data.page);
        setTotalPages(data.totalPages ?? 1);
      }
    } catch (e) {
      console.error('[ADMIN_MATRIMONY_APPLICATIONS] Fetch failed:', e);
      Alert.alert(t('common', 'errorTitle'), t('admin', 'applicationsLoadError'));
    }
  }, [statusFilter, t]);

  useEffect(() => {
    setLoading(true);
    fetchApplications(1, true).finally(() => setLoading(false));
  }, [fetchApplications]);

  const onRefresh = () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    fetchApplications(1, true).finally(() => setRefreshing(false));
  };

  const onEndReached = () => {
    if (loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    fetchApplications(page + 1).finally(() => setLoadingMore(false));
  };

  const replaceOrRemove = (id: string | number, updated: MatrimonyApplication | null) => {
    setApplications(prev => {
      if (!updated) return prev.filter(a => a.id !== id);
      // If the current filter no longer matches the new status, drop it from view.
      if (statusFilter && updated.status !== statusFilter) return prev.filter(a => a.id !== id);
      return prev.map(a => (a.id === id ? updated : a));
    });
  };

  const doApprove = async (application: MatrimonyApplication) => {
    setActingId(application.id);
    try {
      const data = await adminApi.approveMatrimonyApplication(application.id);
      if (data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        replaceOrRemove(application.id, data.application);
        setSelected(null);
        Alert.alert(t('common', 'successTitle'), t('admin', 'applicationApprovedSuccessMessage'));
      } else {
        throw new Error(data.message || t('admin', 'applicationActionError'));
      }
    } catch (e: any) {
      console.error('[ADMIN_MATRIMONY_APPLICATIONS] Approve failed:', e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common', 'errorTitle'), e.message || t('admin', 'applicationActionError'));
    } finally {
      setActingId(null);
    }
  };

  const handleApprove = (application: MatrimonyApplication) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      t('admin', 'confirmApproveApplicationTitle'),
      t('admin', 'confirmApproveApplicationMessage'),
      [
        { text: t('common', 'cancel'), style: 'cancel' },
        { text: t('admin', 'applicationApproveButton'), onPress: () => doApprove(application) },
      ]
    );
  };

  const handleRequestCorrection = (application: MatrimonyApplication) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCorrectionTarget(application);
  };

  const submitCorrection = async (remark: string) => {
    if (!correctionTarget) return;
    setActingId(correctionTarget.id);
    try {
      const data = await adminApi.requestMatrimonyCorrection(correctionTarget.id, remark);
      if (data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        replaceOrRemove(correctionTarget.id, data.application);
        setCorrectionTarget(null);
        setSelected(null);
        Alert.alert(t('common', 'successTitle'), t('admin', 'applicationCorrectionRequestedSuccessMessage'));
      } else {
        throw new Error(data.message || t('admin', 'applicationActionError'));
      }
    } catch (e: any) {
      console.error('[ADMIN_MATRIMONY_APPLICATIONS] Request correction failed:', e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common', 'errorTitle'), e.message || t('admin', 'applicationActionError'));
    } finally {
      setActingId(null);
    }
  };

  const handleReject = (application: MatrimonyApplication) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setRejectTarget(application);
  };

  const submitReject = async (remark: string) => {
    if (!rejectTarget) return;
    setActingId(rejectTarget.id);
    try {
      const data = await adminApi.rejectMatrimonyApplication(rejectTarget.id, remark);
      if (data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        replaceOrRemove(rejectTarget.id, data.application);
        setRejectTarget(null);
        setSelected(null);
        Alert.alert(t('common', 'successTitle'), t('admin', 'applicationRejectedSuccessMessage'));
      } else {
        throw new Error(data.message || t('admin', 'applicationActionError'));
      }
    } catch (e: any) {
      console.error('[ADMIN_MATRIMONY_APPLICATIONS] Reject failed:', e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common', 'errorTitle'), e.message || t('admin', 'applicationActionError'));
    } finally {
      setActingId(null);
    }
  };

  const FILTERS: { value: StatusFilter; labelKey: string }[] = [
    { value: 'pending', labelKey: 'applicationStatusFilterPending' },
    { value: 'correction_needed', labelKey: 'applicationStatusFilterCorrection' },
    { value: 'approved', labelKey: 'applicationStatusFilterApproved' },
    { value: 'rejected', labelKey: 'applicationStatusFilterRejected' },
    { value: '', labelKey: 'applicationStatusFilterAll' },
  ];

  const renderApplication = useCallback(({ item }: { item: MatrimonyApplication }) => (
    <TouchableOpacity
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelected(item); }}
      style={{
        backgroundColor: C.card, borderColor: C.border, borderWidth: 1,
        borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadow.card,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Text style={{ color: C.text, fontFamily: fontBold, flex: 1, ...typography.bodyEmphasis }} numberOfLines={1}>{item.member_name}</Text>
        <StatusBadge status={item.status} />
      </View>
      <Text style={{ color: C.textMuted, fontFamily: fontRegular, marginTop: 4, ...typography.caption }} numberOfLines={1}>
        {t('admin', 'applicationSubmittedByPrefix')} {item.uploaded_by_name || '—'}
      </Text>
      <Text style={{ color: C.textFaint, marginTop: 2, ...typography.caption }}>
        {t('admin', 'applicationSubmittedOnPrefix')} {new Date(item.submitted_at).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  ), [C, spacing, radius, typography, shadow, fontBold, fontRegular, t]);

  const keyExtractor = useCallback((item: MatrimonyApplication) => String(item.id), []);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.goBack(); }} style={{ padding: spacing.xs, borderRadius: radius.full, backgroundColor: C.card }}>
          <ArrowLeft size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={{ color: C.text, fontFamily: fontBold, flex: 1, ...typography.heading }}>{t('admin', 'applicationsTitle')}</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.sm, paddingBottom: spacing.md, alignItems: 'center' }}>
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
        {loading && applications.length === 0 ? (
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
            maintainVisibleContentPosition={{ disabled: true }}
            data={applications}
            keyExtractor={keyExtractor}
            renderItem={renderApplication}
            ListEmptyComponent={
              <EmptyState emoji="📄" title={t('admin', 'applicationsEmptyTitle')} subtitle={t('admin', 'applicationsEmptySubtitle')} />
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

      <ApplicationDetailModal
        application={selected}
        onClose={() => setSelected(null)}
        onApprove={handleApprove}
        onRequestCorrection={handleRequestCorrection}
        onReject={handleReject}
        actingId={actingId}
      />
      <RemarkModal
        visible={!!correctionTarget}
        title={t('admin', 'confirmRequestCorrectionTitle')}
        onClose={() => setCorrectionTarget(null)}
        onSubmit={submitCorrection}
        submitLabel={t('admin', 'applicationRequestCorrectionButton')}
        submitting={actingId === correctionTarget?.id}
      />
      <RemarkModal
        visible={!!rejectTarget}
        title={t('admin', 'confirmRejectApplicationTitle')}
        onClose={() => setRejectTarget(null)}
        onSubmit={submitReject}
        submitLabel={t('admin', 'applicationRejectButton')}
        submitting={actingId === rejectTarget?.id}
      />
    </View>
  );
}
