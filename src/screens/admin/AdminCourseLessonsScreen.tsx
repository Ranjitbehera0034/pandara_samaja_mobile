// src/screens/admin/AdminCourseLessonsScreen.tsx
// Manage one course's lessons — each a title + platform + external link.
// Appended to the end of the list; no reordering UI yet (order_index is
// assigned server-side).
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl, Alert,
  Modal, TextInput, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, Plus, Trash2, X as XIcon } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as adminApi from '../../api/admin';
import { AdminCourseLesson } from '../../api/admin';
import EmptyState from '../../components/common/EmptyState';
import Button from '../../components/common/Button';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

const PLATFORMS = ['youtube', 'udemy', 'coursera', 'other'] as const;

export default function AdminCourseLessonsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { courseId, courseTitle } = route.params;
  const insets = useSafeAreaInsets();
  const { colors: C, spacing, radius, typography, shadow } = useTheme();
  const { lang, t } = useLanguage();
  const fontRegular = lang === 'od' ? 'NotoSansOriya' : undefined;
  const fontBold = lang === 'od' ? 'NotoSansOriya-Bold' : undefined;

  const [lessons, setLessons] = useState<AdminCourseLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [removingId, setRemovingId] = useState<string | number | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [lessonTitle, setLessonTitle] = useState('');
  const [platform, setPlatform] = useState<string>('youtube');
  const [externalUrl, setExternalUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const data = await adminApi.fetchAdminCourseById(courseId);
      if (data.success) setLessons(data.course.lessons || []);
    } catch (e) {
      console.error('[ADMIN_COURSE_LESSONS] Fetch failed:', e);
      Alert.alert(t('common', 'errorTitle'), t('admin', 'courseLessonsLoadError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [courseId, t]);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => { setLessonTitle(''); setPlatform('youtube'); setExternalUrl(''); };

  const openCreate = () => {
    resetForm();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!lessonTitle.trim() || !externalUrl.trim()) {
      Alert.alert(t('common', 'errorTitle'), t('admin', 'lessonFieldsRequiredError'));
      return;
    }
    setSaving(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const data = await adminApi.addCourseLesson(courseId, {
        title: lessonTitle.trim(),
        platform,
        externalUrl: externalUrl.trim(),
      });
      if (data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setShowForm(false);
        resetForm();
        load();
      } else {
        throw new Error(t('admin', 'lessonSaveError'));
      }
    } catch (e: any) {
      console.error('[ADMIN_COURSE_LESSONS] Save failed:', e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common', 'errorTitle'), e.message || t('admin', 'lessonSaveError'));
    } finally {
      setSaving(false);
    }
  };

  const doRemove = async (lessonId: string | number) => {
    setRemovingId(lessonId);
    try {
      const data = await adminApi.deleteCourseLesson(courseId, lessonId);
      if (data.success) {
        setLessons(prev => prev.filter(l => l.id !== lessonId));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        throw new Error(t('admin', 'lessonDeleteError'));
      }
    } catch (e: any) {
      console.error('[ADMIN_COURSE_LESSONS] Remove failed:', e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common', 'errorTitle'), e.message || t('admin', 'lessonDeleteError'));
    } finally {
      setRemovingId(null);
    }
  };

  const handleRemove = (lesson: AdminCourseLesson) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      t('admin', 'confirmDeleteLessonTitle'),
      t('admin', 'confirmDeleteLessonMessage'),
      [
        { text: t('common', 'cancel'), style: 'cancel' },
        { text: t('common', 'delete'), style: 'destructive', onPress: () => doRemove(lesson.id) },
      ]
    );
  };

  const renderItem = useCallback(({ item, index }: { item: AdminCourseLesson; index: number }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadow.card }}>
      <View style={{ width: 32, height: 32, borderRadius: radius.full, backgroundColor: C.primary + '15', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: C.primary, ...typography.caption, fontWeight: '700' }}>{index + 1}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: C.text, fontFamily: fontRegular, ...typography.bodyEmphasis }} numberOfLines={2}>{item.title}</Text>
        <Text style={{ color: C.textFaint, marginTop: 2, ...typography.caption }} numberOfLines={1}>
          {item.platform} · {item.external_url}
        </Text>
      </View>
      <TouchableOpacity
        onPress={() => handleRemove(item)}
        disabled={removingId === item.id}
        style={{ padding: spacing.sm, borderRadius: radius.md, backgroundColor: C.error + '15' }}
      >
        {removingId === item.id ? <ActivityIndicator size="small" color={C.error} /> : <Trash2 size={16} color={C.error} />}
      </TouchableOpacity>
    </View>
  ), [C, spacing, radius, typography, shadow, fontRegular, removingId]);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.goBack(); }} style={{ padding: spacing.xs, borderRadius: radius.full, backgroundColor: C.card }}>
          <ArrowLeft size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={{ color: C.text, fontFamily: fontBold, flex: 1, ...typography.heading }} numberOfLines={1}>{courseTitle}</Text>
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
      ) : (
        <FlatList
          data={lessons}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + spacing.xl, flexGrow: 1 }}
          ListEmptyComponent={<EmptyState emoji="🎬" title={t('admin', 'lessonsEmptyTitle')} subtitle={t('admin', 'lessonsEmptySubtitle')} />}
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
              <Text style={{ color: C.text, fontFamily: fontBold, ...typography.title }}>{t('admin', 'newLessonTitle')}</Text>
              <TouchableOpacity onPress={() => { setShowForm(false); resetForm(); }}>
                <XIcon size={22} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={{ color: C.textMuted, marginBottom: spacing.sm, ...typography.label }}>{t('courses', 'lessonTitleLabel')}</Text>
              <TextInput
                style={{ borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, marginBottom: spacing.lg, backgroundColor: C.card, borderColor: C.border, color: C.text, fontFamily: fontRegular, ...typography.body }}
                placeholder={t('courses', 'lessonTitlePlaceholder')}
                placeholderTextColor={C.textFaint}
                value={lessonTitle}
                onChangeText={setLessonTitle}
              />

              <Text style={{ color: C.textMuted, marginBottom: spacing.sm, ...typography.label }}>{t('courses', 'platformLabel')}</Text>
              <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg, flexWrap: 'wrap' }}>
                {PLATFORMS.map(p => (
                  <TouchableOpacity
                    key={p}
                    onPress={() => setPlatform(p)}
                    style={{
                      paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full,
                      borderWidth: 1, borderColor: platform === p ? C.primary : C.border,
                      backgroundColor: platform === p ? C.primary + '15' : C.card,
                    }}
                  >
                    <Text style={{ color: platform === p ? C.primary : C.textMuted, ...typography.caption, fontWeight: '700', textTransform: 'capitalize' }}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={{ color: C.textMuted, marginBottom: spacing.sm, ...typography.label }}>{t('courses', 'externalUrlLabel')}</Text>
              <TextInput
                style={{ borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, marginBottom: spacing.lg, backgroundColor: C.card, borderColor: C.border, color: C.text, fontFamily: fontRegular, ...typography.body }}
                placeholder={t('courses', 'externalUrlPlaceholder')}
                placeholderTextColor={C.textFaint}
                value={externalUrl}
                onChangeText={setExternalUrl}
                autoCapitalize="none"
                keyboardType="url"
              />

              <Button variant="primary" label={t('common', 'save')} onPress={handleSave} loading={saving} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
