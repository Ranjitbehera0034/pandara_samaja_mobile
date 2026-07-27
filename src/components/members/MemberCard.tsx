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
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

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
  const { colors: C } = useTheme();
  const { lang, t } = useLanguage();
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
    <View style={{ backgroundColor: C.card, borderColor: C.border }} className="border rounded-2xl overflow-hidden shadow-lg mb-3">

      {/* ── Header: membership_no + active badge + actions ── */}
      <View className="flex-row items-center justify-between px-4 pt-3 pb-1">
        <View className="flex-row items-center gap-2">
          <View style={{ backgroundColor: C.border }} className="px-2 py-0.5 rounded-lg">
            <Text style={{ color: C.textMuted }} className="text-xs font-mono font-semibold">
              #{member.membership_no}
            </Text>
          </View>
          {isActive && (
            <View style={{ backgroundColor: C.success + '1a', borderColor: C.success + '33' }} className="flex-row items-center gap-1 border px-1.5 py-0.5 rounded-full">
              <View style={{ backgroundColor: C.success }} className="w-1.5 h-1.5 rounded-full" />
              <Text style={{ color: C.success }} className="text-xs font-bold uppercase tracking-wider">
                {t('members', 'activeBadge')}
              </Text>
            </View>
          )}
        </View>
        <View className="flex-row items-center gap-1">
          <TouchableOpacity
            onPress={onSubscribe}
            disabled={subscribing}
            style={{ backgroundColor: member.is_subscribed ? C.primaryLight + '26' : C.border }}
            className="p-1.5 rounded-xl"
          >
            {member.is_subscribed
              ? <UserCheck size={13} color={C.primaryLight} />
              : <UserPlus size={13} color={C.textMuted} />
            }
          </TouchableOpacity>
          <TouchableOpacity onPress={onMessage} style={{ backgroundColor: C.border }} className="p-1.5 rounded-xl">
            <MessageSquare size={13} color={C.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Avatar + Name row ── */}
      <TouchableOpacity onPress={onPress} className="flex-row items-start gap-3 px-4 py-2">
        {/* Avatar */}
        <View className="w-14 h-14 rounded-full overflow-hidden items-center justify-center shrink-0">
          {photo ? (
            <Image source={{ uri: photo }} className="w-full h-full" resizeMode="cover" />
          ) : (
            <View style={{ backgroundColor: female ? C.female : C.male }} className="w-full h-full items-center justify-center">
              <Text className="text-white font-bold text-lg">{getInitial(member.name)}</Text>
            </View>
          )}
        </View>

        <View className="flex-1 min-w-0">
          <View className="flex-row items-center gap-1.5 flex-wrap">
            <Text style={{ color: C.text, fontFamily: lang === 'od' ? 'NotoSansOriya-Bold' : undefined }} className="font-bold text-base leading-tight" numberOfLines={1}>
              {member.name}
            </Text>
            {member.is_verified && (
              <Text style={{ color: C.primaryLight }} className="text-xs">✓</Text>
            )}
          </View>
          {member.mobile ? (
            <Text style={{ color: C.textMuted }} className="text-xs mt-0.5" numberOfLines={1}>{member.mobile}</Text>
          ) : null}
          {(member.panchayat || member.taluka || member.district) && (
            <View className="flex-row items-center gap-1 mt-0.5">
              <MapPin size={10} color={C.textFaint} />
              <Text style={{ color: C.textFaint }} className="text-xs uppercase tracking-wide" numberOfLines={1}>
                {[member.panchayat, member.taluka, member.district].filter(Boolean).join(', ')}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      {/* ── Info grid: Gender / Male / Female counts ── */}
      <View style={{ borderColor: C.border + '66' }} className="flex-row border-t px-4 py-2 gap-4">
        <View className="flex-1">
          <Text style={{ color: C.textFaint, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined }} className="text-xs font-bold uppercase tracking-wider mb-0.5">
            {t('members', 'headGenderTitle')}
          </Text>
          <Text style={{ color: female ? C.female : C.male }} className="font-semibold text-sm">
            {female ? t('members', 'genderFemaleTag') : t('members', 'genderMaleTag')}
          </Text>
        </View>
        <View className="flex-row gap-4">
          <View>
            <Text style={{ color: C.textFaint, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined }} className="text-xs font-bold uppercase tracking-wider mb-0.5">
              {t('members', 'maleWord')}
            </Text>
            <Text style={{ color: C.male }} className="font-bold text-sm">{member.male ?? 0}</Text>
          </View>
          <View>
            <Text style={{ color: C.textFaint, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined }} className="text-xs font-bold uppercase tracking-wider mb-0.5">
              {t('members', 'femaleWord')}
            </Text>
            <Text style={{ color: C.female }} className="font-bold text-sm">{member.female ?? 0}</Text>
          </View>
        </View>
      </View>

      {/* ── Expand toggle (only if has family members) ── */}
      {fmList.length > 0 && (
        <TouchableOpacity
          onPress={toggleExpand}
          style={{ borderColor: C.border + '66' }}
          className="flex-row items-center justify-between px-4 py-2.5 border-t"
        >
          <Text style={{ color: C.textMuted, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined }} className="text-xs font-semibold uppercase tracking-wider">
            {t('members', 'familyMembersListLabel')}
          </Text>
          <View className="flex-row items-center gap-1">
            <Text style={{ color: C.textFaint }} className="text-xs">({fmList.length})</Text>
            {expanded
              ? <ChevronUp size={13} color={C.textMuted} />
              : <ChevronDown size={13} color={C.textMuted} />
            }
          </View>
        </TouchableOpacity>
      )}

      {/* ── Expandable family list ── */}
      {expanded && fmList.length > 0 && (
        <View style={{ backgroundColor: C.bg + '80' }}>
          {fmList.map((fm, i) => {
            const fmFemale = isFemale(fm.gender);
            // @ts-ignore
            const fmPhoto = cleanPhoto(fm.profile_photo_url);
            return (
              <View
                key={i}
                style={{ borderColor: C.border + '4d' }}
                className="flex-row items-center justify-between px-4 py-2.5 border-t"
              >
                <View className="flex-row items-center gap-2.5 flex-1 min-w-0">
                  {/* Mini avatar */}
                  <View style={{ backgroundColor: fmFemale ? C.female : C.male }} className="w-7 h-7 rounded-full overflow-hidden items-center justify-center shrink-0">
                    {fmPhoto ? (
                      <Image source={{ uri: fmPhoto }} className="w-full h-full" resizeMode="cover" />
                    ) : (
                      <Text className="text-white text-xs font-bold">{getInitial(fm.name)}</Text>
                    )}
                  </View>
                  <Text style={{ color: C.text, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined }} className="text-sm font-medium" numberOfLines={1}>{fm.name}</Text>
                </View>
                <View className="flex-row items-center gap-2 shrink-0 ml-2">
                  {fm.mobile ? (
                    <Phone size={11} color={C.textFaint} />
                  ) : null}
                  <View style={{ backgroundColor: fmFemale ? C.female + '1a' : C.male + '1a', borderColor: fmFemale ? C.female + '33' : C.male + '33' }} className="px-2 py-0.5 rounded-full border">
                    <Text style={{ color: fmFemale ? C.female : C.male, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined }} className="text-xs font-semibold">
                      {fm.relation || (fmFemale ? t('members', 'femaleWord') : t('members', 'maleWord'))}
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
