// src/screens/admin/AdminMemberFamilyFormScreen.tsx
// Admin create/edit of a single entry in a member's household roster
// (member.family_members), scoped by route param `memberId`. Mirrors
// src/screens/family/FamilyMemberFormScreen.tsx (the member-facing
// equivalent) but calls the admin API wrappers and takes `memberId`
// alongside the optional `index`/`member` (existing entry) params.
//
// Unlike the member-facing screen, the head-of-family row IS reachable
// here (AdminMemberDetailScreen lists every entry, including the head —
// it just hides the Delete action for it). So this screen locks the
// relation field and hides Delete whenever the entry being edited is the
// head, matching the backend's own rule (memberModel.isHeadEntry): the
// head's relation can never change and the head can never be removed —
// everything else about the head entry (name/gender/age/marital_status)
// stays fully editable.
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, Trash2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as adminApi from '../../api/admin';
import { FamilyMemberInput } from '../../api/members';
import { FamilyMember } from '../../types';
import Button from '../../components/common/Button';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

const RELATION_OPTIONS = ['Spouse', 'Son', 'Daughter', 'Father', 'Mother', 'Brother', 'Sister'] as const;
const RELATION_LABEL_KEYS: Record<string, string> = {
  Spouse: 'familyMemberRelationSpouse', Son: 'familyMemberRelationSon', Daughter: 'familyMemberRelationDaughter',
  Father: 'familyMemberRelationFather', Mother: 'familyMemberRelationMother', Brother: 'familyMemberRelationBrother',
  Sister: 'familyMemberRelationSister',
};
const MARITAL_OPTIONS = ['Unmarried', 'Married', 'Divorced', 'Widowed'] as const;
const MARITAL_LABEL_KEYS: Record<string, string> = {
  Unmarried: 'familyMemberMaritalUnmarried', Married: 'familyMemberMaritalMarried',
  Divorced: 'familyMemberMaritalDivorced', Widowed: 'familyMemberMaritalWidowed',
};

// Mirrors the backend's isHeadEntry() (memberModel.ts) exactly.
function isHeadRelation(relation?: string): boolean {
  const r = (relation || '').toLowerCase();
  return r === 'self' || r === 'self/head' || r === 'head';
}

function resolveRelationMode(rel?: string): { mode: 'chip' | 'other'; chip: string; other: string } {
  if (!rel) return { mode: 'chip', chip: RELATION_OPTIONS[0], other: '' };
  const match = RELATION_OPTIONS.find(o => o.toLowerCase() === rel.toLowerCase());
  if (match) return { mode: 'chip', chip: match, other: '' };
  return { mode: 'other', chip: RELATION_OPTIONS[0], other: rel };
}

function resolveGender(g?: string): 'Male' | 'Female' | '' {
  if (!g) return '';
  return g.toLowerCase().startsWith('f') ? 'Female' : 'Male';
}

function resolveMarital(m?: string): string {
  if (!m) return '';
  const match = MARITAL_OPTIONS.find(o => o.toLowerCase() === m.toLowerCase());
  return match || '';
}

export default function AdminMemberFamilyFormScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const memberId: string = route.params?.memberId;
  const index: number | undefined = route.params?.index;
  const existing: FamilyMember | undefined = route.params?.member;
  const isEdit = index !== undefined;
  const isHead = isEdit && isHeadRelation(existing?.relation);

  const insets = useSafeAreaInsets();
  const { colors: C, spacing, radius, typography } = useTheme();
  const { lang, t } = useLanguage();
  const fontRegular = lang === 'od' ? 'NotoSansOriya' : undefined;
  const fontBold = lang === 'od' ? 'NotoSansOriya-Bold' : undefined;

  const initialRelation = resolveRelationMode(existing?.relation);

  const [name, setName] = useState(existing?.name || '');
  const [relationMode, setRelationMode] = useState<'chip' | 'other'>(initialRelation.mode);
  const [relationChip, setRelationChip] = useState<string>(initialRelation.chip);
  const [relationOther, setRelationOther] = useState<string>(initialRelation.other);
  const [gender, setGender] = useState<'Male' | 'Female' | ''>(resolveGender(existing?.gender));
  const [age, setAge] = useState(existing?.age != null ? String(existing.age) : '');
  const [maritalStatus, setMaritalStatus] = useState<string>(resolveMarital(existing?.marital_status));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert(t('common', 'errorTitle'), t('admin', 'familyMemberNameRequiredError'));
      return;
    }
    const relationValue = isHead ? existing!.relation : (relationMode === 'chip' ? relationChip : relationOther.trim());
    if (!relationValue) {
      Alert.alert(t('common', 'errorTitle'), t('admin', 'familyMemberRelationRequiredError'));
      return;
    }

    const payload: FamilyMemberInput = { name: name.trim(), relation: relationValue };
    if (gender) payload.gender = gender;
    if (age.trim()) payload.age = age.trim();
    if (maritalStatus) payload.marital_status = maritalStatus;

    setSaving(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const data = isEdit
        ? await adminApi.updateAdminFamilyMember(memberId, index!, payload)
        : await adminApi.addAdminFamilyMember(memberId, payload);
      if (data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        navigation.goBack();
      } else {
        throw new Error(data.message || t('admin', 'familyMemberSaveError'));
      }
    } catch (e: any) {
      console.error('[ADMIN_FAMILY_FORM] Save failed:', e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common', 'errorTitle'), e.response?.data?.message || e.message || t('admin', 'familyMemberSaveError'));
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    setDeleting(true);
    try {
      const data = await adminApi.deleteAdminFamilyMember(memberId, index!);
      if (data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        navigation.goBack();
      } else {
        throw new Error(data.message || t('admin', 'familyMemberDeleteError'));
      }
    } catch (e: any) {
      console.error('[ADMIN_FAMILY_FORM] Delete failed:', e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common', 'errorTitle'), e.response?.data?.message || e.message || t('admin', 'familyMemberDeleteError'));
    } finally {
      setDeleting(false);
    }
  };

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      t('admin', 'familyMemberConfirmDeleteTitle'),
      t('admin', 'familyMemberConfirmDeleteMessage'),
      [
        { text: t('common', 'cancel'), style: 'cancel' },
        { text: t('common', 'delete'), style: 'destructive', onPress: doDelete },
      ]
    );
  };

  const inputStyle = {
    borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    marginBottom: spacing.lg, backgroundColor: C.card, borderColor: C.border, color: C.text,
    fontFamily: fontRegular, ...typography.body,
  };
  const labelStyle = { color: C.textMuted, marginBottom: spacing.sm, fontFamily: fontBold, ...typography.label };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.goBack(); }} style={{ padding: spacing.xs, borderRadius: radius.full, backgroundColor: C.card }}>
          <ArrowLeft size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={{ color: C.text, fontFamily: fontBold, ...typography.heading }}>
          {isEdit ? t('admin', 'familyMemberEditTitle') : t('admin', 'familyMemberAddTitle')}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl }} keyboardShouldPersistTaps="handled">
        <Text style={labelStyle}>{t('admin', 'familyMemberNameLabel')}</Text>
        <TextInput
          style={inputStyle}
          placeholder={t('admin', 'familyMemberNamePlaceholder')}
          placeholderTextColor={C.textFaint}
          value={name}
          onChangeText={setName}
        />

        <Text style={labelStyle}>{t('admin', 'familyMemberRelationLabel')}</Text>
        {isHead ? (
          <View style={[inputStyle, { justifyContent: 'center', opacity: 0.7 }]}>
            <Text style={{ color: C.textMuted, fontFamily: fontRegular, ...typography.body }}>{existing?.relation}</Text>
          </View>
        ) : (
          <>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm }}>
              {RELATION_OPTIONS.map(opt => {
                const active = relationMode === 'chip' && relationChip === opt;
                return (
                  <TouchableOpacity
                    key={opt}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setRelationMode('chip'); setRelationChip(opt); }}
                    style={{
                      backgroundColor: active ? C.primary : C.card, borderColor: active ? C.primary : C.border,
                      borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
                    }}
                    className="border"
                  >
                    <Text style={{ color: active ? '#fff' : C.textMuted, ...typography.caption, fontWeight: '700' }}>
                      {t('admin', RELATION_LABEL_KEYS[opt])}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setRelationMode('other'); }}
                style={{
                  backgroundColor: relationMode === 'other' ? C.primary : C.card, borderColor: relationMode === 'other' ? C.primary : C.border,
                  borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
                }}
                className="border"
              >
                <Text style={{ color: relationMode === 'other' ? '#fff' : C.textMuted, ...typography.caption, fontWeight: '700' }}>
                  {t('admin', 'familyMemberRelationOther')}
                </Text>
              </TouchableOpacity>
            </View>
            {relationMode === 'other' && (
              <TextInput
                style={inputStyle}
                placeholder={t('admin', 'familyMemberRelationOtherPlaceholder')}
                placeholderTextColor={C.textFaint}
                value={relationOther}
                onChangeText={setRelationOther}
              />
            )}
            {relationMode !== 'other' && <View style={{ marginBottom: spacing.sm }} />}
          </>
        )}

        <Text style={labelStyle}>{t('admin', 'familyMemberGenderLabel')}</Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
          {(['Male', 'Female'] as const).map(g => (
            <TouchableOpacity
              key={g}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setGender(g); }}
              style={{
                flex: 1, alignItems: 'center', paddingVertical: spacing.md, borderRadius: radius.md,
                borderWidth: 1, borderColor: gender === g ? C.primary : C.border,
                backgroundColor: gender === g ? C.primary + '15' : C.card,
              }}
            >
              <Text style={{ color: gender === g ? C.primary : C.textMuted, ...typography.body, fontWeight: '700' }}>
                {g === 'Male' ? t('admin', 'matrimonyGenderMale') : t('admin', 'matrimonyGenderFemale')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={labelStyle}>{t('admin', 'familyMemberAgeLabel')}</Text>
        <TextInput
          style={inputStyle}
          placeholder={t('admin', 'familyMemberAgePlaceholder')}
          placeholderTextColor={C.textFaint}
          value={age}
          onChangeText={setAge}
          keyboardType="numeric"
        />

        <Text style={labelStyle}>{t('admin', 'familyMemberMaritalStatusLabel')}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xl }}>
          {MARITAL_OPTIONS.map(opt => {
            const active = maritalStatus === opt;
            return (
              <TouchableOpacity
                key={opt}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setMaritalStatus(active ? '' : opt); }}
                style={{
                  backgroundColor: active ? C.primary : C.card, borderColor: active ? C.primary : C.border,
                  borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
                }}
                className="border"
              >
                <Text style={{ color: active ? '#fff' : C.textMuted, ...typography.caption, fontWeight: '700' }}>
                  {t('admin', MARITAL_LABEL_KEYS[opt])}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ gap: spacing.md }}>
          <Button variant="primary" label={t('common', 'save')} onPress={handleSave} loading={saving} />
          {isEdit && !isHead && (
            <Button
              variant="secondary"
              label={t('common', 'delete')}
              icon={<Trash2 size={16} color={C.error} />}
              onPress={handleDelete}
              loading={deleting}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}
