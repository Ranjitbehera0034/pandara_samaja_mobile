// src/components/members/MemberCard.tsx
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity,
  LayoutAnimation, UIManager, Platform
} from 'react-native';
import {
  MapPin, MessageSquare, UserCheck, UserPlus,
  ChevronDown, ChevronUp, Phone
} from 'lucide-react-native';
import { Member, FamilyMember } from '../../types';
import { cleanPhoto } from '../../utils/googleDriveUrl';
import Avatar from '../common/Avatar';
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
  const { colors: C, spacing, radius, typography, shadow } = useTheme();
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
    <View
      style={{ backgroundColor: C.card, borderColor: C.border, borderRadius: radius.lg, marginBottom: spacing.md, ...shadow.card }}
      className="border overflow-hidden"
    >

      {/* ── Header: membership_no + active badge + actions ── */}
      <View
        className="flex-row items-center justify-between"
        style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xs }}
      >
        <View className="flex-row items-center" style={{ gap: spacing.sm }}>
          <View style={{ backgroundColor: C.border, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.sm }}>
            <Text style={{ color: C.textMuted, fontSize: typography.caption.fontSize, fontWeight: typography.caption.fontWeight }} className="font-mono">
              #{member.membership_no}
            </Text>
          </View>
          {isActive && (
            <View
              style={{ backgroundColor: C.success + '1a', borderColor: C.success + '33', borderRadius: radius.full, paddingHorizontal: spacing.sm - 2, paddingVertical: 2 }}
              className="flex-row items-center gap-1 border"
            >
              <View style={{ backgroundColor: C.success }} className="w-1.5 h-1.5 rounded-full" />
              <Text style={{ color: C.success, fontSize: typography.caption.fontSize, fontWeight: '700' }} className="uppercase tracking-wider">
                {t('members', 'activeBadge')}
              </Text>
            </View>
          )}
        </View>
        <View className="flex-row items-center" style={{ gap: spacing.xs }}>
          <TouchableOpacity
            onPress={onSubscribe}
            disabled={subscribing}
            style={{ backgroundColor: member.is_subscribed ? C.primaryLight + '26' : C.border, padding: spacing.sm - 2, borderRadius: radius.md }}
          >
            {member.is_subscribed
              ? <UserCheck size={16} color={C.primaryLight} />
              : <UserPlus size={16} color={C.textMuted} />
            }
          </TouchableOpacity>
          <TouchableOpacity onPress={onMessage} style={{ backgroundColor: C.border, padding: spacing.sm - 2, borderRadius: radius.md }}>
            <MessageSquare size={16} color={C.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Avatar + Name row ── */}
      <TouchableOpacity
        onPress={onPress}
        className="flex-row items-start"
        style={{ gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }}
      >
        {/* Avatar */}
        <Avatar name={member.name} photoUrl={photo} gender={member.head_gender} size={56} />

        <View className="flex-1 min-w-0">
          <View className="flex-row items-center flex-wrap" style={{ gap: spacing.xs + 2 }}>
            <Text
              style={{
                color: C.text,
                fontFamily: lang === 'od' ? 'NotoSansOriya-Bold' : undefined,
                fontSize: typography.title.fontSize,
                lineHeight: typography.title.lineHeight,
                fontWeight: typography.title.fontWeight,
              }}
              numberOfLines={1}
            >
              {member.name}
            </Text>
            {member.is_verified && (
              <Text style={{ color: C.primaryLight, fontSize: typography.caption.fontSize }}>✓</Text>
            )}
          </View>
          {member.mobile ? (
            <Text
              style={{ color: C.textMuted, fontSize: typography.caption.fontSize, lineHeight: typography.caption.lineHeight, marginTop: 2 }}
              numberOfLines={1}
            >
              {member.mobile}
            </Text>
          ) : null}
          {(member.panchayat || member.taluka || member.district) && (
            <View className="flex-row items-center" style={{ gap: spacing.xs, marginTop: 2 }}>
              <MapPin size={16} color={C.textFaint} />
              <Text
                style={{ color: C.textFaint, fontSize: typography.caption.fontSize, lineHeight: typography.caption.lineHeight }}
                className="uppercase tracking-wide"
                numberOfLines={1}
              >
                {[member.panchayat, member.taluka, member.district].filter(Boolean).join(', ')}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      {/* ── Info grid: Gender / Male / Female counts ── */}
      <View
        style={{ borderColor: C.border + '66', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }}
        className="flex-row border-t"
      >
        <View className="flex-1">
          <Text
            style={{ color: C.textFaint, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined, fontSize: typography.caption.fontSize, fontWeight: '700', marginBottom: 2 }}
            className="uppercase tracking-wider"
          >
            {t('members', 'headGenderTitle')}
          </Text>
          <Text style={{ color: female ? C.female : C.male, fontSize: typography.body.fontSize, fontWeight: '600' }}>
            {female ? t('members', 'genderFemaleTag') : t('members', 'genderMaleTag')}
          </Text>
        </View>
        <View className="flex-row" style={{ gap: spacing.md }}>
          <View>
            <Text
              style={{ color: C.textFaint, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined, fontSize: typography.caption.fontSize, fontWeight: '700', marginBottom: 2 }}
              className="uppercase tracking-wider"
            >
              {t('members', 'maleWord')}
            </Text>
            <Text style={{ color: C.male, fontSize: typography.body.fontSize, fontWeight: '700' }}>{member.male ?? 0}</Text>
          </View>
          <View>
            <Text
              style={{ color: C.textFaint, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined, fontSize: typography.caption.fontSize, fontWeight: '700', marginBottom: 2 }}
              className="uppercase tracking-wider"
            >
              {t('members', 'femaleWord')}
            </Text>
            <Text style={{ color: C.female, fontSize: typography.body.fontSize, fontWeight: '700' }}>{member.female ?? 0}</Text>
          </View>
        </View>
      </View>

      {/* ── Expand toggle (only if has family members) ── */}
      {fmList.length > 0 && (
        <TouchableOpacity
          onPress={toggleExpand}
          style={{ borderColor: C.border + '66', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm + 2 }}
          className="flex-row items-center justify-between border-t"
        >
          <Text
            style={{ color: C.textMuted, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined, fontSize: typography.caption.fontSize, fontWeight: '600' }}
            className="uppercase tracking-wider"
          >
            {t('members', 'familyMembersListLabel')}
          </Text>
          <View className="flex-row items-center" style={{ gap: spacing.xs }}>
            <Text style={{ color: C.textFaint, fontSize: typography.caption.fontSize }}>({fmList.length})</Text>
            {expanded
              ? <ChevronUp size={16} color={C.textMuted} />
              : <ChevronDown size={16} color={C.textMuted} />
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
                style={{ borderColor: C.border + '4d', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm + 2 }}
                className="flex-row items-center justify-between border-t"
              >
                <View className="flex-row items-center flex-1 min-w-0" style={{ gap: spacing.sm + 2 }}>
                  {/* Mini avatar */}
                  <Avatar name={fm.name} photoUrl={fmPhoto} gender={fm.gender} size={28} />
                  <Text
                    style={{ color: C.text, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined, fontSize: typography.body.fontSize, lineHeight: typography.body.lineHeight, fontWeight: '500' }}
                    numberOfLines={1}
                  >
                    {fm.name}
                  </Text>
                </View>
                <View className="flex-row items-center shrink-0" style={{ gap: spacing.sm, marginLeft: spacing.sm }}>
                  {fm.mobile ? (
                    <Phone size={16} color={C.textFaint} />
                  ) : null}
                  <View
                    style={{
                      backgroundColor: fmFemale ? C.female + '1a' : C.male + '1a',
                      borderColor: fmFemale ? C.female + '33' : C.male + '33',
                      borderRadius: radius.full,
                      paddingHorizontal: spacing.sm,
                      paddingVertical: 2,
                    }}
                    className="border"
                  >
                    <Text
                      style={{ color: fmFemale ? C.female : C.male, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined, fontSize: typography.caption.fontSize, fontWeight: '600' }}
                    >
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
