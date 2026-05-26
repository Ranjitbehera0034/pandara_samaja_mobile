// src/components/members/MemberCard.tsx
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, Image,
  LayoutAnimation, UIManager, Platform
} from 'react-native';
import {
  MapPin, MessageSquare, UserCheck, UserPlus,
  ChevronDown, ChevronUp, Phone
} from 'lucide-react-native';
import { Member, FamilyMember } from '../../types';
import { cleanPhoto, getInitial } from '../../utils/googleDriveUrl';

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

const isFemale = (gender?: string | null) =>
  ['female', 'f'].includes((gender || '').toLowerCase());

const wasRecentlyActive = (lastLogin?: string) => {
  if (!lastLogin) return false;
  return Date.now() - new Date(lastLogin).getTime() < 7 * 24 * 60 * 60 * 1000;
};

interface Props {
  member: Member & { is_subscribed?: boolean; last_portal_login?: string; is_verified?: boolean; profile_photo_url?: string | null };
  onPress: () => void;
  onSubscribe: () => void;
  onMessage: () => void;
  subscribing?: boolean;
}

export default function MemberCard({ member, onPress, onSubscribe, onMessage, subscribing }: Props) {
  const [expanded, setExpanded] = useState(false);
  const fmList: FamilyMember[] = Array.isArray(member.family_members) ? member.family_members : [];
  const isActive = wasRecentlyActive(member.last_portal_login);
  const female = isFemale(member.head_gender);
  const photo = cleanPhoto(member.profile_photo_url);

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(e => !e);
  };

  return (
    <View className="bg-slate-800/80 border border-slate-700/60 rounded-2xl overflow-hidden shadow-lg mb-3">

      {/* ── Header: membership_no + active badge + actions ── */}
      <View className="flex-row items-center justify-between px-4 pt-3 pb-1">
        <View className="flex-row items-center gap-2">
          <View className="bg-slate-700/60 px-2 py-0.5 rounded-lg">
            <Text className="text-slate-400 text-xs font-mono font-semibold">
              #{member.membership_no}
            </Text>
          </View>
          {isActive && (
            <View className="flex-row items-center gap-1 bg-green-400/10 border border-green-400/20 px-1.5 py-0.5 rounded-full">
              <View className="w-1.5 h-1.5 rounded-full bg-green-400" />
              <Text className="text-green-400 text-xs font-bold uppercase tracking-wider">ACTIVE</Text>
            </View>
          )}
        </View>
        <View className="flex-row items-center gap-1">
          <TouchableOpacity
            onPress={onSubscribe}
            disabled={subscribing}
            className={`p-1.5 rounded-xl ${member.is_subscribed
              ? 'bg-blue-500/15'
              : 'bg-slate-700'
            }`}
          >
            {member.is_subscribed
              ? <UserCheck size={13} color="#3b82f6" />
              : <UserPlus size={13} color="#94a3b8" />
            }
          </TouchableOpacity>
          <TouchableOpacity onPress={onMessage} className="p-1.5 rounded-xl bg-slate-700">
            <MessageSquare size={13} color="#94a3b8" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Avatar + Name row ── */}
      <TouchableOpacity onPress={onPress} className="flex-row items-start gap-3 px-4 py-2">
        {/* Avatar */}
        <View className={`w-14 h-14 rounded-full overflow-hidden items-center justify-center shrink-0`}>
          {photo ? (
            <Image source={{ uri: photo }} className="w-full h-full" resizeMode="cover" />
          ) : (
            <View className={`w-full h-full items-center justify-center ${female ? 'bg-pink-600' : 'bg-blue-600'}`}>
              <Text className="text-white font-bold text-lg">{getInitial(member.name)}</Text>
            </View>
          )}
        </View>

        <View className="flex-1 min-w-0">
          <View className="flex-row items-center gap-1.5 flex-wrap">
            <Text className="text-white font-bold text-base leading-tight" numberOfLines={1}>
              {member.name}
            </Text>
            {member.is_verified && (
              <Text className="text-blue-400 text-xs">✓</Text>
            )}
          </View>
          {member.mobile ? (
            <Text className="text-slate-400 text-xs mt-0.5" numberOfLines={1}>{member.mobile}</Text>
          ) : null}
          {(member.panchayat || member.taluka || member.district) && (
            <View className="flex-row items-center gap-1 mt-0.5">
              <MapPin size={10} color="#64748b" />
              <Text className="text-slate-500 text-xs uppercase tracking-wide" numberOfLines={1}>
                {[member.panchayat, member.taluka, member.district].filter(Boolean).join(', ')}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      {/* ── Info grid: Gender / Male / Female counts ── */}
      <View className="flex-row border-t border-slate-700/40 px-4 py-2 gap-4">
        <View className="flex-1">
          <Text className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-0.5">Head Gender</Text>
          <Text className={`font-semibold text-sm ${female ? 'text-pink-400' : 'text-blue-400'}`}>
            {female ? '♀ Female' : '♂ Male'}
          </Text>
        </View>
        <View className="flex-row gap-4">
          <View>
            <Text className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-0.5">Male</Text>
            <Text className="text-blue-400 font-bold text-sm">{member.male ?? 0}</Text>
          </View>
          <View>
            <Text className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-0.5">Female</Text>
            <Text className="text-pink-400 font-bold text-sm">{member.female ?? 0}</Text>
          </View>
        </View>
      </View>

      {/* ── Expand toggle (only if has family members) ── */}
      {fmList.length > 0 && (
        <TouchableOpacity
          onPress={toggleExpand}
          className="flex-row items-center justify-between px-4 py-2.5 border-t border-slate-700/40"
        >
          <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
            Family Members List
          </Text>
          <View className="flex-row items-center gap-1">
            <Text className="text-slate-500 text-xs">({fmList.length})</Text>
            {expanded
              ? <ChevronUp size={13} color="#94a3b8" />
              : <ChevronDown size={13} color="#94a3b8" />
            }
          </View>
        </TouchableOpacity>
      )}

      {/* ── Expandable family list ── */}
      {expanded && fmList.length > 0 && (
        <View className="bg-slate-900/50">
          {fmList.map((fm, i) => {
            const fmFemale = isFemale(fm.gender);
            // @ts-ignore
            const fmPhoto = cleanPhoto(fm.profile_photo_url);
            return (
              <View
                key={i}
                className="flex-row items-center justify-between px-4 py-2.5 border-t border-slate-700/30"
              >
                <View className="flex-row items-center gap-2.5 flex-1 min-w-0">
                  {/* Mini avatar */}
                  <View className={`w-7 h-7 rounded-full overflow-hidden items-center justify-center shrink-0 ${fmFemale ? 'bg-pink-600' : 'bg-blue-600'}`}>
                    {fmPhoto ? (
                      <Image source={{ uri: fmPhoto }} className="w-full h-full" resizeMode="cover" />
                    ) : (
                      <Text className="text-white text-xs font-bold">{getInitial(fm.name)}</Text>
                    )}
                  </View>
                  <Text className="text-white text-sm font-medium" numberOfLines={1}>{fm.name}</Text>
                </View>
                <View className="flex-row items-center gap-2 shrink-0 ml-2">
                  {fm.mobile ? (
                    <Phone size={11} color="#64748b" />
                  ) : null}
                  <View className={`px-2 py-0.5 rounded-full border ${fmFemale
                    ? 'bg-pink-500/10 border-pink-500/20'
                    : 'bg-blue-500/10 border-blue-500/20'
                  }`}>
                    <Text className={`text-xs font-semibold ${fmFemale ? 'text-pink-400' : 'text-blue-400'}`}>
                      {fm.relation || (fmFemale ? 'Female' : 'Male')}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
