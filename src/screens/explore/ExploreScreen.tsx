// src/screens/explore/ExploreScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, SafeAreaView } from 'react-native';
import { Compass, TrendingUp, Users, Hash } from 'lucide-react-native';
import { fetchExploreStats } from '../../api/explore';
import GlobalSearch from '../../components/common/GlobalSearch';

type Tab = 'trending' | 'popular' | 'tags';

export default function ExploreScreen() {
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
    { key: 'trending', label: 'Trending', icon: <TrendingUp size={16} /> },
    { key: 'popular', label: 'Members', icon: <Users size={16} /> },
    { key: 'tags', label: 'Hashtags', icon: <Hash size={16} /> },
  ];

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      {/* Header Title */}
      <View className="flex-row items-center gap-3 px-4 pt-4 pb-2">
        <Compass size={26} color="#3b82f6" />
        <Text className="text-white text-2xl font-bold">Explore</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 80 }} showsVerticalScrollIndicator={false}>
        {/* Global Search Component */}
        <GlobalSearch />

        {/* Tab Selector Bar */}
        <View className="flex-row border-b border-slate-700/50 mb-6">
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              className={`flex-1 flex-row items-center justify-center gap-2 py-3 border-b-2 ${activeTab === tab.key
                ? 'border-blue-500'
                : 'border-transparent'
              }`}
            >
              <View style={{ opacity: activeTab === tab.key ? 1 : 0.5 }}>
                {React.cloneElement(tab.icon as any, {
                  color: activeTab === tab.key ? '#3b82f6' : '#94a3b8'
                })}
              </View>
              <Text className={`text-sm font-semibold ${activeTab === tab.key ? 'text-blue-400' : 'text-slate-400'}`}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content Display Areas */}
        <View>
          {/* Trending Tab Content */}
          {activeTab === 'trending' && (
            <View className="bg-slate-800/50 rounded-2xl p-8 items-center border border-slate-700/50">
              <TrendingUp size={48} color="#475569" className="mb-4" />
              <Text className="text-white text-lg font-bold mb-2">Trending Posts</Text>
              <Text className="text-slate-400 text-sm text-center">
                Posts with the most engagement across the community. (Coming Soon)
              </Text>
            </View>
          )}

          {/* Popular Members Tab Content */}
          {activeTab === 'popular' && (
            <View>
              {loading ? (
                <ActivityIndicator color="#3b82f6" size="large" className="py-10" />
              ) : stats?.active_members ? (
                <View className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700/50 items-center gap-4">
                  <Users size={40} color="#3b82f6" />
                  <View className="items-center">
                    <Text className="text-white text-4xl font-bold">{stats.active_members}</Text>
                    <Text className="text-slate-400 text-sm mt-1">Total Members Active Today</Text>
                  </View>
                </View>
              ) : (
                <View className="bg-slate-800/50 rounded-2xl p-8 items-center border border-slate-700/50">
                  <Users size={40} color="#475569" className="mb-4" />
                  <Text className="text-slate-400 text-center">No popular members data available.</Text>
                </View>
              )}
            </View>
          )}

          {/* Tags Tab Content */}
          {activeTab === 'tags' && (
            <View>
              {loading ? (
                <ActivityIndicator color="#3b82f6" size="large" className="py-10" />
              ) : stats?.trending_tags?.length > 0 ? (
                <View className="flex-row flex-wrap gap-3">
                  {stats.trending_tags.map((tag: any) => (
                    <TouchableOpacity
                      key={tag.name}
                      className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl"
                    >
                      <Text className="text-blue-400 font-medium">
                        {tag.name} <Text className="text-slate-500 text-xs">({tag.count})</Text>
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View className="bg-slate-800/50 rounded-2xl p-8 items-center border border-slate-700/50">
                  <Hash size={40} color="#475569" className="mb-4" />
                  <Text className="text-slate-400 text-center">No tags available at the moment.</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
