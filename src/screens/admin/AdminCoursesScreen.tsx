// src/screens/admin/AdminCoursesScreen.tsx
// Courses list — create/edit a course's title/description/category, toggle
// publish state, delete, and tap through to manage its lessons
// (AdminCourseLessonsScreen). Admin-authored only, no submission queue —
// see backend ARCHITECTURE.md's "Courses" section.
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl, Alert,
  Modal, TextInput, KeyboardAvoidingView, Platform, ScrollView, Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Plus, Trash2, Edit2, X as XIcon, ListChecks, ClipboardList } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as adminApi from '../../api/admin';
import { AdminCourse } from '../../api/admin';
import EmptyState from '../../components/common/EmptyState';
import Button from '../../components/common/Button';
import Chip from '../../components/common/Chip';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { COURSE_CATEGORIES, courseCategoryLabel } from '../../data/courseCategories';

export default function AdminCoursesScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors: C, spacing, radius, typography, shadow } = useTheme();
  const { lang, t } = useLanguage();
  const fontRegular = lang === 'od' ? 'NotoSansOriya' : undefined;
  const fontBold = lang === 'od' ? 'NotoSansOriya-Bold' : undefined;

  const [courses, setCourses] = useState<AdminCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [removingId, setRemovingId] = useState<string | number | null>(null);
  const [togglingId, setTogglingId] = useState<string | number | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AdminCourse | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setLoadError(false);
    try {
      const data = await adminApi.fetchAdminCourses();
      if (data.success) setCourses(data.courses);
    } catch (e) {
      console.error('[ADMIN_COURSES] Fetch failed:', e);
      setLoadError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => {
    setEditing(null);
    setTitle(''); setDescription(''); setCategory(''); setThumbnailUrl('');
  };

  const openCreate = () => {
    resetForm();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowForm(true);
  };

  const openEdit = (item: AdminCourse) => {
    setEditing(item);
    setTitle(item.title);
    setDescription(item.description || '');
    setCategory(item.category || '');
    setThumbnailUrl(item.thumbnail_url || '');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert(t('common', 'errorTitle'), t('admin', 'courseTitleRequiredError'));
      return;
    }
    setSaving(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        category: category.trim() || undefined,
        thumbnailUrl: thumbnailUrl.trim() || undefined,
      };
      const data = editing
        ? await adminApi.updateAdminCourse(editing.id, payload)
        : await adminApi.createAdminCourse(payload);
      if (data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setShowForm(false);
        resetForm();
        load();
      } else {
        throw new Error(t('admin', 'courseSaveError'));
      }
    } catch (e: any) {
      console.error('[ADMIN_COURSES] Save failed:', e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common', 'errorTitle'), e.message || t('admin', 'courseSaveError'));
    } finally {
      setSaving(false);
    }
  };

  const doRemove = async (id: string | number) => {
    setRemovingId(id);
    try {
      const data = await adminApi.deleteAdminCourse(id);
      if (data.success) {
        setCourses(prev => prev.filter(c => c.id !== id));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        throw new Error(t('admin', 'courseDeleteError'));
      }
    } catch (e: any) {
      console.error('[ADMIN_COURSES] Remove failed:', e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common', 'errorTitle'), e.message || t('admin', 'courseDeleteError'));
    } finally {
      setRemovingId(null);
    }
  };

  const handleRemove = (item: AdminCourse) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      t('admin', 'confirmDeleteCourseTitle'),
      t('admin', 'confirmDeleteCourseMessage'),
      [
        { text: t('common', 'cancel'), style: 'cancel' },
        { text: t('common', 'delete'), style: 'destructive', onPress: () => doRemove(item.id) },
      ]
    );
  };

  const togglePublish = async (item: AdminCourse) => {
    setTogglingId(item.id);
    try {
      const data = await adminApi.setCoursePublished(item.id, !item.is_published);
      if (data.success) {
        setCourses(prev => prev.map(c => (c.id === item.id ? { ...c, is_published: data.course.is_published } : c)));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e) {
      console.error('[ADMIN_COURSES] Publish toggle failed:', e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common', 'errorTitle'), t('admin', 'courseSaveError'));
    } finally {
      setTogglingId(null);
    }
  };

  const renderItem = useCallback(({ item }: { item: AdminCourse }) => (
    <View style={{ backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadow.card }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          {!!item.category && (
            <Text style={{ alignSelf: 'flex-start', color: C.primary, backgroundColor: C.primary + '15', borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 3, ...typography.caption, fontWeight: '700' }}>
              {courseCategoryLabel(item.category, lang)}
            </Text>
          )}
          <Text style={{ color: C.text, fontFamily: fontBold, marginTop: spacing.xs, ...typography.bodyEmphasis }}>{item.title}</Text>
          <Text style={{ color: C.textFaint, marginTop: 2, ...typography.caption }}>
            {t('admin', 'courseLessonCountLabel')}: {item.lesson_count ?? 0}
          </Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Switch
            value={item.is_published}
            onValueChange={() => togglePublish(item)}
            disabled={togglingId === item.id}
            trackColor={{ false: C.border, true: C.primary + '80' }}
            thumbColor={item.is_published ? C.primary : '#f4f3f4'}
          />
          <Text style={{ color: item.is_published ? C.primary : C.textFaint, ...typography.caption, marginTop: 2 }}>
            {item.is_published ? t('admin', 'coursePublishedLabel') : t('admin', 'courseDraftLabel')}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
        <TouchableOpacity
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.navigate('AdminCourseLessons', { courseId: item.id, courseTitle: item.title }); }}
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, borderWidth: 1, borderColor: C.primary, borderRadius: radius.md, paddingVertical: spacing.sm }}
        >
          <ListChecks size={14} color={C.primary} />
          <Text style={{ color: C.primary, ...typography.caption, fontWeight: '700' }}>{t('admin', 'manageLessonsButton')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => openEdit(item)}
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, borderWidth: 1, borderColor: C.border, borderRadius: radius.md, paddingVertical: spacing.sm }}
        >
          <Edit2 size={14} color={C.text} />
          <Text style={{ color: C.text, ...typography.caption, fontWeight: '700' }}>{t('admin', 'editButton')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleRemove(item)}
          disabled={removingId === item.id}
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, backgroundColor: C.error + '15', borderRadius: radius.md, paddingVertical: spacing.sm }}
        >
          {removingId === item.id ? <ActivityIndicator size="small" color={C.error} /> : <Trash2 size={14} color={C.error} />}
          <Text style={{ color: C.error, ...typography.caption, fontWeight: '700' }}>{t('common', 'delete')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  ), [C, spacing, radius, typography, shadow, fontBold, t, removingId, togglingId, navigation, lang]);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.goBack(); }} style={{ padding: spacing.xs, borderRadius: radius.full, backgroundColor: C.card }}>
          <ArrowLeft size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={{ color: C.text, fontFamily: fontBold, flex: 1, ...typography.heading }}>{t('admin', 'coursesTitle')}</Text>
        <TouchableOpacity
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.navigate('AdminCourseLessonSubmissions'); }}
          style={{ width: 36, height: 36, borderRadius: radius.full, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border }}
        >
          <ClipboardList size={16} color={C.text} />
        </TouchableOpacity>
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
      ) : loadError ? (
        <EmptyState emoji="⚠️" title={t('common', 'error')} subtitle={t('admin', 'coursesLoadError')} />
      ) : (
        <FlatList
          data={courses}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + spacing.xl, flexGrow: 1 }}
          ListEmptyComponent={<EmptyState emoji="🎓" title={t('admin', 'coursesEmptyTitle')} subtitle={t('admin', 'coursesEmptySubtitle')} />}
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
              <Text style={{ color: C.text, fontFamily: fontBold, ...typography.title }}>
                {editing ? t('admin', 'editCourseTitle') : t('admin', 'newCourseTitle')}
              </Text>
              <TouchableOpacity onPress={() => { setShowForm(false); resetForm(); }}>
                <XIcon size={22} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={{ color: C.textMuted, marginBottom: spacing.sm, ...typography.label }}>{t('courses', 'courseTitleLabel')}</Text>
              <TextInput
                style={{ borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, marginBottom: spacing.lg, backgroundColor: C.card, borderColor: C.border, color: C.text, fontFamily: fontRegular, ...typography.body }}
                placeholder={t('courses', 'courseTitlePlaceholder')}
                placeholderTextColor={C.textFaint}
                value={title}
                onChangeText={setTitle}
              />

              <Text style={{ color: C.textMuted, marginBottom: spacing.sm, ...typography.label }}>{t('courses', 'categoryLabel')}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg }}>
                {COURSE_CATEGORIES.map(c => (
                  <Chip
                    key={c.key}
                    label={lang === 'od' ? c.or : c.en}
                    selected={category === c.key}
                    onPress={() => setCategory(category === c.key ? '' : c.key)}
                  />
                ))}
              </View>

              <Text style={{ color: C.textMuted, marginBottom: spacing.sm, ...typography.label }}>{t('courses', 'courseDescriptionLabel')}</Text>
              <TextInput
                style={{ borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, marginBottom: spacing.lg, backgroundColor: C.card, borderColor: C.border, color: C.text, fontFamily: fontRegular, minHeight: 90, textAlignVertical: 'top', ...typography.body }}
                placeholder={t('courses', 'courseDescriptionPlaceholder')}
                placeholderTextColor={C.textFaint}
                value={description}
                onChangeText={setDescription}
                multiline
              />

              <Text style={{ color: C.textMuted, marginBottom: spacing.sm, ...typography.label }}>{t('courses', 'thumbnailUrlLabel')}</Text>
              <TextInput
                style={{ borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, marginBottom: spacing.lg, backgroundColor: C.card, borderColor: C.border, color: C.text, fontFamily: fontRegular, ...typography.body }}
                placeholder={t('courses', 'thumbnailUrlPlaceholder')}
                placeholderTextColor={C.textFaint}
                value={thumbnailUrl}
                onChangeText={setThumbnailUrl}
                autoCapitalize="none"
              />

              <Button variant="primary" label={t('common', 'save')} onPress={handleSave} loading={saving} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
