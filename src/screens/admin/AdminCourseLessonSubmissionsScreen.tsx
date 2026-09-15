// src/screens/admin/AdminCourseLessonSubmissionsScreen.tsx
// Review queue for videos the daily YouTube-channel scraper discovers
// (backend scraper/src/sources/youtubeChannels.ts) — mirrors
// AdminJobSubmissionsScreen's shape. Approve either attaches the video to
// an existing course in its suggested category, or creates a new course
// for it; reject just discards it. Nothing here is published until this
// screen approves it — see backend ARCHITECTURE.md's Courses section.
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, Modal, TextInput, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, X, ExternalLink } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as adminApi from '../../api/admin';
import { CourseLessonSubmission, AdminCourse } from '../../api/admin';
import SkeletonBox from '../../components/common/SkeletonBox';
import EmptyState from '../../components/common/EmptyState';
import Button from '../../components/common/Button';
import Chip from '../../components/common/Chip';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { courseCategoryLabel } from '../../data/courseCategories';

const PAGE_SIZE = 30;

export default function AdminCourseLessonSubmissionsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors: C, spacing, radius, typography, shadow } = useTheme();
  const { lang, t } = useLanguage();
  const fontBold = lang === 'od' ? 'NotoSansOriya-Bold' : undefined;
  const fontRegular = lang === 'od' ? 'NotoSansOriya' : undefined;

  const [submissions, setSubmissions] = useState<CourseLessonSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actingId, setActingId] = useState<string | number | null>(null);
  const [approveTarget, setApproveTarget] = useState<CourseLessonSubmission | null>(null);
  const [candidateCourses, setCandidateCourses] = useState<AdminCourse[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [newCourseTitle, setNewCourseTitle] = useState('');

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const data = await adminApi.fetchCourseLessonSubmissions({ status: 'pending', limit: PAGE_SIZE });
      if (data.success) setSubmissions(data.submissions);
    } catch (e) {
      console.error('[ADMIN_COURSE_LESSON_SUBMISSIONS] Fetch failed:', e);
      Alert.alert(t('common', 'errorTitle'), t('admin', 'courseLessonSubmissionsLoadError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  const removeFromView = (id: string | number) => setSubmissions(prev => prev.filter(s => s.id !== id));

  const openApprove = async (submission: CourseLessonSubmission) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setApproveTarget(submission);
    setNewCourseTitle(submission.title);
    setLoadingCandidates(true);
    try {
      const data = await adminApi.fetchAdminCourses({ category: submission.category || undefined, limit: 50 });
      if (data.success) setCandidateCourses(data.courses);
    } catch (e) {
      console.error('[ADMIN_COURSE_LESSON_SUBMISSIONS] Fetch candidate courses failed:', e);
    } finally {
      setLoadingCandidates(false);
    }
  };

  const doApprove = async (overrides: { existingCourseId?: string | number; newCourseTitle?: string }) => {
    if (!approveTarget) return;
    setActingId(approveTarget.id);
    try {
      const data = await adminApi.approveCourseLessonSubmission(approveTarget.id, {
        ...overrides,
        newCourseCategory: approveTarget.category || undefined,
      });
      if (data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        removeFromView(approveTarget.id);
        setApproveTarget(null);
      } else {
        throw new Error(t('admin', 'courseLessonSubmissionActionError'));
      }
    } catch (e: any) {
      console.error('[ADMIN_COURSE_LESSON_SUBMISSIONS] Approve failed:', e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common', 'errorTitle'), e.message || t('admin', 'courseLessonSubmissionActionError'));
    } finally {
      setActingId(null);
    }
  };

  const doReject = (submission: CourseLessonSubmission) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      t('admin', 'confirmRejectCourseLessonTitle'),
      submission.title,
      [
        { text: t('common', 'cancel'), style: 'cancel' },
        {
          text: t('common', 'reject'),
          style: 'destructive',
          onPress: async () => {
            setActingId(submission.id);
            try {
              const data = await adminApi.rejectCourseLessonSubmission(submission.id);
              if (data.success) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                removeFromView(submission.id);
              }
            } catch (e) {
              console.error('[ADMIN_COURSE_LESSON_SUBMISSIONS] Reject failed:', e);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert(t('common', 'errorTitle'), t('admin', 'courseLessonSubmissionActionError'));
            } finally {
              setActingId(null);
            }
          },
        },
      ]
    );
  };

  const renderItem = useCallback(({ item }: { item: CourseLessonSubmission }) => (
    <View style={{ backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadow.card }}>
      {!!item.category && (
        <Text style={{ alignSelf: 'flex-start', color: C.primary, backgroundColor: C.primary + '15', borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 3, ...typography.caption, fontWeight: '700' }}>
          {courseCategoryLabel(item.category, lang)}
        </Text>
      )}
      <Text style={{ color: C.text, fontFamily: fontBold, marginTop: spacing.xs, ...typography.bodyEmphasis }} numberOfLines={2}>{item.title}</Text>
      <Text style={{ color: C.textMuted, fontFamily: fontRegular, marginTop: 2, ...typography.caption }} numberOfLines={1}>
        {item.channel_name} · {item.platform}
      </Text>
      <TouchableOpacity
        onPress={() => Linking.openURL(item.external_url).catch(() => {})}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.xs }}
      >
        <ExternalLink size={12} color={C.textFaint} />
        <Text style={{ color: C.textFaint, ...typography.caption }} numberOfLines={1}>{item.external_url}</Text>
      </TouchableOpacity>

      <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
        <TouchableOpacity
          onPress={() => doReject(item)}
          disabled={actingId === item.id}
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.error, borderRadius: radius.md, paddingVertical: spacing.sm }}
        >
          <Text style={{ color: C.error, ...typography.caption, fontWeight: '700' }}>{t('common', 'reject')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => openApprove(item)}
          disabled={actingId === item.id}
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.primary, borderRadius: radius.md, paddingVertical: spacing.sm }}
        >
          {actingId === item.id ? <ActivityIndicator size="small" color="#fff" /> : (
            <Text style={{ color: '#fff', ...typography.caption, fontWeight: '700' }}>{t('admin', 'courseLessonApproveButton')}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  ), [C, spacing, radius, typography, shadow, fontBold, fontRegular, t, lang, actingId]);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.goBack(); }} style={{ padding: spacing.xs, borderRadius: radius.full, backgroundColor: C.card }}>
          <ArrowLeft size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={{ color: C.text, fontFamily: fontBold, flex: 1, ...typography.heading }}>{t('admin', 'courseLessonSubmissionsTitle')}</Text>
      </View>

      {loading ? (
        <View style={{ paddingHorizontal: spacing.lg }}>
          {[1, 2, 3].map(i => <SkeletonBox key={i} height={120} style={{ marginBottom: spacing.md, borderRadius: radius.lg }} />)}
        </View>
      ) : (
        <FlatList
          data={submissions}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + spacing.xl, flexGrow: 1 }}
          ListEmptyComponent={<EmptyState emoji="🎬" title={t('admin', 'courseLessonSubmissionsEmptyTitle')} subtitle={t('admin', 'courseLessonSubmissionsEmptySubtitle')} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={C.primary} colors={[C.primary]} progressBackgroundColor={C.card} />}
        />
      )}

      <Modal visible={!!approveTarget} animationType="slide" transparent onRequestClose={() => setApproveTarget(null)}>
        <View style={{ flex: 1, backgroundColor: '#00000080', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: C.bg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: insets.bottom + spacing.lg, maxHeight: '85%' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
              <Text style={{ color: C.text, fontFamily: fontBold, flex: 1, ...typography.title }} numberOfLines={2}>{approveTarget?.title}</Text>
              <TouchableOpacity onPress={() => setApproveTarget(null)}><X size={22} color={C.textMuted} /></TouchableOpacity>
            </View>

            <Text style={{ color: C.textMuted, marginBottom: spacing.sm, ...typography.label }}>{t('admin', 'attachToExistingCourseLabel')}</Text>
            {loadingCandidates ? (
              <ActivityIndicator size="small" color={C.primary} style={{ marginVertical: spacing.md }} />
            ) : candidateCourses.length === 0 ? (
              <Text style={{ color: C.textFaint, marginBottom: spacing.md, ...typography.caption }}>{t('admin', 'noExistingCoursesInCategory')}</Text>
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg }}>
                {candidateCourses.map(c => (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => doApprove({ existingCourseId: c.id })}
                    style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full, borderWidth: 1, borderColor: C.border, backgroundColor: C.card }}
                  >
                    <Text style={{ color: C.text, ...typography.caption, fontWeight: '700' }}>{c.title}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={{ color: C.textMuted, marginBottom: spacing.sm, ...typography.label }}>{t('admin', 'orCreateNewCourseLabel')}</Text>
            <TextInput
              value={newCourseTitle}
              onChangeText={setNewCourseTitle}
              placeholder={t('courses', 'courseTitlePlaceholder')}
              placeholderTextColor={C.textFaint}
              style={{
                borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, marginBottom: spacing.lg,
                backgroundColor: C.card, borderColor: C.border, color: C.text, fontFamily: fontRegular, ...typography.body,
              }}
            />
            <Button
              label={t('admin', 'courseLessonApproveButton')}
              variant="primary"
              loading={actingId === approveTarget?.id}
              onPress={() => {
                if (!newCourseTitle.trim()) {
                  Alert.alert(t('common', 'errorTitle'), t('admin', 'courseTitleRequiredError'));
                  return;
                }
                doApprove({ newCourseTitle: newCourseTitle.trim() });
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
