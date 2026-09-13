// src/screens/community/SongContestScreen.tsx
// Song Competition — list of visible (non-draft) contests.
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as songContestApi from '../../api/songContest';
import { SongContest } from '../../api/songContest';
import EmptyState from '../../components/common/EmptyState';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

export default function SongContestScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors: C, spacing, radius, typography, shadow } = useTheme();
  const { lang, t } = useLanguage();
  const fontRegular = lang === 'od' ? 'NotoSansOriya' : undefined;
  const fontBold = lang === 'od' ? 'NotoSansOriya-Bold' : undefined;

  const [contests, setContests] = useState<SongContest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const data = await songContestApi.fetchContests();
      if (data.success) setContests(data.contests);
    } catch (e) {
      console.error('[SONG_CONTEST] Fetch failed:', e);
      Alert.alert(t('common', 'errorTitle'), t('songContest', 'loadError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  const renderContest = useCallback(({ item }: { item: SongContest }) => (
    <TouchableOpacity
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        navigation.navigate('SongContestDetail', { id: item.id });
      }}
      style={{
        backgroundColor: C.card, borderColor: C.border, borderWidth: 1,
        borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadow.card,
      }}
    >
      <Text style={{
        alignSelf: 'flex-start', color: item.status === 'active' ? C.success : C.textMuted,
        backgroundColor: (item.status === 'active' ? C.success : C.textMuted) + '15',
        borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 3,
        ...typography.caption, fontWeight: '700',
      }}>
        {item.status === 'active' ? t('songContest', 'statusActive') : t('songContest', 'statusClosed')}
      </Text>
      <Text style={{ color: C.text, fontFamily: fontBold, marginTop: spacing.sm, ...typography.bodyEmphasis }}>{item.title}</Text>
      {!!item.description && (
        <Text style={{ color: C.textMuted, fontFamily: fontRegular, marginTop: 2, ...typography.caption }} numberOfLines={2}>
          {item.description}
        </Text>
      )}
    </TouchableOpacity>
  ), [C, spacing, radius, typography, shadow, fontBold, fontRegular, t, navigation]);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.goBack(); }} style={{ padding: spacing.xs, borderRadius: radius.full, backgroundColor: C.card }}>
          <ArrowLeft size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={{ color: C.text, fontFamily: fontBold, flex: 1, ...typography.heading }}>{t('songContest', 'listTitle')}</Text>
      </View>

      <Text style={{ color: C.textMuted, fontFamily: fontRegular, paddingHorizontal: spacing.lg, marginBottom: spacing.md, ...typography.caption }}>
        {t('songContest', 'listSubtitle')}
      </Text>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : (
        <FlatList
          data={contests}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderContest}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + spacing.xl, flexGrow: 1 }}
          ListEmptyComponent={<EmptyState emoji="🎤" title={t('songContest', 'emptyTitle')} subtitle={t('songContest', 'emptySubtitle')} />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={C.primary} colors={[C.primary]} progressBackgroundColor={C.card} />
          }
        />
      )}
    </View>
  );
}
