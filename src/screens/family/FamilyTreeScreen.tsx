// src/screens/family/FamilyTreeScreen.tsx
import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { ArrowLeft, Users, Plus, Pencil, Trash2 } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import Avatar from '../../components/common/Avatar';
import EmptyState from '../../components/common/EmptyState';
import { FamilyMember } from '../../types';
import { fetchFamilyMembers, deleteFamilyMember } from '../../api/members';

type RelationGroupKey = 'spouse' | 'parents' | 'children' | 'others';

function groupKeyFor(relation: string): RelationGroupKey {
  const r = (relation || '').toLowerCase();
  if (/(spouse|wife|husband)/.test(r)) return 'spouse';
  if (/(father|mother|parent)/.test(r)) return 'parents';
  if (/(son|daughter|child)/.test(r)) return 'children';
  return 'others';
}

// Mirrors the backend's isHeadEntry() (memberModel.ts) exactly — the head
// of family entry can never be re-related or deleted, and is already shown
// separately in the "Head of Family" card above, so it must never also show
// up as an editable/deletable row in the grouped list below.
function isHeadRelation(relation?: string): boolean {
  const r = (relation || '').toLowerCase();
  return r === 'self' || r === 'self/head' || r === 'head';
}

type IndexedFamilyMember = FamilyMember & { _index: number };

export default function FamilyTreeScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { member } = useAuth();
  const { colors: C, spacing, radius, typography, shadow } = useTheme();
  const { lang, t } = useLanguage();

  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>(member?.family_members || []);
  const [loading, setLoading] = useState(true);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!member) {
      setLoading(false);
      return;
    }
    try {
      const data = await fetchFamilyMembers();
      if (data.success) setFamilyMembers(data.familyMembers || []);
    } catch (e) {
      console.error('[FAMILY_TREE] Fetch failed:', e);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [member?.membership_no]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const unsub = navigation.addListener('focus', () => load());
    return unsub;
  }, [navigation, load]);

  // Non-head entries only, carrying their real array index so edit/delete
  // calls stay in sync with the backend's index-based routes.
  const nonHeadMembers: IndexedFamilyMember[] = useMemo(
    () => familyMembers
      .map((fm, idx) => ({ ...fm, _index: idx }))
      .filter((fm) => !isHeadRelation(fm.relation)),
    [familyMembers]
  );

  const groups = useMemo(() => {
    const acc: Record<RelationGroupKey, IndexedFamilyMember[]> = {
      spouse: [], parents: [], children: [], others: [],
    };
    nonHeadMembers.forEach((fm) => {
      acc[groupKeyFor(fm.relation)].push(fm);
    });
    return acc;
  }, [nonHeadMembers]);

  const fontFamily = lang === 'od' ? 'NotoSansOriya' : undefined;
  const fontFamilyBold = lang === 'od' ? 'NotoSansOriya-Bold' : undefined;

  const sections: { key: RelationGroupKey; label: string }[] = [
    { key: 'spouse', label: t('familyTree', 'groupSpouse') },
    { key: 'parents', label: t('familyTree', 'groupParents') },
    { key: 'children', label: t('familyTree', 'groupChildren') },
    { key: 'others', label: t('familyTree', 'groupOthers') },
  ];

  const hasAnyFamily = !!member && nonHeadMembers.length > 0;

  const handleEditPress = (fm: IndexedFamilyMember) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('FamilyMemberForm', { index: fm._index, member: fm });
  };

  const doDelete = async (index: number) => {
    setDeletingIndex(index);
    try {
      const data = await deleteFamilyMember(index);
      if (data.success) {
        setFamilyMembers(data.familyMembers || []);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        throw new Error(data.message || t('familyTree', 'deleteError'));
      }
    } catch (e: any) {
      console.error('[FAMILY_TREE] Delete failed:', e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common', 'errorTitle'), e.message || t('familyTree', 'deleteError'));
    } finally {
      setDeletingIndex(null);
    }
  };

  const handleDeletePress = (fm: IndexedFamilyMember) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      t('familyTree', 'confirmDeleteTitle'),
      t('familyTree', 'confirmDeleteMessage'),
      [
        { text: t('common', 'cancel'), style: 'cancel' },
        { text: t('common', 'delete'), style: 'destructive', onPress: () => doDelete(fm._index) },
      ]
    );
  };

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
        <Text style={{ flex: 1, color: C.text, fontFamily: fontFamilyBold, ...typography.heading }}>
          {t('familyTree', 'title')}
        </Text>
        {member && (
          <TouchableOpacity
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.navigate('FamilyMemberForm', {}); }}
            style={{ width: 36, height: 36, borderRadius: radius.full, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' }}
          >
            <Plus size={18} color="#fff" />
          </TouchableOpacity>
        )}
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

            {loading ? (
              <View style={{ paddingVertical: spacing.xxl, alignItems: 'center' }}>
                <ActivityIndicator size="large" color={C.primary} />
              </View>
            ) : !hasAnyFamily ? (
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

            {!loading && sections.map(({ key, label }) => {
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
                        key={`${fm.name}-${fm._index}`}
                        style={{ borderColor: C.border + '80', gap: spacing.sm, padding: spacing.lg }}
                        className={idx < members.length - 1 ? 'flex-row items-center border-b' : 'flex-row items-center'}
                      >
                        <TouchableOpacity
                          onPress={() => handleEditPress(fm)}
                          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
                        >
                          <Avatar name={fm.name} gender={fm.gender} size={48} />
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: C.text, fontFamily: fontFamilyBold, ...typography.bodyEmphasis }}>
                              {fm.name}
                            </Text>
                            <Text style={{ color: C.textMuted, marginTop: 2, fontFamily, ...typography.caption }} className="capitalize">
                              {fm.relation}{fm.age ? ` · ${fm.age} ${t('familyTree', 'ageSuffix')}` : ''}
                            </Text>
                          </View>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleEditPress(fm)}
                          style={{ padding: spacing.sm, borderRadius: radius.full, backgroundColor: C.bg }}
                        >
                          <Pencil size={16} color={C.textMuted} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDeletePress(fm)}
                          disabled={deletingIndex === fm._index}
                          style={{ padding: spacing.sm, borderRadius: radius.full, backgroundColor: C.error + '15' }}
                        >
                          {deletingIndex === fm._index ? (
                            <ActivityIndicator size="small" color={C.error} />
                          ) : (
                            <Trash2 size={16} color={C.error} />
                          )}
                        </TouchableOpacity>
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
