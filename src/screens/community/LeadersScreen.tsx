// src/screens/community/LeadersScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  ActivityIndicator, Image, SafeAreaView, Dimensions
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import { ArrowLeft, Crown, MapPin, Users } from 'lucide-react-native';
import * as leadersApi from '../../api/leaders';
import { cleanPhoto, getInitial } from '../../utils/googleDriveUrl';

type LevelKey = 'State' | 'District' | 'Taluka' | 'Panchayat';

const LEVELS: { key: LevelKey; label: string; labelOr: string; emoji: string; color: string; border: string; bg: string }[] = [
  { key: 'State', label: 'State', labelOr: 'ରାଜ୍ୟ', emoji: '🏛️', color: '#f59e0b', border: 'border-amber-500/30', bg: 'bg-amber-500/10' },
  { key: 'District', label: 'District', labelOr: 'ଜିଲ୍ଲା', emoji: '🗺️', color: '#3b82f6', border: 'border-blue-500/30', bg: 'bg-blue-500/10' },
  { key: 'Taluka', label: 'Taluka', labelOr: 'ତାଲୁକ', emoji: '🏘️', color: '#10b981', border: 'border-emerald-500/30', bg: 'bg-emerald-500/10' },
  { key: 'Panchayat', label: 'Panchayat', labelOr: 'ପଞ୍ଚାୟତ', emoji: '🌿', color: '#8b5cf6', border: 'border-purple-500/30', bg: 'bg-purple-500/10' },
];

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
  const [activeLevel, setActiveLevel] = useState<LevelKey>('State');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationsLoading, setLocationsLoading] = useState(false);

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
    setActiveLevel(level);
    setLeaders([]);
  };

  const LeaderCard = ({ leader }: { leader: Leader }) => {
    const photo = cleanPhoto(leader.image_url);
    return (
      <View
        style={{ width: CARD_WIDTH }}
        className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4 items-center mb-3 shadow-md"
      >
        {/* Avatar */}
        <View
          style={{ borderColor: levelMeta.color, borderWidth: 2 }}
          className="w-16 h-16 rounded-full overflow-hidden items-center justify-center bg-slate-900 mb-2.5"
        >
          {photo ? (
            <Image source={{ uri: photo }} className="w-full h-full" resizeMode="cover" />
          ) : (
            <View className={`w-full h-full items-center justify-center ${levelMeta.bg}`}>
              <Text style={{ color: levelMeta.color }} className="font-bold text-xl">
                {getInitial(leader.name)}
              </Text>
            </View>
          )}
        </View>

        {/* Details */}
        <Text className="text-white font-bold text-sm text-center" numberOfLines={1}>
          {leader.name}
        </Text>
        {leader.name_or ? (
          <Text className="text-slate-400 text-xs mt-0.5 text-center" numberOfLines={1}>
            {leader.name_or}
          </Text>
        ) : null}

        {/* Role Badge */}
        <View className={`mt-2.5 px-3 py-1 rounded-full border ${levelMeta.border} ${levelMeta.bg}`}>
          <Text style={{ color: levelMeta.color }} className="text-[10px] font-bold text-center">
            {leader.role_or || leader.role}
          </Text>
        </View>

        {/* Location tag */}
        {leader.location ? (
          <View className="flex-row items-center gap-1 mt-2">
            <MapPin size={10} color="#64748b" />
            <Text className="text-slate-500 text-[10px] uppercase tracking-wide" numberOfLines={1}>
              {leader.location}
            </Text>
          </View>
        ) : null}
      </View>
    );
  };

  // Grouped leaders map
  const groupedByLocation = needsLocation && !selectedLocation
    ? leaders.reduce<Record<string, Leader[]>>((acc, l) => {
        const key = l.location || 'Other';
        (acc[key] = acc[key] || []).push(l);
        return acc;
      }, {})
    : null;

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      {/* Top Header */}
      <View className="px-4 py-3 border-b border-slate-800 flex-row items-center bg-slate-900 gap-3">
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-1 rounded-full bg-slate-800/50">
          <ArrowLeft size={22} color="#ffffff" />
        </TouchableOpacity>
        <Text className="text-white font-bold text-xl tracking-wide">Leaders</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 80 }} showsVerticalScrollIndicator={false}>
        {/* Intro */}
        <View className="flex-row items-center gap-3 mb-4">
          <View className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 items-center justify-center">
            <Crown size={20} color="#f59e0b" />
          </View>
          <View>
            <Text className="text-white font-bold text-lg">Community Leaders</Text>
            <Text className="text-slate-400 text-xs font-medium">ସମାଜ ନେତୃତ୍ୱ — Leadership Tiers</Text>
          </View>
        </View>

        {/* Level Selector Tabs */}
        <View className="flex-row bg-slate-800/60 border border-slate-700/50 rounded-2xl p-1 mb-4">
          {LEVELS.map(lv => {
            const active = activeLevel === lv.key;
            return (
              <TouchableOpacity
                key={lv.key}
                onPress={() => handleLevelChange(lv.key)}
                className={`flex-1 items-center py-2 rounded-xl transition-all ${active ? 'bg-slate-700' : ''}`}
              >
                <Text className="text-lg mb-0.5">{lv.emoji}</Text>
                <Text style={{ color: active ? lv.color : '#94a3b8' }} className="text-[10px] font-bold">
                  {lv.label}
                </Text>
                <Text className="text-[8px] text-slate-500 font-medium">{lv.labelOr}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Location Picker (for District/Taluka/Panchayat) */}
        {needsLocation && (
          <View>
            {locationsLoading ? (
              <ActivityIndicator color="#3b82f6" size="small" className="py-2" />
            ) : locations.length > 0 ? (
              <View className="mb-4 bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden px-2">
                <Picker
                  selectedValue={selectedLocation}
                  onValueChange={(itemValue) => setSelectedLocation(itemValue)}
                  style={{ color: '#fff' }}
                  dropdownIconColor="#94a3b8"
                >
                  <Picker.Item label={`All ${activeLevel}s`} value="" style={{ backgroundColor: '#1e293b', color: '#fff' }} />
                  {locations.map(loc => (
                    <Picker.Item key={loc} label={loc} value={loc} style={{ backgroundColor: '#1e293b', color: '#fff' }} />
                  ))}
                </Picker>
              </View>
            ) : null}
          </View>
        )}

        {/* Leaders Listing Grid */}
        {loading ? (
          <View className="flex-col items-center justify-center py-20 gap-3">
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text className="text-slate-400 text-sm">Loading leaders…</Text>
          </View>
        ) : leaders.length === 0 ? (
          <View className="items-center justify-center py-20 bg-slate-800/30 rounded-2xl border border-slate-700/50 px-6">
            <Users size={40} color="#475569" className="mb-4" />
            <Text className="text-slate-300 text-base font-bold text-center">No leaders found</Text>
            <Text className="text-slate-500 text-xs text-center mt-1">
              No leader cards have been registered under this tier.
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
                  <Text className="text-[10px] text-slate-500">({groupedByLocation[loc].length})</Text>
                  <View className="flex-1 h-px bg-slate-700/60 ml-2" />
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
    </SafeAreaView>
  );
}
