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
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

export default function AnnouncementsScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { lang, t } = useLanguage();
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
        title: p.title || t('announcements', 'defaultTitle'),
        rawContent: p.content || '',
      }));

      // Sort descending by timestamp
      mapped.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setAnnouncements(mapped);
    } catch (e) {
      console.error('[ANNOUNCEMENTS] Failed to load announcements:', e);
      Alert.alert(t('common', 'errorTitle'), t('announcements', 'loadError'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [lang]);

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
      <View style={{ backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 20, marginBottom: 16 }}>
        {/* Card Header */}
        <View className="flex-row items-center gap-3 mb-4">
          <View style={{ backgroundColor: colors.primary + '10', borderColor: colors.primaryLight + '20' }} className="w-10 h-10 rounded-full items-center justify-center border">
            <Megaphone size={18} color={colors.primaryLight} />
          </View>
          <View>
            <Text style={{ color: colors.text, fontFamily: lang === 'od' ? 'NotoSansOriya-Bold' : undefined }} className="font-bold text-sm">
              {t('announcements', 'officialUpdate')}
            </Text>
            <View className="flex-row items-center gap-1 mt-0.5">
              <Calendar size={12} color={colors.textMuted} />
              <Text style={{ color: colors.textMuted }} className="text-xs">{formattedDate}</Text>
            </View>
          </View>
        </View>

        {/* Title */}
        <Text style={{ color: colors.text, fontFamily: lang === 'od' ? 'NotoSansOriya-Bold' : undefined }} className="font-bold text-lg mb-3 leading-snug">
          {item.title}
        </Text>

        {/* Content */}
        <View className="mb-4">
          <RichContent text={item.rawContent} />
        </View>

        {/* Media Grid */}
        {item.media && item.media.length > 0 && (
          <View style={{ borderTopColor: colors.border + '30' }} className="mt-2 border-t pt-3">
            <MediaGrid media={item.media} />
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} className="flex-1">
      {/* Top Header */}
      <View style={{ borderBottomColor: colors.border, backgroundColor: colors.bg }} className="px-4 py-3 border-b flex-row items-center gap-3">
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ backgroundColor: colors.card + '80' }} className="p-1 rounded-full">
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ color: colors.text, fontFamily: lang === 'od' ? 'NotoSansOriya-Bold' : undefined }} className="font-bold text-xl tracking-wide">
          {t('announcements', 'title')}
        </Text>
      </View>

      {isLoading && !isRefreshing ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
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
            <View style={{ backgroundColor: colors.card + '30', borderColor: colors.border + '50' }} className="items-center justify-center py-20 rounded-2xl border px-6">
              <AlertCircle size={48} color={colors.textFaint} className="mb-4" />
              <Text style={{ color: colors.textMuted, fontFamily: lang === 'od' ? 'NotoSansOriya-Bold' : undefined }} className="text-lg font-medium text-center">
                {t('announcements', 'emptyTitle')}
              </Text>
              <Text style={{ color: colors.textFaint, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined }} className="text-sm text-center mt-1">
                {t('announcements', 'emptySubtitle')}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
