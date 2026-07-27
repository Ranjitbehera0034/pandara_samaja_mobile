// src/screens/community/EventsScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, RefreshControl
} from 'react-native';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Calendar as CalendarIcon, Clock, MapPin, Users, Plus } from 'lucide-react-native';
import * as eventsApi from '../../api/events';
import { cleanPhoto } from '../../utils/googleDriveUrl';
import SkeletonBox from '../../components/common/SkeletonBox';
import EmptyState from '../../components/common/EmptyState';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

type EventTab = 'upcoming' | 'past' | 'rsvped';

function EventsSkeleton({ colors }: { colors: ReturnType<typeof useTheme>['colors'] }) {
  return (
    <View style={{ gap: 16 }}>
      {[1, 2].map(i => (
        <View key={i} style={{ backgroundColor: colors.card, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: colors.border + '80' }}>
          <SkeletonBox width="100%" height={160} borderRadius={0} />
          <View style={{ gap: 12, padding: 16 }}>
            <SkeletonBox width="80%" height={18} />
            <View style={{ gap: 8, marginVertical: 4 }}>
              <SkeletonBox width="60%" height={11} />
              <SkeletonBox width="45%" height={11} />
            </View>
            <SkeletonBox width="100%" height={40} borderRadius={10} />
          </View>
        </View>
      ))}
    </View>
  );
}

