// src/screens/community/MatrimonyScreen.tsx
// Member-facing matrimony directory. Rebuilt against the redesigned
// backend: matrimony is now a document-upload-and-review directory, not a
// swipe/Tinder-style matcher. Three tabs:
//   - Browse: every approved candidate, tap for full detail + uploaded form.
//   - Submit: fill out a short cover form + upload a photo of the filled &
//     signed paper registration form, for admin review.
//   - My Applications: track the status of your own submissions, resubmit
//     if a correction is requested.
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
  ArrowLeft, MapPin, Briefcase, GraduationCap, FileText,
  Search, SlidersHorizontal, ImageOff, Download, Camera,
  Clock, AlertTriangle, CheckCircle2, XCircle,
} from 'lucide-react-native';
import * as matrimonyApi from '../../api/matrimony';
import { Candidate, MatrimonyApplication } from '../../api/matrimony';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import SkeletonBox from '../../components/common/SkeletonBox';
import EmptyState from '../../components/common/EmptyState';
import Button from '../../components/common/Button';

const { width: W, height: H } = Dimensions.get('window');

type TabKey = 'browse' | 'submit' | 'myApplications';
type SortKey = 'newest' | 'age_asc' | 'age_desc' | 'name';
type PickedFile = { uri: string; name: string; type: string };

interface FilterState {
  minAge: string;
  maxAge: string;
  education: string;
  gotra: string;
  gender: '' | 'male' | 'female'; // which gender of candidates to show
}

const EMPTY_FILTERS: FilterState = { minAge: '', maxAge: '', education: '', gotra: '', gender: '' };

const LIMIT = 10;

function getCandidatePhotos(c: Candidate): string[] {
  if (c.photos && c.photos.length > 0) return c.photos;
  if (c.photo) return [c.photo];
  return [];
}

function pickedFromAsset(asset: ImagePicker.ImagePickerAsset): PickedFile {
  const parts = asset.uri.split('/');
  return { uri: asset.uri, name: parts[parts.length - 1], type: 'image/jpeg' };
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
//  Candidate detail modal (browse tap)
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
            <XCircle size={20} color="white" />
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
              <XCircle size={20} color={C.textMuted} />
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
//  Browse card (no swipe — plain tap-to-open-detail)
// ════════════════════════════════════════════════
function CandidateCard({ candidate, onOpenDetail }: { candidate: Candidate; onOpenDetail: () => void }) {
  const { colors: C, spacing, radius, typography, shadow } = useTheme();
  const { lang, t } = useLanguage();
  const fontFamily = lang === 'od' ? 'NotoSansOriya' : undefined;
  const fontFamilyBold = lang === 'od' ? 'NotoSansOriya-Bold' : undefined;
  const photos = getCandidatePhotos(candidate);
  const cardWidth = W - spacing.lg * 2;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onOpenDetail}
      style={{ backgroundColor: C.card, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: C.border, ...shadow.card, marginBottom: spacing.lg }}
    >
      <View style={{ position: 'relative' }}>
        <PhotoCarousel photos={photos} width={cardWidth} height={cardWidth * 0.85} borderRadius={0} colors={C} />
        <View
          style={{
            position: 'absolute', bottom: spacing.md, left: spacing.md,
            backgroundColor: candidate.gender?.toLowerCase() === 'male' ? C.male : C.female,
            paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.sm,
          }}
        >
          <Text style={{ color: 'white', ...typography.caption, fontWeight: '700' }}>
            {candidate.gender?.toLowerCase() === 'male' ? t('matrimony', 'groomTag') : t('matrimony', 'brideTag')}
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
          <View
            style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
              marginTop: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: C.border,
            }}
          >
            <FileText size={14} color={C.primary} />
            <Text style={{ color: C.primary, ...typography.caption, fontWeight: '700' }}>{t('matrimony', 'viewBiodataButton')}</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

