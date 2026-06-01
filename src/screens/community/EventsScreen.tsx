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

type EventTab = 'upcoming' | 'past' | 'rsvped';

function EventsSkeleton() {
  return (
    <View style={{ gap: 16 }}>
      {[1, 2].map(i => (
        <View key={i} style={{ backgroundColor: '#1e293b', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#334155/50' }}>
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
      Alert.alert('Error', 'Failed to load community events.');
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
        Alert.alert('RSVP Registered', 'Successfully registered for this event!');
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
      Alert.alert('Error', 'Failed to submit RSVP registration.');
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
        className="bg-slate-800/80 rounded-2xl border border-slate-700/50 overflow-hidden shadow-xl mb-4"
      >
        {/* Banner Image */}
        <View className="h-40 w-full overflow-hidden relative bg-slate-950">
          <Image source={{ uri: photoUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={200} />
          {/* Calendar Badge overlay */}
          <View className="absolute top-4 left-4 bg-black/75 px-3 py-1.5 rounded-xl border border-white/10 items-center justify-center">
            <Text className="text-[10px] font-bold text-blue-500 uppercase tracking-widest leading-none mb-0.5">
              {displayMonth}
            </Text>
            <Text className="text-xl font-extrabold text-white leading-none">
              {displayDate}
            </Text>
          </View>
        </View>

        {/* Info */}
        <View className="p-5">
          <Text className="text-xl font-bold text-white mb-3 leading-tight">
            {event.title}
          </Text>

          <View className="gap-2.5 text-sm text-slate-400 mb-6">
            <View className="flex-row items-center gap-2">
              <Clock size={15} color="#94a3b8" />
              <Text className="text-slate-300 text-xs">
                {formattedDateString}
              </Text>
            </View>
            <View className="flex-row items-center gap-2">
              <MapPin size={15} color="#94a3b8" />
              <Text className="text-slate-300 text-xs" numberOfLines={1}>
                {event.location || 'TBA'}
              </Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Users size={15} color="#94a3b8" />
              <Text className="text-slate-300 text-xs">
                {event.attendees_count || 0} attending
              </Text>
            </View>
          </View>

          {/* RSVP Actions */}
          <TouchableOpacity
            disabled={isRegistered || rsvpingId === event.id}
            onPress={() => handleRSVP(event.id)}
            className={`w-full py-3 rounded-xl flex-row items-center justify-center shadow-lg ${isRegistered
              ? 'bg-slate-700'
              : 'bg-blue-600 shadow-blue-500/10'
            }`}
          >
            {rsvpingId === event.id ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text className="text-white font-bold text-sm">
                {isRegistered ? '✓ Registered' : 'RSVP Now'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0f172a', paddingTop: insets.top }}>
      {/* Top Header */}
      <View className="px-4 py-3 border-b border-slate-800 flex-row items-center bg-slate-900 justify-between">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.goBack(); }} className="p-1 rounded-full bg-slate-800/50">
            <ArrowLeft size={22} color="#ffffff" />
          </TouchableOpacity>
          <Text className="text-white font-bold text-xl tracking-wide">Events</Text>
        </View>
        <TouchableOpacity 
          onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          className="p-2 bg-blue-600/10 rounded-full border border-blue-500/20"
        >
          <Plus size={16} color="#3b82f6" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 80 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#2563eb"
            colors={['#2563eb']}
            progressBackgroundColor="#1e293b"
          />
        }
      >
        {/* Intro */}
        <View className="flex-row items-center gap-3 mb-4">
          <View className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 items-center justify-center">
            <CalendarIcon size={20} color="#2563eb" />
          </View>
          <View>
            <Text className="text-white font-bold text-lg">Community Events</Text>
            <Text className="text-slate-400 text-xs font-medium">ସମାଜ କାର୍ଯ୍ୟକ୍ରମ — Events Calendar</Text>
          </View>
        </View>

        {/* Tab Filters */}
        <View className="flex-row border-b border-slate-700/50 mb-5">
          {[
            { key: 'upcoming' as const, label: 'Upcoming' },
            { key: 'past' as const, label: 'Past Events' },
            { key: 'rsvped' as const, label: 'My RSVPs' },
          ].map(tab => {
            const active = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => handleTabPress(tab.key)}
                className={`flex-1 items-center py-3 border-b-2 ${active ? 'border-blue-500' : 'border-transparent'}`}
              >
                <Text className={`text-xs font-bold ${active ? 'text-blue-500' : 'text-slate-400'}`}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Listing */}
        {loading && !refreshing ? (
          <EventsSkeleton />
        ) : filteredEvents.length === 0 ? (
          <EmptyState
            emoji="📅"
            title={activeTab === 'rsvped' ? "No RSVPs" : "No upcoming events"}
            subtitle={activeTab === 'rsvped' ? "You haven't RSVPed to any events yet." : "Check back later"}
          />
        ) : (
          filteredEvents.map(renderEventCard)
        )}
      </ScrollView>
    </View>
  );
}
