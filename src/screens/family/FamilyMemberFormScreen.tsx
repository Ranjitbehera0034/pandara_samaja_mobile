// src/screens/family/FamilyMemberFormScreen.tsx
// Single screen used for both create and edit of an entry in the logged-in
// member's own household roster (member.family_members). Route param
// `index` present = edit (also receives `member`, the existing entry data
// straight from FamilyTreeScreen so no extra fetch is needed); absent =
// create. The head-of-family entry is never routed here — FamilyTreeScreen
// excludes it from the tappable/editable list entirely.
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, Trash2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { addFamilyMember, updateFamilyMember, deleteFamilyMember, FamilyMemberInput } from '../../api/members';
import { FamilyMember } from '../../types';
import Button from '../../components/common/Button';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

const RELATION_OPTIONS = ['Spouse', 'Son', 'Daughter', 'Father', 'Mother', 'Brother', 'Sister'] as const;
const RELATION_LABEL_KEYS: Record<string, string> = {
  Spouse: 'relationSpouse', Son: 'relationSon', Daughter: 'relationDaughter', Father: 'relationFather',
  Mother: 'relationMother', Brother: 'relationBrother', Sister: 'relationSister',
};
const MARITAL_OPTIONS = ['Unmarried', 'Married', 'Divorced', 'Widowed'] as const;
const MARITAL_LABEL_KEYS: Record<string, string> = {
  Unmarried: 'maritalUnmarried', Married: 'maritalMarried', Divorced: 'maritalDivorced', Widowed: 'maritalWidowed',
};
const OCCUPATION_OPTIONS = ['Student', 'Homemaker', 'Farmer', 'Government Employee', 'Private Employee', 'Business', 'Retired', 'Unemployed'] as const;
const OCCUPATION_LABEL_KEYS: Record<string, string> = {
  Student: 'occupationStudent', Homemaker: 'occupationHomemaker', Farmer: 'occupationFarmer',
  'Government Employee': 'occupationGovtEmployee', 'Private Employee': 'occupationPrivateEmployee',
  Business: 'occupationBusiness', Retired: 'occupationRetired', Unemployed: 'occupationUnemployed',
};
const BLOOD_GROUP_OPTIONS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

function resolveRelationMode(rel?: string): { mode: 'chip' | 'other'; chip: string; other: string } {
  if (!rel) return { mode: 'chip', chip: RELATION_OPTIONS[0], other: '' };
  const match = RELATION_OPTIONS.find(o => o.toLowerCase() === rel.toLowerCase());
  if (match) return { mode: 'chip', chip: match, other: '' };
  return { mode: 'other', chip: RELATION_OPTIONS[0], other: rel };
}

