// src/screens/explore/ExploreScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { Image } from 'expo-image';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Compass, TrendingUp, Users, Hash, Newspaper, RefreshCw, CalendarDays } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { fetchExploreStats } from '../../api/explore';
import { fetchNews, NewsItem } from '../../api/news';
import NewsViewer from '../../components/explore/NewsViewer';
import OdiaCalendarView from '../../components/explore/OdiaCalendarView';
import GlobalSearch from '../../components/common/GlobalSearch';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

type Tab = 'trending' | 'popular' | 'tags' | 'news' | 'calendar';

// Curated allowlist of the raw category values worth showing as filter
// chips — Dharitri's feed also carries WordPress placement noise ("Home
// Left", "Home Middle") and one-off auto-generated keyword tags that
// aren't meaningful filters, so this is deliberately not "show every
// category we see." District tags (Ganjam, Cuttack, etc.) are a separate
// filter dimension, left for a later step.
const NEWS_CATEGORIES: { raw: string; label: string }[] = [
  { raw: 'ରାଜ୍ୟ', label: 'ରାଜ୍ୟ' },
  { raw: 'ଜାତୀୟ', label: 'ଜାତୀୟ' },
  { raw: 'ଅନ୍ତର୍ଜାତୀୟ', label: 'ଅନ୍ତର୍ଜାତୀୟ' },
  { raw: 'ବାଣିଜ୍ୟ', label: 'ବାଣିଜ୍ୟ' },
  { raw: 'ଜୀବନଚର୍ଯ୍ୟା', label: 'ଜୀବନଚର୍ଯ୍ୟା' },
  { raw: 'rashiphala', label: 'ରାଶିଫଳ' },
  { raw: 'ମେଟ୍ରୋ', label: 'ମେଟ୍ରୋ' },
  { raw: 'ସମ୍ପାଦକୀୟ', label: 'ସମ୍ପାଦକୀୟ' },
];

