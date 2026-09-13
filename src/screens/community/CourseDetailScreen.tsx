// src/screens/community/CourseDetailScreen.tsx
// Course detail — lessons list, each a link to an external platform.
// Tapping a lesson stays inside the app: a YouTube lesson plays via the
// real embedded player (LessonPlayerScreen); anything else (Udemy,
// Coursera, ...) opens in an in-app WebView (InAppWebViewScreen) rather
// than the system browser — see backend ARCHITECTURE.md's "Courses"
// section for why no video is hosted by this app directly.
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Image } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, PlayCircle, GraduationCap } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as coursesApi from '../../api/courses';
import { Course, CourseLesson } from '../../api/courses';
import { extractYouTubeId } from '../../utils/youtube';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

const PLATFORM_LABELS: Record<string, string> = {
  youtube: 'YouTube',
  udemy: 'Udemy',
  coursera: 'Coursera',
};

function platformLabel(platform: string): string {
  return PLATFORM_LABELS[platform] || (platform.charAt(0).toUpperCase() + platform.slice(1));
}

export default function CourseDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { id } = route.params;
  const insets = useSafeAreaInsets();
  const { colors: C, spacing, radius, typography, shadow } = useTheme();
  const { lang, t } = useLanguage();
  const fontRegular = lang === 'od' ? 'NotoSansOriya' : undefined;
  const fontBold = lang === 'od' ? 'NotoSansOriya-Bold' : undefined;

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await coursesApi.fetchCourseById(id);
      if (data.success) setCourse(data.course);
    } catch (e) {
      console.error('[COURSE_DETAIL] Fetch failed:', e);
      Alert.alert(t('common', 'errorTitle'), t('courses', 'detailLoadError'));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => { load(); }, [load]);

  const openLesson = (lesson: CourseLesson) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (lesson.platform === 'youtube') {
      const videoId = extractYouTubeId(lesson.external_url);
      if (videoId) {
        navigation.navigate('LessonPlayer', { videoId, title: lesson.title });
        return;
      }
    }
    navigation.navigate('InAppWebView', { url: lesson.external_url, title: lesson.title });
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.goBack(); }} style={{ padding: spacing.xs, borderRadius: radius.full, backgroundColor: C.card }}>
          <ArrowLeft size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={{ color: C.text, fontFamily: fontBold, flex: 1, ...typography.heading }}>{t('courses', 'detailTitle')}</Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : !course ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl }}>
          <Text style={{ color: C.textMuted, textAlign: 'center', ...typography.body }}>{t('courses', 'notFound')}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xxl }}>
          {course.thumbnail_url ? (
            <Image source={{ uri: course.thumbnail_url }} style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: radius.lg, backgroundColor: C.card }} />
          ) : (
            <View style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: radius.lg, backgroundColor: C.primary + '15', alignItems: 'center', justifyContent: 'center' }}>
              <GraduationCap size={48} color={C.primary} />
            </View>
          )}

          {!!course.category && (
            <Text style={{ alignSelf: 'flex-start', color: C.primary, backgroundColor: C.primary + '15', borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: 4, marginTop: spacing.md, ...typography.caption, fontWeight: '700' }}>
              {course.category}
            </Text>
          )}
          <Text style={{ color: C.text, fontFamily: fontBold, marginTop: spacing.sm, ...typography.display }}>{course.title}</Text>
          {!!course.description && (
            <Text style={{ color: C.textMuted, fontFamily: fontRegular, marginTop: spacing.xs, ...typography.body, lineHeight: 22 }}>
              {course.description}
            </Text>
          )}

          <Text style={{ color: C.textMuted, marginTop: spacing.xl, marginBottom: spacing.sm, ...typography.label }}>
            {t('courses', 'lessonsLabel')}
          </Text>

          {(course.lessons || []).length === 0 ? (
            <Text style={{ color: C.textFaint, ...typography.caption }}>{t('courses', 'noLessonsYet')}</Text>
          ) : (
            (course.lessons || []).map((lesson, i) => (
              <TouchableOpacity
                key={lesson.id}
                onPress={() => openLesson(lesson)}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: spacing.md,
                  backgroundColor: C.card, borderColor: C.border, borderWidth: 1,
                  borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.sm, ...shadow.card,
                }}
              >
                <View style={{ width: 32, height: 32, borderRadius: radius.full, backgroundColor: C.primary + '15', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: C.primary, ...typography.caption, fontWeight: '700' }}>{i + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.text, fontFamily: fontRegular, ...typography.bodyEmphasis }} numberOfLines={2}>{lesson.title}</Text>
                  <Text style={{ color: C.textFaint, marginTop: 2, ...typography.caption }}>{platformLabel(lesson.platform)}</Text>
                </View>
                <PlayCircle size={22} color={C.primary} />
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}
