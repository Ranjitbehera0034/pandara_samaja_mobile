// src/screens/admin/AdminMemberEditScreen.tsx
// Admin form to edit a member's non-sensitive fields via PUT /api/admin/members/:id.
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { ArrowLeft } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as adminApi from '../../api/admin';
import { UpdateAdminMemberInput } from '../../api/admin';
import { AdminStackParams } from '../../navigation/AdminStack';
import Button from '../../components/common/Button';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

type EditRoute = RouteProp<AdminStackParams, 'AdminMemberEdit'>;

const emptyForm: UpdateAdminMemberInput = {
  name: '', mobile: '', district: '', taluka: '', panchayat: '', village: '', address: '', head_gender: 'Male',
};

export default function AdminMemberEditScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<EditRoute>();
  const { id } = route.params;
  const insets = useSafeAreaInsets();
  const { colors: C, spacing, radius, typography, shadow } = useTheme();
  const { lang, t } = useLanguage();
  const fontRegular = lang === 'od' ? 'NotoSansOriya' : undefined;
  const fontBold = lang === 'od' ? 'NotoSansOriya-Bold' : undefined;

  const [form, setForm] = useState<UpdateAdminMemberInput>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await adminApi.fetchAdminMember(id);
      if (data.success) {
        const m = data.member;
        setForm({
          name: m.name || '', mobile: m.mobile || '', district: m.district || '', taluka: m.taluka || '',
          panchayat: m.panchayat || '', village: m.village || '', address: (m.address as string) || '',
          head_gender: m.head_gender || 'Male',
        });
      }
    } catch (e) {
      console.error('[ADMIN_MEMBER_EDIT] Fetch failed:', e);
      Alert.alert(t('common', 'errorTitle'), t('admin', 'memberLoadError'));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => { load(); }, [load]);

  const setField = (key: keyof UpdateAdminMemberInput, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!form.name?.trim()) {
      Alert.alert(t('common', 'errorTitle'), t('admin', 'matrimonyNameRequiredError'));
      return;
    }
    setSaving(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const data = await adminApi.updateAdminMember(id, form);
      if (data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        navigation.goBack();
      } else {
        throw new Error(data.message || t('admin', 'memberEditSaveError'));
      }
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common', 'errorTitle'), e.message || t('admin', 'memberEditSaveError'));
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    marginBottom: spacing.lg, backgroundColor: C.card, borderColor: C.border, color: C.text,
    fontFamily: fontRegular, ...typography.body,
  };
  const labelStyle = { color: C.textMuted, marginBottom: spacing.sm, fontFamily: fontBold, ...typography.label };

  const fields: { key: keyof UpdateAdminMemberInput; labelKey: string; keyboardType?: 'numeric' | 'phone-pad' | 'email-address' }[] = [
    { key: 'mobile', labelKey: 'memberEditMobileLabel', keyboardType: 'phone-pad' },
    { key: 'district', labelKey: 'memberEditDistrictLabel' },
    { key: 'taluka', labelKey: 'memberEditTalukaLabel' },
    { key: 'panchayat', labelKey: 'memberEditPanchayatLabel' },
    { key: 'village', labelKey: 'memberEditVillageLabel' },
    { key: 'address', labelKey: 'matrimonyAddressLabel' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.goBack(); }} style={{ padding: spacing.xs, borderRadius: radius.full, backgroundColor: C.card }}>
          <ArrowLeft size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={{ color: C.text, fontFamily: fontBold, ...typography.heading }}>{t('admin', 'editMemberTitle')}</Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}>
          <Text style={labelStyle}>{t('admin', 'matrimonyNameLabel')}</Text>
          <TextInput style={inputStyle} placeholder={t('admin', 'matrimonyNameLabel')} placeholderTextColor={C.textFaint} value={form.name} onChangeText={(v) => setField('name', v)} />

          <Text style={labelStyle}>{t('admin', 'matrimonyGenderLabel')}</Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
            {(['Male', 'Female'] as const).map(g => (
              <TouchableOpacity
                key={g}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setField('head_gender', g); }}
                style={{
                  flex: 1, alignItems: 'center', paddingVertical: spacing.md, borderRadius: radius.md,
                  borderWidth: 1, borderColor: form.head_gender === g ? C.primary : C.border,
                  backgroundColor: form.head_gender === g ? C.primary + '15' : C.card,
                }}
              >
                <Text style={{ color: form.head_gender === g ? C.primary : C.textMuted, ...typography.body, fontWeight: '700' }}>
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
                autoCapitalize={f.key === 'mobile' ? 'none' : 'sentences'}
              />
            </View>
          ))}

          <View style={{ gap: spacing.md, marginTop: spacing.md }}>
            <Button variant="primary" label={t('common', 'save')} onPress={handleSave} loading={saving} />
          </View>
        </ScrollView>
      )}
    </View>
  );
}
