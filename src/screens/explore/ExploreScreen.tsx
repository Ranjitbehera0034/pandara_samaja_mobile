// src/screens/explore/ExploreScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Compass, TrendingUp, Users, Hash, Newspaper } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { fetchExploreStats } from '../../api/explore';
import { fetchNews, NewsItem } from '../../api/news';
import NewsViewer from '../../components/explore/NewsViewer';
import GlobalSearch from '../../components/common/GlobalSearch';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

type Tab = 'trending' | 'popular' | 'tags' | 'news';

export default function ExploreScreen() {
  const { colors: C, spacing, radius, typography } = useTheme();
  const { lang, t } = useLanguage();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<Tab>('news');
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsLoaded, setNewsLoaded] = useState(false);

  useEffect(() => {
    fetchExploreStats()
      .then(d => { if (d.success) setStats(d.stats); })
      .catch((err) => console.error('[EXPLORE STATS]', err))
      .finally(() => setLoading(false));
  }, []);

  // Fetched lazily on first visit to the News tab rather than on mount —
  // it's a separate backend call most sessions won't need.
  useEffect(() => {
    if (activeTab !== 'news' || newsLoaded) return;
    setNewsLoading(true);
    fetchNews()
      .then(d => { if (d.success) setNews(d.items); })
      .catch((err) => console.error('[EXPLORE NEWS]', err))
      .finally(() => { setNewsLoading(false); setNewsLoaded(true); });
  }, [activeTab, newsLoaded]);

  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const openNewsAt = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setViewerIndex(index);
  };

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'news', label: t('explore', 'tabNews'), icon: <Newspaper size={16} /> },
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
        <Text style={{ color: C.text, fontFamily: lang === 'od' ? 'NotoSansOriya-Bold' : undefined, ...typography.heading }}>
          {t('explore', 'title')}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 80 }} showsVerticalScrollIndicator={false}>
        {/* Global Search Component */}
        <GlobalSearch />

        {/* Tab Selector Bar */}
        <View style={{ borderColor: C.border + '80', marginBottom: spacing.xl }} className="flex-row border-b">
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={{ borderBottomColor: activeTab === tab.key ? C.primaryLight : 'transparent', gap: spacing.sm, paddingVertical: spacing.md }}
              className="flex-1 flex-row items-center justify-center border-b-2"
            >
              <View style={{ opacity: activeTab === tab.key ? 1 : 0.5 }}>
                {React.cloneElement(tab.icon as any, {
                  color: activeTab === tab.key ? C.primaryLight : C.textMuted
                })}
              </View>
              <Text style={{ color: activeTab === tab.key ? C.primaryLight : C.textMuted, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined, ...typography.bodyEmphasis }}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

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
              {newsLoading ? (
                <ActivityIndicator color={C.primaryLight} size="large" style={{ paddingVertical: spacing.xxl + spacing.sm }} />
              ) : news.length > 0 ? (
                <View style={{ gap: spacing.md }}>
                  {news.map((item, index) => (
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
                  <Text style={{ color: C.textMuted, textAlign: 'center', fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined, ...typography.body }}>
                    {t('explore', 'noNews')}
                  </Text>
                </View>
              )}
              <NewsViewer
                visible={viewerIndex !== null}
                items={news}
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
