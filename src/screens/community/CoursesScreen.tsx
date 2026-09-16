// src/screens/community/CoursesScreen.tsx
// Free courses — admin-curated links to external learning platforms
// (YouTube/Udemy/Coursera/etc.) for skill-building and govt exam prep.
// Read-only browse; no submission path (see backend ARCHITECTURE.md).
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl, Alert, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, GraduationCap } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as coursesApi from '../../api/courses';
import { Course } from '../../api/courses';
import EmptyState from '../../components/common/EmptyState';
import ChipFilterRow from '../../components/common/ChipFilterRow';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { COURSE_CATEGORIES, courseCategoryLabel } from '../../data/courseCategories';

const PAGE_SIZE = 20;

export default function CoursesScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors: C, spacing, radius, typography, shadow } = useTheme();
  const { lang, t } = useLanguage();
  const fontRegular = lang === 'od' ? 'NotoSansOriya' : undefined;
  const fontBold = lang === 'od' ? 'NotoSansOriya-Bold' : undefined;

  const [courses, setCourses] = useState<Course[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [category, setCategory] = useState<string | null>(null);

  const load = useCallback(async (pageNum: number, replace = false, categoryOverride?: string | null) => {
    try {
      const activeCategory = categoryOverride !== undefined ? categoryOverride : category;
      const data = await coursesApi.fetchCourses({ page: pageNum, limit: PAGE_SIZE, category: activeCategory || undefined });
      if (data.success) {
        setCourses(prev => (replace ? data.courses : [...prev, ...data.courses]));
        setPage(data.page);
        setHasMore(data.courses.length === PAGE_SIZE);
      }
    } catch (e) {
      console.error('[COURSES] Fetch failed:', e);
      Alert.alert(t('common', 'errorTitle'), t('courses', 'loadError'));
    }
  }, [t, category]);

  useEffect(() => {
    setLoading(true);
    load(1, true).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectCategory = (next: string | null) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCategory(next);
    setLoading(true);
    load(1, true, next).finally(() => setLoading(false));
  };

  const onRefresh = () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    load(1, true).finally(() => setRefreshing(false));
  };

  const onEndReached = () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    load(page + 1).finally(() => setLoadingMore(false));
  };

  const renderCourse = useCallback(({ item }: { item: Course }) => (
    <TouchableOpacity
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        navigation.navigate('CourseDetail', { id: item.id });
      }}
      style={{
        backgroundColor: C.card, borderColor: C.border, borderWidth: 1,
        borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadow.card,
        flexDirection: 'row', gap: spacing.md,
      }}
    >
      {item.thumbnail_url ? (
        <Image source={{ uri: item.thumbnail_url }} style={{ width: 64, height: 64, borderRadius: radius.md, backgroundColor: C.bg }} />
      ) : (
        <View style={{ width: 64, height: 64, borderRadius: radius.md, backgroundColor: C.primary + '15', alignItems: 'center', justifyContent: 'center' }}>
          <GraduationCap size={28} color={C.primary} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        {!!item.category && (
          <Text style={{ alignSelf: 'flex-start', color: C.primary, backgroundColor: C.primary + '15', borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 3, ...typography.caption, fontWeight: '700' }}>
            {courseCategoryLabel(item.category, lang)}
          </Text>
        )}
        <Text style={{ color: C.text, fontFamily: fontBold, marginTop: spacing.xs, ...typography.bodyEmphasis }} numberOfLines={2}>
          {item.title}
        </Text>
        {!!item.description && (
          <Text style={{ color: C.textMuted, fontFamily: fontRegular, marginTop: 2, ...typography.caption }} numberOfLines={2}>
            {item.description}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  ), [C, spacing, radius, typography, shadow, fontBold, fontRegular, navigation, lang]);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.goBack(); }} style={{ padding: spacing.xs, borderRadius: radius.full, backgroundColor: C.card }}>
          <ArrowLeft size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={{ color: C.text, fontFamily: fontBold, flex: 1, ...typography.heading }}>{t('courses', 'listTitle')}</Text>
      </View>

      <Text style={{ color: C.textMuted, fontFamily: fontRegular, paddingHorizontal: spacing.lg, marginBottom: spacing.md, ...typography.caption }}>
        {t('courses', 'listSubtitle')}
      </Text>

      <ChipFilterRow
        title={t('courses', 'filterByCategoryTitle')}
        allLabel={t('courses', 'allCategoriesLabel')}
        options={COURSE_CATEGORIES.map(c => ({ key: c.key, label: lang === 'od' ? c.or : c.en }))}
        selected={category}
        onSelect={selectCategory}
      />

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : (
        <FlatList
          data={courses}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderCourse}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + spacing.xl, flexGrow: 1 }}
          ListEmptyComponent={<EmptyState emoji="🎓" title={t('courses', 'emptyTitle')} subtitle={t('courses', 'emptySubtitle')} />}
          ListFooterComponent={
            <View style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
              {loadingMore && <ActivityIndicator size="small" color={C.primaryLight} />}
            </View>
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.3}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} colors={[C.primary]} progressBackgroundColor={C.card} />
          }
        />
      )}
    </View>
  );
}
