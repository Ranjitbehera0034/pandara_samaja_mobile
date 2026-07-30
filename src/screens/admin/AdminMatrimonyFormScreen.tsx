// src/screens/admin/AdminMatrimonyFormScreen.tsx
// Single screen used for both admin-create and admin-edit of a matrimony
// candidate profile (route param `id` present = edit, absent = create).
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Modal } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { ArrowLeft, Ban, CheckCircle2, Trash2, Heart, X, Camera } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as adminApi from '../../api/admin';
import { MatrimonyCandidateInput } from '../../api/admin';
import { AdminStackParams } from '../../navigation/AdminStack';
import Button from '../../components/common/Button';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

type PickedFile = { uri: string; name: string; type: string };

function pickedFromAsset(asset: ImagePicker.ImagePickerAsset): PickedFile {
  const parts = asset.uri.split('/');
  return { uri: asset.uri, name: parts[parts.length - 1], type: 'image/jpeg' };
}

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
  const [isMatched, setIsMatched] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [banning, setBanning] = useState(false);
  const [matchModalVisible, setMatchModalVisible] = useState(false);

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
        setIsMatched(!!c.is_matched);
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

  const handleMatchConfirmed = (candidate: adminApi.MatrimonyCandidate) => {
    setIsMatched(!!candidate.is_matched);
    setMatchModalVisible(false);
    Alert.alert(t('admin', 'confirmMatchSuccessTitle'), t('admin', 'confirmMatchSuccessMessage'));
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
              backgroundColor: (isMatched ? C.primary : isBanned ? C.error : C.success) + '15', borderRadius: radius.full,
              paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
            }}>
              {isMatched ? <Heart size={12} color={C.primary} /> : isBanned ? <Ban size={12} color={C.error} /> : <CheckCircle2 size={12} color={C.success} />}
              <Text style={{ color: isMatched ? C.primary : isBanned ? C.error : C.success, ...typography.caption, fontWeight: '700' }}>
                {isMatched ? t('admin', 'archivedBadge') : isBanned ? t('admin', 'bannedBadge') : t('admin', 'matrimonyApprovedBadge')}
              </Text>
            </View>
          )}

          <Text style={labelStyle}>{t('admin', 'matrimonyNameLabel')}</Text>
          <TextInput editable={!isMatched} style={inputStyle} placeholder={t('admin', 'matrimonyNameLabel')} placeholderTextColor={C.textFaint} value={form.name} onChangeText={(v) => setField('name', v)} />

          <Text style={labelStyle}>{t('admin', 'matrimonyGenderLabel')}</Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
            {(['Male', 'Female'] as const).map(g => (
              <TouchableOpacity
                key={g}
                disabled={isMatched}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setField('gender', g); }}
                style={{
                  flex: 1, alignItems: 'center', paddingVertical: spacing.md, borderRadius: radius.md,
                  borderWidth: 1, borderColor: form.gender === g ? C.primary : C.border,
                  backgroundColor: form.gender === g ? C.primary + '15' : C.card,
                  opacity: isMatched ? 0.6 : 1,
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
                editable={!isMatched}
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
            {!isMatched && (
              <Button variant="primary" label={t('common', 'save')} onPress={handleSave} loading={saving} />
            )}
            {isEdit && !isMatched && (
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
                  label={t('admin', 'confirmMatchButton')}
                  icon={<Heart size={16} color={C.primary} />}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setMatchModalVisible(true); }}
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

      {isEdit && (
        <ConfirmMatchModal
          visible={matchModalVisible}
          candidateId={id!}
          onClose={() => setMatchModalVisible(false)}
          onConfirmed={handleMatchConfirmed}
        />
      )}
    </View>
  );
}

// ════════════════════════════════════════════════
//  Confirm Match / Marriage modal
// ════════════════════════════════════════════════
function ConfirmMatchModal({ visible, candidateId, onClose, onConfirmed }: {
  visible: boolean; candidateId: string | number; onClose: () => void;
  onConfirmed: (candidate: adminApi.MatrimonyCandidate) => void;
}) {
  const { colors: C, spacing, radius, typography, shadow } = useTheme();
  const { lang, t } = useLanguage();
  const fontRegular = lang === 'od' ? 'NotoSansOriya' : undefined;
  const fontBold = lang === 'od' ? 'NotoSansOriya-Bold' : undefined;

  const [partnerMemberId, setPartnerMemberId] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [partnerGender, setPartnerGender] = useState<'Male' | 'Female' | ''>('');
  const [matchDate, setMatchDate] = useState('');
  const [evidence, setEvidence] = useState<PickedFile | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setPartnerMemberId('');
      setPartnerName('');
      setPartnerGender('');
      setMatchDate('');
      setEvidence(null);
    }
  }, [visible]);

  const pickEvidence = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    setEvidence(pickedFromAsset(result.assets[0]));
  };

  const handleSubmit = async () => {
    if (!partnerName.trim()) {
      Alert.alert(t('common', 'errorTitle'), t('admin', 'matchedPartnerNameRequiredError'));
      return;
    }
    if (!partnerGender) {
      Alert.alert(t('common', 'errorTitle'), t('admin', 'matchedPartnerGenderRequiredError'));
      return;
    }
    if (!evidence) {
      Alert.alert(t('common', 'errorTitle'), t('admin', 'evidenceRequiredError'));
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSubmitting(true);
    try {
      const fd = new FormData();
      if (partnerMemberId.trim()) fd.append('matchedPartnerMemberId', partnerMemberId.trim());
      fd.append('matchedPartnerName', partnerName.trim());
      fd.append('matchedPartnerGender', partnerGender);
      if (matchDate.trim()) fd.append('matchDate', matchDate.trim());
      // @ts-ignore — React Native FormData file shape
      fd.append('evidence', evidence);

      const data = await adminApi.confirmMatrimonyMatch(candidateId, fd);
      if (data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onConfirmed(data.candidate);
      } else {
        throw new Error(data.message || t('admin', 'confirmMatchError'));
      }
    } catch (e: any) {
      console.error('[ADMIN_MATRIMONY_FORM] Confirm match failed:', e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common', 'errorTitle'), e.message || t('admin', 'confirmMatchError'));
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = {
    borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    marginBottom: spacing.lg, backgroundColor: C.bg, borderColor: C.border, color: C.text,
    fontFamily: fontRegular, ...typography.body,
  };
  const labelStyle = { color: C.textMuted, marginBottom: spacing.sm, fontFamily: fontBold, ...typography.label };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#00000080', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: C.card, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, maxHeight: '90%', ...shadow.raised }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg }}>
            <Text style={{ color: C.text, fontFamily: fontBold, ...typography.title }}>{t('admin', 'confirmMatchTitle')}</Text>
            <TouchableOpacity onPress={onClose}><X size={20} color={C.textMuted} /></TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={labelStyle}>{t('admin', 'matchedPartnerMemberIdLabel')}</Text>
            <TextInput
              value={partnerMemberId}
              onChangeText={setPartnerMemberId}
              placeholder="MEM1234567"
              placeholderTextColor={C.textFaint}
              autoCapitalize="characters"
              style={inputStyle}
            />
            <Text style={{ color: C.textFaint, marginTop: -spacing.md, marginBottom: spacing.lg, fontFamily: fontRegular, ...typography.caption }}>
              {t('admin', 'matchedPartnerMemberIdHelpText')}
            </Text>

            <Text style={labelStyle}>{t('admin', 'matchedPartnerNameFieldLabel')}</Text>
            <TextInput
              value={partnerName}
              onChangeText={setPartnerName}
              placeholderTextColor={C.textFaint}
              style={inputStyle}
            />

            <Text style={labelStyle}>{t('admin', 'matchedPartnerGenderFieldLabel')}</Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
              {(['Male', 'Female'] as const).map(g => (
                <TouchableOpacity
                  key={g}
                  onPress={() => setPartnerGender(g)}
                  style={{
                    flex: 1, alignItems: 'center', paddingVertical: spacing.md, borderRadius: radius.md,
                    borderWidth: 1, borderColor: partnerGender === g ? C.primary : C.border,
                    backgroundColor: partnerGender === g ? C.primary + '15' : C.bg,
                  }}
                >
                  <Text style={{ color: partnerGender === g ? C.primary : C.textMuted, ...typography.body, fontWeight: '700' }}>
                    {g === 'Male' ? t('admin', 'matrimonyGenderMale') : t('admin', 'matrimonyGenderFemale')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={labelStyle}>{t('admin', 'matchDateFieldLabel')}</Text>
            <TextInput
              value={matchDate}
              onChangeText={setMatchDate}
              placeholder={t('admin', 'matchDatePlaceholder')}
              placeholderTextColor={C.textFaint}
              style={inputStyle}
            />

            <Text style={labelStyle}>{t('admin', 'evidenceFieldLabel')}</Text>
            <Text style={{ color: C.textFaint, marginBottom: spacing.sm, fontFamily: fontRegular, ...typography.caption }}>
              {t('admin', 'evidenceHelpText')}
            </Text>
            {evidence ? (
              <Image source={{ uri: evidence.uri }} style={{ width: '100%', height: 140, borderRadius: radius.md, marginBottom: spacing.sm }} contentFit="cover" />
            ) : null}
            <TouchableOpacity
              onPress={pickEvidence}
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
                borderWidth: 1, borderColor: C.border, borderRadius: radius.md, paddingVertical: spacing.md, marginBottom: spacing.xl,
              }}
            >
              <Camera size={18} color={C.primary} />
              <Text style={{ color: C.primary, ...typography.bodyEmphasis }}>{t('admin', 'chooseEvidenceButton')}</Text>
            </TouchableOpacity>

            <Button
              label={t('admin', 'confirmMatchSubmitButton')}
              variant="primary"
              onPress={handleSubmit}
              loading={submitting}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
