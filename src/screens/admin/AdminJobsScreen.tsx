// src/screens/admin/AdminJobsScreen.tsx
// Published job postings — admin can create directly (pre-approved, e.g. a
// real government vacancy found by hand) or edit/delete any listing.
// Member-submitted postings go through the separate review queue
// (AdminJobSubmissionsScreen) before landing here; flagged live listings
// go through AdminJobReportsScreen.
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl, Alert,
  Modal, TextInput, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Plus, Trash2, Edit2, X as XIcon, ClipboardList, Flag } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as adminApi from '../../api/admin';
import { AdminJob } from '../../api/admin';
import EmptyState from '../../components/common/EmptyState';
import Button from '../../components/common/Button';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

export default function AdminJobsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors: C, spacing, radius, typography, shadow } = useTheme();
  const { lang, t } = useLanguage();
  const fontRegular = lang === 'od' ? 'NotoSansOriya' : undefined;
  const fontBold = lang === 'od' ? 'NotoSansOriya-Bold' : undefined;

  const [jobs, setJobs] = useState<AdminJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [removingId, setRemovingId] = useState<string | number | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AdminJob | null>(null);
  const [title, setTitle] = useState('');
  const [organization, setOrganization] = useState('');
  const [category, setCategory] = useState<'govt' | 'private'>('govt');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [applicationInfo, setApplicationInfo] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setLoadError(false);
    try {
      const data = await adminApi.fetchAdminJobs();
      if (data.success) setJobs(data.jobs);
    } catch (e) {
      console.error('[ADMIN_JOBS] Fetch failed:', e);
      setLoadError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => {
    setEditing(null);
    setTitle(''); setOrganization(''); setCategory('govt');
    setDescription(''); setLocation(''); setApplicationInfo(''); setContactPhone('');
  };

  const openCreate = () => {
    resetForm();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowForm(true);
  };

  const openEdit = (item: AdminJob) => {
    setEditing(item);
    setTitle(item.title);
    setOrganization(item.organization);
    setCategory(item.category);
    setDescription(item.description);
    setLocation(item.location || '');
    setApplicationInfo(item.application_info);
    setContactPhone(item.contact_phone || '');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !organization.trim() || !description.trim() || !applicationInfo.trim()) {
      Alert.alert(t('common', 'errorTitle'), t('admin', 'jobFieldsRequiredError'));
      return;
    }
    setSaving(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const payload = {
        title: title.trim(), organization: organization.trim(), category,
        description: description.trim(), location: location.trim() || undefined,
        applicationInfo: applicationInfo.trim(), contactPhone: contactPhone.trim() || undefined,
      };
      const data = editing
        ? await adminApi.updateAdminJob(editing.id, payload)
        : await adminApi.createAdminJob(payload);
      if (data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setShowForm(false);
        resetForm();
        load();
      } else {
        throw new Error(t('admin', 'jobSaveError'));
      }
    } catch (e: any) {
      console.error('[ADMIN_JOBS] Save failed:', e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common', 'errorTitle'), e.message || t('admin', 'jobSaveError'));
    } finally {
      setSaving(false);
    }
  };

  const doRemove = async (id: string | number) => {
    setRemovingId(id);
    try {
      const data = await adminApi.deleteAdminJob(id);
      if (data.success) {
        setJobs(prev => prev.filter(j => j.id !== id));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        throw new Error(t('admin', 'jobDeleteError'));
      }
    } catch (e: any) {
      console.error('[ADMIN_JOBS] Remove failed:', e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common', 'errorTitle'), e.message || t('admin', 'jobDeleteError'));
    } finally {
      setRemovingId(null);
    }
  };

  const handleRemove = (item: AdminJob) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      t('admin', 'confirmDeleteJobTitle'),
      t('admin', 'confirmDeleteJobMessage'),
      [
        { text: t('common', 'cancel'), style: 'cancel' },
        { text: t('common', 'delete'), style: 'destructive', onPress: () => doRemove(item.id) },
      ]
    );
  };

  const renderItem = useCallback(({ item }: { item: AdminJob }) => (
    <View style={{ backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadow.card }}>
      <Text style={{
        alignSelf: 'flex-start', color: item.category === 'govt' ? C.primary : C.textMuted,
        backgroundColor: (item.category === 'govt' ? C.primary : C.textMuted) + '15',
        borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 3,
        ...typography.caption, fontWeight: '700',
      }}>
        {item.category === 'govt' ? t('jobs', 'categoryGovt') : t('jobs', 'categoryPrivate')}
      </Text>
      <Text style={{ color: C.text, fontFamily: fontBold, marginTop: spacing.sm, ...typography.bodyEmphasis }} numberOfLines={1}>{item.title}</Text>
      <Text style={{ color: C.textMuted, fontFamily: fontRegular, marginTop: 2, ...typography.caption }} numberOfLines={1}>{item.organization}</Text>
      <Text style={{ color: C.textFaint, marginTop: spacing.sm, ...typography.caption }}>{new Date(item.created_at).toLocaleDateString()}</Text>

      <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
        <TouchableOpacity
          onPress={() => openEdit(item)}
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, borderWidth: 1, borderColor: C.border, borderRadius: radius.md, paddingVertical: spacing.sm }}
        >
          <Edit2 size={14} color={C.text} />
          <Text style={{ color: C.text, ...typography.caption, fontWeight: '700' }}>{t('admin', 'editButton')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleRemove(item)}
          disabled={removingId === item.id}
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, backgroundColor: C.error + '15', borderRadius: radius.md, paddingVertical: spacing.sm }}
        >
          {removingId === item.id ? <ActivityIndicator size="small" color={C.error} /> : <Trash2 size={14} color={C.error} />}
          <Text style={{ color: C.error, ...typography.caption, fontWeight: '700' }}>{t('common', 'delete')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  ), [C, spacing, radius, typography, shadow, fontBold, fontRegular, t, removingId]);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.goBack(); }} style={{ padding: spacing.xs, borderRadius: radius.full, backgroundColor: C.card }}>
          <ArrowLeft size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={{ color: C.text, fontFamily: fontBold, flex: 1, ...typography.heading }}>{t('admin', 'jobsTitle')}</Text>
        <TouchableOpacity
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.navigate('AdminJobReports'); }}
          style={{ width: 36, height: 36, borderRadius: radius.full, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border }}
        >
          <Flag size={16} color={C.error} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.navigate('AdminJobSubmissions'); }}
          style={{ width: 36, height: 36, borderRadius: radius.full, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border }}
        >
          <ClipboardList size={16} color={C.text} />
        </TouchableOpacity>
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
        <EmptyState emoji="⚠️" title={t('common', 'error')} subtitle={t('admin', 'jobsLoadError')} />
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + spacing.xl, flexGrow: 1 }}
          ListEmptyComponent={<EmptyState emoji="💼" title={t('admin', 'jobsEmptyTitle')} subtitle={t('admin', 'jobsEmptySubtitle')} />}
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
                {editing ? t('admin', 'editJobTitle') : t('admin', 'newJobTitle')}
              </Text>
              <TouchableOpacity onPress={() => { setShowForm(false); resetForm(); }}>
                <XIcon size={22} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={{ color: C.textMuted, marginBottom: spacing.sm, ...typography.label }}>{t('jobs', 'jobTitleLabel')}</Text>
              <TextInput
                style={{ borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, marginBottom: spacing.lg, backgroundColor: C.card, borderColor: C.border, color: C.text, fontFamily: fontRegular, ...typography.body }}
                placeholder={t('jobs', 'jobTitlePlaceholder')}
                placeholderTextColor={C.textFaint}
                value={title}
                onChangeText={setTitle}
              />

              <Text style={{ color: C.textMuted, marginBottom: spacing.sm, ...typography.label }}>{t('jobs', 'organizationLabel')}</Text>
              <TextInput
                style={{ borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, marginBottom: spacing.lg, backgroundColor: C.card, borderColor: C.border, color: C.text, fontFamily: fontRegular, ...typography.body }}
                placeholder={t('jobs', 'organizationPlaceholder')}
                placeholderTextColor={C.textFaint}
                value={organization}
                onChangeText={setOrganization}
              />

              <Text style={{ color: C.textMuted, marginBottom: spacing.sm, ...typography.label }}>{t('jobs', 'categoryLabel')}</Text>
              <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
                {(['govt', 'private'] as const).map(c => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setCategory(c)}
                    style={{
                      flex: 1, alignItems: 'center', paddingVertical: spacing.md, borderRadius: radius.md,
                      borderWidth: 1, borderColor: category === c ? C.primary : C.border,
                      backgroundColor: category === c ? C.primary + '15' : C.card,
                    }}
                  >
                    <Text style={{ color: category === c ? C.primary : C.textMuted, ...typography.body, fontWeight: '700' }}>
                      {c === 'govt' ? t('jobs', 'categoryGovt') : t('jobs', 'categoryPrivate')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={{ color: C.textMuted, marginBottom: spacing.sm, ...typography.label }}>{t('jobs', 'descriptionLabel')}</Text>
              <TextInput
                style={{ borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, marginBottom: spacing.lg, backgroundColor: C.card, borderColor: C.border, color: C.text, fontFamily: fontRegular, minHeight: 90, textAlignVertical: 'top', ...typography.body }}
                placeholder={t('jobs', 'descriptionPlaceholder')}
                placeholderTextColor={C.textFaint}
                value={description}
                onChangeText={setDescription}
                multiline
              />

              <Text style={{ color: C.textMuted, marginBottom: spacing.sm, ...typography.label }}>{t('jobs', 'locationLabel')}</Text>
              <TextInput
                style={{ borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, marginBottom: spacing.lg, backgroundColor: C.card, borderColor: C.border, color: C.text, fontFamily: fontRegular, ...typography.body }}
                placeholder={t('jobs', 'locationPlaceholder')}
                placeholderTextColor={C.textFaint}
                value={location}
                onChangeText={setLocation}
              />

              <Text style={{ color: C.textMuted, marginBottom: spacing.sm, ...typography.label }}>{t('jobs', 'applicationInfoLabel')}</Text>
              <TextInput
                style={{ borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, marginBottom: spacing.lg, backgroundColor: C.card, borderColor: C.border, color: C.text, fontFamily: fontRegular, minHeight: 70, textAlignVertical: 'top', ...typography.body }}
                placeholder={t('jobs', 'applicationInfoPlaceholder')}
                placeholderTextColor={C.textFaint}
                value={applicationInfo}
                onChangeText={setApplicationInfo}
                multiline
              />

              <Text style={{ color: C.textMuted, marginBottom: spacing.sm, ...typography.label }}>{t('admin', 'jobContactPhoneOptionalLabel')}</Text>
              <TextInput
                style={{ borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, marginBottom: spacing.lg, backgroundColor: C.card, borderColor: C.border, color: C.text, fontFamily: fontRegular, ...typography.body }}
                placeholder={t('jobs', 'contactPhonePlaceholder')}
                placeholderTextColor={C.textFaint}
                value={contactPhone}
                onChangeText={setContactPhone}
                keyboardType="phone-pad"
              />

              <Button variant="primary" label={t('common', 'save')} onPress={handleSave} loading={saving} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
