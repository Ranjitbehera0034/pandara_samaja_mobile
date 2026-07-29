// src/screens/admin/AdminMatrimonyFormScreen.tsx
// Single screen used for both admin-create and admin-edit of a matrimony
// candidate profile (route param `id` present = edit, absent = create).
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { ArrowLeft, Ban, CheckCircle2, Trash2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as adminApi from '../../api/admin';
import { MatrimonyCandidateInput } from '../../api/admin';
import { AdminStackParams } from '../../navigation/AdminStack';
import Button from '../../components/common/Button';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

type FormRoute = RouteProp<AdminStackParams, 'AdminMatrimonyForm'>;

const emptyForm: MatrimonyCandidateInput = {
  name: '', gender: 'Male', dob: '', age: '', height: '', bloodGroup: '', gotra: '', bansha: '',
  education: '', technicalEducation: '', professionalEducation: '', occupation: '',
  father: '', mother: '', address: '', phone: '', email: '',
};

export default function AdminMatrimonyFormScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<FormRoute>();
  const id = route.params?.id;
  const isEdit = id !== undefined;
  const insets = useSafeAreaInsets();
  const { colors: C, spacing, radius, typography, shadow } = useTheme();
  const { lang, t } = useLanguage();
  const fontRegular = lang === 'od' ? 'NotoSansOriya' : undefined;
  const fontBold = lang === 'od' ? 'NotoSansOriya-Bold' : undefined;

  const [form, setForm] = useState<MatrimonyCandidateInput>(emptyForm);
  const [status, setStatus] = useState<string>('approved');
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [banning, setBanning] = useState(false);

  const load = useCallback(async () => {
    if (!isEdit) return;
    try {
      const data = await adminApi.fetchAdminMatrimonyCandidate(id!);
      if (data.success) {
        const c = data.candidate;
        setForm({
          name: c.name || '', gender: c.gender || 'Male', dob: c.dob || '', age: c.age != null ? String(c.age) : '',
          height: c.height || '', bloodGroup: c.blood_group || '', gotra: c.gotra || '', bansha: c.bansha || '',
          education: c.education || '', technicalEducation: c.technical_education || '', professionalEducation: c.professional_education || '',
          occupation: c.occupation || '', father: c.father || '', mother: c.mother || '', address: c.address || '',
          phone: c.phone || '', email: c.email || '',
        });
        setStatus(c.status);
      }
    } catch (e) {
      console.error('[ADMIN_MATRIMONY_FORM] Fetch failed:', e);
      Alert.alert(t('common', 'errorTitle'), t('admin', 'matrimonyLoadError'));
    } finally {
      setLoading(false);
    }
  }, [id, isEdit, t]);

  useEffect(() => { load(); }, [load]);

  const setField = (key: keyof MatrimonyCandidateInput, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert(t('common', 'errorTitle'), t('admin', 'matrimonyNameRequiredError'));
      return;
    }
    setSaving(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const data = isEdit
        ? await adminApi.updateMatrimonyCandidate(id!, form)
        : await adminApi.createMatrimonyCandidate(form);
      if (data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        navigation.goBack();
      } else {
        throw new Error(data.message || t('admin', 'matrimonySaveError'));
      }
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common', 'errorTitle'), e.message || t('admin', 'matrimonySaveError'));
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    setDeleting(true);
    try {
      const data = await adminApi.deleteMatrimonyCandidate(id!);
      if (data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        navigation.goBack();
      } else {
        throw new Error(data.message || t('admin', 'matrimonyDeleteError'));
      }
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common', 'errorTitle'), e.message || t('admin', 'matrimonyDeleteError'));
    } finally {
      setDeleting(false);
    }
  };

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      t('admin', 'confirmDeleteCandidateTitle'),
      t('admin', 'confirmDeleteCandidateMessage'),
      [
        { text: t('common', 'cancel'), style: 'cancel' },
        { text: t('common', 'delete'), style: 'destructive', onPress: doDelete },
      ]
    );
  };

  const isBanned = status === 'banned';

  const doToggleBan = async () => {
    setBanning(true);
    try {
      const data = await adminApi.setMatrimonyCandidateBanned(id!, !isBanned);
      if (data.success) {
        setStatus(data.candidate.status);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e) {
      console.error('[ADMIN_MATRIMONY_FORM] Ban toggle failed:', e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common', 'errorTitle'), t('admin', 'matrimonyBanError'));
    } finally {
      setBanning(false);
    }
  };

  const handleBanPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      isBanned ? t('admin', 'confirmUnbanCandidateTitle') : t('admin', 'confirmBanCandidateTitle'),
      isBanned ? t('admin', 'confirmUnbanCandidateMessage') : t('admin', 'confirmBanCandidateMessage'),
      [
        { text: t('common', 'cancel'), style: 'cancel' },
        { text: isBanned ? t('admin', 'unbanButton') : t('admin', 'banButton'), style: 'destructive', onPress: doToggleBan },
      ]
    );
  };

  const inputStyle = {
    borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    marginBottom: spacing.lg, backgroundColor: C.card, borderColor: C.border, color: C.text,
    fontFamily: fontRegular, ...typography.body,
  };
  const labelStyle = { color: C.textMuted, marginBottom: spacing.sm, fontFamily: fontBold, ...typography.label };

  const fields: { key: keyof MatrimonyCandidateInput; labelKey: string; keyboardType?: 'numeric' | 'phone-pad' | 'email-address' }[] = [
    { key: 'dob', labelKey: 'matrimonyDobLabel' },
    { key: 'age', labelKey: 'matrimonyAgeLabel', keyboardType: 'numeric' },
    { key: 'height', labelKey: 'matrimonyHeightLabel' },
    { key: 'bloodGroup', labelKey: 'matrimonyBloodGroupLabel' },
    { key: 'gotra', labelKey: 'matrimonyGotraLabel' },
    { key: 'bansha', labelKey: 'matrimonyBanshaLabel' },
    { key: 'education', labelKey: 'matrimonyEducationLabel' },
    { key: 'technicalEducation', labelKey: 'matrimonyTechnicalEducationLabel' },
    { key: 'professionalEducation', labelKey: 'matrimonyProfessionalEducationLabel' },
    { key: 'occupation', labelKey: 'matrimonyOccupationLabel' },
    { key: 'father', labelKey: 'matrimonyFatherLabel' },
    { key: 'mother', labelKey: 'matrimonyMotherLabel' },
    { key: 'address', labelKey: 'matrimonyAddressLabel' },
    { key: 'phone', labelKey: 'matrimonyPhoneLabel', keyboardType: 'phone-pad' },
    { key: 'email', labelKey: 'matrimonyEmailLabel', keyboardType: 'email-address' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.goBack(); }} style={{ padding: spacing.xs, borderRadius: radius.full, backgroundColor: C.card }}>
          <ArrowLeft size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={{ color: C.text, fontFamily: fontBold, ...typography.heading }}>
          {isEdit ? t('admin', 'matrimonyEditTitle') : t('admin', 'matrimonyCreateTitle')}
        </Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}>
          {isEdit && (
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginBottom: spacing.lg,
              backgroundColor: (isBanned ? C.error : C.success) + '15', borderRadius: radius.full,
              paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
            }}>
              {isBanned ? <Ban size={12} color={C.error} /> : <CheckCircle2 size={12} color={C.success} />}
              <Text style={{ color: isBanned ? C.error : C.success, ...typography.caption, fontWeight: '700' }}>
                {isBanned ? t('admin', 'bannedBadge') : t('admin', 'matrimonyApprovedBadge')}
              </Text>
            </View>
          )}

          <Text style={labelStyle}>{t('admin', 'matrimonyNameLabel')}</Text>
          <TextInput style={inputStyle} placeholder={t('admin', 'matrimonyNameLabel')} placeholderTextColor={C.textFaint} value={form.name} onChangeText={(v) => setField('name', v)} />

          <Text style={labelStyle}>{t('admin', 'matrimonyGenderLabel')}</Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
            {(['Male', 'Female'] as const).map(g => (
              <TouchableOpacity
                key={g}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setField('gender', g); }}
                style={{
                  flex: 1, alignItems: 'center', paddingVertical: spacing.md, borderRadius: radius.md,
                  borderWidth: 1, borderColor: form.gender === g ? C.primary : C.border,
                  backgroundColor: form.gender === g ? C.primary + '15' : C.card,
                }}
              >
                <Text style={{ color: form.gender === g ? C.primary : C.textMuted, ...typography.body, fontWeight: '700' }}>
                  {g === 'Male' ? t('admin', 'matrimonyGenderMale') : t('admin', 'matrimonyGenderFemale')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {fields.map(f => (
            <View key={f.key}>
              <Text style={labelStyle}>{t('admin', f.labelKey)}</Text>
              <TextInput
                style={inputStyle}
                placeholder={t('admin', f.labelKey)}
                placeholderTextColor={C.textFaint}
                value={(form[f.key] as string) || ''}
                onChangeText={(v) => setField(f.key, v)}
                keyboardType={f.keyboardType}
                autoCapitalize={f.key === 'email' || f.key === 'phone' ? 'none' : 'sentences'}
              />
            </View>
          ))}

          <View style={{ gap: spacing.md, marginTop: spacing.md }}>
            <Button variant="primary" label={t('common', 'save')} onPress={handleSave} loading={saving} />
            {isEdit && (
              <>
                <Button
                  variant="secondary"
                  label={isBanned ? t('admin', 'unbanButton') : t('admin', 'banButton')}
                  icon={<Ban size={16} color={C.text} />}
                  onPress={handleBanPress}
                  loading={banning}
                />
                <Button
                  variant="secondary"
                  label={t('common', 'delete')}
                  icon={<Trash2 size={16} color={C.error} />}
                  onPress={handleDelete}
                  loading={deleting}
                />
              </>
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