export default function EventsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { lang, t } = useLanguage();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<EventTab>('upcoming');
  const [registeredIds, setRegisteredIds] = useState<number[]>([]);
  const [rsvpingId, setRsvpingId] = useState<number | null>(null);

  const fetchEventsData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await eventsApi.fetchEvents();
      if (data.success) {
        setEvents(data.events || []);
      }
    } catch (e) {
      console.error('[EVENTS] Fetch failed:', e);
      Alert.alert(t('common', 'errorTitle'), t('events', 'loadError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEventsData();
  }, []);

  const handleRSVP = async (eventId: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRsvpingId(eventId);
    try {
      const data = await eventsApi.rsvpEvent(eventId);
      if (data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(t('events', 'rsvpSuccessTitle'), t('events', 'rsvpSuccessMessage'));
        setRegisteredIds(prev => [...prev, eventId]);
        // Update local attendees count
        setEvents(prev => prev.map(e =>
          e.id === eventId
            ? { ...e, attendees_count: (parseInt(e.attendees_count) || 0) + 1, registered_by_me: true }
            : e
        ));
      }
    } catch (e) {
      console.error('[RSVP] Failed:', e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common', 'errorTitle'), t('events', 'rsvpError'));
    } finally {
      setRsvpingId(null);
    }
  };

  const handleTabPress = (tab: EventTab) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await fetchEventsData(true);
  };

  const filteredEvents = events.filter(e => {
    const isPast = new Date(e.event_date).getTime() < Date.now();
    const isRegistered = e.registered_by_me || registeredIds.includes(e.id);

    if (activeTab === 'upcoming') return !isPast;
    if (activeTab === 'past') return isPast;
    if (activeTab === 'rsvped') return isRegistered;
    return true;
  });

  const renderEventCard = (event: any) => {
    const dateObj = new Date(event.event_date);
    const displayMonth = dateObj.toLocaleDateString(undefined, { month: 'short' }).toUpperCase();
    const displayDate = dateObj.getDate();
    const formattedDateString = dateObj.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const isRegistered = event.registered_by_me || registeredIds.includes(event.id);
    const photoUrl = cleanPhoto(event.image_url) || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87';

    return (
      <View
        key={event.id}
        style={{ backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border + '80', overflow: 'hidden', marginBottom: 16 }}
      >
        {/* Banner Image */}
        <View style={{ backgroundColor: colors.bg }} className="h-40 w-full overflow-hidden relative">
          <Image source={{ uri: photoUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={200} />
          {/* Calendar Badge overlay */}
          <View className="absolute top-4 left-4 bg-black/75 px-3 py-1.5 rounded-xl border border-white/10 items-center justify-center">
            <Text style={{ color: colors.primaryLight }} className="text-[10px] font-bold uppercase tracking-widest leading-none mb-0.5">
              {displayMonth}
            </Text>
            <Text className="text-xl font-extrabold text-white leading-none">
              {displayDate}
            </Text>
          </View>
        </View>

        {/* Info */}
        <View className="p-5">
          <Text style={{ color: colors.text, fontFamily: lang === 'od' ? 'NotoSansOriya-Bold' : undefined }} className="text-xl font-bold mb-3 leading-tight">
            {event.title}
          </Text>

          <View className="gap-2.5 mb-6">
            <View className="flex-row items-center gap-2">
              <Clock size={15} color={colors.textMuted} />
              <Text style={{ color: colors.textMuted }} className="text-xs">
                {formattedDateString}
              </Text>
            </View>
            <View className="flex-row items-center gap-2">
              <MapPin size={15} color={colors.textMuted} />
              <Text style={{ color: colors.textMuted, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined }} className="text-xs" numberOfLines={1}>
                {event.location || t('events', 'locationTBA')}
              </Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Users size={15} color={colors.textMuted} />
              <Text style={{ color: colors.textMuted, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined }} className="text-xs">
                {event.attendees_count || 0} {t('events', 'attending')}
              </Text>
            </View>
          </View>

          {/* RSVP Actions */}
          <TouchableOpacity
            disabled={isRegistered || rsvpingId === event.id}
            onPress={() => handleRSVP(event.id)}
            style={{ backgroundColor: isRegistered ? colors.border : colors.primary }}
            className="w-full py-3 rounded-xl flex-row items-center justify-center shadow-lg"
          >
            {rsvpingId === event.id ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={{ fontFamily: lang === 'od' ? 'NotoSansOriya-Bold' : undefined }} className="text-white font-bold text-sm">
                {isRegistered ? t('events', 'registered') : t('events', 'rsvpNow')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      {/* Top Header */}
      <View style={{ borderBottomColor: colors.border, backgroundColor: colors.bg }} className="px-4 py-3 border-b flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.goBack(); }} style={{ backgroundColor: colors.card + '80' }} className="p-1 rounded-full">
            <ArrowLeft size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={{ color: colors.text, fontFamily: lang === 'od' ? 'NotoSansOriya-Bold' : undefined }} className="font-bold text-xl tracking-wide">
            {t('events', 'title')}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          style={{ backgroundColor: colors.primary + '10', borderColor: colors.primaryLight + '20' }}
          className="p-2 rounded-full border"
        >
          <Plus size={16} color={colors.primaryLight} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 80 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor={colors.card}
          />
        }
      >
        {/* Intro */}
        <View className="flex-row items-center gap-3 mb-4">
          <View style={{ backgroundColor: colors.primaryLight + '10', borderColor: colors.primaryLight + '20' }} className="w-10 h-10 rounded-xl border items-center justify-center">
            <CalendarIcon size={20} color={colors.primary} />
          </View>
          <View>
            <Text style={{ color: colors.text, fontFamily: lang === 'od' ? 'NotoSansOriya-Bold' : undefined }} className="font-bold text-lg">
              {t('events', 'communityEvents')}
            </Text>
            <Text style={{ color: colors.textMuted }} className="text-xs font-medium">{t('events', 'calendarSubtitle')}</Text>
          </View>
        </View>

        {/* Tab Filters */}
        <View style={{ borderBottomColor: colors.border + '80' }} className="flex-row border-b mb-5">
          {[
            { key: 'upcoming' as const, label: t('events', 'tabUpcoming') },
            { key: 'past' as const, label: t('events', 'tabPast') },
            { key: 'rsvped' as const, label: t('events', 'tabRsvped') },
          ].map(tab => {
            const active = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => handleTabPress(tab.key)}
                style={{ borderBottomColor: active ? colors.primary : 'transparent' }}
                className="flex-1 items-center py-3 border-b-2"
              >
                <Text style={{ color: active ? colors.primary : colors.textMuted, fontFamily: lang === 'od' ? 'NotoSansOriya-Bold' : undefined }} className="text-xs font-bold">
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Listing */}
        {loading && !refreshing ? (
          <EventsSkeleton colors={colors} />
        ) : filteredEvents.length === 0 ? (
          <EmptyState
            emoji="📅"
            title={activeTab === 'rsvped' ? t('events', 'noRsvpsTitle') : t('events', 'noUpcomingTitle')}
            subtitle={activeTab === 'rsvped' ? t('events', 'noRsvpsSubtitle') : t('events', 'noUpcomingSubtitle')}
          />
        ) : (
          filteredEvents.map(renderEventCard)
        )}
      </ScrollView>
    </View>
  );
}
