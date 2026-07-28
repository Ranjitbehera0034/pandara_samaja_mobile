// src/screens/community/MatrimonyScreen.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Dimensions,
  Linking,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, Heart, X, MapPin, Briefcase, GraduationCap, FileText,
  Search, SlidersHorizontal, ImagePlus, Camera, ImageOff,
} from 'lucide-react-native';
import * as matrimonyApi from '../../api/matrimony';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import SkeletonBox from '../../components/common/SkeletonBox';
import EmptyState from '../../components/common/EmptyState';
import Button from '../../components/common/Button';

const { width: W, height: H } = Dimensions.get('window');

type Gender = 'male' | 'female';
type TabKey = 'browse' | 'myProfile' | 'matches';
type SortKey = 'newest' | 'age_asc' | 'age_desc' | 'name';

interface Candidate {
  id: string | number;
  name: string;
  gender: string;
  dob?: string | null;
  age?: number | null;
  height?: string | null;
  blood_group?: string | null;
  gotra?: string | null;
  bansha?: string | null;
  education?: string | null;
  technical_education?: string | null;
  professional_education?: string | null;
  occupation?: string | null;
  father?: string | null;
  mother?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  photo?: string | null;
  photos?: string[] | null;
  form_url?: string | null;
  submitted_by?: string | number | null;
  is_matched?: boolean;
  created_at?: string;
}

interface FilterState {
  minAge: string;
  maxAge: string;
  education: string;
  gotra: string;
  gender: '' | 'male' | 'female'; // which gender of candidates to show
}

const EMPTY_FILTERS: FilterState = { minAge: '', maxAge: '', education: '', gotra: '', gender: '' };

interface ProfileFormState {
  name: string; gender: Gender | ''; dob: string; age: string; height: string;
  bloodGroup: string; gotra: string; bansha: string; education: string;
  technicalEducation: string; professionalEducation: string; occupation: string;
  father: string; mother: string; address: string; phone: string; email: string;
}

const EMPTY_PROFILE_FORM: ProfileFormState = {
  name: '', gender: '', dob: '', age: '', height: '', bloodGroup: '', gotra: '', bansha: '',
  education: '', technicalEducation: '', professionalEducation: '', occupation: '',
  father: '', mother: '', address: '', phone: '', email: '',
};

const LIMIT = 10;

function getCandidatePhotos(c: Candidate): string[] {
  if (c.photos && c.photos.length > 0) return c.photos;
  if (c.photo) return [c.photo];
  return [];
}

// ════════════════════════════════════════════════
//  Photo carousel — shared by card + detail modal
// ════════════════════════════════════════════════
function PhotoCarousel({ photos, width, height, borderRadius, colors: C }: {
  photos: string[]; width: number; height: number; borderRadius: number; colors: ReturnType<typeof useTheme>['colors'];
}) {
  const [idx, setIdx] = useState(0);

  if (photos.length === 0) {
    return (
      <View style={{ width, height, borderRadius, backgroundColor: C.border, alignItems: 'center', justifyContent: 'center' }}>
        <ImageOff size={36} color={C.textFaint} />
      </View>
    );
  }

  return (
    <View style={{ width, height, borderRadius, overflow: 'hidden' }}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setIdx(Math.round(e.nativeEvent.contentOffset.x / width))}
      >
        {photos.map((uri, i) => (
          <Image key={i} source={{ uri }} style={{ width, height }} contentFit="cover" transition={150} />
        ))}
      </ScrollView>
      {photos.length > 1 && (
        <View style={{ position: 'absolute', bottom: 8, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 4 }}>
          {photos.map((_, i) => (
            <View
              key={i}
              style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: i === idx ? '#fff' : 'rgba(255,255,255,0.5)' }}
            />
          ))}
        </View>
      )}
    </View>
  );
}

