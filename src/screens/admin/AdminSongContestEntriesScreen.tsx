// src/screens/admin/AdminSongContestEntriesScreen.tsx
// Moderation queue for one contest's submitted videos. Every entry needs
// an explicit approve/reject before it's visible to members (see backend
// ARCHITECTURE.md's "Song Competition" section — this mirrors the Jobs
// review-queue shape, not Announcements).
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, ScrollView, Modal, TextInput } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { FlashList } from '@shopify/flash-list';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, X, Clock, CheckCircle2, XCircle, Users } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as adminApi from '../../api/admin';
import { AdminSongContestEntry } from '../../api/admin';
import SkeletonBox from '../../components/common/SkeletonBox';
import EmptyState from '../../components/common/EmptyState';
import Button from '../../components/common/Button';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

type StatusFilter = '' | 'pending' | 'approved' | 'rejected';

function StatusBadge({ status }: { status: AdminSongContestEntry['moderation_status'] }) {
  const { colors: C, spacing, radius, typography } = useTheme();
  const { t } = useLanguage();
  const map = {
    pending: { color: C.warning, label: t('admin', 'entryStatusFilterPending'), Icon: Clock },
    approved: { color: C.success, label: t('admin', 'entryStatusFilterApproved'), Icon: CheckCircle2 },
    rejected: { color: C.error, label: t('admin', 'entryStatusFilterRejected'), Icon: XCircle },
  } as const;
  const { color, label, Icon } = map[status];
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
          <Text style={{ color: C.textMuted, marginBottom: spacing.xs, ...typography.caption }}>{t('admin', 'entryRemarkLabel')}</Text>
          <TextInput
            value={remark}
            onChangeText={setRemark}
            placeholder={t('admin', 'entryRemarkPlaceholder')}
            placeholderTextColor={C.textFaint}
            multiline
            style={{
              backgroundColor: C.bg, borderColor: C.border, borderWidth: 1, color: C.text, borderRadius: radius.md,
              paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, minHeight: 90, textAlignVertical: 'top',
              marginBottom: spacing.lg, ...typography.body,
            }}
          />
          <Button
            label={t('admin', 'rejectEntryButton')}
            variant="primary"
            loading={submitting}
            onPress={() => {
              if (!remark.trim()) {
                Alert.alert(t('common', 'errorTitle'), t('admin', 'entryRemarkRequiredError'));
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

function EntryDetailModal({ entry, onClose, onApprove, onReject, actingId }: {
  entry: AdminSongContestEntry | null; onClose: () => void;
  onApprove: (e: AdminSongContestEntry) => void; onReject: (e: AdminSongContestEntry) => void;
  actingId: string | number | null;
}) {
  const { colors: C, spacing, radius, typography } = useTheme();
  const { lang, t } = useLanguage();
  const fontBold = lang === 'od' ? 'NotoSansOriya-Bold' : undefined;
  const fontRegular = lang === 'od' ? 'NotoSansOriya' : undefined;

  if (!entry) return null;
  const isActing = actingId === entry.id;

  return (
    <Modal visible={!!entry} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: C.border }}>
          <Text style={{ color: C.text, fontFamily: fontBold, ...typography.title }}>{t('admin', 'entriesTitle')}</Text>
          <TouchableOpacity onPress={onClose}><X size={20} color={C.textMuted} /></TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
          <View style={{ width: '100%', aspectRatio: 9 / 16, maxHeight: 480, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: '#000', marginBottom: spacing.lg }}>
            <Video source={{ uri: entry.video_url }} style={{ flex: 1 }} useNativeControls resizeMode={ResizeMode.CONTAIN} />
          </View>

          <StatusBadge status={entry.moderation_status} />
          <Text style={{ color: C.text, fontFamily: fontBold, marginTop: spacing.md, ...typography.display }}>{entry.entry_name}</Text>
          <Text style={{ color: C.textMuted, marginTop: 2, ...typography.caption, textTransform: 'capitalize' }}>{entry.entry_type}</Text>

          {entry.entry_type === 'group' && !!entry.village && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.sm }}>
              <Users size={13} color={C.textFaint} />
              <Text style={{ color: C.textFaint, ...typography.caption }}>{entry.village}</Text>
            </View>
          )}
          {!!entry.participant_names && (
            <Text style={{ color: C.textMuted, fontFamily: fontRegular, marginTop: spacing.sm, ...typography.caption }}>{entry.participant_names}</Text>
          )}

          <Text style={{ color: C.textFaint, marginTop: spacing.md, ...typography.caption }}>
            {t('admin', 'jobSubmittedByPrefix')} {entry.registered_by_membership_no} · {entry.registered_by_mobile}
          </Text>

          {entry.admin_remarks ? (
            <View style={{ marginTop: spacing.lg, backgroundColor: C.warning + '15', borderRadius: radius.md, padding: spacing.md }}>
              <Text style={{ color: C.warning, ...typography.caption, fontWeight: '700', marginBottom: 2 }}>{t('matrimony', 'adminRemarkLabel')}</Text>
              <Text style={{ color: C.text, fontFamily: fontRegular, ...typography.caption }}>{entry.admin_remarks}</Text>
            </View>
          ) : null}

          {entry.moderation_status === 'pending' && (
            <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
              <Button label={t('admin', 'approveEntryButton')} variant="primary" loading={isActing} onPress={() => onApprove(entry)} />
              <Button label={t('admin', 'rejectEntryButton')} variant="secondary" loading={isActing} onPress={() => onReject(entry)} />
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function AdminSongContestEntriesScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { contestId, contestTitle } = route.params;
  const insets = useSafeAreaInsets();
  const { colors: C, spacing, radius, typography, shadow } = useTheme();
  const { lang, t } = useLanguage();
  const fontRegular = lang === 'od' ? 'NotoSansOriya' : undefined;
  const fontBold = lang === 'od' ? 'NotoSansOriya-Bold' : undefined;

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [entries, setEntries] = useState<AdminSongContestEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<AdminSongContestEntry | null>(null);
  const [actingId, setActingId] = useState<string | number | null>(null);
  const [rejectTarget, setRejectTarget] = useState<AdminSongContestEntry | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const data = await adminApi.fetchAdminContestEntries(contestId, statusFilter || undefined);
      if (data.success) setEntries(data.entries);
    } catch (e) {
      console.error('[ADMIN_SONG_CONTEST_ENTRIES] Fetch failed:', e);
      Alert.alert(t('common', 'errorTitle'), t('admin', 'entriesLoadError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [contestId, statusFilter, t]);

  useEffect(() => { load(); }, [load]);

  const removeFromView = (id: string | number) => setEntries(prev => prev.filter(e => e.id !== id));

  const doApprove = async (entry: AdminSongContestEntry) => {
    setActingId(entry.id);
    try {
      const data = await adminApi.approveContestEntry(entry.id);
      if (data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        removeFromView(entry.id);
        setSelected(null);
        Alert.alert(t('common', 'successTitle'), t('admin', 'entryApprovedSuccessMessage'));
      } else {
        throw new Error(data.message || t('admin', 'entryActionError'));
      }
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common', 'errorTitle'), e.message || t('admin', 'entryActionError'));
    } finally {
      setActingId(null);
    }
  };

  const handleApprove = (entry: AdminSongContestEntry) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      t('admin', 'confirmApproveEntryTitle'),
      t('admin', 'confirmApproveEntryMessage'),
      [
        { text: t('common', 'cancel'), style: 'cancel' },
        { text: t('admin', 'approveEntryButton'), onPress: () => doApprove(entry) },
      ]
    );
  };

  const handleReject = (entry: AdminSongContestEntry) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setRejectTarget(entry);
  };

  const submitReject = async (remark: string) => {
    if (!rejectTarget) return;
    setActingId(rejectTarget.id);
    try {
      const data = await adminApi.rejectContestEntry(rejectTarget.id, remark);
      if (data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        removeFromView(rejectTarget.id);
        setRejectTarget(null);
        setSelected(null);
        Alert.alert(t('common', 'successTitle'), t('admin', 'entryRejectedSuccessMessage'));
      } else {
        throw new Error(data.message || t('admin', 'entryActionError'));
      }
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common', 'errorTitle'), e.message || t('admin', 'entryActionError'));
    } finally {
      setActingId(null);
    }
  };

  const FILTERS: { value: StatusFilter; labelKey: string }[] = [
    { value: 'pending', labelKey: 'entryStatusFilterPending' },
    { value: 'approved', labelKey: 'entryStatusFilterApproved' },
    { value: 'rejected', labelKey: 'entryStatusFilterRejected' },
    { value: '', labelKey: 'entryStatusFilterAll' },
  ];

  const renderEntry = useCallback(({ item }: { item: AdminSongContestEntry }) => (
    <TouchableOpacity
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelected(item); }}
      style={{
        backgroundColor: C.card, borderColor: C.border, borderWidth: 1,
        borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadow.card,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Text style={{ color: C.text, fontFamily: fontBold, flex: 1, ...typography.bodyEmphasis }} numberOfLines={1}>{item.entry_name}</Text>
        <StatusBadge status={item.moderation_status} />
      </View>
      <Text style={{ color: C.textMuted, fontFamily: fontRegular, marginTop: 4, ...typography.caption }} numberOfLines={1}>
        {item.entry_type === 'group' ? `${t('songContest', 'entryTypeGroup')} · ${item.village}` : t('songContest', 'entryTypeIndividual')}
      </Text>
      <Text style={{ color: C.textFaint, marginTop: 2, ...typography.caption }}>
        {new Date(item.created_at).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  ), [C, spacing, radius, typography, shadow, fontBold, fontRegular, t]);

  const keyExtractor = useCallback((item: AdminSongContestEntry) => String(item.id), []);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.goBack(); }} style={{ padding: spacing.xs, borderRadius: radius.full, backgroundColor: C.card }}>
          <ArrowLeft size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={{ color: C.text, fontFamily: fontBold, flex: 1, ...typography.heading }} numberOfLines={1}>{contestTitle}</Text>
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
        {loading && entries.length === 0 ? (
          <View style={{ gap: spacing.md }}>
            {[1, 2, 3].map(i => (
              <View key={i} style={{ padding: spacing.lg, backgroundColor: C.card, borderRadius: radius.lg, borderWidth: 1, borderColor: C.border, gap: spacing.sm }}>
                <SkeletonBox width="50%" height={14} />
                <SkeletonBox width="30%" height={11} />
              </View>
            ))}
          </View>
        ) : (
          <FlashList
            maintainVisibleContentPosition={{ disabled: true }}
            data={entries}
            keyExtractor={keyExtractor}
            renderItem={renderEntry}
            ListEmptyComponent={
              <EmptyState emoji="🎬" title={t('admin', 'entriesEmptyTitle')} subtitle={t('admin', 'entriesEmptySubtitle')} />
            }
            contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={C.primary} colors={[C.primary]} progressBackgroundColor={C.card} />
            }
          />
        )}
      </View>

      <EntryDetailModal
        entry={selected}
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
