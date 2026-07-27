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

function EventsSkeleton({ colors, spacing, radius }: { colors: ReturnType<typeof useTheme>['colors']; spacing: ReturnType<typeof useTheme>['spacing']; radius: ReturnType<typeof useTheme>['radius'] }) {
  return (
    <View style={{ gap: spacing.lg }}>
      {[1, 2].map(i => (
        <View key={i} style={{ backgroundColor: colors.card, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border + '80' }}>
          <SkeletonBox width="100%" height={160} borderRadius={0} />
          <View style={{ gap: spacing.md, padding: spacing.lg }}>
            <SkeletonBox width="80%" height={18} />
            <View style={{ gap: spacing.sm, marginVertical: spacing.xs }}>
              <SkeletonBox width="60%" height={11} />
              <SkeletonBox width="45%" height={11} />
            </View>
            <SkeletonBox width="100%" height={40} borderRadius={radius.sm} />
          </View>
        </View>
      ))}
    </View>
  );
}

export default function EventsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, spacing, radius, typography, shadow } = useTheme();
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
        style={{ backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border + '80', overflow: 'hidden', marginBottom: spacing.lg }}
      >
        {/* Banner Image */}
        <View style={{ backgroundColor: colors.bg }} className="h-40 w-full overflow-hidden relative">
          <Image source={{ uri: photoUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={200} />
          {/* Calendar Badge overlay */}
          <View
            style={{ backgroundColor: 'rgba(0,0,0,0.75)', paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2, borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}
            className="absolute top-4 left-4 items-center justify-center"
          >
            <Text style={{ color: colors.primaryLight, letterSpacing: 1, marginBottom: 2, ...typography.caption, fontSize: 10, lineHeight: 14 }} className="uppercase">
              {displayMonth}
            </Text>
            <Text style={{ color: 'white', ...typography.title, lineHeight: 22 }}>
              {displayDate}
            </Text>
          </View>
        </View>

        {/* Info */}
        <View style={{ padding: spacing.lg }}>
          <Text style={{ color: colors.text, fontFamily: lang === 'od' ? 'NotoSansOriya-Bold' : undefined, marginBottom: spacing.md, ...typography.title }}>
            {event.title}
          </Text>

          <View style={{ gap: spacing.sm + 2, marginBottom: spacing.xl }}>
            <View style={{ gap: spacing.sm }} className="flex-row items-center">
              <Clock size={16} color={colors.textMuted} />
              <Text style={{ color: colors.textMuted, ...typography.caption }}>
                {formattedDateString}
              </Text>
            </View>
            <View style={{ gap: spacing.sm }} className="flex-row items-center">
              <MapPin size={16} color={colors.textMuted} />
              <Text style={{ color: colors.textMuted, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined, ...typography.caption }} numberOfLines={1}>
                {event.location || t('events', 'locationTBA')}
              </Text>
            </View>
            <View style={{ gap: spacing.sm }} className="flex-row items-center">
              <Users size={16} color={colors.textMuted} />
              <Text style={{ color: colors.textMuted, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined, ...typography.caption }}>
                {event.attendees_count || 0} {t('events', 'attending')}
              </Text>
            </View>
          </View>

          {/* RSVP Actions */}
          <TouchableOpacity
            disabled={isRegistered || rsvpingId === event.id}
            onPress={() => handleRSVP(event.id)}
            style={{ backgroundColor: isRegistered ? colors.border : colors.primary, paddingVertical: spacing.md, borderRadius: radius.md, ...shadow.raised }}
            className="w-full flex-row items-center justify-center"
          >
            {rsvpingId === event.id ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={{ color: 'white', fontFamily: lang === 'od' ? 'NotoSansOriya-Bold' : undefined, ...typography.bodyEmphasis, fontWeight: '700' }}>
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
      <View style={{ borderBottomColor: colors.border, backgroundColor: colors.bg, paddingHorizontal: spacing.lg, paddingVertical: spacing.md }} className="border-b flex-row items-center justify-between">
        <View style={{ gap: spacing.md }} className="flex-row items-center">
          <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.goBack(); }} style={{ backgroundColor: colors.card + '80', padding: spacing.xs, borderRadius: radius.full }}>
            <ArrowLeft size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={{ color: colors.text, fontFamily: lang === 'od' ? 'NotoSansOriya-Bold' : undefined, letterSpacing: 0.3, ...typography.heading }}>
            {t('events', 'title')}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          style={{ backgroundColor: colors.primary + '10', borderColor: colors.primaryLight + '20', padding: spacing.sm, borderRadius: radius.full }}
          className="border"
        >
          <Plus size={16} color={colors.primaryLight} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 80 }}
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
        <View style={{ gap: spacing.md, marginBottom: spacing.lg }} className="flex-row items-center">
          <View style={{ backgroundColor: colors.primaryLight + '10', borderColor: colors.primaryLight + '20', borderRadius: radius.md }} className="w-10 h-10 border items-center justify-center">
            <CalendarIcon size={20} color={colors.primary} />
          </View>
          <View>
            <Text style={{ color: colors.text, fontFamily: lang === 'od' ? 'NotoSansOriya-Bold' : undefined, ...typography.title }}>
              {t('events', 'communityEvents')}
            </Text>
            <Text style={{ color: colors.textMuted, ...typography.caption }}>{t('events', 'calendarSubtitle')}</Text>
          </View>
        </View>

        {/* Tab Filters */}
        <View style={{ borderBottomColor: colors.border + '80', marginBottom: spacing.xl - 4 }} className="flex-row border-b">
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
                style={{ borderBottomColor: active ? colors.primary : 'transparent', paddingVertical: spacing.md }}
                className="flex-1 items-center border-b-2"
              >
                <Text style={{ color: active ? colors.primary : colors.textMuted, fontFamily: lang === 'od' ? 'NotoSansOriya-Bold' : undefined, ...typography.caption, fontWeight: '700' }}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Listing */}
        {loading && !refreshing ? (
          <EventsSkeleton colors={colors} spacing={spacing} radius={radius} />
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
