// src/screens/admin/AdminSongContestsScreen.tsx
// Song Competition — create a contest (starts as a draft, invisible to
// members), start it (makes it visible + notifies everyone), close entries
// once done, and jump into moderating its submitted videos.
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl, Alert,
  Modal, TextInput, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Plus, Trash2, Edit2, X as XIcon, ListChecks, Play, Square } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as adminApi from '../../api/admin';
import { AdminSongContest } from '../../api/admin';
import EmptyState from '../../components/common/EmptyState';
import Button from '../../components/common/Button';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

const STATUS_COLOR_KEY: Record<AdminSongContest['status'], 'textMuted' | 'success' | 'warning'> = {
  draft: 'textMuted', active: 'success', closed: 'warning',
};

export default function AdminSongContestsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors: C, spacing, radius, typography, shadow } = useTheme();
  const { lang, t } = useLanguage();
  const fontRegular = lang === 'od' ? 'NotoSansOriya' : undefined;
  const fontBold = lang === 'od' ? 'NotoSansOriya-Bold' : undefined;

  const [contests, setContests] = useState<AdminSongContest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [actingId, setActingId] = useState<string | number | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AdminSongContest | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [rules, setRules] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setLoadError(false);
    try {
      const data = await adminApi.fetchAdminSongContests();
      if (data.success) setContests(data.contests);
    } catch (e) {
      console.error('[ADMIN_SONG_CONTESTS] Fetch failed:', e);
      setLoadError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => { setEditing(null); setTitle(''); setDescription(''); setRules(''); };

  const openCreate = () => {
    resetForm();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowForm(true);
  };

  const openEdit = (item: AdminSongContest) => {
    setEditing(item);
    setTitle(item.title);
    setDescription(item.description || '');
    setRules(item.rules || '');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert(t('common', 'errorTitle'), t('admin', 'contestTitleRequiredError'));
      return;
    }
    setSaving(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        rules: rules.trim() || undefined,
      };
      const data = editing
        ? await adminApi.updateSongContest(editing.id, payload)
        : await adminApi.createSongContest(payload);
      if (data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setShowForm(false);
        resetForm();
        load();
      } else {
        throw new Error(t('admin', 'contestSaveError'));
      }
    } catch (e: any) {
      console.error('[ADMIN_SONG_CONTESTS] Save failed:', e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common', 'errorTitle'), e.message || t('admin', 'contestSaveError'));
    } finally {
      setSaving(false);
    }
  };

  const doStart = async (item: AdminSongContest) => {
    setActingId(item.id);
    try {
      const data = await adminApi.startSongContest(item.id);
      if (data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        load();
      } else {
        throw new Error(data.message || t('admin', 'contestStartError'));
      }
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common', 'errorTitle'), e.message || t('admin', 'contestStartError'));
    } finally {
      setActingId(null);
    }
  };

  const handleStart = (item: AdminSongContest) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      t('admin', 'confirmStartContestTitle'),
      t('admin', 'confirmStartContestMessage'),
      [
        { text: t('common', 'cancel'), style: 'cancel' },
        { text: t('admin', 'startContestButton'), onPress: () => doStart(item) },
      ]
    );
  };

  const doClose = async (item: AdminSongContest) => {
    setActingId(item.id);
    try {
      const data = await adminApi.closeSongContest(item.id);
      if (data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        load();
      } else {
        throw new Error(data.message || t('admin', 'contestCloseError'));
      }
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common', 'errorTitle'), e.message || t('admin', 'contestCloseError'));
    } finally {
      setActingId(null);
    }
  };

  const handleClose = (item: AdminSongContest) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      t('admin', 'confirmCloseContestTitle'),
      t('admin', 'confirmCloseContestMessage'),
      [
        { text: t('common', 'cancel'), style: 'cancel' },
        { text: t('admin', 'closeContestButton'), onPress: () => doClose(item) },
      ]
    );
  };

  const doRemove = async (id: string | number) => {
    setActingId(id);
    try {
      const data = await adminApi.deleteSongContest(id);
      if (data.success) {
        setContests(prev => prev.filter(c => c.id !== id));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        throw new Error(t('admin', 'contestDeleteError'));
      }
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common', 'errorTitle'), e.message || t('admin', 'contestDeleteError'));
    } finally {
      setActingId(null);
    }
  };

  const handleRemove = (item: AdminSongContest) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      t('admin', 'confirmDeleteContestTitle'),
      t('admin', 'confirmDeleteContestMessage'),
      [
        { text: t('common', 'cancel'), style: 'cancel' },
        { text: t('common', 'delete'), style: 'destructive', onPress: () => doRemove(item.id) },
      ]
    );
  };

  const statusLabel = (status: AdminSongContest['status']) =>
    status === 'active' ? t('admin', 'contestStatusActive') : status === 'closed' ? t('admin', 'contestStatusClosed') : t('admin', 'contestStatusDraft');

  const renderItem = useCallback(({ item }: { item: AdminSongContest }) => {
    const statusColor = C[STATUS_COLOR_KEY[item.status]];
    return (
      <View style={{ backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadow.card }}>
        <Text style={{ alignSelf: 'flex-start', color: statusColor, backgroundColor: statusColor + '15', borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 3, ...typography.caption, fontWeight: '700' }}>
          {statusLabel(item.status)}
        </Text>
        <Text style={{ color: C.text, fontFamily: fontBold, marginTop: spacing.xs, ...typography.bodyEmphasis }}>{item.title}</Text>

        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, flexWrap: 'wrap' }}>
          <TouchableOpacity
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.navigate('AdminSongContestEntries', { contestId: item.id, contestTitle: item.title }); }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderWidth: 1, borderColor: C.primary, borderRadius: radius.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.md }}
          >
            <ListChecks size={14} color={C.primary} />
            <Text style={{ color: C.primary, ...typography.caption, fontWeight: '700' }}>{t('admin', 'manageEntriesButton')}</Text>
          </TouchableOpacity>

          {item.status === 'draft' && (
            <>
              <TouchableOpacity
                onPress={() => openEdit(item)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderWidth: 1, borderColor: C.border, borderRadius: radius.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.md }}
              >
                <Edit2 size={14} color={C.text} />
                <Text style={{ color: C.text, ...typography.caption, fontWeight: '700' }}>{t('admin', 'editButton')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleStart(item)}
                disabled={actingId === item.id}
                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: C.success + '15', borderRadius: radius.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.md }}
              >
                {actingId === item.id ? <ActivityIndicator size="small" color={C.success} /> : <Play size={14} color={C.success} />}
                <Text style={{ color: C.success, ...typography.caption, fontWeight: '700' }}>{t('admin', 'startContestButton')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleRemove(item)}
                disabled={actingId === item.id}
                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: C.error + '15', borderRadius: radius.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.md }}
              >
                <Trash2 size={14} color={C.error} />
                <Text style={{ color: C.error, ...typography.caption, fontWeight: '700' }}>{t('common', 'delete')}</Text>
              </TouchableOpacity>
            </>
          )}

          {item.status === 'active' && (
            <TouchableOpacity
              onPress={() => handleClose(item)}
              disabled={actingId === item.id}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: C.warning + '15', borderRadius: radius.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.md }}
            >
              {actingId === item.id ? <ActivityIndicator size="small" color={C.warning} /> : <Square size={14} color={C.warning} />}
              <Text style={{ color: C.warning, ...typography.caption, fontWeight: '700' }}>{t('admin', 'closeContestButton')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }, [C, spacing, radius, typography, shadow, fontBold, t, actingId, navigation]);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.goBack(); }} style={{ padding: spacing.xs, borderRadius: radius.full, backgroundColor: C.card }}>
          <ArrowLeft size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={{ color: C.text, fontFamily: fontBold, flex: 1, ...typography.heading }}>{t('admin', 'songContestsTitle')}</Text>
        <TouchableOpacity
          onPress={openCreate}
          style={{ width: 36, height: 36, borderRadius: radius.full, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' }}
        >
          <Plus size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : loadError ? (
        <EmptyState emoji="⚠️" title={t('common', 'error')} subtitle={t('admin', 'songContestsLoadError')} />
      ) : (
        <FlatList
          data={contests}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + spacing.xl, flexGrow: 1 }}
          ListEmptyComponent={<EmptyState emoji="🎤" title={t('admin', 'songContestsEmptyTitle')} subtitle={t('admin', 'songContestsEmptySubtitle')} />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={C.primary} colors={[C.primary]} progressBackgroundColor={C.card} />
          }
        />
      )}

      <Modal visible={showForm} animationType="slide" transparent onRequestClose={() => setShowForm(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <View style={{ backgroundColor: C.bg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xl, paddingBottom: insets.bottom + spacing.xl, maxHeight: '88%' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg }}>
              <Text style={{ color: C.text, fontFamily: fontBold, ...typography.title }}>
                {editing ? t('admin', 'editContestTitle') : t('admin', 'newContestTitle')}
              </Text>
              <TouchableOpacity onPress={() => { setShowForm(false); resetForm(); }}>
                <XIcon size={22} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={{ color: C.textMuted, marginBottom: spacing.sm, ...typography.label }}>{t('admin', 'contestTitleLabel')}</Text>
              <TextInput
                style={{ borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, marginBottom: spacing.lg, backgroundColor: C.card, borderColor: C.border, color: C.text, fontFamily: fontRegular, ...typography.body }}
                placeholder={t('admin', 'contestTitlePlaceholder')}
                placeholderTextColor={C.textFaint}
                value={title}
                onChangeText={setTitle}
              />

              <Text style={{ color: C.textMuted, marginBottom: spacing.sm, ...typography.label }}>{t('admin', 'contestDescriptionLabel')}</Text>
              <TextInput
                style={{ borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, marginBottom: spacing.lg, backgroundColor: C.card, borderColor: C.border, color: C.text, fontFamily: fontRegular, minHeight: 80, textAlignVertical: 'top', ...typography.body }}
                placeholder={t('admin', 'contestDescriptionPlaceholder')}
                placeholderTextColor={C.textFaint}
                value={description}
                onChangeText={setDescription}
                multiline
              />

              <Text style={{ color: C.textMuted, marginBottom: spacing.sm, ...typography.label }}>{t('admin', 'contestRulesLabel')}</Text>
              <TextInput
                style={{ borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, marginBottom: spacing.lg, backgroundColor: C.card, borderColor: C.border, color: C.text, fontFamily: fontRegular, minHeight: 80, textAlignVertical: 'top', ...typography.body }}
                placeholder={t('admin', 'contestRulesPlaceholder')}
                placeholderTextColor={C.textFaint}
                value={rules}
                onChangeText={setRules}
                multiline
              />

              <Button variant="primary" label={t('common', 'save')} onPress={handleSave} loading={saving} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