function BrowseSkeleton({ colors: C, spacing, radius }: { colors: ReturnType<typeof useTheme>['colors']; spacing: ReturnType<typeof useTheme>['spacing']; radius: ReturnType<typeof useTheme>['radius'] }) {
  const cardWidth = W - spacing.lg * 2;
  return (
    <View style={{ padding: spacing.lg }}>
      <View style={{ backgroundColor: C.card, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: C.border }}>
        <SkeletonBox width="100%" height={cardWidth * 0.85} borderRadius={0} />
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
//  Status badge (My Applications tab)
// ════════════════════════════════════════════════
function StatusBadge({ status }: { status: MatrimonyApplication['status'] }) {
  const { colors: C, spacing, radius, typography } = useTheme();
  const { t } = useLanguage();

  const map: Record<MatrimonyApplication['status'], { color: string; label: string; Icon: any }> = {
    pending: { color: C.warning, label: t('matrimony', 'statusPendingBadge'), Icon: Clock },
    correction_needed: { color: C.warning, label: t('matrimony', 'statusCorrectionNeededBadge'), Icon: AlertTriangle },
    approved: { color: C.success, label: t('matrimony', 'statusApprovedBadge'), Icon: CheckCircle2 },
    rejected: { color: C.error, label: t('matrimony', 'statusRejectedBadge'), Icon: XCircle },
  };
  const { color, label, Icon } = map[status] || map.pending;

  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start',
      backgroundColor: color + '15', borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 4,
    }}>
      <Icon size={12} color={color} />
      <Text style={{ color, ...typography.caption, fontWeight: '700' }}>{label}</Text>
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
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingBrowse, setLoadingBrowse] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

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
    // Plain optional filter now — no forced opposite-gender default.
    if (filters.gender) params.gender = filters.gender;
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

  const onEndReached = () => {
    if (loadingBrowse || loadingMore || !hasMore) return;
    loadBrowse(page + 1, false);
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

  // ── Submit tab state ──
  const RELATION_OPTIONS = ['Self/Head', 'Son', 'Daughter'] as const;
  const [candidateName, setCandidateName] = useState('');
  const [relation, setRelation] = useState<string>('Self/Head');
  const [relationOther, setRelationOther] = useState('');
  const [submitGender, setSubmitGender] = useState<'Male' | 'Female' | ''>('');
  const [uploadedForm, setUploadedForm] = useState<PickedFile | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);

  const handleDownloadForm = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDownloadingTemplate(true);
    try {
      const data = await matrimonyApi.fetchFormTemplateUrl();
      if (data.success && data.url) {
        await Linking.openURL(data.url);
      }
    } catch (e) {
      console.error('[MATRIMONY] fetch form template failed:', e);
      Alert.alert(t('common', 'errorTitle'), t('matrimony', 'downloadFormError'));
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const pickUploadedForm = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    setUploadedForm(pickedFromAsset(result.assets[0]));
  };

  const resetSubmitForm = () => {
    setCandidateName('');
    setRelation('Self/Head');
    setRelationOther('');
    setSubmitGender('');
    setUploadedForm(null);
  };

  const handleSubmitApplication = async () => {
    if (!candidateName.trim()) {
      Alert.alert(t('common', 'errorTitle'), t('matrimony', 'candidateNameRequiredError'));
      return;
    }
    const relationValue = relation === 'Other' ? relationOther.trim() : relation;
    if (!relationValue) {
      Alert.alert(t('common', 'errorTitle'), relation === 'Other' ? t('matrimony', 'relationOtherRequiredError') : t('matrimony', 'relationRequiredError'));
      return;
    }
    if (!submitGender) {
      Alert.alert(t('common', 'errorTitle'), t('matrimony', 'genderRequiredError'));
      return;
    }
    if (!uploadedForm) {
      Alert.alert(t('common', 'errorTitle'), t('matrimony', 'uploadedFormRequiredError'));
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('candidateName', candidateName.trim());
      fd.append('relationToHof', relationValue);
      fd.append('gender', submitGender);
      // @ts-ignore — React Native FormData file shape
      fd.append('form', uploadedForm);

      const data = await matrimonyApi.submitMatrimonyApplication(fd);
      if (data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        resetSubmitForm();
        setMyApplicationsLoaded(false);
        Alert.alert(t('matrimony', 'submitApplicationSuccessTitle'), t('matrimony', 'submitApplicationSuccessMessage'));
        setActiveTab('myApplications');
      }
    } catch (e) {
      console.error('[MATRIMONY] submit application failed:', e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common', 'errorTitle'), t('matrimony', 'submitApplicationError'));
    } finally {
      setSubmitting(false);
    }
  };

  // ── My Applications tab state ──
  const [myApplications, setMyApplications] = useState<MatrimonyApplication[]>([]);
  const [loadingApplications, setLoadingApplications] = useState(true);
  const [myApplicationsLoaded, setMyApplicationsLoaded] = useState(false);
  const [resubmittingId, setResubmittingId] = useState<string | number | null>(null);

  const loadMyApplications = useCallback(async () => {
    setLoadingApplications(true);
    try {
      const data = await matrimonyApi.fetchMyApplications();
      if (data.success) setMyApplications(data.applications || []);
    } catch (e) {
      console.error('[MATRIMONY] load applications failed:', e);
      Alert.alert(t('common', 'errorTitle'), t('matrimony', 'loadApplicationsError'));
    } finally {
      setLoadingApplications(false);
      setMyApplicationsLoaded(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeTab === 'myApplications' && !myApplicationsLoaded) loadMyApplications();
  }, [activeTab, myApplicationsLoaded, loadMyApplications]);

  const handleResubmit = async (applicationId: string | number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    const file = pickedFromAsset(result.assets[0]);

    setResubmittingId(applicationId);
    try {
      const fd = new FormData();
      // @ts-ignore — React Native FormData file shape
      fd.append('form', file);
      const data = await matrimonyApi.resubmitApplication(applicationId, fd);
      if (data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setMyApplications(prev => prev.map(a => (a.id === applicationId ? data.application : a)));
        Alert.alert(t('matrimony', 'resubmitSuccessTitle'), t('matrimony', 'resubmitSuccessMessage'));
      }
    } catch (e) {
      console.error('[MATRIMONY] resubmit failed:', e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common', 'errorTitle'), t('matrimony', 'resubmitError'));
    } finally {
      setResubmittingId(null);
    }
  };

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'browse', label: t('matrimony', 'tabBrowse') },
    { key: 'submit', label: t('matrimony', 'tabSubmit') },
    { key: 'myApplications', label: t('matrimony', 'tabMyApplications') },
  ];

  const inputStyle = {
    backgroundColor: C.card, borderColor: C.border, color: C.text, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, marginBottom: spacing.lg,
    fontFamily, ...typography.body,
  };
  const labelStyle = { color: C.textMuted, marginBottom: spacing.xs, fontFamily, ...typography.caption };

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
        ) : (
          <ScrollView
            contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xxl }}
            showsVerticalScrollIndicator={false}
            onScroll={({ nativeEvent }) => {
              const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
              if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 200) onEndReached();
            }}
            scrollEventThrottle={200}
          >
            {candidates.map(c => (
              <CandidateCard key={String(c.id)} candidate={c} onOpenDetail={() => setDetailCandidate(c)} />
            ))}
            {loadingMore ? (
              <View style={{ paddingVertical: spacing.lg, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={C.primary} />
              </View>
            ) : null}
          </ScrollView>
        )
      )}

      {/* Submit tab content */}
      {activeTab === 'submit' && (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xxl }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={{ color: C.text, fontFamily: fontFamilyBold, marginBottom: spacing.xs, ...typography.heading }}>
            {t('matrimony', 'submitIntroTitle')}
          </Text>
          <Text style={{ color: C.textMuted, marginBottom: spacing.xl, fontFamily, ...typography.body }}>
            {t('matrimony', 'submitIntroSubtitle')}
          </Text>

          <TouchableOpacity
            onPress={handleDownloadForm}
            disabled={downloadingTemplate}
            style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
              backgroundColor: C.primary + '15', borderWidth: 1, borderColor: C.primary + '30',
              borderRadius: radius.md, paddingVertical: spacing.md, marginBottom: spacing.xl,
            }}
          >
            {downloadingTemplate ? <ActivityIndicator size="small" color={C.primary} /> : <Download size={18} color={C.primary} />}
            <Text style={{ color: C.primary, ...typography.bodyEmphasis }}>{t('matrimony', 'downloadFormButton')}</Text>
          </TouchableOpacity>

          <Text style={labelStyle}>{t('matrimony', 'candidateNameFieldLabel')}</Text>
          <TextInput
            value={candidateName}
            onChangeText={setCandidateName}
            placeholder={t('matrimony', 'candidateNamePlaceholder')}
            placeholderTextColor={C.textFaint}
            style={inputStyle}
            className="border"
          />

          <Text style={labelStyle}>{t('matrimony', 'relationToHofFieldLabel')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm }}>
            {[...RELATION_OPTIONS, 'Other'].map(opt => {
              const label = opt === 'Self/Head' ? t('matrimony', 'relationSelf')
                : opt === 'Son' ? t('matrimony', 'relationSon')
                : opt === 'Daughter' ? t('matrimony', 'relationDaughter')
                : t('matrimony', 'relationOther');
              return (
                <TouchableOpacity
                  key={opt}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setRelation(opt); }}
                  style={{
                    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full,
                    backgroundColor: relation === opt ? C.primary : C.card,
                    borderWidth: 1, borderColor: relation === opt ? C.primary : C.border,
                  }}
                >
                  <Text style={{ color: relation === opt ? 'white' : C.textMuted, fontFamily, ...typography.caption, fontWeight: '700' }}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {relation === 'Other' ? (
            <TextInput
              value={relationOther}
              onChangeText={setRelationOther}
              placeholder={t('matrimony', 'relationOtherPlaceholder')}
              placeholderTextColor={C.textFaint}
              style={inputStyle}
              className="border"
            />
          ) : (
            <View style={{ marginBottom: spacing.lg }} />
          )}

          <Text style={labelStyle}>{t('matrimony', 'genderFieldLabel')}</Text>
          <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg }}>
            <TouchableOpacity
              onPress={() => setSubmitGender('Male')}
              style={{
                flex: 1, paddingVertical: spacing.sm + 2, borderRadius: radius.md, alignItems: 'center',
                backgroundColor: submitGender === 'Male' ? C.male : C.card,
                borderWidth: 1, borderColor: submitGender === 'Male' ? C.male : C.border,
              }}
            >
              <Text style={{ color: submitGender === 'Male' ? 'white' : C.textMuted, ...typography.bodyEmphasis }}>
                {t('matrimony', 'maleOption')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setSubmitGender('Female')}
              style={{
                flex: 1, paddingVertical: spacing.sm + 2, borderRadius: radius.md, alignItems: 'center',
                backgroundColor: submitGender === 'Female' ? C.female : C.card,
                borderWidth: 1, borderColor: submitGender === 'Female' ? C.female : C.border,
              }}
            >
              <Text style={{ color: submitGender === 'Female' ? 'white' : C.textMuted, ...typography.bodyEmphasis }}>
                {t('matrimony', 'femaleOption')}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={labelStyle}>{t('matrimony', 'uploadedFormFieldLabel')}</Text>
          <Text style={{ color: C.textFaint, marginBottom: spacing.sm, fontFamily, ...typography.caption }}>
            {t('matrimony', 'uploadedFormHelpText')}
          </Text>
          {uploadedForm ? (
            <Image source={{ uri: uploadedForm.uri }} style={{ width: '100%', height: 160, borderRadius: radius.md, marginBottom: spacing.sm }} contentFit="cover" />
          ) : null}
          <TouchableOpacity
            onPress={pickUploadedForm}
            style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
              borderWidth: 1, borderColor: C.border, borderRadius: radius.md, paddingVertical: spacing.md, marginBottom: spacing.xl,
            }}
          >
            <Camera size={18} color={C.primary} />
            <Text style={{ color: C.primary, ...typography.bodyEmphasis }}>{t('matrimony', 'chooseUploadedFormButton')}</Text>
          </TouchableOpacity>

          <Button
            label={t('matrimony', 'submitApplicationButton')}
            variant="primary"
            onPress={handleSubmitApplication}
            loading={submitting}
          />
        </ScrollView>
      )}

      {/* My Applications tab content */}
      {activeTab === 'myApplications' && (
        loadingApplications ? (
          <View style={{ padding: spacing.lg, gap: spacing.md }}>
            {[1, 2, 3].map(i => <SkeletonBox key={i} width="100%" height={100} borderRadius={radius.lg} />)}
          </View>
        ) : myApplications.length === 0 ? (
          <EmptyState
            emoji="📄"
            title={t('matrimony', 'myApplicationsEmptyTitle')}
            subtitle={t('matrimony', 'myApplicationsEmptySubtitle')}
            action={{ label: t('matrimony', 'tabSubmit'), onPress: () => setActiveTab('submit') }}
          />
        ) : (
          <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xxl }} showsVerticalScrollIndicator={false}>
            {myApplications.map((application) => {
              const isResubmitting = resubmittingId === application.id;
              return (
                <View
                  key={String(application.id)}
                  style={{
                    backgroundColor: C.card, borderRadius: radius.lg, borderWidth: 1, borderColor: C.border,
                    padding: spacing.lg, marginBottom: spacing.md,
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Text style={{ color: C.text, fontFamily: fontFamilyBold, flex: 1, ...typography.bodyEmphasis }}>
                      {application.member_name}
                    </Text>
                    <StatusBadge status={application.status} />
                  </View>
                  <Text style={{ color: C.textFaint, marginTop: spacing.xs, ...typography.caption }}>
                    {t('matrimony', 'submittedOnPrefix')} {new Date(application.submitted_at).toLocaleDateString()}
                  </Text>

                  {application.status === 'correction_needed' && application.admin_remarks ? (
                    <View style={{ marginTop: spacing.sm, backgroundColor: C.warning + '15', borderRadius: radius.md, padding: spacing.md }}>
                      <Text style={{ color: C.warning, ...typography.caption, fontWeight: '700', marginBottom: 2 }}>
                        {t('matrimony', 'adminRemarkLabel')}
                      </Text>
                      <Text style={{ color: C.text, fontFamily, ...typography.caption }}>{application.admin_remarks}</Text>
                    </View>
                  ) : null}
                  {application.status === 'rejected' && application.admin_remarks ? (
                    <View style={{ marginTop: spacing.sm, backgroundColor: C.error + '15', borderRadius: radius.md, padding: spacing.md }}>
                      <Text style={{ color: C.error, ...typography.caption, fontWeight: '700', marginBottom: 2 }}>
                        {t('matrimony', 'adminRemarkLabel')}
                      </Text>
                      <Text style={{ color: C.text, fontFamily, ...typography.caption }}>{application.admin_remarks}</Text>
                    </View>
                  ) : null}

                  {application.uploaded_file_url ? (
                    <TouchableOpacity
                      onPress={() => Linking.openURL(application.uploaded_file_url).catch(() => {})}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.md }}
                    >
                      <FileText size={16} color={C.primary} />
                      <Text style={{ color: C.primary, ...typography.caption }}>{t('matrimony', 'viewUploadedFormButton')}</Text>
                    </TouchableOpacity>
                  ) : null}

                  {application.status === 'correction_needed' ? (
                    <View style={{ marginTop: spacing.md }}>
                      <Button
                        label={t('matrimony', 'resubmitButton')}
                        variant="primary"
                        onPress={() => handleResubmit(application.id)}
                        loading={isResubmitting}
                        fullWidth
                      />
                    </View>
                  ) : null}
                </View>
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
    </View>
  );
}
