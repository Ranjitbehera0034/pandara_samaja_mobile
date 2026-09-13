// src/screens/community/SongContestDetailScreen.tsx
// Contest detail: rules, your own entry's moderation status (if you've
// registered), a Register CTA (if not, and the contest is still active),
// and the public feed of approved entries sorted by likes.
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { ArrowLeft, Heart, MessageCircle, Users } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as songContestApi from '../../api/songContest';
import { SongContest, SongContestEntry } from '../../api/songContest';
import EmptyState from '../../components/common/EmptyState';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

function MyEntryCard({ entry }: { entry: SongContestEntry }) {
  const { colors: C, spacing, radius, typography } = useTheme();
  const { lang, t } = useLanguage();
  const fontRegular = lang === 'od' ? 'NotoSansOriya' : undefined;

  const statusColor = entry.moderation_status === 'approved' ? C.success : entry.moderation_status === 'rejected' ? C.error : C.warning;
  const statusLabel = entry.moderation_status === 'approved'
    ? t('songContest', 'myEntryStatusApproved')
    : entry.moderation_status === 'rejected'
      ? t('songContest', 'myEntryStatusRejected')
      : t('songContest', 'myEntryStatusPending');

  return (
    <View style={{ backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.lg }}>
      <Text style={{ color: C.textMuted, ...typography.label }}>{t('songContest', 'myEntryLabel')}</Text>
      <Text style={{ color: C.text, fontFamily: fontRegular, marginTop: spacing.xs, ...typography.bodyEmphasis }}>{entry.entry_name}</Text>
      <Text style={{ alignSelf: 'flex-start', color: statusColor, backgroundColor: statusColor + '15', borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 3, marginTop: spacing.sm, ...typography.caption, fontWeight: '700' }}>
        {statusLabel}
      </Text>
      {entry.moderation_status === 'rejected' && !!entry.admin_remarks && (
        <View style={{ marginTop: spacing.sm }}>
          <Text style={{ color: C.textFaint, ...typography.caption, fontWeight: '700' }}>{t('songContest', 'myEntryRemarkLabel')}</Text>
          <Text style={{ color: C.textMuted, fontFamily: fontRegular, ...typography.caption }}>{entry.admin_remarks}</Text>
        </View>
      )}
    </View>
  );
}

export default function SongContestDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { id } = route.params;
  const insets = useSafeAreaInsets();
  const { colors: C, spacing, radius, typography, shadow } = useTheme();
  const { lang, t } = useLanguage();
  const fontRegular = lang === 'od' ? 'NotoSansOriya' : undefined;
  const fontBold = lang === 'od' ? 'NotoSansOriya-Bold' : undefined;

  const [contest, setContest] = useState<SongContest | null>(null);
  const [myEntry, setMyEntry] = useState<SongContestEntry | null>(null);
  const [entries, setEntries] = useState<SongContestEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [contestData, myEntryData, entriesData] = await Promise.all([
        songContestApi.fetchContestById(id),
        songContestApi.fetchMyEntry(id),
        songContestApi.fetchEntries(id),
      ]);
      if (contestData.success) setContest(contestData.contest);
      if (myEntryData.success) setMyEntry(myEntryData.entry);
      if (entriesData.success) setEntries(entriesData.entries);
    } catch (e) {
      console.error('[SONG_CONTEST_DETAIL] Fetch failed:', e);
      Alert.alert(t('common', 'errorTitle'), t('songContest', 'detailLoadError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, t]);

  useEffect(() => { load(); }, [load]);
  // Refresh on return from registration or after liking/commenting on an entry
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const renderEntry = useCallback(({ item }: { item: SongContestEntry }) => (
    <TouchableOpacity
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        navigation.navigate('SongContestEntryDetail', { entry: item });
      }}
      style={{
        backgroundColor: C.card, borderColor: C.border, borderWidth: 1,
        borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadow.card,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: C.text, fontFamily: fontRegular, flex: 1, ...typography.bodyEmphasis }} numberOfLines={1}>{item.entry_name}</Text>
        {item.entry_type === 'group' && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Users size={12} color={C.textFaint} />
            <Text style={{ color: C.textFaint, ...typography.caption }}>{item.village}</Text>
          </View>
        )}
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.lg, marginTop: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Heart size={13} color={item.liked_by_me ? C.error : C.textFaint} fill={item.liked_by_me ? C.error : 'none'} />
          <Text style={{ color: C.textFaint, ...typography.caption }}>{item.like_count ?? 0}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <MessageCircle size={13} color={C.textFaint} />
          <Text style={{ color: C.textFaint, ...typography.caption }}>{item.comment_count ?? 0}</Text>
        </View>
      </View>
    </TouchableOpacity>
  ), [C, spacing, radius, typography, shadow, fontRegular, navigation]);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.goBack(); }} style={{ padding: spacing.xs, borderRadius: radius.full, backgroundColor: C.card }}>
          <ArrowLeft size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={{ color: C.text, fontFamily: fontBold, flex: 1, ...typography.heading }} numberOfLines={1}>{contest?.title || t('songContest', 'listTitle')}</Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : !contest ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl }}>
          <Text style={{ color: C.textMuted, textAlign: 'center', ...typography.body }}>{t('songContest', 'notFound')}</Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderEntry}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}
          ListHeaderComponent={
            <View style={{ marginBottom: spacing.lg }}>
              {!!contest.description && (
                <Text style={{ color: C.textMuted, fontFamily: fontRegular, marginBottom: spacing.md, ...typography.body, lineHeight: 22 }}>
                  {contest.description}
                </Text>
              )}
              {!!contest.rules && (
                <View style={{ backgroundColor: C.card, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.lg }}>
                  <Text style={{ color: C.textMuted, ...typography.label }}>{t('songContest', 'rulesLabel')}</Text>
                  <Text style={{ color: C.text, fontFamily: fontRegular, marginTop: spacing.xs, ...typography.caption }}>{contest.rules}</Text>
                </View>
              )}

              {myEntry ? (
                <MyEntryCard entry={myEntry} />
              ) : contest.status === 'active' ? (
                <TouchableOpacity
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.navigate('SongContestRegister', { contestId: id }); }}
                  style={{ backgroundColor: C.primary, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center', marginBottom: spacing.lg }}
                >
                  <Text style={{ color: '#fff', ...typography.bodyEmphasis, fontWeight: '700' }}>{t('songContest', 'registerButton')}</Text>
                </TouchableOpacity>
              ) : null}

              <Text style={{ color: C.textMuted, ...typography.label }}>{t('songContest', 'entriesLabel')}</Text>
            </View>
          }
          ListEmptyComponent={<EmptyState emoji="🎵" title={t('songContest', 'noEntriesYet')} subtitle="" />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={C.primary} colors={[C.primary]} progressBackgroundColor={C.card} />
          }
        />
      )}
    </View>
  );
}
