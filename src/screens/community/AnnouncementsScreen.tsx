// src/screens/community/AnnouncementsScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  TouchableOpacity
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Calendar, Megaphone, AlertCircle } from 'lucide-react-native';
import * as feedApi from '../../api/feed';
import { mapAnnouncement } from '../../utils/feedUtils';
import MediaGrid from '../../components/feed/MediaGrid';
import RichContent from '../../components/feed/RichContent';

export default function AnnouncementsScreen() {
  const navigation = useNavigation<any>();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchAnnouncementsData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const res = await feedApi.fetchAnnouncements();
      let rawPosts: any[] = [];

      if (res && res.success && Array.isArray(res.posts)) {
        rawPosts = res.posts;
      } else if (Array.isArray(res)) {
        rawPosts = res;
      } else if (res && Array.isArray(res.data)) {
        rawPosts = res.data;
      }

      // Map posts to Announcement structure with title and content
      const mapped = rawPosts.map((p: any) => ({
        ...mapAnnouncement(p),
        title: p.title || 'Official Announcement',
        rawContent: p.content || '',
      }));

      // Sort descending by timestamp
      mapped.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setAnnouncements(mapped);
    } catch (e) {
      console.error('[ANNOUNCEMENTS] Failed to load announcements:', e);
      Alert.alert('Error', 'Failed to load official announcements.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncementsData();
  }, [fetchAnnouncementsData]);

  const renderAnnouncementCard = ({ item }: { item: any }) => {
    const formattedDate = new Date(item.timestamp).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return (
      <View className="bg-slate-800/80 rounded-2xl border border-slate-700/50 p-5 mb-4 shadow-lg">
        {/* Card Header */}
        <View className="flex-row items-center gap-3 mb-4">
          <View className="w-10 h-10 rounded-full bg-blue-600/10 items-center justify-center border border-blue-500/20">
            <Megaphone size={18} color="#3b82f6" />
          </View>
          <View>
            <Text className="text-white font-bold text-sm">Official Update</Text>
            <View className="flex-row items-center gap-1 mt-0.5">
              <Calendar size={12} color="#94a3b8" />
              <Text className="text-slate-400 text-xs">{formattedDate}</Text>
            </View>
          </View>
        </View>

        {/* Title */}
        <Text className="text-white font-bold text-lg mb-3 leading-snug">
          {item.title}
        </Text>

        {/* Content */}
        <View className="mb-4">
          <RichContent text={item.rawContent} />
        </View>

        {/* Media Grid */}
        {item.media && item.media.length > 0 && (
          <View className="mt-2 border-t border-slate-700/30 pt-3">
            <MediaGrid media={item.media} />
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      {/* Top Header */}
      <View className="px-4 py-3 border-b border-slate-800 flex-row items-center bg-slate-900 gap-3">
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-1 rounded-full bg-slate-800/50">
          <ArrowLeft size={22} color="#ffffff" />
        </TouchableOpacity>
        <Text className="text-white font-bold text-xl tracking-wide">Announcements</Text>
      </View>

      {isLoading && !isRefreshing ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : (
        <FlatList
          data={announcements}
          keyExtractor={(item) => item.id}
          renderItem={renderAnnouncementCard}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
          refreshing={isRefreshing}
          onRefresh={() => fetchAnnouncementsData(true)}
          ListEmptyComponent={
            <View className="items-center justify-center py-20 bg-slate-800/30 rounded-2xl border border-slate-700/50 px-6">
              <AlertCircle size={48} color="#475569" className="mb-4" />
              <Text className="text-lg font-medium text-slate-300 text-center">No Announcements Yet</Text>
              <Text className="text-slate-500 text-sm text-center mt-1">
                Check back later for official updates from the admins.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
