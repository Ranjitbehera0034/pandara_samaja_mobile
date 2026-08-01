// src/screens/community/LiveStreamScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { ArrowLeft, Radio, Users } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useSocket } from '../../hooks/useSocket';
import * as liveApi from '../../api/live';
import { LiveStream } from '../../api/live';
import Avatar from '../../components/common/Avatar';
import EmptyState from '../../components/common/EmptyState';
import Button from '../../components/common/Button';

export default function LiveStreamScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors: C, spacing, radius, typography, shadow } = useTheme();
  const { t } = useLanguage();

  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [starting, setStarting] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await liveApi.fetchActiveLiveStreams();
      if (res.success) setStreams(res.streams);
    } catch (e) {
      console.error('[LIVE] Failed to load active streams:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useSocket({
    onLiveStarted: () => load(),
    onLiveEnded: () => load(),
  });

  const handleGoLive = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('GoLive');
  };

  const handleWatch = (stream: LiveStream) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('LiveViewer', { roomName: stream.room_name });
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.goBack(); }} style={{ padding: spacing.xs, borderRadius: radius.full, backgroundColor: C.card }}>
          <ArrowLeft size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={{ color: C.text, ...typography.heading }}>{t('live', 'hubTitle')}</Text>
      </View>

      <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.md }}>
        <Button
          variant="primary"
          label={t('live', 'goLiveButton')}
          icon={<Radio size={18} color="#fff" />}
          onPress={handleGoLive}
          loading={starting}
        />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : (
        <View style={{ flex: 1, paddingHorizontal: spacing.lg }}>
          <FlatList
            data={streams}
            keyExtractor={(item) => item.room_name}
            ListEmptyComponent={
              <EmptyState emoji="📡" title={t('live', 'noLiveTitle')} subtitle={t('live', 'noLiveSubtitle')} />
            }
            contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={C.primary} colors={[C.primary]} progressBackgroundColor={C.card} />
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => handleWatch(item)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadow.card }}
              >
                <View>
                  <Avatar name={item.host_name || '?'} photoUrl={item.host_photo} size={48} />
                  <View style={{ position: 'absolute', bottom: -2, right: -2, backgroundColor: '#ef4444', borderRadius: radius.full, width: 14, height: 14, borderWidth: 2, borderColor: C.card }} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.text, ...typography.bodyEmphasis, fontWeight: '700' }} numberOfLines={1}>{item.host_name}</Text>
                  {!!item.title && <Text style={{ color: C.textMuted, ...typography.body }} numberOfLines={1}>{item.title}</Text>}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                  <Users size={14} color={C.textMuted} />
                  <Text style={{ color: C.textMuted, ...typography.caption }}>{item.peak_viewers}</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </View>
  );
}
