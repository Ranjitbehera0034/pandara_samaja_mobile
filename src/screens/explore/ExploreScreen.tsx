// src/screens/explore/ExploreScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, SafeAreaView } from 'react-native';
import { Compass, TrendingUp, Users, Hash } from 'lucide-react-native';
import { fetchExploreStats } from '../../api/explore';
import GlobalSearch from '../../components/common/GlobalSearch';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

type Tab = 'trending' | 'popular' | 'tags';

export default function ExploreScreen() {
  const { colors: C } = useTheme();
  const { lang, t } = useLanguage();
  const [activeTab, setActiveTab] = useState<Tab>('trending');
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExploreStats()
      .then(d => { if (d.success) setStats(d.stats); })
      .catch((err) => console.error('[EXPLORE STATS]', err))
      .finally(() => setLoading(false));
  }, []);

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'trending', label: t('explore', 'tabTrending'), icon: <TrendingUp size={16} /> },
    { key: 'popular', label: t('explore', 'tabMembers'), icon: <Users size={16} /> },
    { key: 'tags', label: t('explore', 'tabHashtags'), icon: <Hash size={16} /> },
  ];

  return (
    <SafeAreaView style={{ backgroundColor: C.bg }} className="flex-1">
      {/* Header Title */}
      <View className="flex-row items-center gap-3 px-4 pt-4 pb-2">
        <Compass size={26} color={C.primaryLight} />
        <Text style={{ color: C.text, fontFamily: lang === 'od' ? 'NotoSansOriya-Bold' : undefined }} className="text-2xl font-bold">
          {t('explore', 'title')}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 80 }} showsVerticalScrollIndicator={false}>
        {/* Global Search Component */}
        <GlobalSearch />

        {/* Tab Selector Bar */}
        <View style={{ borderColor: C.border + '80' }} className="flex-row border-b mb-6">
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={{ borderBottomColor: activeTab === tab.key ? C.primaryLight : 'transparent' }}
              className="flex-1 flex-row items-center justify-center gap-2 py-3 border-b-2"
            >
              <View style={{ opacity: activeTab === tab.key ? 1 : 0.5 }}>
                {React.cloneElement(tab.icon as any, {
                  color: activeTab === tab.key ? C.primaryLight : C.textMuted
                })}
              </View>
              <Text style={{ color: activeTab === tab.key ? C.primaryLight : C.textMuted, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined }} className="text-sm font-semibold">
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content Display Areas */}
        <View>
          {/* Trending Tab Content */}
          {activeTab === 'trending' && (
            <View style={{ backgroundColor: C.card + '80', borderColor: C.border + '80' }} className="rounded-2xl p-8 items-center border">
              <TrendingUp size={48} color={C.textFaint} className="mb-4" />
              <Text style={{ color: C.text, fontFamily: lang === 'od' ? 'NotoSansOriya-Bold' : undefined }} className="text-lg font-bold mb-2">
                {t('explore', 'trendingPostsTitle')}
              </Text>
              <Text style={{ color: C.textMuted, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined }} className="text-sm text-center">
                {t('explore', 'trendingPostsSubtitle')}
              </Text>
            </View>
          )}

          {/* Popular Members Tab Content */}
          {activeTab === 'popular' && (
            <View>
              {loading ? (
                <ActivityIndicator color={C.primaryLight} size="large" className="py-10" />
              ) : stats?.active_members ? (
                <View style={{ backgroundColor: C.card + '80', borderColor: C.border + '80' }} className="p-6 rounded-2xl border items-center gap-4">
                  <Users size={40} color={C.primaryLight} />
                  <View className="items-center">
                    <Text style={{ color: C.text }} className="text-4xl font-bold">{stats.active_members}</Text>
                    <Text style={{ color: C.textMuted, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined }} className="text-sm mt-1">
                      {t('explore', 'activeMembersLabel')}
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={{ backgroundColor: C.card + '80', borderColor: C.border + '80' }} className="rounded-2xl p-8 items-center border">
                  <Users size={40} color={C.textFaint} className="mb-4" />
                  <Text style={{ color: C.textMuted, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined }} className="text-center">
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
                <ActivityIndicator color={C.primaryLight} size="large" className="py-10" />
              ) : stats?.trending_tags?.length > 0 ? (
                <View className="flex-row flex-wrap gap-3">
                  {stats.trending_tags.map((tag: any) => (
                    <TouchableOpacity
                      key={tag.name}
                      style={{ backgroundColor: C.card, borderColor: C.border }}
                      className="px-4 py-2 border rounded-xl"
                    >
                      <Text style={{ color: C.primaryLight }} className="font-medium">
                        {tag.name} <Text style={{ color: C.textFaint }} className="text-xs">({tag.count})</Text>
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View style={{ backgroundColor: C.card + '80', borderColor: C.border + '80' }} className="rounded-2xl p-8 items-center border">
                  <Hash size={40} color={C.textFaint} className="mb-4" />
                  <Text style={{ color: C.textMuted, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined }} className="text-center">
                    {t('explore', 'noTags')}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
