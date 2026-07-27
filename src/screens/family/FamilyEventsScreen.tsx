// src/screens/family/FamilyEventsScreen.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
  Modal, Alert, RefreshControl, ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { ArrowLeft, Plus, X, Trash2, Calendar as CalendarIcon, MapPin, Tag, Check, HelpCircle } from 'lucide-react-native';
import * as familyApi from '../../api/family';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import SkeletonBox from '../../components/common/SkeletonBox';
import EmptyState from '../../components/common/EmptyState';

type RsvpStatus = 'going' | 'not_going' | 'maybe';

interface FamilyEvent {
  id: string | number;
  title: string;
  description?: string | null;
  event_date: string;
  location?: string | null;
  type?: string | null;
  rsvps: { member_id: string; status: RsvpStatus }[];
}

function EventsSkeleton({ colors, spacing, radius }: any) {
  return (
    <View style={{ gap: spacing.lg }}>
      {[1, 2].map(i => (
        <View key={i} style={{ backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border + '80', padding: spacing.lg, gap: spacing.md }}>
          <SkeletonBox width="70%" height={18} />
          <SkeletonBox width="50%" height={12} />
          <SkeletonBox width="100%" height={40} borderRadius={radius.sm} />
        </View>
      ))}
    </View>
  );
}

