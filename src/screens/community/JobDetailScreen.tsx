// src/screens/community/JobDetailScreen.tsx
// Full posting detail. "Apply" always hands off outside the app via
// application_info (a link or instructions) — there's no in-app
// application tracking. contact_phone is the submitter's own
// accountability number, shown separately so applicants know who posted
// it. Members can report a suspicious listing, which auto-hides it
// pending admin review.
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Linking, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, MapPin, Clock, ExternalLink, Phone, Flag, CalendarClock, CalendarX, IndianRupee, GraduationCap, Users, Landmark, Pencil, X as XIcon } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as jobsApi from '../../api/jobs';
import { JobPosting } from '../../api/jobs';
import * as coursesApi from '../../api/courses';
import { Course } from '../../api/courses';
import Button from '../../components/common/Button';
import Chip from '../../components/common/Chip';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { JOB_SECTORS, jobSectorLabel } from '../../data/jobSectors';
import { courseCategoryForJobSector } from '../../data/jobSectorToCourseCategory';

export default function JobDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { id } = route.params;
  const insets = useSafeAreaInsets();
  const { colors: C, spacing, radius, typography, shadow } = useTheme();
  const { lang, t } = useLanguage();
  const fontRegular = lang === 'od' ? 'NotoSansOriya' : undefined;
  const fontBold = lang === 'od' ? 'NotoSansOriya-Bold' : undefined;

  const [job, setJob] = useState<JobPosting | null>(null);
  const [loading, setLoading] = useState(true);
  const [reporting, setReporting] = useState(false);
  const [recommendedCourses, setRecommendedCourses] = useState<Course[]>([]);

  // ── Suggest an edit — a member noticed wrong/outdated info on this
  // already-published posting. Never applies directly; an admin reviews
  // it (see AdminJobEditSuggestionsScreen). Fields are pre-filled with the
  // job's current values so a member only needs to touch what's wrong.
  const [showEditForm, setShowEditForm] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editOrganization, setEditOrganization] = useState('');
  const [editSector, setEditSector] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editApplicationInfo, setEditApplicationInfo] = useState('');
  const [editEligibility, setEditEligibility] = useState('');
  const [editLastDate, setEditLastDate] = useState('');
  const [editRegistrationStartDate, setEditRegistrationStartDate] = useState('');
  const [editApplicationFee, setEditApplicationFee] = useState('');
  const [editNoOfVacancies, setEditNoOfVacancies] = useState('');
  const [editNote, setEditNote] = useState('');
  const [submittingEdit, setSubmittingEdit] = useState(false);

  const openEditForm = () => {
    if (!job) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditTitle(job.title || '');
    setEditOrganization(job.organization || '');
    setEditSector(job.sector || '');
    setEditDescription(job.description || '');
    setEditLocation(job.location || '');
    setEditApplicationInfo(job.application_info || '');
    setEditEligibility(job.eligibility || '');
    setEditLastDate(job.last_date || '');
    setEditRegistrationStartDate(job.registration_start_date || '');
    setEditApplicationFee(job.application_fee || '');
    setEditNoOfVacancies(job.no_of_vacancies || '');
    setEditNote('');
    setShowEditForm(true);
  };

  const submitEdit = async () => {
    if (!editNote.trim()) {
      Alert.alert(t('common', 'errorTitle'), t('jobs', 'editNoteRequiredError'));
      return;
    }
    setSubmittingEdit(true);
    try {
      const data = await jobsApi.suggestJobEdit(id, {
        title: editTitle.trim(),
        organization: editOrganization.trim(),
        sector: editSector.trim(),
        description: editDescription.trim(),
        location: editLocation.trim(),
        applicationInfo: editApplicationInfo.trim(),
        eligibility: editEligibility.trim(),
        lastDate: editLastDate.trim(),
        registrationStartDate: editRegistrationStartDate.trim(),
        applicationFee: editApplicationFee.trim(),
        noOfVacancies: editNoOfVacancies.trim(),
        note: editNote.trim(),
      });
      if (data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setShowEditForm(false);
        Alert.alert(t('common', 'successTitle'), t('jobs', 'editSuggestionSubmittedMessage'));
      } else {
        throw new Error(t('jobs', 'editSuggestionSubmitError'));
      }
    } catch (e: any) {
      console.error('[JOB_DETAIL] Edit suggestion failed:', e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common', 'errorTitle'), e.message || t('jobs', 'editSuggestionSubmitError'));
    } finally {
      setSubmittingEdit(false);
    }
  };

  const load = useCallback(async () => {
    try {
      const data = await jobsApi.fetchJobById(id);
      if (data.success) setJob(data.job);
    } catch (e) {
      console.error('[JOB_DETAIL] Fetch failed:', e);
      Alert.alert(t('common', 'errorTitle'), t('jobs', 'detailLoadError'));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => { load(); }, [load]);

  // Suggest exam-prep courses matching this job's sector — purely a UI-side
  // join (src/data/jobSectorToCourseCategory.ts) against the existing
  // courses API, no backend change needed since both taxonomies already
  // share category keys by design.
  useEffect(() => {
    const category = courseCategoryForJobSector(job?.sector);
    if (!category) { setRecommendedCourses([]); return; }
    coursesApi.fetchCourses({ category, limit: 3 })
      .then(data => { if (data.success) setRecommendedCourses(data.courses); })
      .catch(e => console.error('[JOB_DETAIL] Recommended courses fetch failed:', e));
  }, [job?.sector]);

  const looksLikeUrl = (s: string) => /^https?:\/\//i.test(s.trim());

  const openApplicationInfo = () => {
    if (!job) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (looksLikeUrl(job.application_info)) {
      Linking.openURL(job.application_info.trim()).catch(() => {
        Alert.alert(t('common', 'errorTitle'), t('jobs', 'openLinkError'));
      });
    } else {
      Alert.alert(t('jobs', 'howToApplyTitle'), job.application_info);
    }
  };

  const callContact = () => {
    if (!job?.contact_phone) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(`tel:${job.contact_phone}`).catch(() => {});
  };

  const doReport = async () => {
    setReporting(true);
    try {
      const data = await jobsApi.reportJob(id);
      if (data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(t('jobs', 'reportedTitle'), t('jobs', 'reportedMessage'));
        navigation.goBack();
      }
    } catch (e) {
      console.error('[JOB_DETAIL] Report failed:', e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common', 'errorTitle'), t('jobs', 'reportError'));
    } finally {
      setReporting(false);
    }
  };

  const handleReport = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      t('jobs', 'confirmReportTitle'),
      t('jobs', 'confirmReportMessage'),
      [
        { text: t('common', 'cancel'), style: 'cancel' },
        { text: t('jobs', 'reportButton'), style: 'destructive', onPress: doReport },
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.goBack(); }} style={{ padding: spacing.xs, borderRadius: radius.full, backgroundColor: C.card }}>
          <ArrowLeft size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={{ color: C.text, fontFamily: fontBold, flex: 1, ...typography.heading }}>{t('jobs', 'detailTitle')}</Text>
        {!!job && (
          <TouchableOpacity onPress={openEditForm} style={{ padding: spacing.xs, borderRadius: radius.full, backgroundColor: C.card, marginRight: spacing.xs }}>
            <Pencil size={18} color={C.textMuted} />
          </TouchableOpacity>
        )}
        {!!job && (
          <TouchableOpacity onPress={handleReport} disabled={reporting} style={{ padding: spacing.xs, borderRadius: radius.full, backgroundColor: C.card }}>
            {reporting ? <ActivityIndicator size="small" color={C.error} /> : <Flag size={18} color={C.error} />}
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : !job ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl }}>
          <Text style={{ color: C.textMuted, textAlign: 'center', ...typography.body }}>{t('jobs', 'notFound')}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xxl }}>
          <Text style={{
            alignSelf: 'flex-start',
            color: job.category === 'govt' ? C.primary : C.textMuted,
            backgroundColor: (job.category === 'govt' ? C.primary : C.textMuted) + '15',
            borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: 4,
            ...typography.caption, fontWeight: '700',
          }}>
            {job.category === 'govt' ? t('jobs', 'categoryGovt') : t('jobs', 'categoryPrivate')}
          </Text>

          <Text style={{ color: C.text, fontFamily: fontBold, marginTop: spacing.md, ...typography.display }}>{job.title}</Text>
          <Text style={{ color: C.textMuted, fontFamily: fontRegular, marginTop: 2, ...typography.bodyEmphasis }}>{job.organization}</Text>

          <View style={{ flexDirection: 'row', gap: spacing.lg, marginTop: spacing.md }}>
            {!!job.location && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <MapPin size={13} color={C.textFaint} />
                <Text style={{ color: C.textFaint, ...typography.caption }}>{job.location}</Text>
              </View>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Clock size={13} color={C.textFaint} />
              <Text style={{ color: C.textFaint, ...typography.caption }}>{new Date(job.created_at).toLocaleDateString()}</Text>
            </View>
          </View>

          <View style={{ borderWidth: 1, borderColor: C.border, borderRadius: radius.lg, overflow: 'hidden', marginTop: spacing.lg }}>
            {([
              { icon: Users, label: t('jobs', 'categoryLabel'), value: job.category === 'govt' ? t('jobs', 'categoryGovt') : t('jobs', 'categoryPrivate') },
              ...(job.sector ? [{ icon: Landmark, label: t('jobs', 'sectorLabel'), value: jobSectorLabel(job.sector, lang) }] : []),
              ...(job.location ? [{ icon: MapPin, label: t('jobs', 'locationDetailLabel'), value: job.location }] : []),
              ...(job.no_of_vacancies ? [{ icon: Users, label: t('jobs', 'noOfVacanciesLabel'), value: job.no_of_vacancies }] : []),
              ...(job.registration_start_date ? [{ icon: CalendarClock, label: t('jobs', 'registrationStartLabel'), value: job.registration_start_date }] : []),
              ...(job.last_date ? [{ icon: CalendarX, label: t('jobs', 'lastDateLabel'), value: job.last_date, valueColor: C.error }] : []),
              ...(job.application_fee ? [{ icon: IndianRupee, label: t('jobs', 'applicationFeeLabel'), value: job.application_fee }] : []),
              {
                icon: GraduationCap, label: t('jobs', 'eligibilityLabel'),
                value: job.eligibility || t('jobs', 'eligibilityNotAvailable'),
                multiline: true, faint: !job.eligibility,
              },
            ] as { icon: any; label: string; value: string; valueColor?: string; multiline?: boolean; faint?: boolean }[]).map((row, i) => (
              <View
                key={row.label}
                style={{ flexDirection: 'row', backgroundColor: C.card, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: C.border }}
              >
                <View style={{
                  width: 128, flexDirection: 'row', alignItems: 'flex-start', gap: 6,
                  paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.md,
                  borderRightWidth: 1, borderRightColor: C.border, backgroundColor: C.bg,
                }}>
                  <row.icon size={13} color={C.textMuted} style={{ marginTop: 1 }} />
                  <Text style={{ color: C.textMuted, ...typography.caption, flexShrink: 1, lineHeight: 17 }}>{row.label}</Text>
                </View>
                <View style={{ flex: 1, paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.md, justifyContent: 'center' }}>
                  <Text style={{
                    color: row.faint ? C.textFaint : (row.valueColor || C.text),
                    fontFamily: fontRegular,
                    fontStyle: row.faint ? 'italic' : 'normal',
                    ...typography.caption,
                    fontWeight: row.multiline ? '400' : '700',
                    lineHeight: 19,
                  }}>{row.value}</Text>
                </View>
              </View>
            ))}
          </View>

          <Text style={{ color: C.textMuted, marginTop: spacing.xl, ...typography.label }}>{t('jobs', 'descriptionLabel')}</Text>
          <Text style={{ color: C.text, fontFamily: fontRegular, marginTop: spacing.xs, ...typography.body, lineHeight: 22 }}>
            {job.description}
          </Text>

          {recommendedCourses.length > 0 && (
            <View style={{ marginTop: spacing.xl }}>
              <Text style={{ color: C.textMuted, marginBottom: spacing.sm, ...typography.label }}>{t('jobs', 'recommendedCoursesLabel')}</Text>
              {recommendedCourses.map(c => (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.navigate('CourseDetail', { id: c.id }); }}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
                    backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: radius.lg,
                    padding: spacing.md, marginBottom: spacing.sm,
                  }}
                >
                  <View style={{ width: 36, height: 36, borderRadius: radius.md, backgroundColor: C.primary + '15', alignItems: 'center', justifyContent: 'center' }}>
                    <GraduationCap size={18} color={C.primary} />
                  </View>
                  <Text style={{ flex: 1, color: C.text, fontFamily: fontRegular, ...typography.caption, fontWeight: '700' }} numberOfLines={2}>
                    {c.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={{ backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, marginTop: spacing.xl, ...shadow.card }}>
            <Text style={{ color: C.textMuted, ...typography.label }}>{t('jobs', 'howToApplyLabel')}</Text>
            <Text style={{ color: C.text, fontFamily: fontRegular, marginTop: spacing.xs, ...typography.body }}>{job.application_info}</Text>

            {!!job.contact_phone && (
              <TouchableOpacity onPress={callContact} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.md }}>
                <Phone size={14} color={C.primary} />
                <Text style={{ color: C.primary, ...typography.caption, fontWeight: '700' }}>{job.contact_phone}</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            onPress={openApplicationInfo}
            style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
              backgroundColor: C.primary, borderRadius: radius.md, paddingVertical: spacing.md, marginTop: spacing.lg,
            }}
          >
            <ExternalLink size={16} color="#fff" />
            <Text style={{ color: '#fff', ...typography.bodyEmphasis, fontWeight: '700' }}>{t('jobs', 'applyButton')}</Text>
          </TouchableOpacity>

          <Text style={{ color: C.textFaint, textAlign: 'center', marginTop: spacing.md, ...typography.caption }}>
            {t('jobs', 'disclaimerText')}
          </Text>
        </ScrollView>
      )}

      <Modal visible={showEditForm} animationType="slide" transparent onRequestClose={() => setShowEditForm(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <View style={{ backgroundColor: C.bg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xl, paddingBottom: insets.bottom + spacing.xl, maxHeight: '90%' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg }}>
              <Text style={{ color: C.text, fontFamily: fontBold, flex: 1, ...typography.title }}>{t('jobs', 'suggestEditTitle')}</Text>
              <TouchableOpacity onPress={() => setShowEditForm(false)}>
                <XIcon size={22} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={{ color: C.textFaint, marginBottom: spacing.lg, ...typography.caption }}>{t('jobs', 'suggestEditHelperText')}</Text>

              <Text style={{ color: C.textMuted, marginBottom: spacing.sm, ...typography.label }}>{t('jobs', 'editNoteLabel')}</Text>
              <TextInput
                style={{ borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, marginBottom: spacing.lg, backgroundColor: C.card, borderColor: C.border, color: C.text, fontFamily: fontRegular, minHeight: 70, textAlignVertical: 'top', ...typography.body }}
                placeholder={t('jobs', 'editNotePlaceholder')}
                placeholderTextColor={C.textFaint}
                value={editNote}
                onChangeText={setEditNote}
                multiline
              />

              {job?.category === 'govt' && (
                <>
                  <Text style={{ color: C.textMuted, marginBottom: spacing.sm, ...typography.label }}>{t('jobs', 'sectorLabel')}</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg }}>
                    {JOB_SECTORS.map(s => (
                      <Chip
                        key={s.key}
                        label={lang === 'od' ? s.or : s.en}
                        selected={editSector === s.key}
                        onPress={() => setEditSector(editSector === s.key ? '' : s.key)}
                      />
                    ))}
                  </View>
                </>
              )}

              {([
                { label: t('jobs', 'jobTitleLabel'), value: editTitle, set: setEditTitle },
                { label: t('jobs', 'organizationLabel'), value: editOrganization, set: setEditOrganization },
                { label: t('jobs', 'noOfVacanciesLabel'), value: editNoOfVacancies, set: setEditNoOfVacancies },
                { label: t('jobs', 'registrationStartLabel'), value: editRegistrationStartDate, set: setEditRegistrationStartDate },
                { label: t('jobs', 'lastDateLabel'), value: editLastDate, set: setEditLastDate },
                { label: t('jobs', 'applicationFeeLabel'), value: editApplicationFee, set: setEditApplicationFee },
                { label: t('jobs', 'locationDetailLabel'), value: editLocation, set: setEditLocation },
                { label: t('jobs', 'howToApplyLabel'), value: editApplicationInfo, set: setEditApplicationInfo },
              ]).map(f => (
                <View key={f.label}>
                  <Text style={{ color: C.textMuted, marginBottom: spacing.sm, ...typography.label }}>{f.label}</Text>
                  <TextInput
                    style={{ borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, marginBottom: spacing.lg, backgroundColor: C.card, borderColor: C.border, color: C.text, fontFamily: fontRegular, ...typography.body }}
                    placeholderTextColor={C.textFaint}
                    value={f.value}
                    onChangeText={f.set}
                  />
                </View>
              ))}

              <Text style={{ color: C.textMuted, marginBottom: spacing.sm, ...typography.label }}>{t('jobs', 'eligibilityLabel')}</Text>
              <TextInput
                style={{ borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, marginBottom: spacing.lg, backgroundColor: C.card, borderColor: C.border, color: C.text, fontFamily: fontRegular, minHeight: 70, textAlignVertical: 'top', ...typography.body }}
                value={editEligibility}
                onChangeText={setEditEligibility}
                multiline
              />

              <Text style={{ color: C.textMuted, marginBottom: spacing.sm, ...typography.label }}>{t('jobs', 'descriptionLabel')}</Text>
              <TextInput
                style={{ borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, marginBottom: spacing.lg, backgroundColor: C.card, borderColor: C.border, color: C.text, fontFamily: fontRegular, minHeight: 90, textAlignVertical: 'top', ...typography.body }}
                value={editDescription}
                onChangeText={setEditDescription}
                multiline
              />

              <Button variant="primary" label={t('jobs', 'submitEditButton')} onPress={submitEdit} loading={submittingEdit} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
