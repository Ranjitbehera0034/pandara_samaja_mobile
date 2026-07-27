// src/screens/family/FamilyTreeScreen.tsx
import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { ArrowLeft, Users } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import Avatar from '../../components/common/Avatar';
import EmptyState from '../../components/common/EmptyState';
import { FamilyMember } from '../../types';

type RelationGroupKey = 'spouse' | 'parents' | 'children' | 'others';

function groupKeyFor(relation: string): RelationGroupKey {
  const r = (relation || '').toLowerCase();
  if (/(spouse|wife|husband)/.test(r)) return 'spouse';
  if (/(father|mother|parent)/.test(r)) return 'parents';
  if (/(son|daughter|child)/.test(r)) return 'children';
  return 'others';
}

export default function FamilyTreeScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { member } = useAuth();
  const { colors: C, spacing, radius, typography, shadow } = useTheme();
  const { lang, t } = useLanguage();

  const familyMembers: FamilyMember[] = member?.family_members || [];

  const groups = useMemo(() => {
    const acc: Record<RelationGroupKey, FamilyMember[]> = {
      spouse: [], parents: [], children: [], others: [],
    };
    familyMembers.forEach((fm) => {
      acc[groupKeyFor(fm.relation)].push(fm);
    });
    return acc;
  }, [familyMembers]);

  const fontFamily = lang === 'od' ? 'NotoSansOriya' : undefined;
  const fontFamilyBold = lang === 'od' ? 'NotoSansOriya-Bold' : undefined;

  const sections: { key: RelationGroupKey; label: string }[] = [
    { key: 'spouse', label: t('familyTree', 'groupSpouse') },
    { key: 'parents', label: t('familyTree', 'groupParents') },
    { key: 'children', label: t('familyTree', 'groupChildren') },
    { key: 'others', label: t('familyTree', 'groupOthers') },
  ];

  const hasAnyFamily = !!member && familyMembers.length > 0;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      {/* Header */}
      <View
        style={{ borderBottomColor: C.border, backgroundColor: C.bg, paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}
        className="border-b flex-row items-center"
      >
        <TouchableOpacity
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.goBack(); }}
          style={{ backgroundColor: C.card + '80', padding: spacing.xs, borderRadius: radius.full, marginRight: spacing.md }}
        >
          <ArrowLeft size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={{ color: C.text, fontFamily: fontFamilyBold, ...typography.heading }}>
          {t('familyTree', 'title')}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xxl }}
        showsVerticalScrollIndicator={false}
      >
        {!member ? (
          <EmptyState
            emoji="🌳"
            title={t('familyTree', 'emptyTitle')}
            subtitle={t('familyTree', 'emptySubtitle')}
          />
        ) : (
          <>
            <Text style={{ color: C.textMuted, marginBottom: spacing.xl, fontFamily, ...typography.caption }}>
              {t('familyTree', 'subtitle')}
            </Text>

            {/* Head of Family — prominent card at the top */}
            <View
              style={{ backgroundColor: C.card, borderColor: C.border, borderRadius: radius.lg, padding: spacing.xl, marginBottom: spacing.xl, alignItems: 'center', ...shadow.card }}
              className="border"
            >
              <Avatar name={member.name} gender={member.head_gender} size={88} />
              <Text style={{ color: C.text, marginTop: spacing.md, fontFamily: fontFamilyBold, ...typography.title }}>
                {member.name}
              </Text>
              <View
                style={{ backgroundColor: C.amber + '1a', borderColor: C.amber + '33', borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, marginTop: spacing.sm }}
                className="border"
              >
                <Text style={{ color: C.amber, fontFamily: fontFamilyBold, ...typography.caption }}>
                  {t('familyTree', 'headOfFamily')}
                </Text>
              </View>
              <Text style={{ color: C.textFaint, marginTop: spacing.sm, ...typography.caption }}>
                {t('familyTree', 'membershipPrefix')}{member.membership_no}
              </Text>
            </View>

            {!hasAnyFamily ? (
              <EmptyState
                emoji="🌳"
                title={t('familyTree', 'emptyTitle')}
                subtitle={t('familyTree', 'emptySubtitle')}
              />
            ) : (
              /* Connecting line down to the family groups below */
              <View style={{ alignItems: 'center', marginBottom: spacing.sm }}>
                <View style={{ width: 2, height: spacing.xl, backgroundColor: C.border }} />
              </View>
            )}

            {sections.map(({ key, label }) => {
              const members = groups[key];
              if (members.length === 0) return null;
              return (
                <View key={key} style={{ marginBottom: spacing.xl }}>
                  <View style={{ gap: spacing.sm, marginBottom: spacing.md }} className="flex-row items-center">
                    <Users size={16} color={C.primaryLight} />
                    <Text style={{ color: C.textMuted, fontFamily: fontFamilyBold, ...typography.caption, fontWeight: '700' }} className="uppercase tracking-wider">
                      {label} ({members.length})
                    </Text>
                  </View>
                  <View
                    style={{ backgroundColor: C.card, borderColor: C.border, borderRadius: radius.lg, ...shadow.card }}
                    className="border overflow-hidden"
                  >
                    {members.map((fm, idx) => (
                      <View
                        key={`${fm.name}-${idx}`}
                        style={{ borderColor: C.border + '80', gap: spacing.md, padding: spacing.lg }}
                        className={idx < members.length - 1 ? 'flex-row items-center border-b' : 'flex-row items-center'}
                      >
                        <Avatar name={fm.name} gender={fm.gender} size={48} />
                        <View className="flex-1">
                          <Text style={{ color: C.text, fontFamily: fontFamilyBold, ...typography.bodyEmphasis }}>
                            {fm.name}
                          </Text>
                          <Text style={{ color: C.textMuted, marginTop: 2, fontFamily, ...typography.caption }} className="capitalize">
                            {fm.relation}{fm.age ? ` · ${fm.age} ${t('familyTree', 'ageSuffix')}` : ''}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
  );
}
