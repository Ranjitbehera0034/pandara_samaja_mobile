// src/screens/live/LiveViewerScreen.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, TextInput, FlatList, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { X, Users, Send } from 'lucide-react-native';
import { Room, RoomEvent, RemoteTrackPublication, RemoteParticipant, Track } from 'livekit-client';
import { VideoTrack } from '@livekit/react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useSocket } from '../../hooks/useSocket';
import * as liveApi from '../../api/live';

interface LiveComment {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  at: string;
}

export default function LiveViewerScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const roomName: string = route.params?.roomName;
  const insets = useSafeAreaInsets();
  const { colors: C, spacing, radius, typography } = useTheme();
  const { t } = useLanguage();

  const [phase, setPhase] = useState<'joining' | 'live' | 'ended' | 'error'>('joining');
  const [errorMessage, setErrorMessage] = useState('');
  const [hostName, setHostName] = useState<string | null>(null);
  const [remoteTrackRef, setRemoteTrackRef] = useState<any>(undefined);
  const [viewerCount, setViewerCount] = useState(0);
  const [comments, setComments] = useState<LiveComment[]>([]);
  const [commentText, setCommentText] = useState('');

  const roomRef = useRef<Room | null>(null);

  const { joinLive, leaveLive, sendLiveComment } = useSocket({
    onLiveComment: (c) => setComments(prev => [...prev.slice(-99), c]),
    onLiveViewerCount: ({ roomName: rn, count }) => {
      if (rn === roomName) setViewerCount(count);
    },
    onLiveEnded: ({ roomName: rn }) => {
      if (rn === roomName) setPhase('ended');
    },
  });

  const cleanup = useCallback(() => {
    roomRef.current?.disconnect().catch(() => {});
    roomRef.current = null;
    leaveLive(roomName);
  }, [leaveLive, roomName]);

  useEffect(() => {
    let cancelled = false;

    const go = async () => {
      try {
        const res = await liveApi.fetchLiveViewerToken(roomName);
        if (cancelled) return;
        if (!res.success) {
          setErrorMessage(res.message || t('live', 'joinError'));
          setPhase('error');
          return;
        }
        setHostName(res.room.host_name);

        const room = new Room();
        roomRef.current = room;

        room.on(RoomEvent.TrackSubscribed, (_track, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
          if (publication.source === Track.Source.Camera) {
            setRemoteTrackRef({ participant, publication, source: Track.Source.Camera } as any);
          }
        });
        room.on(RoomEvent.Disconnected, () => {
          setPhase((p) => (p === 'live' ? 'ended' : p));
        });

        await room.connect(res.wsUrl, res.token);
        if (cancelled) return;

        joinLive(roomName);
        setPhase('live');
      } catch (e: any) {
        if (cancelled) return;
        console.error('[LIVE_VIEWER] Failed to join:', e);
        setErrorMessage(e.response?.data?.message || e.message || t('live', 'joinError'));
        setPhase('error');
      }
    };

    go();

    return () => {
      cancelled = true;
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomName]);

  const handleLeave = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    cleanup();
    navigation.goBack();
  };

  const handleSendComment = () => {
    if (!commentText.trim()) return;
    sendLiveComment(roomName, commentText.trim());
    setCommentText('');
  };

  if (phase === 'joining') {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', gap: spacing.md }}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={{ color: '#fff', ...typography.body }}>{t('live', 'joiningLabel')}</Text>
      </View>
    );
  }

  if (phase === 'error' || phase === 'ended') {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.lg }}>
        <Text style={{ color: '#fff', textAlign: 'center', ...typography.body }}>
          {phase === 'ended' ? t('live', 'streamEndedMessage') : errorMessage}
        </Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingHorizontal: spacing.xl, paddingVertical: spacing.md, backgroundColor: C.primary, borderRadius: radius.lg }}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>{t('common', 'back')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {remoteTrackRef ? (
        <VideoTrack trackRef={remoteTrackRef} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} objectFit="cover" />
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      )}

      {/* Top bar */}
      <View style={{ position: 'absolute', top: insets.top + spacing.sm, left: spacing.lg, right: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444' }} />
          <Text style={{ color: '#fff', ...typography.caption, fontWeight: '700' }} numberOfLines={1}>{hostName || t('live', 'liveLabel')}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full }}>
          <Users size={14} color="#fff" />
          <Text style={{ color: '#fff', ...typography.caption, fontWeight: '700' }}>{viewerCount}</Text>
        </View>
        <TouchableOpacity onPress={handleLeave} style={{ backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: radius.full, padding: spacing.xs }}>
          <X size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Live comments overlay */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}
      >
        <FlatList
          data={comments}
          keyExtractor={(item) => item.id}
          inverted
          style={{ maxHeight: 220, paddingHorizontal: spacing.lg }}
          contentContainerStyle={{ paddingBottom: spacing.sm }}
          renderItem={({ item }) => (
            <View style={{ flexDirection: 'row', marginBottom: spacing.xs }}>
              <Text style={{ color: '#fff', ...typography.caption }}>
                <Text style={{ fontWeight: '800' }}>{item.senderName}  </Text>
                {item.text}
              </Text>
            </View>
          )}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.lg, paddingBottom: insets.bottom + spacing.sm }}>
          <TextInput
            value={commentText}
            onChangeText={setCommentText}
            placeholder={t('live', 'commentPlaceholder')}
            placeholderTextColor="rgba(255,255,255,0.6)"
            style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: radius.full, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, color: '#fff' }}
            onSubmitEditing={handleSendComment}
          />
          <TouchableOpacity onPress={handleSendComment} style={{ backgroundColor: C.primary, borderRadius: radius.full, padding: spacing.sm + 2 }}>
            <Send size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