// ════════════════════════════════════════════════
//  Candidate detail modal (browse tap / matches tap)
// ════════════════════════════════════════════════
function CandidateDetailModal({ candidate, onClose }: { candidate: Candidate | null; onClose: () => void }) {
  const { colors: C, spacing, radius, typography } = useTheme();
  const { lang, t } = useLanguage();
  const fontFamily = lang === 'od' ? 'NotoSansOriya' : undefined;
  const fontFamilyBold = lang === 'od' ? 'NotoSansOriya-Bold' : undefined;

  if (!candidate) return null;
  const photos = getCandidatePhotos(candidate);

  const openForm = () => {
    if (!candidate.form_url) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(candidate.form_url).catch(() => Alert.alert(t('common', 'errorTitle'), t('common', 'error')));
  };

  const Row = ({ label, value }: { label: string; value?: string | number | null }) => {
    if (value === undefined || value === null || value === '') return null;
    return (
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 0.5, borderBottomColor: C.border }}>
        <Text style={{ color: C.textMuted, ...typography.body }}>{label}</Text>
        <Text style={{ color: C.text, textAlign: 'right', flex: 1, marginLeft: spacing.xl - 4, fontFamily, ...typography.bodyEmphasis }}>
          {value}
        </Text>
      </View>
    );
  };

  return (
    <Modal visible={!!candidate} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <View style={{ height: H * 0.35, position: 'relative' }}>
          <PhotoCarousel photos={photos} width={W} height={H * 0.35} borderRadius={0} colors={C} />
          <TouchableOpacity
            onPress={onClose}
            style={{
              position: 'absolute', top: spacing.lg, right: spacing.lg,
              backgroundColor: 'rgba(15, 23, 42, 0.7)', width: 36, height: 36, borderRadius: radius.full,
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={20} color="white" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: spacing.xl - 4, paddingBottom: spacing.xxl + spacing.xxl }}>
          <Text style={{ color: C.text, fontFamily: fontFamilyBold, ...typography.display }}>
            {candidate.name}{typeof candidate.age === 'number' ? `, ${candidate.age}` : ''}
          </Text>
          {candidate.gotra ? (
            <Text style={{ color: C.primaryLight, marginTop: spacing.xs, fontFamily, ...typography.label }}>
              {t('matrimony', 'gotraLabel')} {candidate.gotra}
            </Text>
          ) : null}

          <View style={{ marginTop: spacing.xl }}>
            <Text style={{ color: C.textMuted, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: spacing.md, ...typography.caption, fontWeight: '700' }}>
              {t('matrimony', 'profileDetailsHeader')}
            </Text>
            <Row label={t('matrimony', 'heightLabel')} value={candidate.height} />
            <Row label={t('matrimony', 'bloodGroupLabel')} value={candidate.blood_group} />
            <Row label={t('matrimony', 'banshaLabel')} value={candidate.bansha} />
            <Row label={t('matrimony', 'educationLabel')} value={candidate.education} />
            <Row label={t('matrimony', 'technicalEducationLabel')} value={candidate.technical_education} />
            <Row label={t('matrimony', 'professionalEducationLabel')} value={candidate.professional_education} />
            <Row label={t('matrimony', 'occupationLabel')} value={candidate.occupation} />
            <Row label={t('matrimony', 'fatherLabel')} value={candidate.father} />
            <Row label={t('matrimony', 'motherLabel')} value={candidate.mother} />
            <Row label={t('matrimony', 'addressLabel')} value={candidate.address} />
            <Row label={t('matrimony', 'phoneLabel')} value={candidate.phone} />
            <Row label={t('matrimony', 'emailLabel')} value={candidate.email} />
          </View>

          {candidate.form_url ? (
            <TouchableOpacity
              onPress={openForm}
              style={{
                marginTop: spacing.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                gap: spacing.sm, backgroundColor: C.primary + '15', borderWidth: 1, borderColor: C.primary + '30',
                borderRadius: radius.md, paddingVertical: spacing.md,
              }}
            >
              <FileText size={18} color={C.primary} />
              <Text style={{ color: C.primary, ...typography.bodyEmphasis }}>{t('matrimony', 'viewBiodataButton')}</Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ════════════════════════════════════════════════
//  Search / filter / sort modal
// ════════════════════════════════════════════════
function MatrimonyFilterModal({ visible, onClose, filters, sort, onApply }: {
  visible: boolean; onClose: () => void; filters: FilterState; sort: SortKey;
  onApply: (filters: FilterState, sort: SortKey) => void;
}) {
  const { colors: C, spacing, radius, typography, shadow } = useTheme();
  const { t } = useLanguage();
  const [local, setLocal] = useState<FilterState>(filters);
  const [localSort, setLocalSort] = useState<SortKey>(sort);

  useEffect(() => {
    if (visible) {
      setLocal(filters);
      setLocalSort(sort);
    }
  }, [visible, filters, sort]);

  const SORT_OPTIONS: { value: SortKey; label: string }[] = [
    { value: 'newest', label: t('matrimony', 'sortNewest') },
    { value: 'age_asc', label: t('matrimony', 'sortAgeAsc') },
    { value: 'age_desc', label: t('matrimony', 'sortAgeDesc') },
    { value: 'name', label: t('matrimony', 'sortName') },
  ];
  const GENDER_OPTIONS: { value: '' | 'male' | 'female'; label: string }[] = [
    { value: '', label: t('matrimony', 'filterAll') },
    { value: 'male', label: t('matrimony', 'filterGrooms') },
    { value: 'female', label: t('matrimony', 'filterBrides') },
  ];

  const inputStyle = {
    backgroundColor: C.bg, borderColor: C.border, color: C.text, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, ...typography.body,
  };
  const labelStyle = { color: C.textMuted, marginBottom: spacing.xs, ...typography.caption };

  const handleReset = () => {
    setLocal(EMPTY_FILTERS);
    setLocalSort('newest');
    onApply(EMPTY_FILTERS, 'newest');
    onClose();
  };

  const handleApply = () => {
    onApply(local, localSort);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#00000080', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: C.card, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, maxHeight: '88%', ...shadow.raised }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg }}>
            <Text style={{ color: C.text, ...typography.title }}>{t('matrimony', 'filtersTitle')}</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={20} color={C.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={labelStyle}>{t('matrimony', 'sortLabel')}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg }}>
              {SORT_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => setLocalSort(opt.value)}
                  style={{
                    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full,
                    backgroundColor: localSort === opt.value ? C.primary : C.bg,
                    borderWidth: 1, borderColor: localSort === opt.value ? C.primary : C.border,
                  }}
                >
                  <Text style={{ color: localSort === opt.value ? 'white' : C.textMuted, ...typography.caption, fontWeight: '700' }}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={labelStyle}>{t('matrimony', 'genderFilterLabel')}</Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
              {GENDER_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.value || 'all'}
                  onPress={() => setLocal(f => ({ ...f, gender: opt.value }))}
                  style={{
                    flex: 1, paddingVertical: spacing.sm, borderRadius: radius.md, alignItems: 'center',
                    backgroundColor: local.gender === opt.value ? C.primary : C.bg,
                    borderWidth: 1, borderColor: local.gender === opt.value ? C.primary : C.border,
                  }}
                >
                  <Text style={{ color: local.gender === opt.value ? 'white' : C.textMuted, ...typography.caption, fontWeight: '700' }}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg }}>
              <View style={{ flex: 1 }}>
                <Text style={labelStyle}>{t('matrimony', 'minAgeLabel')}</Text>
                <TextInput
                  value={local.minAge}
                  onChangeText={(v) => setLocal(f => ({ ...f, minAge: v.replace(/[^0-9]/g, '') }))}
                  keyboardType="number-pad"
                  placeholder="18"
                  placeholderTextColor={C.textFaint}
                  style={inputStyle}
                  className="border"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={labelStyle}>{t('matrimony', 'maxAgeLabel')}</Text>
                <TextInput
                  value={local.maxAge}
                  onChangeText={(v) => setLocal(f => ({ ...f, maxAge: v.replace(/[^0-9]/g, '') }))}
                  keyboardType="number-pad"
                  placeholder="45"
                  placeholderTextColor={C.textFaint}
                  style={inputStyle}
                  className="border"
                />
              </View>
            </View>

            <Text style={labelStyle}>{t('matrimony', 'educationFilterLabel')}</Text>
            <TextInput
              value={local.education}
              onChangeText={(v) => setLocal(f => ({ ...f, education: v }))}
              placeholder={t('matrimony', 'educationFilterPlaceholder')}
              placeholderTextColor={C.textFaint}
              style={[inputStyle, { marginBottom: spacing.lg }]}
              className="border"
            />

            <Text style={labelStyle}>{t('matrimony', 'gotraFilterLabel')}</Text>
            <TextInput
              value={local.gotra}
              onChangeText={(v) => setLocal(f => ({ ...f, gotra: v }))}
              placeholder={t('matrimony', 'gotraFilterPlaceholder')}
              placeholderTextColor={C.textFaint}
              style={[inputStyle, { marginBottom: spacing.xl }]}
              className="border"
            />
          </ScrollView>

          <View style={{ flexDirection: 'row', gap: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: C.border }}>
            <View style={{ flex: 1 }}>
              <Button label={t('matrimony', 'resetFiltersButton')} variant="secondary" onPress={handleReset} />
            </View>
            <View style={{ flex: 1 }}>
              <Button label={t('matrimony', 'applyFiltersButton')} variant="primary" onPress={handleApply} />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ════════════════════════════════════════════════
//  Create / edit "my profile" form modal
// ════════════════════════════════════════════════
function ProfileFormModal({ visible, initial, onClose, onSaved }: {
  visible: boolean; initial: Candidate | null; onClose: () => void; onSaved: (c: Candidate) => void;
}) {
  const { colors: C, spacing, radius, typography, shadow } = useTheme();
  const { lang, t } = useLanguage();
  const fontFamily = lang === 'od' ? 'NotoSansOriya' : undefined;
  const fontFamilyBold = lang === 'od' ? 'NotoSansOriya-Bold' : undefined;

  const [form, setForm] = useState<ProfileFormState>(EMPTY_PROFILE_FORM);
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]);
  const [existingFormUrl, setExistingFormUrl] = useState<string | null>(null);
  const [newPhotos, setNewPhotos] = useState<{ uri: string; name: string; type: string }[]>([]);
  const [formFile, setFormFile] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (initial) {
      setForm({
        name: initial.name || '',
        gender: (initial.gender === 'male' || initial.gender === 'female') ? initial.gender : '',
        dob: initial.dob || '',
        age: initial.age != null ? String(initial.age) : '',
        height: initial.height || '',
        bloodGroup: initial.blood_group || '',
        gotra: initial.gotra || '',
        bansha: initial.bansha || '',
        education: initial.education || '',
        technicalEducation: initial.technical_education || '',
        professionalEducation: initial.professional_education || '',
        occupation: initial.occupation || '',
        father: initial.father || '',
        mother: initial.mother || '',
        address: initial.address || '',
        phone: initial.phone || '',
        email: initial.email || '',
      });
      setExistingPhotos(getCandidatePhotos(initial));
      setExistingFormUrl(initial.form_url || null);
    } else {
      setForm(EMPTY_PROFILE_FORM);
      setExistingPhotos([]);
      setExistingFormUrl(null);
    }
    setNewPhotos([]);
    setFormFile(null);
  }, [visible, initial]);

  const set = (key: keyof ProfileFormState) => (value: string) => setForm(f => ({ ...f, [key]: value }));

  const pickPhotos = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (result.canceled || result.assets.length === 0) return;
    const picked = result.assets.map(asset => {
      const parts = asset.uri.split('/');
      return { uri: asset.uri, name: parts[parts.length - 1], type: 'image/jpeg' };
    });
    setNewPhotos(prev => [...prev, ...picked]);
  };

  const removeNewPhoto = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNewPhotos(prev => prev.filter((_, i) => i !== index));
  };

  // NOTE: expo-document-picker is not installed in this project, so the
  // "biodata form" upload falls back to picking a photographed/scanned
  // image of the document via expo-image-picker (single image, no PDFs).
  const pickForm = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const parts = asset.uri.split('/');
    setFormFile({ uri: asset.uri, name: parts[parts.length - 1], type: 'image/jpeg' });
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      Alert.alert(t('common', 'errorTitle'), t('matrimony', 'nameRequiredError'));
      return;
    }
    if (!form.gender) {
      Alert.alert(t('common', 'errorTitle'), t('matrimony', 'genderRequiredError'));
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSaving(true);
    try {
      const fd = new FormData();
      if (initial?.id) fd.append('id', String(initial.id));
      fd.append('name', form.name.trim());
      fd.append('gender', form.gender);
      if (form.dob.trim()) fd.append('dob', form.dob.trim());
      if (form.age.trim()) fd.append('age', form.age.trim());
      if (form.height.trim()) fd.append('height', form.height.trim());
      if (form.bloodGroup.trim()) fd.append('bloodGroup', form.bloodGroup.trim());
      if (form.gotra.trim()) fd.append('gotra', form.gotra.trim());
      if (form.bansha.trim()) fd.append('bansha', form.bansha.trim());
      if (form.education.trim()) fd.append('education', form.education.trim());
      if (form.technicalEducation.trim()) fd.append('technicalEducation', form.technicalEducation.trim());
      if (form.professionalEducation.trim()) fd.append('professionalEducation', form.professionalEducation.trim());
      if (form.occupation.trim()) fd.append('occupation', form.occupation.trim());
      if (form.father.trim()) fd.append('father', form.father.trim());
      if (form.mother.trim()) fd.append('mother', form.mother.trim());
      if (form.address.trim()) fd.append('address', form.address.trim());
      if (form.phone.trim()) fd.append('phone', form.phone.trim());
      if (form.email.trim()) fd.append('email', form.email.trim());

      if (formFile) {
        // @ts-ignore — React Native FormData file shape
        fd.append('form', formFile);
      }
      newPhotos.forEach((photo) => {
        // @ts-ignore — React Native FormData file shape
        fd.append('photos', photo);
      });

      const data = await matrimonyApi.saveProfile(fd);
      if (data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onSaved(data.candidate);
        onClose();
      }
    } catch (e) {
      console.error('[MATRIMONY] save profile failed:', e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common', 'errorTitle'), t('matrimony', 'saveProfileError'));
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    backgroundColor: C.bg, borderColor: C.border, color: C.text, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, marginBottom: spacing.lg,
    fontFamily, ...typography.body,
  };
  const labelStyle = { color: C.textMuted, marginBottom: spacing.xs, fontFamily, ...typography.caption };

  const Field = ({ label, value, onChangeText, placeholder, keyboardType, multiline }: {
    label: string; value: string; onChangeText: (v: string) => void; placeholder?: string;
    keyboardType?: 'default' | 'numeric' | 'phone-pad' | 'email-address'; multiline?: boolean;
  }) => (
    <View>
      <Text style={labelStyle}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={C.textFaint}
        keyboardType={keyboardType}
        multiline={multiline}
        style={multiline ? [inputStyle, { minHeight: 72, textAlignVertical: 'top' }] : inputStyle}
        className="border"
      />
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#00000080', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: C.bg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, maxHeight: '92%', ...shadow.raised }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg }}>
            <Text style={{ color: C.text, fontFamily: fontFamilyBold, ...typography.title }}>
              {initial ? t('matrimony', 'editFormTitle') : t('matrimony', 'createFormTitle')}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X size={20} color={C.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Field label={t('matrimony', 'nameFieldLabel')} value={form.name} onChangeText={set('name')} placeholder={t('matrimony', 'namePlaceholder')} />

            <Text style={labelStyle}>{t('matrimony', 'genderFieldLabel')}</Text>
            <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg }}>
              <TouchableOpacity
                onPress={() => setForm(f => ({ ...f, gender: 'male' }))}
                style={{
                  flex: 1, paddingVertical: spacing.sm + 2, borderRadius: radius.md, alignItems: 'center',
                  backgroundColor: form.gender === 'male' ? C.male : C.card,
                  borderWidth: 1, borderColor: form.gender === 'male' ? C.male : C.border,
                }}
              >
                <Text style={{ color: form.gender === 'male' ? 'white' : C.textMuted, ...typography.bodyEmphasis }}>
                  {t('matrimony', 'maleOption')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setForm(f => ({ ...f, gender: 'female' }))}
                style={{
                  flex: 1, paddingVertical: spacing.sm + 2, borderRadius: radius.md, alignItems: 'center',
                  backgroundColor: form.gender === 'female' ? C.female : C.card,
                  borderWidth: 1, borderColor: form.gender === 'female' ? C.female : C.border,
                }}
              >
                <Text style={{ color: form.gender === 'female' ? 'white' : C.textMuted, ...typography.bodyEmphasis }}>
                  {t('matrimony', 'femaleOption')}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <View style={{ flex: 1 }}>
                <Field label={t('matrimony', 'dobLabel')} value={form.dob} onChangeText={set('dob')} placeholder={t('matrimony', 'dobPlaceholder')} />
              </View>
              <View style={{ width: 110 }}>
                <Field
                  label={t('matrimony', 'ageFieldLabel')}
                  value={form.age}
                  onChangeText={(v) => set('age')(v.replace(/[^0-9]/g, ''))}
                  placeholder={t('matrimony', 'ageFieldPlaceholder')}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <View style={{ flex: 1 }}>
                <Field label={t('matrimony', 'heightLabel')} value={form.height} onChangeText={set('height')} placeholder={t('matrimony', 'heightPlaceholder')} />
              </View>
              <View style={{ flex: 1 }}>
                <Field label={t('matrimony', 'bloodGroupLabel')} value={form.bloodGroup} onChangeText={set('bloodGroup')} placeholder={t('matrimony', 'bloodGroupPlaceholder')} />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <View style={{ flex: 1 }}>
                <Field label={t('matrimony', 'gotraLabel')} value={form.gotra} onChangeText={set('gotra')} placeholder={t('matrimony', 'gotraFilterPlaceholder')} />
              </View>
              <View style={{ flex: 1 }}>
                <Field label={t('matrimony', 'banshaLabel')} value={form.bansha} onChangeText={set('bansha')} placeholder={t('matrimony', 'banshaPlaceholder')} />
              </View>
            </View>

            <Field label={t('matrimony', 'educationLabel')} value={form.education} onChangeText={set('education')} placeholder={t('matrimony', 'educationPlaceholder')} />
            <Field label={t('matrimony', 'technicalEducationLabel')} value={form.technicalEducation} onChangeText={set('technicalEducation')} placeholder={t('matrimony', 'technicalEducationPlaceholder')} />
            <Field label={t('matrimony', 'professionalEducationLabel')} value={form.professionalEducation} onChangeText={set('professionalEducation')} placeholder={t('matrimony', 'professionalEducationPlaceholder')} />
            <Field label={t('matrimony', 'occupationLabel')} value={form.occupation} onChangeText={set('occupation')} placeholder={t('matrimony', 'occupationPlaceholder')} />
            <Field label={t('matrimony', 'fatherLabel')} value={form.father} onChangeText={set('father')} placeholder={t('matrimony', 'fatherPlaceholder')} />
            <Field label={t('matrimony', 'motherLabel')} value={form.mother} onChangeText={set('mother')} placeholder={t('matrimony', 'motherPlaceholder')} />
            <Field label={t('matrimony', 'addressLabel')} value={form.address} onChangeText={set('address')} placeholder={t('matrimony', 'addressPlaceholder')} multiline />
            <Field label={t('matrimony', 'phoneLabel')} value={form.phone} onChangeText={set('phone')} placeholder={t('matrimony', 'phonePlaceholder')} keyboardType="phone-pad" />
            <Field label={t('matrimony', 'emailLabel')} value={form.email} onChangeText={set('email')} placeholder={t('matrimony', 'emailPlaceholder')} keyboardType="email-address" />

            {/* Photos */}
            <Text style={labelStyle}>{t('matrimony', 'photosFieldLabel')}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm }}>
              {existingPhotos.map((uri, i) => (
                <Image key={`existing-${i}`} source={{ uri }} style={{ width: 72, height: 72, borderRadius: radius.md }} contentFit="cover" />
              ))}
              {newPhotos.map((p, i) => (
                <View key={`new-${i}`} style={{ position: 'relative' }}>
                  <Image source={{ uri: p.uri }} style={{ width: 72, height: 72, borderRadius: radius.md }} contentFit="cover" />
                  <TouchableOpacity
                    onPress={() => removeNewPhoto(i)}
                    style={{
                      position: 'absolute', top: -6, right: -6, backgroundColor: C.error, borderRadius: radius.full,
                      width: 20, height: 20, alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <X size={12} color="white" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
            <TouchableOpacity
              onPress={pickPhotos}
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
                borderWidth: 1, borderColor: C.border, borderRadius: radius.md, paddingVertical: spacing.md, marginBottom: spacing.lg,
              }}
            >
              <ImagePlus size={18} color={C.primary} />
              <Text style={{ color: C.primary, ...typography.bodyEmphasis }}>{t('matrimony', 'choosePhotosButton')}</Text>
            </TouchableOpacity>

            {/* Biodata form */}
            <Text style={labelStyle}>{t('matrimony', 'formFieldLabel')}</Text>
            <Text style={{ color: C.textFaint, marginBottom: spacing.sm, fontFamily, ...typography.caption }}>
              {t('matrimony', 'formPickerHelpText')}
            </Text>
            {formFile ? (
              <Image source={{ uri: formFile.uri }} style={{ width: '100%', height: 140, borderRadius: radius.md, marginBottom: spacing.sm }} contentFit="cover" />
            ) : existingFormUrl ? (
              <TouchableOpacity
                onPress={() => Linking.openURL(existingFormUrl).catch(() => {})}
                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}
              >
                <FileText size={16} color={C.primary} />
                <Text style={{ color: C.primary, ...typography.caption }}>{t('matrimony', 'viewBiodataButton')}</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              onPress={pickForm}
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
                borderWidth: 1, borderColor: C.border, borderRadius: radius.md, paddingVertical: spacing.md, marginBottom: spacing.xl,
              }}
            >
              <Camera size={18} color={C.primary} />
              <Text style={{ color: C.primary, ...typography.bodyEmphasis }}>{t('matrimony', 'chooseFormButton')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={saving}
              style={{ backgroundColor: saving ? C.border : C.primary, paddingVertical: spacing.md, borderRadius: radius.md, alignItems: 'center', marginBottom: spacing.xl }}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={{ color: 'white', fontFamily: fontFamilyBold, ...typography.bodyEmphasis }}>
                  {t('matrimony', 'submitProfileButton')}
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ════════════════════════════════════════════════
//  Browse deck card
// ════════════════════════════════════════════════
function CandidateCard({ candidate, onLike, onPass, onOpenDetail, actionLoading }: {
  candidate: Candidate; onLike: () => void; onPass: () => void; onOpenDetail: () => void; actionLoading: boolean;
}) {
  const { colors: C, spacing, radius, typography, shadow } = useTheme();
  const { lang, t } = useLanguage();
  const fontFamily = lang === 'od' ? 'NotoSansOriya' : undefined;
  const fontFamilyBold = lang === 'od' ? 'NotoSansOriya-Bold' : undefined;
  const photos = getCandidatePhotos(candidate);
  const cardWidth = W - spacing.lg * 2;

  return (
    <View style={{ backgroundColor: C.card, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: C.border, ...shadow.card }}>
      <TouchableOpacity activeOpacity={0.9} onPress={onOpenDetail}>
        <View style={{ position: 'relative' }}>
          <PhotoCarousel photos={photos} width={cardWidth} height={cardWidth * 0.95} borderRadius={0} colors={C} />
          <View
            style={{
              position: 'absolute', bottom: spacing.md, left: spacing.md,
              backgroundColor: candidate.gender === 'male' ? C.male : C.female,
              paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.sm,
            }}
          >
            <Text style={{ color: 'white', ...typography.caption, fontWeight: '700' }}>
              {candidate.gender === 'male' ? t('matrimony', 'groomTag') : t('matrimony', 'brideTag')}
            </Text>
          </View>
        </View>

        <View style={{ padding: spacing.lg }}>
          <Text style={{ color: C.text, fontFamily: fontFamilyBold, ...typography.title }}>
            {candidate.name}{typeof candidate.age === 'number' ? `, ${candidate.age}` : ''}
          </Text>
          {candidate.gotra ? (
            <Text style={{ color: C.primaryLight, marginTop: spacing.xs, fontFamily, ...typography.bodyEmphasis }}>
              {t('matrimony', 'gotraLabel')} {candidate.gotra}
            </Text>
          ) : null}

          <View style={{ marginTop: spacing.md, gap: spacing.xs + 2 }}>
            {candidate.education ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2 }}>
                <GraduationCap size={16} color={C.textMuted} />
                <Text style={{ color: C.textMuted, fontFamily, fontSize: 13 }}>{candidate.education}</Text>
              </View>
            ) : null}
            {candidate.occupation ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2 }}>
                <Briefcase size={16} color={C.textMuted} />
                <Text style={{ color: C.textMuted, fontFamily, fontSize: 13 }}>{candidate.occupation}</Text>
              </View>
            ) : null}
            {candidate.address ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2 }}>
                <MapPin size={16} color={C.textMuted} />
                <Text style={{ color: C.textMuted, fontFamily, fontSize: 13 }}>{candidate.address}</Text>
              </View>
            ) : null}
          </View>

          {candidate.form_url ? (
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                Linking.openURL(candidate.form_url as string).catch(() => {});
              }}
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
                marginTop: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: C.border,
              }}
            >
              <FileText size={14} color={C.primary} />
              <Text style={{ color: C.primary, ...typography.caption, fontWeight: '700' }}>{t('matrimony', 'viewBiodataButton')}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </TouchableOpacity>

      {/* Like / Pass actions */}
      <View style={{ flexDirection: 'row', gap: spacing.md, padding: spacing.lg, paddingTop: 0 }}>
        <TouchableOpacity
          disabled={actionLoading}
          onPress={onPass}
          style={{
            flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
            paddingVertical: spacing.md, borderRadius: radius.full, borderWidth: 1.5, borderColor: C.border,
            opacity: actionLoading ? 0.6 : 1,
          }}
        >
          <X size={18} color={C.error} />
          <Text style={{ color: C.error, ...typography.label }}>{t('matrimony', 'passButtonLabel')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          disabled={actionLoading}
          onPress={onLike}
          style={{
            flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
            paddingVertical: spacing.md, borderRadius: radius.full, backgroundColor: C.primary,
            opacity: actionLoading ? 0.6 : 1,
          }}
        >
          {actionLoading ? <ActivityIndicator size="small" color="#fff" /> : <Heart size={18} color="white" fill="white" />}
          <Text style={{ color: 'white', ...typography.label }}>{t('matrimony', 'likeButtonLabel')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function BrowseSkeleton({ colors: C, spacing, radius }: { colors: ReturnType<typeof useTheme>['colors']; spacing: ReturnType<typeof useTheme>['spacing']; radius: ReturnType<typeof useTheme>['radius'] }) {
  const cardWidth = W - spacing.lg * 2;
  return (
    <View style={{ padding: spacing.lg }}>
      <View style={{ backgroundColor: C.card, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: C.border }}>
        <SkeletonBox width="100%" height={cardWidth * 0.95} borderRadius={0} />
        <View style={{ padding: spacing.lg, gap: spacing.sm + 2 }}>
          <SkeletonBox width="60%" height={18} />
          <SkeletonBox width="40%" height={13} />
          <SkeletonBox width="80%" height={13} />
          <SkeletonBox width="55%" height={13} />
        </View>
      </View>
    </View>
  );
}

// ════════════════════════════════════════════════
//  Main screen
// ════════════════════════════════════════════════
export default function MatrimonyScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { lang, t } = useLanguage();
  const { colors: C, spacing, radius, typography } = useTheme();
  const fontFamily = lang === 'od' ? 'NotoSansOriya' : undefined;
  const fontFamilyBold = lang === 'od' ? 'NotoSansOriya-Bold' : undefined;

  const [activeTab, setActiveTab] = useState<TabKey>('browse');
  const [detailCandidate, setDetailCandidate] = useState<Candidate | null>(null);

  // ── Browse tab state ──
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [cursor, setCursor] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingBrowse, setLoadingBrowse] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('newest');
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(searchText.trim()), 500);
    return () => clearTimeout(handle);
  }, [searchText]);

  const buildParams = useCallback((pageNum: number): matrimonyApi.CandidateSearchParams => {
    const params: matrimonyApi.CandidateSearchParams = { page: pageNum, limit: LIMIT, sort };
    if (debouncedSearch) params.search = debouncedSearch;
    if (filters.minAge) params.minAge = filters.minAge;
    if (filters.maxAge) params.maxAge = filters.maxAge;
    if (filters.education.trim()) params.education = filters.education.trim();
    if (filters.gotra.trim()) params.gotra = filters.gotra.trim();
    // The API's `gender` param excludes candidates of that gender (it's meant
    // for "browse the opposite gender by default"), so a UI request to show
    // only grooms (male) must pass gender=female to exclude female, and vice
    // versa.
    if (filters.gender === 'male') params.gender = 'female';
    else if (filters.gender === 'female') params.gender = 'male';
    return params;
  }, [debouncedSearch, sort, filters]);

  const loadBrowse = useCallback(async (pageNum: number, replace: boolean) => {
    if (replace) setLoadingBrowse(true);
    else setLoadingMore(true);
    try {
      const data = await matrimonyApi.fetchCandidates(buildParams(pageNum));
      if (data.success) {
        const list: Candidate[] = data.candidates || [];
        setCandidates(prev => (replace ? list : [...prev, ...list]));
        if (replace) setCursor(0);
        setHasMore(list.length >= LIMIT);
        setPage(pageNum);
      }
    } catch (e) {
      console.error('[MATRIMONY] load candidates failed:', e);
      Alert.alert(t('common', 'errorTitle'), t('matrimony', 'loadError'));
    } finally {
      setLoadingBrowse(false);
      setLoadingMore(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildParams]);

  useEffect(() => {
    loadBrowse(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, sort, filters]);

  // Prefetch the next page as the deck runs low.
  useEffect(() => {
    if (!loadingBrowse && !loadingMore && hasMore && candidates.length - cursor <= 2) {
      loadBrowse(page + 1, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor, candidates.length]);

  const currentCandidate = candidates[cursor];

  const handleSwipe = async (direction: 'like' | 'pass') => {
    if (!currentCandidate || actionLoading) return;
    Haptics.impactAsync(direction === 'like' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
    setActionLoading(true);
    try {
      const data = await matrimonyApi.swipeCandidate(currentCandidate.id, direction);
      if (data.success) {
        if (direction === 'like') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setCursor(prev => prev + 1);
        if (data.matched) {
          setTimeout(() => {
            Alert.alert(t('matrimony', 'matchedAlertTitle'), t('matrimony', 'matchedAlertMessage'));
          }, 250);
        }
      }
    } catch (e) {
      console.error('[MATRIMONY] swipe failed:', e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common', 'errorTitle'), t('matrimony', 'swipeError'));
    } finally {
      setActionLoading(false);
    }
  };

  const resetAllFilters = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSearchText('');
    setDebouncedSearch('');
    setSort('newest');
    setFilters(EMPTY_FILTERS);
  };

  const hasActiveFilters = useMemo(
    () => !!(filters.minAge || filters.maxAge || filters.education || filters.gotra || filters.gender || sort !== 'newest'),
    [filters, sort]
  );

  // ── My Profile tab state ──
  const [myProfile, setMyProfile] = useState<Candidate | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [profileFormVisible, setProfileFormVisible] = useState(false);

  const loadMyProfile = useCallback(async () => {
    setLoadingProfile(true);
    try {
      const data = await matrimonyApi.fetchMyProfile();
      if (data.success) setMyProfile((data.candidates && data.candidates[0]) || null);
    } catch (e) {
      console.error('[MATRIMONY] load profile failed:', e);
      Alert.alert(t('common', 'errorTitle'), t('matrimony', 'loadProfileError'));
    } finally {
      setLoadingProfile(false);
      setProfileLoaded(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeTab === 'myProfile' && !profileLoaded) loadMyProfile();
  }, [activeTab, profileLoaded, loadMyProfile]);

  // ── Matches tab state ──
  const [matches, setMatches] = useState<Candidate[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [matchesLoaded, setMatchesLoaded] = useState(false);

  const loadMatches = useCallback(async () => {
    setLoadingMatches(true);
    try {
      const data = await matrimonyApi.fetchMatches();
      if (data.success) setMatches(data.matches || []);
    } catch (e) {
      console.error('[MATRIMONY] load matches failed:', e);
      Alert.alert(t('common', 'errorTitle'), t('matrimony', 'loadMatchesError'));
    } finally {
      setLoadingMatches(false);
      setMatchesLoaded(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeTab === 'matches' && !matchesLoaded) loadMatches();
  }, [activeTab, matchesLoaded, loadMatches]);

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'browse', label: t('matrimony', 'tabBrowse') },
    { key: 'myProfile', label: t('matrimony', 'tabMyProfile') },
    { key: 'matches', label: t('matrimony', 'tabMatches') },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md + 2,
          backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border,
        }}
      >
        <TouchableOpacity
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.goBack(); }}
          style={{ marginRight: spacing.lg, padding: spacing.xs }}
        >
          <ArrowLeft size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={{ color: C.text, fontFamily: fontFamilyBold, ...typography.title }}>{t('matrimony', 'title')}</Text>
      </View>

      {/* Tabs */}
      <View style={{ flexDirection: 'row', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm }}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveTab(tab.key); }}
            style={{
              flex: 1, paddingVertical: spacing.sm + 2, borderRadius: radius.md, alignItems: 'center',
              backgroundColor: activeTab === tab.key ? C.primary : C.card,
              borderWidth: 1, borderColor: activeTab === tab.key ? C.primary : C.border,
            }}
          >
            <Text
              style={{
                color: activeTab === tab.key ? 'white' : C.textMuted,
                fontFamily: fontFamilyBold, ...typography.bodyEmphasis, fontSize: 13,
              }}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Browse: search + filter bar */}
      {activeTab === 'browse' && (
        <View style={{ flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
          <View
            style={{
              flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
              backgroundColor: C.card, borderRadius: radius.md, borderWidth: 1, borderColor: C.border, paddingHorizontal: spacing.md,
            }}
          >
            <Search size={16} color={C.textFaint} />
            <TextInput
              value={searchText}
              onChangeText={setSearchText}
              placeholder={t('matrimony', 'searchPlaceholder')}
              placeholderTextColor={C.textFaint}
              style={{ flex: 1, color: C.text, paddingVertical: spacing.sm + 2, fontFamily, ...typography.body }}
            />
          </View>
          <TouchableOpacity
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setFilterModalVisible(true); }}
            style={{
              width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center',
              backgroundColor: C.card, borderWidth: 1, borderColor: hasActiveFilters ? C.primary : C.border,
            }}
          >
            <SlidersHorizontal size={18} color={hasActiveFilters ? C.primary : C.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      {/* Browse tab content */}
      {activeTab === 'browse' && (
        loadingBrowse && candidates.length === 0 ? (
          <BrowseSkeleton colors={C} spacing={spacing} radius={radius} />
        ) : candidates.length === 0 ? (
          <EmptyState
            emoji="💍"
            title={t('matrimony', 'emptyTitle')}
            subtitle={t('matrimony', 'emptySubtitle')}
            action={{ label: t('matrimony', 'resetFilter'), onPress: resetAllFilters }}
          />
        ) : cursor >= candidates.length ? (
          loadingMore ? (
            <View style={{ paddingVertical: spacing.xxl, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={C.primary} />
            </View>
          ) : (
            <EmptyState
              emoji="🎉"
              title={t('matrimony', 'emptyTitle')}
              subtitle={t('matrimony', 'emptySubtitle')}
              action={{ label: t('matrimony', 'resetFilter'), onPress: resetAllFilters }}
            />
          )
        ) : (
          <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }} showsVerticalScrollIndicator={false}>
            <CandidateCard
              candidate={currentCandidate}
              onLike={() => handleSwipe('like')}
              onPass={() => handleSwipe('pass')}
              onOpenDetail={() => setDetailCandidate(currentCandidate)}
              actionLoading={actionLoading}
            />
          </ScrollView>
        )
      )}

      {/* My Profile tab content */}
      {activeTab === 'myProfile' && (
        loadingProfile ? (
          <View style={{ padding: spacing.lg }}>
            <SkeletonBox width="100%" height={260} borderRadius={radius.lg} />
          </View>
        ) : myProfile ? (
          <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xxl }} showsVerticalScrollIndicator={false}>
            <Text style={{ color: C.text, fontFamily: fontFamilyBold, marginBottom: spacing.md, ...typography.heading }}>
              {t('matrimony', 'myProfileHeader')}
            </Text>
            <View style={{ backgroundColor: C.card, borderRadius: radius.lg, borderWidth: 1, borderColor: C.border, overflow: 'hidden' }}>
              <PhotoCarousel photos={getCandidatePhotos(myProfile)} width={W - spacing.lg * 2} height={220} borderRadius={0} colors={C} />
              <View style={{ padding: spacing.lg }}>
                <Text style={{ color: C.text, fontFamily: fontFamilyBold, ...typography.title }}>
                  {myProfile.name}{typeof myProfile.age === 'number' ? `, ${myProfile.age}` : ''}
                </Text>
                {myProfile.gotra ? (
                  <Text style={{ color: C.primaryLight, marginTop: spacing.xs, ...typography.bodyEmphasis }}>
                    {t('matrimony', 'gotraLabel')} {myProfile.gotra}
                  </Text>
                ) : null}
                <View style={{ marginTop: spacing.md, gap: spacing.xs }}>
                  {myProfile.education ? (
                    <Text style={{ color: C.textMuted, fontSize: 13 }}>{myProfile.education}</Text>
                  ) : null}
                  {myProfile.occupation ? (
                    <Text style={{ color: C.textMuted, fontSize: 13 }}>{myProfile.occupation}</Text>
                  ) : null}
                </View>
                {myProfile.form_url ? (
                  <TouchableOpacity
                    onPress={() => Linking.openURL(myProfile.form_url as string).catch(() => {})}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.md }}
                  >
                    <FileText size={16} color={C.primary} />
                    <Text style={{ color: C.primary, ...typography.caption }}>{t('matrimony', 'viewBiodataButton')}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
            <View style={{ marginTop: spacing.lg }}>
              <Button
                label={t('matrimony', 'editProfileButton')}
                variant="primary"
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setProfileFormVisible(true); }}
              />
            </View>
          </ScrollView>
        ) : (
          <EmptyState
            emoji="💍"
            title={t('matrimony', 'noProfileTitle')}
            subtitle={t('matrimony', 'noProfileSubtitle')}
            action={{
              label: t('matrimony', 'createProfileButton'),
              onPress: () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setProfileFormVisible(true); },
            }}
          />
        )
      )}

      {/* Matches tab content */}
      {activeTab === 'matches' && (
        loadingMatches ? (
          <View style={{ padding: spacing.lg, gap: spacing.md }}>
            {[1, 2, 3].map(i => <SkeletonBox key={i} width="100%" height={84} borderRadius={radius.lg} />)}
          </View>
        ) : matches.length === 0 ? (
          <EmptyState emoji="💞" title={t('matrimony', 'noMatchesTitle')} subtitle={t('matrimony', 'noMatchesSubtitle')} />
        ) : (
          <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xxl }} showsVerticalScrollIndicator={false}>
            {matches.map((m) => {
              const photos = getCandidatePhotos(m);
              return (
                <TouchableOpacity
                  key={String(m.id)}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setDetailCandidate(m); }}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: C.card,
                    borderRadius: radius.lg, borderWidth: 1, borderColor: C.border, padding: spacing.md, marginBottom: spacing.md,
                  }}
                >
                  {photos.length > 0 ? (
                    <Image source={{ uri: photos[0] }} style={{ width: 64, height: 64, borderRadius: radius.md, backgroundColor: C.border }} contentFit="cover" />
                  ) : (
                    <View style={{ width: 64, height: 64, borderRadius: radius.md, backgroundColor: C.border, alignItems: 'center', justifyContent: 'center' }}>
                      <ImageOff size={20} color={C.textFaint} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: C.text, fontFamily: fontFamilyBold, ...typography.bodyEmphasis }}>
                      {m.name}{typeof m.age === 'number' ? `, ${m.age}` : ''}
                    </Text>
                    {m.gotra ? (
                      <Text style={{ color: C.primaryLight, marginTop: 2, ...typography.caption }}>
                        {t('matrimony', 'gotraLabel')} {m.gotra}
                      </Text>
                    ) : null}
                    <View
                      style={{
                        marginTop: spacing.xs, alignSelf: 'flex-start', backgroundColor: C.success + '15',
                        paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.sm,
                      }}
                    >
                      <Text style={{ color: C.success, ...typography.caption, fontWeight: '700' }}>
                        {t('matrimony', 'matchedBadge')}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )
      )}

      {/* Overlays */}
      <CandidateDetailModal candidate={detailCandidate} onClose={() => setDetailCandidate(null)} />
      <MatrimonyFilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        filters={filters}
        sort={sort}
        onApply={(f, s) => { setFilters(f); setSort(s); }}
      />
      <ProfileFormModal
        visible={profileFormVisible}
        initial={myProfile}
        onClose={() => setProfileFormVisible(false)}
        onSaved={(c) => setMyProfile(c)}
      />
    </View>
  );
}
