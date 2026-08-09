// src/screens/community/AnnouncementsScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Alert,
  TouchableOpacity
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Calendar, Megaphone, AlertCircle } from 'lucide-react-native';
import * as feedApi from '../../api/feed';
import { mapAnnouncement } from '../../utils/feedUtils';
import MediaGrid from '../../components/feed/MediaGrid';
import MediaViewerModal from '../../components/feed/MediaViewerModal';
import RichContent from '../../components/feed/RichContent';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

export default function AnnouncementsScreen() {
  const navigation = useNavigation<any>();
  const { colors, spacing, radius, typography } = useTheme();
  const { lang, t } = useLanguage();
  const insets = useSafeAreaInsets();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewerMedia, setViewerMedia] = useState<any[] | null>(null);
  const [viewerIndex, setViewerIndex] = useState(0);

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
      <View style={{ backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginBottom: spacing.lg }}>
        {/* Card Header */}
        <View style={{ gap: spacing.md, marginBottom: spacing.lg }} className="flex-row items-center">
          <View style={{ backgroundColor: colors.primary + '10', borderColor: colors.primaryLight + '20', borderRadius: radius.full }} className="w-10 h-10 items-center justify-center border">
            <Megaphone size={16} color={colors.primaryLight} />
          </View>
          <View>
            <Text style={{ color: colors.text, fontFamily: lang === 'od' ? 'NotoSansOriya-Bold' : undefined, ...typography.bodyEmphasis }}>
              {t('announcements', 'officialUpdate')}
            </Text>
            <View style={{ gap: spacing.xs, marginTop: 2 }} className="flex-row items-center">
              <Calendar size={12} color={colors.textMuted} />
              <Text style={{ color: colors.textMuted, ...typography.caption }}>{formattedDate}</Text>
            </View>
          </View>
        </View>

        {/* Title */}
        <Text style={{ color: colors.text, fontFamily: lang === 'od' ? 'NotoSansOriya-Bold' : undefined, marginBottom: spacing.md, ...typography.title }}>
          {item.title}
        </Text>

        {/* Content */}
        <View style={{ marginBottom: spacing.lg }}>
          <RichContent text={item.rawContent} />
        </View>

        {/* Media Grid */}
        {item.media && item.media.length > 0 && (
          <View style={{ borderTopColor: colors.border + '30', marginTop: spacing.sm, paddingTop: spacing.md }} className="border-t">
            <MediaGrid
              media={item.media}
              onMediaPress={(index) => { setViewerMedia(item.media); setViewerIndex(index); }}
            />
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }} className="flex-1">
      {/* Top Header */}
      <View style={{ borderBottomColor: colors.border, backgroundColor: colors.bg, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.md }} className="border-b flex-row items-center">
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ backgroundColor: colors.card + '80', padding: spacing.xs, borderRadius: radius.full }}>
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ color: colors.text, fontFamily: lang === 'od' ? 'NotoSansOriya-Bold' : undefined, letterSpacing: 0.3, ...typography.heading }}>
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
          contentContainerStyle={{ padding: spacing.lg }}
          showsVerticalScrollIndicator={false}
          refreshing={isRefreshing}
          onRefresh={() => fetchAnnouncementsData(true)}
          ListEmptyComponent={
            <View style={{ backgroundColor: colors.card + '30', borderColor: colors.border + '50', paddingVertical: spacing.xxl + spacing.xxl, borderRadius: radius.xl, paddingHorizontal: spacing.xl }} className="items-center justify-center border">
              <AlertCircle size={48} color={colors.textFaint} style={{ marginBottom: spacing.lg }} />
              <Text style={{ color: colors.textMuted, fontFamily: lang === 'od' ? 'NotoSansOriya-Bold' : undefined, textAlign: 'center', ...typography.title }}>
                {t('announcements', 'emptyTitle')}
              </Text>
              <Text style={{ color: colors.textFaint, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined, textAlign: 'center', marginTop: spacing.xs, ...typography.body }}>
                {t('announcements', 'emptySubtitle')}
              </Text>
            </View>
          }
        />
      )}

      <MediaViewerModal
        visible={!!viewerMedia}
        media={viewerMedia || []}
        initialIndex={viewerIndex}
        onClose={() => setViewerMedia(null)}
      />
    </View>
  );
}
