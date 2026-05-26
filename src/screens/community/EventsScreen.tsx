// src/screens/community/EventsScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  ActivityIndicator, Image, Alert, SafeAreaView, RefreshControl
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Calendar as CalendarIcon, Clock, MapPin, Users, Plus } from 'lucide-react-native';
import * as eventsApi from '../../api/events';
import { cleanPhoto } from '../../utils/googleDriveUrl';

type EventTab = 'upcoming' | 'past' | 'rsvped';

export default function EventsScreen() {
  const navigation = useNavigation<any>();
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
    setRsvpingId(eventId);
    try {
      const data = await eventsApi.rsvpEvent(eventId);
      if (data.success) {
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
      Alert.alert('Error', 'Failed to submit RSVP registration.');
    } finally {
      setRsvpingId(null);
    }
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
          <Image source={{ uri: photoUrl }} className="w-full h-full" resizeMode="cover" />
          {/* Calendar Badge overlay */}
          <View className="absolute top-4 left-4 bg-black/70 px-3 py-1.5 rounded-xl border border-white/10 items-center justify-center">
            <Text className="text-[10px] font-bold text-pink-500 uppercase tracking-widest leading-none mb-0.5">
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
              : 'bg-pink-600 shadow-pink-500/10'
            }`}
          >
            {rsvpingId === event.id ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text className="text-white font-semibold text-sm">
                {isRegistered ? '✓ Registered' : 'RSVP Now'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      {/* Top Header */}
      <View className="px-4 py-3 border-b border-slate-800 flex-row items-center bg-slate-900 justify-between">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity onPress={() => navigation.goBack()} className="p-1 rounded-full bg-slate-800/50">
            <ArrowLeft size={22} color="#ffffff" />
          </TouchableOpacity>
          <Text className="text-white font-bold text-xl tracking-wide">Events</Text>
        </View>
        <TouchableOpacity className="p-2 bg-pink-600/10 rounded-full border border-pink-500/20">
          <Plus size={16} color="#db2777" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchEventsData(true)} tintColor="#db2777" />
        }
      >
        {/* Intro */}
        <View className="flex-row items-center gap-3 mb-4">
          <View className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/20 items-center justify-center">
            <CalendarIcon size={20} color="#ec4899" />
          </View>
          <View>
            <Text className="text-white font-bold text-lg">Community Events</Text>
            <Text className="text-slate-400 text-xs font-medium">ସମାଜ କାର୍ଯ୍ୟକ୍ରମ — Events Calendar</Text>
          </View>
        </View>

        {/* Tab Filters */}
        <View className="flex-row border-b border-slate-700/50 mb-5">
          {[
            { key: 'upcoming', label: 'Upcoming' },
            { key: 'past', label: 'Past Events' },
            { key: 'rsvped', label: 'My RSVPs' },
          ].map(tab => {
            const active = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key as any)}
                className={`flex-1 items-center py-3 border-b-2 ${active ? 'border-pink-500' : 'border-transparent'}`}
              >
                <Text className={`text-xs font-bold ${active ? 'text-pink-500' : 'text-slate-400'}`}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Listing */}
        {loading && !refreshing ? (
          <View className="flex-col items-center justify-center py-20">
            <ActivityIndicator size="large" color="#db2777" />
            <Text className="text-slate-400 text-sm mt-3">Loading events…</Text>
          </View>
        ) : filteredEvents.length === 0 ? (
          <View className="items-center justify-center py-20 bg-slate-800/30 rounded-2xl border border-slate-700/50 px-6">
            <CalendarIcon size={40} color="#475569" className="mb-4" />
            <Text className="text-slate-300 text-base font-bold text-center">No events found</Text>
            <Text className="text-slate-500 text-xs text-center mt-1">
              {activeTab === 'rsvped' ? "You haven't RSVPed to any events yet." : 'No events available for this category.'}
            </Text>
          </View>
        ) : (
          filteredEvents.map(renderEventCard)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
