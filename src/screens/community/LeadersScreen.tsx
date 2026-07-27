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
  const { colors, spacing, radius, typography, shadow } = useTheme();
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
        style={{ width: CARD_WIDTH, backgroundColor: colors.card + '80', borderColor: colors.border + '60', borderRadius: radius.xl, padding: spacing.md, marginBottom: spacing.md, ...shadow.card }}
        className="border items-center"
      >
        {/* Avatar */}
        <View
          style={{ borderColor: levelMeta.color, borderWidth: 2, backgroundColor: colors.bg, borderRadius: radius.full, marginBottom: spacing.sm + 2 }}
          className="w-16 h-16 overflow-hidden items-center justify-center"
        >
          {photo ? (
            <Image source={{ uri: photo }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={200} />
          ) : (
            <View style={{ backgroundColor: levelMeta.color + '10' }} className="w-full h-full items-center justify-center">
              <Text style={{ color: levelMeta.color, ...typography.title }}>
                {getInitial(leader.name)}
              </Text>
            </View>
          )}
        </View>

        {/* Details */}
        <Text style={{ color: colors.text, fontFamily: lang === 'od' ? 'NotoSansOriya-Bold' : undefined, ...typography.bodyEmphasis }} className="text-center" numberOfLines={1}>
          {leader.name}
        </Text>
        {leader.name_or ? (
          <Text style={{ color: colors.textMuted, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined, marginTop: 2, ...typography.caption }} className="text-center" numberOfLines={1}>
            {leader.name_or}
          </Text>
        ) : null}

        {/* Role Badge */}
        <View style={{ borderColor: levelMeta.color + '30', backgroundColor: levelMeta.color + '10', marginTop: spacing.sm + 2, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full }} className="border">
          <Text style={{ color: levelMeta.color, fontFamily: lang === 'od' ? 'NotoSansOriya-Bold' : undefined, ...typography.caption, fontSize: 10 }} className="text-center">
            {leader.role_or || leader.role}
          </Text>
        </View>

        {/* Location tag */}
        {leader.location ? (
          <View style={{ gap: spacing.xs, marginTop: spacing.sm }} className="flex-row items-center">
            <MapPin size={12} color={colors.textFaint} />
            <Text style={{ color: colors.textFaint, letterSpacing: 0.5, ...typography.caption, fontSize: 10 }} className="uppercase" numberOfLines={1}>
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
      <View style={{ borderBottomColor: colors.border, backgroundColor: colors.bg, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.md }} className="border-b flex-row items-center">
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.goBack(); }} style={{ backgroundColor: colors.card + '80', padding: spacing.xs, borderRadius: radius.full }}>
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ color: colors.text, fontFamily: lang === 'od' ? 'NotoSansOriya-Bold' : undefined, letterSpacing: 0.3, ...typography.heading }}>
          {t('leaders', 'title')}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 80 }} showsVerticalScrollIndicator={false}>
        {/* Intro */}
        <View style={{ gap: spacing.md, marginBottom: spacing.lg }} className="flex-row items-center">
          <View style={{ backgroundColor: colors.amber + '10', borderColor: colors.amber + '20', borderRadius: radius.md }} className="w-10 h-10 border items-center justify-center">
            <Crown size={20} color={colors.amber} />
          </View>
          <View>
            <Text style={{ color: colors.text, fontFamily: lang === 'od' ? 'NotoSansOriya-Bold' : undefined, ...typography.title }}>
              {t('leaders', 'communityLeaders')}
            </Text>
            <Text style={{ color: colors.textMuted, ...typography.caption }}>{t('leaders', 'leadershipSubtitle')}</Text>
          </View>
        </View>

        {/* Level Selector Tabs */}
        <View style={{ backgroundColor: colors.card + '60', borderColor: colors.border + '50', borderRadius: radius.xl, padding: spacing.xs, marginBottom: spacing.lg }} className="flex-row border">
          {LEVELS.map(lv => {
            const active = activeLevel === lv.key;
            return (
              <TouchableOpacity
                key={lv.key}
                onPress={() => handleLevelChange(lv.key)}
                style={{ backgroundColor: active ? colors.borderLight : 'transparent', paddingVertical: spacing.sm, borderRadius: radius.md }}
                className="flex-1 items-center"
              >
                <Text style={{ marginBottom: 2 }} className="text-lg">{lv.emoji}</Text>
                <Text style={{ color: active ? lv.color : colors.textMuted, ...typography.caption, fontSize: 10 }}>
                  {lv.label}
                </Text>
                <Text style={{ color: colors.textFaint, fontFamily: 'NotoSansOriya', ...typography.caption, fontSize: 8, fontWeight: '500' }}>{lv.labelOr}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Custom iOS-style Bottom Sheet Button for Location selector */}
        {needsLocation && (
          <View>
            {locationsLoading ? (
              <ActivityIndicator color={colors.primaryLight} size="small" style={{ paddingVertical: spacing.sm }} />
            ) : locations.length > 0 ? (
              <TouchableOpacity
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowLocationModal(true); }}
                style={{ backgroundColor: colors.card, borderColor: colors.border, marginBottom: spacing.lg, borderRadius: radius.xl, padding: spacing.md }}
                className="border flex-row justify-between items-center active:opacity-80"
              >
                <Text style={{ color: colors.text, ...typography.bodyEmphasis }}>
                  {selectedLocation ? `${t('leaders', 'locationPrefix')} ${selectedLocation}` : `${t('leaders', 'selectPrefix')} ${activeLevel}`}
                </Text>
                <Text style={{ color: colors.primaryLight, ...typography.caption, fontWeight: '700' }}>{t('leaders', 'choose')}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        {/* Leaders Listing Grid */}
        {loading ? (
          <View style={{ paddingVertical: spacing.xxl + spacing.xxl, gap: spacing.md }} className="flex-col items-center justify-center">
            <ActivityIndicator size="large" color={colors.primaryLight} />
            <Text style={{ color: colors.textMuted, ...typography.body }}>{t('leaders', 'loadingLeaders')}</Text>
          </View>
        ) : leaders.length === 0 ? (
          <View style={{ backgroundColor: colors.card + '30', borderColor: colors.border + '50', paddingVertical: spacing.xxl + spacing.xxl, borderRadius: radius.xl, paddingHorizontal: spacing.xl }} className="items-center justify-center border">
            <Users size={40} color={colors.borderLight} style={{ marginBottom: spacing.lg }} />
            <Text style={{ color: colors.text, textAlign: 'center', ...typography.label }}>{t('leaders', 'emptyTitle')}</Text>
            <Text style={{ color: colors.textFaint, textAlign: 'center', marginTop: spacing.xs, ...typography.caption }}>
              {t('leaders', 'emptySubtitle')}
            </Text>
          </View>
        ) : groupedByLocation ? (
          // Grouped listing by location
          <View style={{ gap: spacing.xl }}>
            {Object.keys(groupedByLocation).sort().map(loc => (
              <View key={loc}>
                {/* Location Group Title */}
                <View style={{ gap: spacing.sm, marginBottom: spacing.md }} className="flex-row items-center">
                  <MapPin size={12} color={levelMeta.color} />
                  <Text style={{ color: levelMeta.color, letterSpacing: 1, ...typography.caption, fontWeight: '700' }} className="uppercase">
                    {loc}
                  </Text>
                  <Text style={{ color: colors.textFaint, fontSize: 10 }}>({groupedByLocation[loc].length})</Text>
                  <View style={{ backgroundColor: colors.border + '60', marginLeft: spacing.sm }} className="flex-1 h-px" />
                </View>
                {/* Cards Grid */}
                <View style={{ gap: spacing.sm }} className="flex-row flex-wrap">
                  {groupedByLocation[loc].map(leader => (
                    <LeaderCard key={leader.id} leader={leader} />
                  ))}
                </View>
              </View>
            ))}
          </View>
        ) : (
          // Flat listing (State level or filter selected)
          <View style={{ gap: spacing.sm }} className="flex-row flex-wrap">
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
        <Pressable style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} className="flex-1 justify-end" onPress={() => setShowLocationModal(false)}>
          <View
            style={{ backgroundColor: colors.card, borderColor: colors.border, maxHeight: Dimensions.get('window').height * 0.7, paddingBottom: insets.bottom + spacing.xl, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xl }}
            className="border-t"
          >
            <View style={{ marginBottom: spacing.lg }} className="flex-row items-center justify-between">
              <Text style={{ color: colors.text, fontFamily: lang === 'od' ? 'NotoSansOriya-Bold' : undefined, ...typography.title }}>
                {t('leaders', 'selectLocationTitle')}
              </Text>
              <TouchableOpacity onPress={() => setShowLocationModal(false)}>
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ gap: spacing.sm }}>
              <TouchableOpacity
                onPress={() => handleLocationSelect('')}
                style={{
                  backgroundColor: !selectedLocation ? colors.primary + '10' : colors.bg + '40',
                  borderColor: !selectedLocation ? colors.primaryLight + '40' : colors.border,
                  padding: spacing.md,
                  borderRadius: radius.md,
                  marginBottom: spacing.sm,
                }}
                className="border"
              >
                <Text style={{ color: !selectedLocation ? colors.primaryLight : colors.text, ...typography.bodyEmphasis }}>
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
                    padding: spacing.md,
                    borderRadius: radius.md,
                    marginBottom: spacing.sm,
                  }}
                  className="border"
                >
                  <Text style={{ color: selectedLocation === loc ? colors.primaryLight : colors.text, ...typography.bodyEmphasis }}>
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