function resolveOccupationMode(occ?: string | null): { mode: 'chip' | 'other'; chip: string; other: string } {
  if (!occ) return { mode: 'chip', chip: '', other: '' };
  const match = OCCUPATION_OPTIONS.find(o => o.toLowerCase() === occ.toLowerCase());
  if (match) return { mode: 'chip', chip: match, other: '' };
  return { mode: 'other', chip: '', other: occ };
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

export default function FamilyMemberFormScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const index: number | undefined = route.params?.index;
  const existing: FamilyMember | undefined = route.params?.member;
  const isEdit = index !== undefined;

  const insets = useSafeAreaInsets();
  const { colors: C, spacing, radius, typography } = useTheme();
  const { lang, t } = useLanguage();
  const fontRegular = lang === 'od' ? 'NotoSansOriya' : undefined;
  const fontBold = lang === 'od' ? 'NotoSansOriya-Bold' : undefined;

  const initialRelation = resolveRelationMode(existing?.relation);
  const initialOccupation = resolveOccupationMode(existing?.occupation);

  const [name, setName] = useState(existing?.name || '');
  const [relationMode, setRelationMode] = useState<'chip' | 'other'>(initialRelation.mode);
  const [relationChip, setRelationChip] = useState<string>(initialRelation.chip);
  const [relationOther, setRelationOther] = useState<string>(initialRelation.other);
  const [gender, setGender] = useState<'Male' | 'Female' | ''>(resolveGender(existing?.gender));
  const [age, setAge] = useState(existing?.age != null ? String(existing.age) : '');
  const [mobile, setMobile] = useState(existing?.mobile || '');
  const [maritalStatus, setMaritalStatus] = useState<string>(resolveMarital(existing?.marital_status));
  const [occupationMode, setOccupationMode] = useState<'chip' | 'other'>(initialOccupation.mode);
  const [occupationChip, setOccupationChip] = useState<string>(initialOccupation.chip);
  const [occupationOther, setOccupationOther] = useState<string>(initialOccupation.other);
  const [bloodGroup, setBloodGroup] = useState<string>(existing?.blood_group || '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert(t('common', 'errorTitle'), t('familyTree', 'nameRequiredError'));
      return;
    }
    const relationValue = relationMode === 'chip' ? relationChip : relationOther.trim();
    if (!relationValue) {
      Alert.alert(t('common', 'errorTitle'), t('familyTree', 'relationRequiredError'));
      return;
    }

    const cleanMobile = mobile.replace(/\D/g, '');
    if (cleanMobile && cleanMobile.length !== 10) {
      Alert.alert(t('common', 'errorTitle'), t('familyTree', 'mobileInvalidError'));
      return;
    }

    const occupationValue = occupationMode === 'chip' ? occupationChip : occupationOther.trim();

    const payload: FamilyMemberInput = { name: name.trim(), relation: relationValue };
    if (gender) payload.gender = gender;
    if (age.trim()) payload.age = age.trim();
    if (maritalStatus) payload.marital_status = maritalStatus;
    if (cleanMobile) payload.mobile = cleanMobile;
    if (occupationValue) payload.occupation = occupationValue;
    if (bloodGroup) payload.blood_group = bloodGroup;

    setSaving(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const data = isEdit
        ? await updateFamilyMember(index!, payload)
        : await addFamilyMember(payload);
      if (data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        navigation.goBack();
      } else {
        throw new Error(data.message || t('familyTree', 'saveError'));
      }
    } catch (e: any) {
      console.error('[FAMILY_MEMBER_FORM] Save failed:', e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common', 'errorTitle'), e.response?.data?.message || e.message || t('familyTree', 'saveError'));
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    setDeleting(true);
    try {
      const data = await deleteFamilyMember(index!);
      if (data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        navigation.goBack();
      } else {
        throw new Error(data.message || t('familyTree', 'deleteError'));
      }
    } catch (e: any) {
      console.error('[FAMILY_MEMBER_FORM] Delete failed:', e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common', 'errorTitle'), e.response?.data?.message || e.message || t('familyTree', 'deleteError'));
    } finally {
      setDeleting(false);
    }
  };

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      t('familyTree', 'confirmDeleteTitle'),
      t('familyTree', 'confirmDeleteMessage'),
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
          {isEdit ? t('familyTree', 'editMemberTitle') : t('familyTree', 'addMemberTitle')}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl }} keyboardShouldPersistTaps="handled">
        <Text style={labelStyle}>{t('familyTree', 'nameLabel')}</Text>
        <TextInput
          style={inputStyle}
          placeholder={t('familyTree', 'namePlaceholder')}
          placeholderTextColor={C.textFaint}
          value={name}
          onChangeText={setName}
        />

        <Text style={labelStyle}>{t('familyTree', 'mobileLabel')}</Text>
        <TextInput
          style={inputStyle}
          placeholder={t('familyTree', 'mobilePlaceholder')}
          placeholderTextColor={C.textFaint}
          value={mobile}
          onChangeText={setMobile}
          keyboardType="phone-pad"
          maxLength={10}
        />

        <Text style={labelStyle}>{t('familyTree', 'relationLabel')}</Text>
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
                  {t('familyTree', RELATION_LABEL_KEYS[opt])}
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
              {t('familyTree', 'relationOther')}
            </Text>
          </TouchableOpacity>
        </View>
        {relationMode === 'other' && (
          <TextInput
            style={inputStyle}
            placeholder={t('familyTree', 'relationOtherPlaceholder')}
            placeholderTextColor={C.textFaint}
            value={relationOther}
            onChangeText={setRelationOther}
          />
        )}
        {relationMode !== 'other' && <View style={{ marginBottom: spacing.sm }} />}

        <Text style={labelStyle}>{t('familyTree', 'genderLabel')}</Text>
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
                {g === 'Male' ? t('familyTree', 'genderMale') : t('familyTree', 'genderFemale')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={labelStyle}>{t('familyTree', 'ageLabel')}</Text>
        <TextInput
          style={inputStyle}
          placeholder={t('familyTree', 'agePlaceholder')}
          placeholderTextColor={C.textFaint}
          value={age}
          onChangeText={setAge}
          keyboardType="numeric"
        />

        <Text style={labelStyle}>{t('familyTree', 'maritalStatusLabel')}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg }}>
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
                  {t('familyTree', MARITAL_LABEL_KEYS[opt])}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={labelStyle}>{t('familyTree', 'occupationLabel')}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm }}>
          {OCCUPATION_OPTIONS.map(opt => {
            const active = occupationMode === 'chip' && occupationChip === opt;
            return (
              <TouchableOpacity
                key={opt}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setOccupationMode('chip'); setOccupationChip(active ? '' : opt); }}
                style={{
                  backgroundColor: active ? C.primary : C.card, borderColor: active ? C.primary : C.border,
                  borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
                }}
                className="border"
              >
                <Text style={{ color: active ? '#fff' : C.textMuted, ...typography.caption, fontWeight: '700' }}>
                  {t('familyTree', OCCUPATION_LABEL_KEYS[opt])}
                </Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setOccupationMode('other'); }}
            style={{
              backgroundColor: occupationMode === 'other' ? C.primary : C.card, borderColor: occupationMode === 'other' ? C.primary : C.border,
              borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
            }}
            className="border"
          >
            <Text style={{ color: occupationMode === 'other' ? '#fff' : C.textMuted, ...typography.caption, fontWeight: '700' }}>
              {t('familyTree', 'occupationOther')}
            </Text>
          </TouchableOpacity>
        </View>
        {occupationMode === 'other' && (
          <TextInput
            style={inputStyle}
            placeholder={t('familyTree', 'occupationOtherPlaceholder')}
            placeholderTextColor={C.textFaint}
            value={occupationOther}
            onChangeText={setOccupationOther}
          />
        )}
        {occupationMode !== 'other' && <View style={{ marginBottom: spacing.sm }} />}

        <Text style={labelStyle}>{t('familyTree', 'bloodGroupLabel')}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xl }}>
          {BLOOD_GROUP_OPTIONS.map(opt => {
            const active = bloodGroup === opt;
            return (
              <TouchableOpacity
                key={opt}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setBloodGroup(active ? '' : opt); }}
                style={{
                  backgroundColor: active ? C.primary : C.card, borderColor: active ? C.primary : C.border,
                  borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
                }}
                className="border"
              >
                <Text style={{ color: active ? '#fff' : C.textMuted, ...typography.caption, fontWeight: '700' }}>{opt}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ gap: spacing.md }}>
          <Button variant="primary" label={t('common', 'save')} onPress={handleSave} loading={saving} />
          {isEdit && (
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
