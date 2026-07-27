// src/screens/community/LeadersScreen.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  ActivityIndicator, SafeAreaView, Dimensions, Modal, Pressable
} from 'react-native';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Crown, MapPin, Users, X } from 'lucide-react-native';
import * as leadersApi from '../../api/leaders';
import { cleanPhoto, getInitial } from '../../utils/googleDriveUrl';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

type LevelKey = 'State' | 'District' | 'Taluka' | 'Panchayat';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 40) / 2; // Two items per row

interface Leader {
  id: number;
  name: string;
  name_or: string | null;
  role: string;
  role_or: string | null;
  level: string;
  location: string | null;
  image_url: string | null;
  display_order: number;
}

export default function LeadersScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { lang, t } = useLanguage();
  const [activeLevel, setActiveLevel] = useState<LevelKey>('State');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);

  const LEVELS: { key: LevelKey; label: string; labelOr: string; emoji: string; color: string }[] = useMemo(() => [
    { key: 'State', label: t('leaders', 'levelState'), labelOr: t('leaders', 'levelStateOr'), emoji: '🏛️', color: colors.amber },
    { key: 'District', label: t('leaders', 'levelDistrict'), labelOr: t('leaders', 'levelDistrictOr'), emoji: '🗺️', color: colors.primaryLight },
    { key: 'Taluka', label: t('leaders', 'levelTaluka'), labelOr: t('leaders', 'levelTalukaOr'), emoji: '🏘️', color: colors.success },
    { key: 'Panchayat', label: t('leaders', 'levelPanchayat'), labelOr: t('leaders', 'levelPanchayatOr'), emoji: '🌿', color: colors.accent },
  ], [colors, lang]);

  const levelMeta = LEVELS.find(l => l.key === activeLevel)!;
  const needsLocation = activeLevel !== 'State';

  // Fetch locations
  useEffect(() => {
    if (!needsLocation) {
      setLocations([]);
      setSelectedLocation('');
      return;
    }
    setLocationsLoading(true);
    setSelectedLocation('');
    leadersApi.fetchLeaderLocations(activeLevel)
      .then(r => { if (r.success) setLocations(r.data || []); })
      .catch(() => setLocations([]))
      .finally(() => setLocationsLoading(false));
  }, [activeLevel, needsLocation]);

  // Fetch leaders
  useEffect(() => {
    setLoading(true);
    leadersApi.fetchLeaders(activeLevel, selectedLocation || undefined)
      .then(r => { if (r.success) setLeaders(r.data || []); })
      .catch(() => setLeaders([]))
      .finally(() => setLoading(false));
  }, [activeLevel, selectedLocation]);

  const handleLevelChange = (level: LevelKey) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveLevel(level);
    setLeaders([]);
  };

  const handleLocationSelect = (loc: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedLocation(loc);
    setShowLocationModal(false);
  };

  const LeaderCard = useCallback(({ leader }: { leader: Leader }) => {
    const photo = cleanPhoto(leader.image_url);
    return (
      <View
        style={{ width: CARD_WIDTH, backgroundColor: colors.card + '80', borderColor: colors.border + '60' }}
        className="border rounded-2xl p-4 items-center mb-3 shadow-md"
      >
        {/* Avatar */}
        <View
          style={{ borderColor: levelMeta.color, borderWidth: 2, backgroundColor: colors.bg }}
          className="w-16 h-16 rounded-full overflow-hidden items-center justify-center mb-2.5"
        >
          {photo ? (
            <Image source={{ uri: photo }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={200} />
          ) : (
            <View style={{ backgroundColor: levelMeta.color + '10' }} className="w-full h-full items-center justify-center">
              <Text style={{ color: levelMeta.color }} className="font-bold text-xl">
                {getInitial(leader.name)}
              </Text>
            </View>
          )}
        </View>

        {/* Details */}
        <Text style={{ color: colors.text, fontFamily: lang === 'od' ? 'NotoSansOriya-Bold' : undefined }} className="font-bold text-sm text-center" numberOfLines={1}>
          {leader.name}
        </Text>
        {leader.name_or ? (
          <Text style={{ color: colors.textMuted, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined }} className="text-xs mt-0.5 text-center" numberOfLines={1}>
            {leader.name_or}
          </Text>
        ) : null}

        {/* Role Badge */}
        <View style={{ borderColor: levelMeta.color + '30', backgroundColor: levelMeta.color + '10' }} className="mt-2.5 px-3 py-1 rounded-full border">
          <Text style={{ color: levelMeta.color, fontFamily: lang === 'od' ? 'NotoSansOriya-Bold' : undefined }} className="text-[10px] font-bold text-center">
            {leader.role_or || leader.role}
          </Text>
        </View>

        {/* Location tag */}
        {leader.location ? (
          <View className="flex-row items-center gap-1 mt-2">
            <MapPin size={10} color={colors.textFaint} />
            <Text style={{ color: colors.textFaint }} className="text-[10px] uppercase tracking-wide" numberOfLines={1}>
              {leader.location}
            </Text>
          </View>
        ) : null}
      </View>
    );
  }, [levelMeta, colors, lang]);

  // Grouped leaders map
  const groupedByLocation = needsLocation && !selectedLocation
    ? leaders.reduce<Record<string, Leader[]>>((acc, l) => {
        const key = l.location || 'Other';
        (acc[key] = acc[key] || []).push(l);
        return acc;
      }, {})
    : null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      {/* Top Header */}
      <View style={{ borderBottomColor: colors.border, backgroundColor: colors.bg }} className="px-4 py-3 border-b flex-row items-center gap-3">
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.goBack(); }} style={{ backgroundColor: colors.card + '80' }} className="p-1 rounded-full">
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ color: colors.text, fontFamily: lang === 'od' ? 'NotoSansOriya-Bold' : undefined }} className="font-bold text-xl tracking-wide">
          {t('leaders', 'title')}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 80 }} showsVerticalScrollIndicator={false}>
        {/* Intro */}
        <View className="flex-row items-center gap-3 mb-4">
          <View style={{ backgroundColor: colors.amber + '10', borderColor: colors.amber + '20' }} className="w-10 h-10 rounded-xl border items-center justify-center">
            <Crown size={20} color={colors.amber} />
          </View>
          <View>
            <Text style={{ color: colors.text, fontFamily: lang === 'od' ? 'NotoSansOriya-Bold' : undefined }} className="font-bold text-lg">
              {t('leaders', 'communityLeaders')}
            </Text>
            <Text style={{ color: colors.textMuted }} className="text-xs font-medium">{t('leaders', 'leadershipSubtitle')}</Text>
          </View>
        </View>

        {/* Level Selector Tabs */}
        <View style={{ backgroundColor: colors.card + '60', borderColor: colors.border + '50' }} className="flex-row border rounded-2xl p-1 mb-4">
          {LEVELS.map(lv => {
            const active = activeLevel === lv.key;
            return (
              <TouchableOpacity
                key={lv.key}
                onPress={() => handleLevelChange(lv.key)}
                style={{ backgroundColor: active ? colors.borderLight : 'transparent' }}
                className="flex-1 items-center py-2 rounded-xl"
              >
                <Text className="text-lg mb-0.5">{lv.emoji}</Text>
                <Text style={{ color: active ? lv.color : colors.textMuted }} className="text-[10px] font-bold">
                  {lv.label}
                </Text>
                <Text style={{ color: colors.textFaint, fontFamily: 'NotoSansOriya' }} className="text-[8px] font-medium">{lv.labelOr}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Custom iOS-style Bottom Sheet Button for Location selector */}
        {needsLocation && (
          <View>
            {locationsLoading ? (
              <ActivityIndicator color={colors.primaryLight} size="small" className="py-2" />
            ) : locations.length > 0 ? (
              <TouchableOpacity
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowLocationModal(true); }}
                style={{ backgroundColor: colors.card, borderColor: colors.border }}
                className="mb-4 border rounded-2xl p-4 flex-row justify-between items-center active:opacity-80"
              >
                <Text style={{ color: colors.text }} className="text-sm font-semibold">
                  {selectedLocation ? `${t('leaders', 'locationPrefix')} ${selectedLocation}` : `${t('leaders', 'selectPrefix')} ${activeLevel}`}
                </Text>
                <Text style={{ color: colors.primaryLight }} className="text-xs font-bold">{t('leaders', 'choose')}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        {/* Leaders Listing Grid */}
        {loading ? (
          <View className="flex-col items-center justify-center py-20 gap-3">
            <ActivityIndicator size="large" color={colors.primaryLight} />
            <Text style={{ color: colors.textMuted }} className="text-sm">{t('leaders', 'loadingLeaders')}</Text>
          </View>
        ) : leaders.length === 0 ? (
          <View style={{ backgroundColor: colors.card + '30', borderColor: colors.border + '50' }} className="items-center justify-center py-20 rounded-2xl border px-6">
            <Users size={40} color={colors.borderLight} className="mb-4" />
            <Text style={{ color: colors.text }} className="text-base font-bold text-center">{t('leaders', 'emptyTitle')}</Text>
            <Text style={{ color: colors.textFaint }} className="text-xs text-center mt-1">
              {t('leaders', 'emptySubtitle')}
            </Text>
          </View>
        ) : groupedByLocation ? (
          // Grouped listing by location
          <View className="gap-6">
            {Object.keys(groupedByLocation).sort().map(loc => (
              <View key={loc}>
                {/* Location Group Title */}
                <View className="flex-row items-center gap-2 mb-3">
                  <MapPin size={12} color={levelMeta.color} />
                  <Text style={{ color: levelMeta.color }} className="text-xs font-bold uppercase tracking-widest">
                    {loc}
                  </Text>
                  <Text style={{ color: colors.textFaint }} className="text-[10px]">({groupedByLocation[loc].length})</Text>
                  <View style={{ backgroundColor: colors.border + '60' }} className="flex-1 h-px ml-2" />
                </View>
                {/* Cards Grid */}
                <View className="flex-row flex-wrap gap-2">
                  {groupedByLocation[loc].map(leader => (
                    <LeaderCard key={leader.id} leader={leader} />
                  ))}
                </View>
              </View>
            ))}
          </View>
        ) : (
          // Flat listing (State level or filter selected)
          <View className="flex-row flex-wrap gap-2">
            {leaders.map(leader => (
              <LeaderCard key={leader.id} leader={leader} />
            ))}
          </View>
        )}
      </ScrollView>

      {/* iOS-Style Bottom Sheet Location Selector Modal */}
      <Modal
        visible={showLocationModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLocationModal(false)}
      >
        <Pressable className="flex-1 bg-black/60 justify-end" onPress={() => setShowLocationModal(false)}>
          <View
            style={{ backgroundColor: colors.card, borderColor: colors.border, maxHeight: Dimensions.get('window').height * 0.7, paddingBottom: insets.bottom + 24 }}
            className="border-t rounded-t-3xl p-6"
          >
            <View className="flex-row items-center justify-between mb-5">
              <Text style={{ color: colors.text, fontFamily: lang === 'od' ? 'NotoSansOriya-Bold' : undefined }} className="font-bold text-lg">
                {t('leaders', 'selectLocationTitle')}
              </Text>
              <TouchableOpacity onPress={() => setShowLocationModal(false)}>
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="gap-2">
              <TouchableOpacity
                onPress={() => handleLocationSelect('')}
                style={{
                  backgroundColor: !selectedLocation ? colors.primary + '10' : colors.bg + '40',
                  borderColor: !selectedLocation ? colors.primaryLight + '40' : colors.border,
                }}
                className="p-4 rounded-xl border mb-2"
              >
                <Text style={{ color: !selectedLocation ? colors.primaryLight : colors.text }} className="font-semibold text-sm">
                  {t('leaders', 'allPrefix')} {activeLevel}s
                </Text>
              </TouchableOpacity>

              {locations.map(loc => (
                <TouchableOpacity
                  key={loc}
                  onPress={() => handleLocationSelect(loc)}
                  style={{
                    backgroundColor: selectedLocation === loc ? colors.primary + '10' : colors.bg + '40',
                    borderColor: selectedLocation === loc ? colors.primaryLight + '40' : colors.border,
                  }}
                  className="p-4 rounded-xl border mb-2"
                >
                  <Text style={{ color: selectedLocation === loc ? colors.primaryLight : colors.text }} className="font-semibold text-sm">
                    {loc}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