export default function FamilyEventsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { member } = useAuth();
  const { colors: C, spacing, radius, typography, shadow } = useTheme();
  const { lang, t } = useLanguage();
  const fontFamily = lang === 'od' ? 'NotoSansOriya' : undefined;
  const fontFamilyBold = lang === 'od' ? 'NotoSansOriya-Bold' : undefined;

  const [events, setEvents] = useState<FamilyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [rsvpingId, setRsvpingId] = useState<string | number | null>(null);

  // Create modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newType, setNewType] = useState('');
  const [creating, setCreating] = useState(false);

  const loadEvents = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await familyApi.fetchFamilyEvents();
      if (data.success) setEvents(data.events || []);
    } catch (e) {
      console.error('[FAMILY_EVENTS] Fetch failed:', e);
      Alert.alert(t('common', 'errorTitle'), t('familyEvents', 'loadError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handleRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    loadEvents(true);
  };

  const resetCreateForm = () => {
    setNewTitle('');
    setNewDescription('');
    setNewDate('');
    setNewLocation('');
    setNewType('');
  };

  const handleCreateEvent = async () => {
    if (!newTitle.trim()) {
      Alert.alert(t('common', 'errorTitle'), t('familyEvents', 'titleRequiredError'));
      return;
    }
    const validDate = /^\d{4}-\d{2}-\d{2}$/.test(newDate.trim()) && !isNaN(new Date(newDate.trim()).getTime());
    if (!validDate) {
      Alert.alert(t('common', 'errorTitle'), t('familyEvents', 'dateRequiredError'));
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCreating(true);
    try {
      const data = await familyApi.createFamilyEvent({
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
        eventDate: newDate.trim(),
        location: newLocation.trim() || undefined,
        type: newType.trim() || undefined,
      });
      if (data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setEvents(prev => [...prev, { ...data.event, rsvps: data.event.rsvps || [] }]);
        setShowCreateModal(false);
        resetCreateForm();
      }
    } catch (e) {
      console.error('[FAMILY_EVENTS] Create failed:', e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common', 'errorTitle'), t('familyEvents', 'createError'));
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteEvent = (event: FamilyEvent) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      t('familyEvents', 'deleteEventConfirmTitle'),
      t('familyEvents', 'deleteEventConfirmMessage'),
      [
        { text: t('familyEvents', 'cancelButton'), style: 'cancel' },
        {
          text: t('common', 'delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              const data = await familyApi.deleteFamilyEvent(event.id);
              if (data.success) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setEvents(prev => prev.filter(e => e.id !== event.id));
              }
            } catch (e) {
              console.error('[FAMILY_EVENTS] Delete failed:', e);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert(t('common', 'errorTitle'), t('familyEvents', 'deleteError'));
            }
          },
        },
      ]
    );
  };

  const handleRsvp = async (event: FamilyEvent, status: RsvpStatus) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRsvpingId(event.id);
    try {
      const data = await familyApi.rsvpFamilyEvent(event.id, status);
      if (data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setEvents(prev => prev.map(e => {
          if (e.id !== event.id) return e;
          const otherRsvps = e.rsvps.filter(r => r.member_id !== member?.membership_no);
          return { ...e, rsvps: [...otherRsvps, { member_id: member?.membership_no || '', status }] };
        }));
      }
    } catch (e) {
      console.error('[FAMILY_EVENTS] RSVP failed:', e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common', 'errorTitle'), t('familyEvents', 'rsvpError'));
    } finally {
      setRsvpingId(null);
    }
  };

  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());
  }, [events]);

  const filteredEvents = useMemo(() => {
    const now = Date.now();
    return sortedEvents.filter(e => {
      const isPast = new Date(e.event_date).getTime() < now;
      return activeTab === 'upcoming' ? !isPast : isPast;
    });
  }, [sortedEvents, activeTab]);

  const myStatusFor = (event: FamilyEvent): RsvpStatus | null => {
    const mine = event.rsvps?.find(r => r.member_id === member?.membership_no);
    return mine ? mine.status : null;
  };

  const RSVP_OPTIONS: { key: RsvpStatus; label: string; icon: (color: string) => React.ReactNode }[] = [
    { key: 'going', label: t('familyEvents', 'rsvpGoing'), icon: (color) => <Check size={14} color={color} /> },
    { key: 'maybe', label: t('familyEvents', 'rsvpMaybe'), icon: (color) => <HelpCircle size={14} color={color} /> },
    { key: 'not_going', label: t('familyEvents', 'rsvpNotGoing'), icon: (color) => <X size={14} color={color} /> },
  ];

  const renderEventCard = (event: FamilyEvent) => {
    const dateObj = new Date(event.event_date);
    const displayMonth = dateObj.toLocaleDateString(undefined, { month: 'short' }).toUpperCase();
    const displayDate = dateObj.getDate();
    const formattedDateString = dateObj.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    const myStatus = myStatusFor(event);

    return (
      <View
        key={event.id}
        style={{ backgroundColor: C.card, borderColor: C.border + '80', borderRadius: radius.lg, borderWidth: 1, padding: spacing.lg, marginBottom: spacing.lg }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, marginBottom: spacing.md }}>
          <View
            style={{ backgroundColor: C.primary + '15', borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, alignItems: 'center', minWidth: 56 }}
          >
            <Text style={{ color: C.primary, letterSpacing: 1, ...typography.caption, fontSize: 10 }} className="uppercase">
              {displayMonth}
            </Text>
            <Text style={{ color: C.primary, ...typography.title, lineHeight: 22 }}>
              {displayDate}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.text, fontFamily: fontFamilyBold, ...typography.title }}>
              {event.title}
            </Text>
            {event.type ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs }}>
                <Tag size={12} color={C.textFaint} />
                <Text style={{ color: C.textFaint, fontFamily, ...typography.caption }}>{event.type}</Text>
              </View>
            ) : null}
          </View>
          <TouchableOpacity onPress={() => handleDeleteEvent(event)} style={{ padding: spacing.xs }}>
            <Trash2 size={16} color={C.error} />
          </TouchableOpacity>
        </View>

        {event.description ? (
          <Text style={{ color: C.textMuted, marginBottom: spacing.md, fontFamily, ...typography.body }}>
            {event.description}
          </Text>
        ) : null}

        <View style={{ gap: spacing.sm, marginBottom: spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <CalendarIcon size={16} color={C.textMuted} />
            <Text style={{ color: C.textMuted, ...typography.caption }}>{formattedDateString}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <MapPin size={16} color={C.textMuted} />
            <Text style={{ color: C.textMuted, fontFamily, ...typography.caption }} numberOfLines={1}>
              {event.location || t('familyEvents', 'locationTBA')}
            </Text>
          </View>
        </View>

        {/* RSVP buttons */}
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {RSVP_OPTIONS.map(opt => {
            const isActive = myStatus === opt.key;
            const activeColor = opt.key === 'going' ? C.success : opt.key === 'maybe' ? C.amber : C.error;
            return (
              <TouchableOpacity
                key={opt.key}
                disabled={rsvpingId === event.id}
                onPress={() => handleRsvp(event, opt.key)}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: spacing.xs,
                  paddingVertical: spacing.sm + 2,
                  borderRadius: radius.md,
                  backgroundColor: isActive ? activeColor + '1a' : C.bg,
                  borderWidth: 1,
                  borderColor: isActive ? activeColor : C.border,
                }}
              >
                {rsvpingId === event.id && isActive ? (
                  <ActivityIndicator size="small" color={activeColor} />
                ) : (
                  <>
                    {opt.icon(isActive ? activeColor : C.textMuted)}
                    <Text style={{ color: isActive ? activeColor : C.textMuted, fontFamily: fontFamilyBold, ...typography.caption, fontWeight: '700' }}>
                      {opt.label}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      {/* Header */}
      <View
        style={{ borderBottomColor: C.border, backgroundColor: C.bg, paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}
        className="border-b flex-row items-center justify-between"
      >
        <View style={{ gap: spacing.md }} className="flex-row items-center">
          <TouchableOpacity
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.goBack(); }}
            style={{ backgroundColor: C.card + '80', padding: spacing.xs, borderRadius: radius.full }}
          >
            <ArrowLeft size={20} color={C.text} />
          </TouchableOpacity>
          <Text style={{ color: C.text, fontFamily: fontFamilyBold, ...typography.heading }}>
            {t('familyEvents', 'title')}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowCreateModal(true); }}
          style={{ backgroundColor: C.primary + '10', borderColor: C.primaryLight + '20', padding: spacing.sm, borderRadius: radius.full }}
          className="border"
        >
          <Plus size={16} color={C.primaryLight} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xxl }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.primary} colors={[C.primary]} progressBackgroundColor={C.card} />
        }
      >
        <Text style={{ color: C.textMuted, marginBottom: spacing.lg, fontFamily, ...typography.caption }}>
          {t('familyEvents', 'subtitle')}
        </Text>

        {/* Tabs */}
        <View style={{ borderBottomColor: C.border + '80', marginBottom: spacing.lg }} className="flex-row border-b">
          {[
            { key: 'upcoming' as const, label: t('familyEvents', 'tabUpcoming') },
            { key: 'past' as const, label: t('familyEvents', 'tabPast') },
          ].map(tab => {
            const active = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveTab(tab.key); }}
                style={{ borderBottomColor: active ? C.primary : 'transparent', paddingVertical: spacing.md }}
                className="flex-1 items-center border-b-2"
              >
                <Text style={{ color: active ? C.primary : C.textMuted, fontFamily: fontFamilyBold, ...typography.caption, fontWeight: '700' }}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {loading && !refreshing ? (
          <EventsSkeleton colors={C} spacing={spacing} radius={radius} />
        ) : filteredEvents.length === 0 ? (
          <EmptyState
            emoji="📅"
            title={t('familyEvents', 'emptyTitle')}
            subtitle={t('familyEvents', 'emptySubtitle')}
            action={{ label: t('familyEvents', 'createEvent'), onPress: () => setShowCreateModal(true) }}
          />
        ) : (
          filteredEvents.map(renderEventCard)
        )}
      </ScrollView>

      {/* Create Event Modal */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={{ backgroundColor: '#00000080', flex: 1, justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: C.bg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, maxHeight: '90%', ...shadow.raised }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg }}>
              <Text style={{ color: C.text, fontFamily: fontFamilyBold, ...typography.title }}>
                {t('familyEvents', 'newEventTitle')}
              </Text>
              <TouchableOpacity onPress={() => { setShowCreateModal(false); resetCreateForm(); }}>
                <X size={20} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={{ color: C.textMuted, marginBottom: spacing.xs, fontFamily, ...typography.caption }}>
                {t('familyEvents', 'eventTitleLabel')}
              </Text>
              <TextInput
                value={newTitle}
                onChangeText={setNewTitle}
                placeholder={t('familyEvents', 'eventTitlePlaceholder')}
                placeholderTextColor={C.textFaint}
                style={{ backgroundColor: C.card, borderColor: C.border, color: C.text, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, marginBottom: spacing.lg, fontFamily, ...typography.body }}
                className="border"
              />

              <Text style={{ color: C.textMuted, marginBottom: spacing.xs, fontFamily, ...typography.caption }}>
                {t('familyEvents', 'descriptionLabel')}
              </Text>
              <TextInput
                value={newDescription}
                onChangeText={setNewDescription}
                placeholder={t('familyEvents', 'descriptionPlaceholder')}
                placeholderTextColor={C.textFaint}
                multiline
                style={{ backgroundColor: C.card, borderColor: C.border, color: C.text, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, marginBottom: spacing.lg, minHeight: 64, fontFamily, ...typography.body }}
                className="border"
                textAlignVertical="top"
              />

              <Text style={{ color: C.textMuted, marginBottom: spacing.xs, fontFamily, ...typography.caption }}>
                {t('familyEvents', 'dateLabel')}
              </Text>
              <TextInput
                value={newDate}
                onChangeText={setNewDate}
                placeholder={t('familyEvents', 'datePlaceholder')}
                placeholderTextColor={C.textFaint}
                style={{ backgroundColor: C.card, borderColor: C.border, color: C.text, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, marginBottom: spacing.lg, ...typography.body }}
                className="border"
              />

              <Text style={{ color: C.textMuted, marginBottom: spacing.xs, fontFamily, ...typography.caption }}>
                {t('familyEvents', 'locationLabel')}
              </Text>
              <TextInput
                value={newLocation}
                onChangeText={setNewLocation}
                placeholder={t('familyEvents', 'locationPlaceholder')}
                placeholderTextColor={C.textFaint}
                style={{ backgroundColor: C.card, borderColor: C.border, color: C.text, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, marginBottom: spacing.lg, fontFamily, ...typography.body }}
                className="border"
              />

              <Text style={{ color: C.textMuted, marginBottom: spacing.xs, fontFamily, ...typography.caption }}>
                {t('familyEvents', 'typeLabel')}
              </Text>
              <TextInput
                value={newType}
                onChangeText={setNewType}
                placeholder={t('familyEvents', 'typePlaceholder')}
                placeholderTextColor={C.textFaint}
                style={{ backgroundColor: C.card, borderColor: C.border, color: C.text, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, marginBottom: spacing.xl, fontFamily, ...typography.body }}
                className="border"
              />

              <TouchableOpacity
                onPress={handleCreateEvent}
                disabled={creating}
                style={{ backgroundColor: creating ? C.border : C.primary, paddingVertical: spacing.md, borderRadius: radius.md, alignItems: 'center', marginBottom: spacing.xl }}
              >
                {creating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{ color: 'white', fontFamily: fontFamilyBold, ...typography.bodyEmphasis }}>
                    {t('familyEvents', 'createButton')}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