export default function ExploreScreen() {
  const { colors: C, spacing, radius, typography } = useTheme();
  const { lang, t } = useLanguage();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [activeTab, setActiveTab] = useState<Tab>('news');

  // A news push notification navigates here with { initialTab: 'news' } —
  // this screen stays mounted across tab switches (standard bottom-tab
  // behavior), so without this, tapping the notification would just reveal
  // whatever pill the member last left selected instead of actually landing
  // on News. Consumed once via setParams so it doesn't keep re-forcing News
  // if the member later leaves and naturally returns to this tab.
  useEffect(() => {
    if (route.params?.initialTab === 'news') {
      setActiveTab('news');
      navigation.setParams({ initialTab: undefined });
    }
  }, [route.params?.initialTab, navigation]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsLoaded, setNewsLoaded] = useState(false);
  const [newsError, setNewsError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = () => {
    return fetchExploreStats()
      .then(d => { if (d.success) setStats(d.stats); })
      .catch((err) => console.error('[EXPLORE STATS]', err));
  };

  useEffect(() => {
    loadStats().finally(() => setLoading(false));
  }, []);

  const loadNews = () => {
    setNewsLoading(true);
    setNewsError(false);
    return fetchNews()
      .then(d => { if (d.success) setNews(d.items); })
      .catch((err) => {
        console.error('[EXPLORE NEWS]', err);
        setNewsError(true);
      })
      .finally(() => { setNewsLoading(false); setNewsLoaded(true); });
  };

  // Fetched lazily on first visit to the News tab rather than on mount —
  // it's a separate backend call most sessions won't need.
  useEffect(() => {
    if (activeTab !== 'news' || newsLoaded) return;
    loadNews();
  }, [activeTab, newsLoaded]);

  // Both pull-to-refresh and the explicit refresh button (News tab) land
  // here — always hits the network fresh, ignoring the "already loaded
  // once" guard that lazy-loading normally relies on.
  const handleRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    Promise.all([loadStats(), activeTab === 'news' ? loadNews() : Promise.resolve()])
      .finally(() => setRefreshing(false));
  };

  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null); // null = All

  const openNewsAt = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setViewerIndex(index);
  };

  // Only show chips for categories that actually have at least one
  // currently-loaded article — no point offering an empty filter.
  const availableCategories = NEWS_CATEGORIES.filter((c) =>
    news.some((item) => item.categories.includes(c.raw))
  );
  const filteredNews = selectedCategory
    ? news.filter((item) => item.categories.includes(selectedCategory))
    : news;

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'news', label: t('explore', 'tabNews'), icon: <Newspaper size={16} /> },
    { key: 'calendar', label: t('explore', 'tabCalendar'), icon: <CalendarDays size={16} /> },
    { key: 'trending', label: t('explore', 'tabTrending'), icon: <TrendingUp size={16} /> },
    { key: 'popular', label: t('explore', 'tabMembers'), icon: <Users size={16} /> },
    { key: 'tags', label: t('explore', 'tabHashtags'), icon: <Hash size={16} /> },
  ];

  return (
    <View style={{ backgroundColor: C.bg, paddingTop: insets.top }} className="flex-1">
      {/* Header Title */}
      <View
        style={{ gap: spacing.md, paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm }}
        className="flex-row items-center"
      >
        <Compass size={24} color={C.primaryLight} />
        <Text style={{ color: C.text, fontFamily: lang === 'od' ? 'NotoSansOriya-Bold' : undefined, flex: 1, ...typography.heading }}>
          {t('explore', 'title')}
        </Text>
        <TouchableOpacity
          onPress={handleRefresh}
          disabled={refreshing}
          style={{ width: 36, height: 36, borderRadius: radius.full, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', opacity: refreshing ? 0.5 : 1 }}
        >
          <RefreshCw size={18} color={C.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.primary} colors={[C.primary]} progressBackgroundColor={C.card} />
        }
      >
        {/* Global Search Component */}
        <GlobalSearch />

        {/* Tab Selector Bar — horizontal scrollable pills, scales cleanly
            regardless of how many tabs exist (was a 5-way equal-width
            squeeze before, cramped on smaller screens) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.sm, paddingBottom: 4 }}
          style={{ marginBottom: spacing.lg }}
        >
          {TABS.map(tab => {
            const active = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
                  paddingHorizontal: spacing.lg, paddingVertical: spacing.sm + 2,
                  borderRadius: radius.full,
                  backgroundColor: active ? C.primary : 'transparent',
                  borderWidth: active ? 0 : 1,
                  borderColor: C.border,
                }}
              >
                {React.cloneElement(tab.icon as any, {
                  color: active ? '#fff' : C.textMuted
                })}
                <Text style={{ ...typography.caption, color: active ? '#fff' : C.textMuted, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined, fontWeight: active ? '600' : '400' }}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Tab Content Display Areas */}
        <View>
          {/* Trending Tab Content */}
          {activeTab === 'trending' && (
            <View style={{ backgroundColor: C.card + '80', borderColor: C.border + '80', borderRadius: radius.lg, padding: spacing.xxl }} className="items-center border">
              <TrendingUp size={48} color={C.textFaint} style={{ marginBottom: spacing.lg }} />
              <Text style={{ color: C.text, fontFamily: lang === 'od' ? 'NotoSansOriya-Bold' : undefined, marginBottom: spacing.sm, ...typography.title }}>
                {t('explore', 'trendingPostsTitle')}
              </Text>
              <Text style={{ color: C.textMuted, textAlign: 'center', fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined, ...typography.body }}>
                {t('explore', 'trendingPostsSubtitle')}
              </Text>
            </View>
          )}

          {/* Odia Calendar Tab Content */}
          {activeTab === 'calendar' && <OdiaCalendarView />}

          {/* Popular Members Tab Content */}
          {activeTab === 'popular' && (
            <View>
              {loading ? (
                <ActivityIndicator color={C.primaryLight} size="large" style={{ paddingVertical: spacing.xxl + spacing.sm }} />
              ) : stats?.active_members ? (
                <View style={{ backgroundColor: C.card + '80', borderColor: C.border + '80', padding: spacing.xl, borderRadius: radius.lg, gap: spacing.lg }} className="border items-center">
                  <Users size={40} color={C.primaryLight} />
                  <View className="items-center">
                    <Text style={{ color: C.text, ...typography.display }}>{stats.active_members}</Text>
                    <Text style={{ color: C.textMuted, marginTop: spacing.xs, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined, ...typography.body }}>
                      {t('explore', 'activeMembersLabel')}
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={{ backgroundColor: C.card + '80', borderColor: C.border + '80', borderRadius: radius.lg, padding: spacing.xxl }} className="items-center border">
                  <Users size={40} color={C.textFaint} style={{ marginBottom: spacing.lg }} />
                  <Text style={{ color: C.textMuted, textAlign: 'center', fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined, ...typography.body }}>
                    {t('explore', 'noPopularMembers')}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Tags Tab Content */}
          {activeTab === 'tags' && (
            <View>
              {loading ? (
                <ActivityIndicator color={C.primaryLight} size="large" style={{ paddingVertical: spacing.xxl + spacing.sm }} />
              ) : stats?.trending_tags?.length > 0 ? (
                <View style={{ gap: spacing.md }} className="flex-row flex-wrap">
                  {stats.trending_tags.map((tag: any) => (
                    <TouchableOpacity
                      key={tag.name}
                      style={{ backgroundColor: C.card, borderColor: C.border, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.md }}
                      className="border"
                    >
                      <Text style={{ color: C.primaryLight, ...typography.body, fontWeight: '500' }}>
                        {tag.name} <Text style={{ color: C.textFaint, ...typography.caption }}>({tag.count})</Text>
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View style={{ backgroundColor: C.card + '80', borderColor: C.border + '80', borderRadius: radius.lg, padding: spacing.xxl }} className="items-center border">
                  <Hash size={40} color={C.textFaint} style={{ marginBottom: spacing.lg }} />
                  <Text style={{ color: C.textMuted, textAlign: 'center', fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined, ...typography.body }}>
                    {t('explore', 'noTags')}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* News Tab Content */}
          {activeTab === 'news' && (
            <View>
              {(!newsLoading || newsLoaded) && availableCategories.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.lg, flexGrow: 0 }} contentContainerStyle={{ gap: spacing.sm, alignItems: 'center' }}>
                  <TouchableOpacity
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedCategory(null); }}
                    style={{
                      paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full,
                      backgroundColor: selectedCategory === null ? C.primary : C.card,
                      borderWidth: 1, borderColor: selectedCategory === null ? C.primary : C.border,
                    }}
                  >
                    <Text style={{ color: selectedCategory === null ? '#fff' : C.textMuted, fontFamily: 'NotoSansOriya', ...typography.caption, fontWeight: '600' }}>
                      {t('explore', 'allCategories')}
                    </Text>
                  </TouchableOpacity>
                  {availableCategories.map((cat) => (
                    <TouchableOpacity
                      key={cat.raw}
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedCategory(cat.raw); }}
                      style={{
                        paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full,
                        backgroundColor: selectedCategory === cat.raw ? C.primary : C.card,
                        borderWidth: 1, borderColor: selectedCategory === cat.raw ? C.primary : C.border,
                      }}
                    >
                      <Text style={{ color: selectedCategory === cat.raw ? '#fff' : C.textMuted, fontFamily: 'NotoSansOriya', ...typography.caption, fontWeight: '600' }}>
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              {newsLoading && !newsLoaded ? (
                // Only the very first load takes over the screen — a
                // refresh (pull-to-refresh or the button) keeps existing
                // content visible, same as everywhere else refresh exists.
                <ActivityIndicator color={C.primaryLight} size="large" style={{ paddingVertical: spacing.xxl + spacing.sm }} />
              ) : filteredNews.length > 0 ? (
                <View style={{ gap: spacing.md }}>
                  {filteredNews.map((item, index) => (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => openNewsAt(index)}
                      style={{ backgroundColor: C.card, borderColor: C.border, borderRadius: radius.lg, overflow: 'hidden' }}
                      className="border"
                    >
                      {item.imageUrl && (
                        <Image source={{ uri: item.imageUrl }} style={{ width: '100%', height: 160, backgroundColor: C.bg }} contentFit="cover" />
                      )}
                      <View style={{ padding: spacing.lg }}>
                        <Text style={{ color: C.text, fontFamily: 'NotoSansOriya-Bold', marginBottom: spacing.xs, ...typography.bodyEmphasis }}>
                          {item.title}
                        </Text>
                        {!!item.snippet && (
                          <Text numberOfLines={2} style={{ color: C.textMuted, fontFamily: 'NotoSansOriya', marginBottom: spacing.sm, ...typography.body }}>
                            {item.snippet}
                          </Text>
                        )}
                        <Text style={{ color: C.primaryLight, ...typography.caption, fontWeight: '600' }}>
                          {item.sourceName}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View style={{ backgroundColor: C.card + '80', borderColor: C.border + '80', borderRadius: radius.lg, padding: spacing.xxl }} className="items-center border">
                  <Newspaper size={40} color={C.textFaint} style={{ marginBottom: spacing.lg }} />
                  <Text style={{ color: C.textMuted, textAlign: 'center', fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined, marginBottom: newsError ? spacing.lg : 0, ...typography.body }}>
                    {newsError ? t('explore', 'newsLoadError') : t('explore', 'noNews')}
                  </Text>
                  {newsError && (
                    <TouchableOpacity
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); loadNews(); }}
                      style={{ backgroundColor: C.primary, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm + 2, borderRadius: radius.md }}
                    >
                      <Text style={{ color: '#fff', fontFamily: lang === 'od' ? 'NotoSansOriya-Bold' : undefined, ...typography.bodyEmphasis, fontWeight: '600' }}>
                        {t('common', 'retry')}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
              <NewsViewer
                visible={viewerIndex !== null}
                items={filteredNews}
                initialIndex={viewerIndex ?? 0}
                onClose={() => setViewerIndex(null)}
              />
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
