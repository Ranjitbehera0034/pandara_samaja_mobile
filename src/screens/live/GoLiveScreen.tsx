// src/screens/live/GoLiveScreen.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, TextInput, FlatList, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { X, Users, Send } from 'lucide-react-native';
import { Room, RoomEvent, LocalTrackPublication, Track } from 'livekit-client';
import { VideoTrack } from '@livekit/react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useSocket } from '../../hooks/useSocket';
import * as liveApi from '../../api/live';
import * as adminApi from '../../api/admin';

interface LiveComment {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  at: string;
}

export default function GoLiveScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const isAdmin = !!route.params?.isAdmin || route.name === 'AdminLive';
  const insets = useSafeAreaInsets();
  const { colors: C, spacing, radius, typography } = useTheme();
  const { t } = useLanguage();

  const [phase, setPhase] = useState<'starting' | 'live' | 'error'>('starting');
  const [errorMessage, setErrorMessage] = useState('');
  const [roomName, setRoomName] = useState<string | null>(null);
  const [localPub, setLocalPub] = useState<LocalTrackPublication | undefined>(undefined);
  const [viewerCount, setViewerCount] = useState(0);
  const [comments, setComments] = useState<LiveComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [ending, setEnding] = useState(false);

  const roomRef = useRef<Room | null>(null);
  const roomNameRef = useRef<string | null>(null);

  // Same reasoning as StoryCameraScreen — broadcasting your own camera is
  // one of the few flows where locking to portrait while active is
  // deliberate, not an oversight, even in an app that otherwise rotates
  // freely.
  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    return () => {
      ScreenOrientation.unlockAsync().catch(() => {});
    };
  }, []);

  const { joinLive, leaveLive, sendLiveComment } = useSocket(
    {
      onLiveComment: (c) => setComments(prev => [...prev.slice(-99), c]),
      onLiveViewerCount: ({ roomName: rn, count }) => {
        if (rn === roomNameRef.current) setViewerCount(count);
      },
    },
    { tokenType: isAdmin ? 'admin' : 'member' }
  );

  const cleanupRoom = useCallback(() => {
    roomRef.current?.disconnect().catch(() => {});
    roomRef.current = null;
    if (roomNameRef.current) leaveLive(roomNameRef.current);
  }, [leaveLive]);

  useEffect(() => {
    let cancelled = false;

    const go = async () => {
      try {
        const start = isAdmin ? adminApi.adminStartLiveStream : liveApi.startLiveStream;
        const res = await start();
        if (cancelled) return;
        if (!res.success) {
          setErrorMessage(res.message || t('live', 'startError'));
          setPhase('error');
          return;
        }

        const room = new Room();
        roomRef.current = room;
        roomNameRef.current = res.room.room_name;
        setRoomName(res.room.room_name);

        await room.connect(res.wsUrl, res.token);
        const pub = await room.localParticipant.setCameraEnabled(true);
        await room.localParticipant.setMicrophoneEnabled(true);
        if (cancelled) return;

        setLocalPub(pub);
        joinLive(res.room.room_name);
        setPhase('live');
      } catch (e: any) {
        if (cancelled) return;
        console.error('[GO_LIVE] Failed to start:', e);
        setErrorMessage(e.response?.data?.message || e.message || t('live', 'startError'));
        setPhase('error');
      }
    };

    go();

    return () => {
      cancelled = true;
      cleanupRoom();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEnd = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      t('live', 'confirmEndTitle'),
      t('live', 'confirmEndMessage'),
      [
        { text: t('common', 'cancel'), style: 'cancel' },
        {
          text: t('live', 'endButton'),
          style: 'destructive',
          onPress: async () => {
            if (!roomNameRef.current) return;
            setEnding(true);
            try {
              const end = isAdmin ? adminApi.adminEndLiveStream : liveApi.endLiveStream;
              await end(roomNameRef.current);
            } catch (e) {
              console.error('[GO_LIVE] End failed:', e);
            } finally {
              cleanupRoom();
              navigation.goBack();
            }
          },
        },
      ]
    );
  };

  const handleSendComment = () => {
    if (!commentText.trim() || !roomNameRef.current) return;
    sendLiveComment(roomNameRef.current, commentText.trim());
    setCommentText('');
  };

  const localTrackRef = localPub ? ({ participant: roomRef.current?.localParticipant, publication: localPub, source: Track.Source.Camera } as any) : undefined;

  if (phase === 'starting') {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', gap: spacing.md }}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={{ color: '#fff', ...typography.body }}>{t('live', 'startingLabel')}</Text>
      </View>
    );
  }

  if (phase === 'error') {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.lg }}>
        <Text style={{ color: '#fff', textAlign: 'center', ...typography.body }}>{errorMessage}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingHorizontal: spacing.xl, paddingVertical: spacing.md, backgroundColor: C.primary, borderRadius: radius.lg }}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>{t('common', 'back')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {localTrackRef && (
        <VideoTrack trackRef={localTrackRef} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} objectFit="cover" mirror />
      )}

      {/* Top bar */}
      <View style={{ position: 'absolute', top: insets.top + spacing.sm, left: spacing.lg, right: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: '#ef4444', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' }} />
          <Text style={{ color: '#fff', ...typography.caption, fontWeight: '800' }}>{t('live', 'liveLabel')}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full }}>
          <Users size={14} color="#fff" />
          <Text style={{ color: '#fff', ...typography.caption, fontWeight: '700' }}>{viewerCount}</Text>
        </View>
        <TouchableOpacity onPress={handleEnd} disabled={ending} style={{ backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: radius.full, padding: spacing.xs }}>
          {ending ? <ActivityIndicator size="small" color="#fff" /> : <X size={20} color="#fff" />}
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
