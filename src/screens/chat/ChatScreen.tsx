// src/screens/chat/ChatScreen.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  Modal,
  Animated,
  useWindowDimensions,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Search, Send, ArrowLeft, MessageSquare, Circle, Check, CheckCheck, Plus, MoreVertical, X } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { useSocket } from '../../hooks/useSocket';
import * as chatApi from '../../api/chat';
import { ChatContact, ChatPerson } from '../../api/chat';
import { cleanPhoto } from '../../utils/googleDriveUrl';
import { timeAgoShort } from '../../utils/feedUtils';
import SkeletonBox from '../../components/common/SkeletonBox';
import EmptyState from '../../components/common/EmptyState';
import Avatar from '../../components/common/Avatar';

// Chat identity is per-PERSON: a household (membership_no) can have several
// people — each with their own mobile — independently messaging others. A
// composite "membership_no:mobile" key is what actually identifies a thread.
const ckey = (membershipNo: string, mobile: string) => `${membershipNo}:${mobile}`;

interface ChatMessage {
  id: string;
  sender: 'me' | 'other';
  text: string;
  timestamp: string;
  read: boolean;
}

interface ChatThread {
  id: string; // ckey(membershipNo, mobile)
  membershipNo: string;
  mobile: string;
  name: string;
  relation: string;
  avatarUrl: string | null;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  online: boolean;
}

function mapContactToThread(c: ChatContact, online: boolean): ChatThread {
  return {
    id: ckey(c.contact_id, c.contact_mobile),
    membershipNo: c.contact_id,
    mobile: c.contact_mobile,
    name: c.contact_name,
    relation: c.contact_relation,
    avatarUrl: cleanPhoto(c.contact_avatar),
    lastMessage: c.last_message,
    timestamp: timeAgoShort(c.last_message_at),
    unreadCount: c.unread_count,
    online,
  };
}

function mapRowToMessage(row: chatApi.ChatMessageRow, myId: string, myMobile: string): ChatMessage {
  return {
    id: row.id,
    sender: row.sender_id === myId && row.sender_mobile === myMobile ? 'me' : 'other',
    text: row.content,
    timestamp: new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    read: row.read,
  };
}

function InboxSkeleton() {
  const { spacing } = useTheme();
  return (
    <View style={{ padding: spacing.lg, gap: spacing.lg }}>
      {[1, 2, 3, 4].map(i => (
        <View key={i} style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
          <SkeletonBox width={50} height={50} borderRadius={25} />
          <View style={{ flex: 1, gap: spacing.sm }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <SkeletonBox width="40%" height={14} />
              <SkeletonBox width="15%" height={10} />
            </View>
            <SkeletonBox width="75%" height={10} />
          </View>
        </View>
      ))}
    </View>
  );
}

// Bouncing typing indicator component
function TypingIndicator({ colors }: { colors: ReturnType<typeof useTheme>['colors'] }) {
  const { spacing, radius } = useTheme();
  const [dot1] = useState(new Animated.Value(0));
  const [dot2] = useState(new Animated.Value(0));
  const [dot3] = useState(new Animated.Value(0));

  useEffect(() => {
    const animateDot = (value: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(value, { toValue: -6, duration: 300, useNativeDriver: true }),
          Animated.timing(value, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.timing(value, { toValue: 0, duration: 600, useNativeDriver: true }),
        ])
      );
    };

    const anim1 = animateDot(dot1, 0);
    const anim2 = animateDot(dot2, 150);
    const anim3 = animateDot(dot3, 300);

    anim1.start();
    anim2.start();
    anim3.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  }, []);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.card, borderRadius: radius.lg, alignSelf: 'flex-start', marginLeft: 44, marginTop: spacing.xs }}>
      <Animated.View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.textMuted, transform: [{ translateY: dot1 }] }} />
      <Animated.View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.textMuted, transform: [{ translateY: dot2 }] }} />
      <Animated.View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.textMuted, transform: [{ translateY: dot3 }] }} />
    </View>
  );
}

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { width: W } = useWindowDimensions();
  const { lang, t } = useLanguage();
  const { colors: C, spacing, radius, typography, shadow } = useTheme();
  const { member, user } = useAuth();
  const { setUnreadCount } = useChat();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const myId = member?.membership_no;
  const myMobile = user?.mobile || member?.mobile;

  const [search, setSearch] = useState('');
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const [blockedSet, setBlockedSet] = useState<Set<string>>(new Set());

  const [activeThread, setActiveThread] = useState<ChatThread | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const [composeVisible, setComposeVisible] = useState(false);
  const [composeQuery, setComposeQuery] = useState('');
  const [composeResults, setComposeResults] = useState<ChatPerson[]>([]);
  const [composeLoading, setComposeLoading] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const activeThreadIdRef = useRef<string | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const composeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    activeThreadIdRef.current = activeThread?.id ?? null;
  }, [activeThread?.id]);

  // Keep the Chat tab badge in sync with the live inbox once it's loaded
  useEffect(() => {
    setUnreadCount(threads.reduce((sum, th) => sum + th.unreadCount, 0));
  }, [threads, setUnreadCount]);

  const loadContacts = useCallback(async () => {
    try {
      const [contactsRes, blockedRes] = await Promise.all([
        chatApi.fetchContacts(),
        chatApi.fetchBlocked().catch(() => ({ success: false, blocked: [] as any[] })),
      ]);
      if (contactsRes.success) {
        setThreads(contactsRes.contacts.map(c => mapContactToThread(c, onlineIds.has(ckey(c.contact_id, c.contact_mobile)))));
      }
      if (blockedRes.success) {
        setBlockedSet(new Set(blockedRes.blocked.map(b => ckey(b.blocked_membership_no, b.blocked_mobile))));
      }
    } catch (e) {
      console.error('[CHAT] Failed to load contacts:', e);
      Alert.alert(t('common', 'errorTitle'), t('chat', 'loadError'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Bottom-tab screens stay mounted across tab switches, so a plain mount
  // effect only ever fetches once — going Home and back to Messages would
  // keep showing whatever was loaded at the very first visit. Refetching
  // on every focus is what makes "go away and come back" actually show
  // new messages, matching what every other chat app does.
  useFocusEffect(
    useCallback(() => {
      loadContacts();
    }, [loadContacts])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadContacts();
    setRefreshing(false);
  }, [loadContacts]);

  const openThread = useCallback(async (thread: ChatThread) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveThread(thread);
    setThreads(prev => {
      const idx = prev.findIndex(t2 => t2.id === thread.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], unreadCount: 0 };
        return next;
      }
      return [{ ...thread, unreadCount: 0 }, ...prev];
    });
    setMessagesLoading(true);
    setMessages([]);
    try {
      const data = await chatApi.fetchConversation(thread.membershipNo, thread.mobile);
      if (data.success && myId && myMobile) {
        setMessages(data.messages.map(row => mapRowToMessage(row, myId, myMobile)));
      }
    } catch (e) {
      console.error('[CHAT] Failed to load conversation:', e);
    } finally {
      setMessagesLoading(false);
    }
  }, [myId, myMobile]);

  // Deep-link into a thread from the member directory
  // (navigation.navigate('Chat', { withId, withMobile, withName }))
  useEffect(() => {
    const withId = route.params?.withId;
    const withMobile = route.params?.withMobile;
    const withName = route.params?.withName;
    if (!withId || !withMobile || loading) return;

    const key = ckey(withId, withMobile);
    const existing = threads.find(t2 => t2.id === key);
    if (existing) {
      openThread(existing);
    } else {
      openThread({
        id: key, membershipNo: withId, mobile: withMobile,
        name: withName || withId, relation: 'Head', avatarUrl: null,
        lastMessage: '', timestamp: '', unreadCount: 0, online: onlineIds.has(key),
      });
    }
    navigation.setParams({ withId: undefined, withMobile: undefined, withName: undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.params?.withId, route.params?.withMobile, loading]);

  const { joinChat, sendMessage, typingStart, typingStop } = useSocket({
    onReceiveMessage: (msg) => {
      handleIncomingMessage(msg);
    },
    onMessageSent: (msg) => {
      handleIncomingMessage(msg);
    },
    onMessageError: (data) => {
      Alert.alert(t('common', 'errorTitle'), data?.error || t('chat', 'sendError'));
    },
    onTypingStart: ({ senderId, senderMobile }) => {
      if (senderMobile && ckey(senderId, senderMobile) === activeThreadIdRef.current) setIsTyping(true);
    },
    onTypingStop: ({ senderId, senderMobile }) => {
      if (senderMobile && ckey(senderId, senderMobile) === activeThreadIdRef.current) setIsTyping(false);
    },
    onMessagesRead: ({ readerId, readerMobile }) => {
      if (readerMobile && ckey(readerId, readerMobile) === activeThreadIdRef.current) {
        setMessages(prev => prev.map(m => (m.sender === 'me' ? { ...m, read: true } : m)));
      }
    },
    onUserOnline: ({ userId, mobile }) => {
      const key = mobile ? ckey(userId, mobile) : userId;
      setOnlineIds(prev => new Set(prev).add(key));
      setThreads(prev => prev.map(t2 => (t2.id === key ? { ...t2, online: true } : t2)));
      setActiveThread(prev => (prev && prev.id === key ? { ...prev, online: true } : prev));
    },
    onUserOffline: ({ userId, mobile }) => {
      const key = mobile ? ckey(userId, mobile) : userId;
      setOnlineIds(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
      setThreads(prev => prev.map(t2 => (t2.id === key ? { ...t2, online: false } : t2)));
      setActiveThread(prev => (prev && prev.id === key ? { ...prev, online: false } : prev));
    },
  });

  const handleIncomingMessage = useCallback((msg: any) => {
    if (!myId || !myMobile) return;
    const myKey = ckey(myId, myMobile);
    const senderKey = ckey(msg.senderId, msg.senderMobile);
    const receiverKey = ckey(msg.receiverId, msg.receiverMobile);
    const isFromOther = senderKey !== myKey;
    const otherKey = isFromOther ? senderKey : receiverKey;
    const otherMembershipNo = isFromOther ? msg.senderId : msg.receiverId;
    const otherMobile = isFromOther ? msg.senderMobile : msg.receiverMobile;

    if (otherKey === activeThreadIdRef.current) {
      setMessages(prev => (prev.some(m => m.id === msg.id) ? prev : [...prev, mapRowToMessage({
        id: msg.id, sender_id: msg.senderId, sender_mobile: msg.senderMobile,
        receiver_id: msg.receiverId, receiver_mobile: msg.receiverMobile,
        content: msg.content, type: msg.type, read: msg.read, created_at: msg.timestamp,
      }, myId, myMobile)]));
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      if (isFromOther) setIsTyping(false);
    }

    setThreads(prev => {
      const idx = prev.findIndex(t2 => t2.id === otherKey);
      const bump: ChatThread = {
        id: otherKey,
        membershipNo: otherMembershipNo,
        mobile: otherMobile,
        name: idx >= 0 ? prev[idx].name : (msg.senderName || otherMembershipNo),
        relation: idx >= 0 ? prev[idx].relation : 'Head',
        avatarUrl: idx >= 0 ? prev[idx].avatarUrl : cleanPhoto(msg.senderAvatar),
        lastMessage: msg.content,
        timestamp: timeAgoShort(msg.timestamp),
        unreadCount: isFromOther && otherKey !== activeThreadIdRef.current ? (idx >= 0 ? prev[idx].unreadCount + 1 : 1) : (idx >= 0 ? prev[idx].unreadCount : 0),
        online: idx >= 0 ? prev[idx].online : onlineIds.has(otherKey),
      };
      const rest = prev.filter(t2 => t2.id !== otherKey);
      return [bump, ...rest];
    });
  }, [myId, myMobile, onlineIds]);

  useEffect(() => {
    if (myId) joinChat(myId);
  }, [myId, joinChat]);

  const handleThreadPress = (thread: ChatThread) => openThread(thread);

  const handleCloseThread = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (activeThread) typingStop(activeThread.membershipNo, activeThread.mobile);
    setActiveThread(null);
    setIsTyping(false);
  };

  const handleTextChange = (value: string) => {
    setMessageText(value);
    if (!activeThread) return;
    typingStart(activeThread.membershipNo, activeThread.mobile);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => typingStop(activeThread.membershipNo, activeThread.mobile), 2000);
  };

  const isActiveThreadBlocked = !!activeThread && blockedSet.has(activeThread.id);

  const handleSendMessage = () => {
    if (!messageText.trim() || !activeThread || isActiveThreadBlocked) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    sendMessage(activeThread.membershipNo, activeThread.mobile, messageText.trim());
    setMessageText('');
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingStop(activeThread.membershipNo, activeThread.mobile);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const handleBlockToggle = async () => {
    if (!activeThread) return;
    const wasBlocked = isActiveThreadBlocked;
    try {
      if (wasBlocked) {
        await chatApi.unblockPerson(activeThread.membershipNo, activeThread.mobile);
        setBlockedSet(prev => {
          const next = new Set(prev);
          next.delete(activeThread.id);
          return next;
        });
      } else {
        await chatApi.blockPerson(activeThread.membershipNo, activeThread.mobile);
        setBlockedSet(prev => new Set(prev).add(activeThread.id));
      }
    } catch (e) {
      Alert.alert(t('common', 'errorTitle'), t('chat', 'sendError'));
    }
  };

  const handleReport = async () => {
    if (!activeThread) return;
    try {
      await chatApi.reportPerson(activeThread.membershipNo, activeThread.mobile);
      Alert.alert(t('chat', 'reportSentTitle'), t('chat', 'reportSentBody'));
    } catch (e) {
      Alert.alert(t('common', 'errorTitle'), t('chat', 'sendError'));
    }
  };

  const handleThreadOptions = () => {
    if (!activeThread) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      activeThread.name,
      undefined,
      [
        { text: isActiveThreadBlocked ? t('chat', 'unblock') : t('chat', 'block'), style: 'destructive', onPress: handleBlockToggle },
        { text: t('chat', 'report'), onPress: () => {
          Alert.alert(t('chat', 'reportConfirmTitle'), t('chat', 'reportConfirmBody'), [
            { text: t('chat', 'report'), style: 'destructive', onPress: handleReport },
            { text: t('common', 'cancel'), style: 'cancel' },
          ]);
        } },
        { text: t('common', 'cancel'), style: 'cancel' },
      ]
    );
  };

  const openCompose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setComposeQuery('');
    setComposeResults([]);
    setComposeVisible(true);
  };

  const handleComposeQueryChange = (value: string) => {
    setComposeQuery(value);
    if (composeDebounceRef.current) clearTimeout(composeDebounceRef.current);
    if (!value.trim()) {
      setComposeResults([]);
      setComposeLoading(false);
      return;
    }
    setComposeLoading(true);
    composeDebounceRef.current = setTimeout(async () => {
      try {
        const data = await chatApi.searchChatMembers(value.trim());
        if (data.success) setComposeResults(data.members);
      } catch (e) {
        console.error('[CHAT] search failed:', e);
      } finally {
        setComposeLoading(false);
      }
    }, 300);
  };

  const handlePickPerson = (person: ChatPerson) => {
    setComposeVisible(false);
    const key = ckey(person.membership_no, person.mobile);
    const existing = threads.find(t2 => t2.id === key);
    if (existing) {
      openThread(existing);
    } else {
      openThread({
        id: key, membershipNo: person.membership_no, mobile: person.mobile,
        name: person.name, relation: person.relation, avatarUrl: cleanPhoto(person.profile_photo_url),
        lastMessage: '', timestamp: '', unreadCount: 0, online: onlineIds.has(key),
      });
    }
  };

  const handlePickRecent = (thread: ChatThread) => {
    setComposeVisible(false);
    openThread(thread);
  };

  const filteredThreads = threads.filter(t2 =>
    t2.name.toLowerCase().includes(search.toLowerCase()) ||
    t2.lastMessage.toLowerCase().includes(search.toLowerCase())
  );

  const recentSuggestions = threads.slice(0, 8);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md + 2,
        backgroundColor: C.card,
        borderBottomWidth: 1,
        borderBottomColor: C.border,
      }}>
        <Text style={{ color: C.text, fontSize: typography.heading.fontSize, lineHeight: typography.heading.lineHeight, fontWeight: typography.heading.fontWeight, fontFamily: lang === 'od' ? 'NotoSansOriya-Bold' : undefined }}>
          {t('chat', 'title')}
        </Text>
        <TouchableOpacity onPress={openCompose} style={{ width: 36, height: 36, borderRadius: radius.full, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' }}>
          <Plus size={20} color="white" />
        </TouchableOpacity>
      </View>

      {/* Inbox view */}
      <View style={{ flex: 1 }}>
        {/* Search */}
        <View style={{ padding: spacing.lg }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: C.card,
            borderRadius: radius.md,
            paddingHorizontal: spacing.md,
            height: 44,
            borderWidth: 1,
            borderColor: C.border,
          }}>
            <Search size={16} color={C.textMuted} style={{ marginRight: spacing.sm }} />
            <TextInput
              placeholder={t('chat', 'searchPlaceholder')}
              placeholderTextColor={C.textFaint}
              value={search}
              onChangeText={setSearch}
              style={{ flex: 1, color: C.text, fontSize: typography.body.fontSize, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined }}
            />
          </View>
        </View>

        {loading ? (
          <InboxSkeleton />
        ) : filteredThreads.length === 0 ? (
          <EmptyState
            emoji="💬"
            title={t('chat', 'noConversationsTitle')}
            subtitle={t('chat', 'noConversationsSubtitle')}
          />
        ) : (
          <FlatList
            data={filteredThreads}
            keyExtractor={item => item.id}
            contentContainerStyle={{ paddingHorizontal: spacing.lg }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.primary} colors={[C.primary]} />
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => handleThreadPress(item)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: spacing.md + 2,
                  borderBottomWidth: 0.5,
                  borderBottomColor: C.border,
                }}
              >
                {/* Avatar with Online indicator */}
                <View style={{ marginRight: spacing.md }}>
                  <Avatar name={item.name} photoUrl={item.avatarUrl} size={50} showOnlineDot={item.online} />
                </View>

                {/* Info */}
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={{ color: C.text, fontSize: typography.label.fontSize, lineHeight: typography.label.lineHeight, fontWeight: typography.label.fontWeight }}>
                      {item.name}{item.relation !== 'Head' ? ` · ${item.relation}` : ''}
                    </Text>
                    <Text style={{ color: C.textFaint, fontSize: typography.caption.fontSize, lineHeight: typography.caption.lineHeight }}>{item.timestamp}</Text>
                  </View>
                  <Text
                    numberOfLines={1}
                    style={{
                      color: item.unreadCount > 0 ? C.text : C.textMuted,
                      fontSize: typography.body.fontSize,
                      lineHeight: typography.body.lineHeight,
                      fontWeight: item.unreadCount > 0 ? '600' : '400'
                    }}
                  >
                    {item.lastMessage}
                  </Text>
                </View>

                {/* Unread badge */}
                {item.unreadCount > 0 && (
                  <View style={{
                    backgroundColor: C.primary,
                    borderRadius: radius.full,
                    minWidth: 20,
                    height: 20,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginLeft: spacing.sm + 2,
                    paddingHorizontal: spacing.xs,
                  }}>
                    <Text style={{ color: 'white', fontSize: typography.caption.fontSize - 2, fontWeight: '700' }}>
                      {item.unreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
          />
        )}
      </View>

      {/* New Message compose modal */}
      <Modal visible={composeVisible} animationType="slide" onRequestClose={() => setComposeVisible(false)}>
        <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
          <View style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
            borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.card,
          }}>
            <Text style={{ color: C.text, fontSize: typography.label.fontSize, fontWeight: '700' }}>{t('chat', 'newMessage')}</Text>
            <TouchableOpacity onPress={() => setComposeVisible(false)} style={{ padding: spacing.xs }}>
              <X size={20} color={C.text} />
            </TouchableOpacity>
          </View>

          <View style={{ padding: spacing.lg }}>
            <View style={{
              flexDirection: 'row', alignItems: 'center', backgroundColor: C.card,
              borderRadius: radius.md, paddingHorizontal: spacing.md, height: 44,
              borderWidth: 1, borderColor: C.border,
            }}>
              <Search size={16} color={C.textMuted} style={{ marginRight: spacing.sm }} />
              <TextInput
                autoFocus
                placeholder={t('chat', 'composeSearchPlaceholder')}
                placeholderTextColor={C.textFaint}
                value={composeQuery}
                onChangeText={handleComposeQueryChange}
                style={{ flex: 1, color: C.text, fontSize: typography.body.fontSize, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined }}
              />
            </View>
          </View>

          {!composeQuery.trim() ? (
            <>
              {recentSuggestions.length > 0 && (
                <Text style={{ color: C.textMuted, fontSize: typography.caption.fontSize, fontWeight: '700', paddingHorizontal: spacing.lg, marginBottom: spacing.sm }}>
                  {t('chat', 'recentContacts')}
                </Text>
              )}
              <FlatList
                data={recentSuggestions}
                keyExtractor={item => item.id}
                contentContainerStyle={{ paddingHorizontal: spacing.lg }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => handlePickRecent(item)}
                    style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm + 2 }}
                  >
                    <Avatar name={item.name} photoUrl={item.avatarUrl} size={42} />
                    <View style={{ marginLeft: spacing.md }}>
                      <Text style={{ color: C.text, fontSize: typography.body.fontSize, fontWeight: '600' }}>{item.name}</Text>
                      {item.relation !== 'Head' && (
                        <Text style={{ color: C.textMuted, fontSize: typography.caption.fontSize }}>{item.relation}</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                )}
              />
            </>
          ) : composeLoading ? (
            <View style={{ padding: spacing.lg }}><SkeletonBox width="100%" height={14} /></View>
          ) : composeResults.length === 0 ? (
            <EmptyState emoji="🔍" title={t('chat', 'noResultsTitle')} subtitle={t('chat', 'noResultsSubtitle')} />
          ) : (
            <FlatList
              data={composeResults}
              keyExtractor={item => ckey(item.membership_no, item.mobile)}
              contentContainerStyle={{ paddingHorizontal: spacing.lg }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => handlePickPerson(item)}
                  style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm + 2 }}
                >
                  <Avatar name={item.name} photoUrl={cleanPhoto(item.profile_photo_url)} size={42} />
                  <View style={{ marginLeft: spacing.md, flex: 1 }}>
                    <Text style={{ color: C.text, fontSize: typography.body.fontSize, fontWeight: '600' }}>{item.name}</Text>
                    <Text style={{ color: C.textMuted, fontSize: typography.caption.fontSize }}>
                      {item.relation !== 'Head' ? `${item.relation} · ` : ''}{item.village || item.mobile}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </Modal>

      {/* Direct Message conversation Detail Modal */}
      {activeThread && (
        <Modal
          visible={!!activeThread}
          animationType="slide"
          onRequestClose={handleCloseThread}
        >
          <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top, paddingBottom: insets.bottom }}>
            {/* Header */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.md,
              borderBottomWidth: 1,
              borderBottomColor: C.border,
              backgroundColor: C.card,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2, flex: 1 }}>
                <TouchableOpacity onPress={handleCloseThread} style={{ padding: spacing.xs }}>
                  <ArrowLeft size={20} color={C.text} />
                </TouchableOpacity>

                <Avatar name={activeThread.name} photoUrl={activeThread.avatarUrl} size={40} showOnlineDot={activeThread.online} />

                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.text, fontSize: typography.label.fontSize, lineHeight: typography.label.lineHeight, fontWeight: typography.label.fontWeight }} numberOfLines={1}>
                    {activeThread.name}{activeThread.relation !== 'Head' ? ` · ${activeThread.relation}` : ''}
                  </Text>
                  <Text style={{ color: isActiveThreadBlocked ? C.error : C.success, fontSize: typography.caption.fontSize, lineHeight: typography.caption.lineHeight, fontWeight: '600' }}>
                    {isActiveThreadBlocked ? t('chat', 'blocked') : (activeThread.online ? t('chat', 'online') : t('chat', 'offline'))}
                  </Text>
                </View>
              </View>

              <TouchableOpacity onPress={handleThreadOptions} style={{ padding: spacing.xs }}>
                <MoreVertical size={20} color={C.text} />
              </TouchableOpacity>
            </View>

            {/* Message Area wrapped in KeyboardAvoidingView */}
            <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 44 : 0}
            >
              {/* Message List */}
              {messagesLoading ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <SkeletonBox width="60%" height={14} />
                </View>
              ) : (
                <FlatList
                  ref={flatListRef}
                  data={messages}
                  keyExtractor={item => item.id}
                  contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
                  onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                  renderItem={({ item }) => {
                    const isMe = item.sender === 'me';
                    return (
                      <View style={{
                        flexDirection: 'row',
                        justifyContent: isMe ? 'flex-end' : 'flex-start',
                        alignItems: 'flex-end',
                        gap: spacing.sm,
                      }}>
                        {/* Avatar for received messages ONLY */}
                        {!isMe && (
                          <Avatar name={activeThread.name} photoUrl={activeThread.avatarUrl} size={28} />
                        )}

                        <View style={{
                          maxWidth: W * 0.7,
                          backgroundColor: isMe ? C.primary : C.card,
                          paddingHorizontal: spacing.md + 2,
                          paddingVertical: spacing.sm + 2,
                          borderRadius: radius.xl - 2,
                          borderTopRightRadius: isMe ? 2 : radius.xl - 2,
                          borderTopLeftRadius: isMe ? radius.xl - 2 : 2,
                          borderWidth: isMe ? 0 : 1,
                          borderColor: C.border,
                        }}>
                          <Text style={{ color: isMe ? '#fff' : C.text, fontSize: typography.body.fontSize, lineHeight: typography.body.lineHeight }}>
                            {item.text}
                          </Text>

                          <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            marginTop: spacing.xs,
                            gap: spacing.xs
                          }}>
                            <Text style={{ color: isMe ? 'rgba(255, 255, 255, 0.6)' : C.textMuted, fontSize: typography.caption.fontSize - 2 }}>
                              {item.timestamp}
                            </Text>
                            {isMe && (
                              item.read
                                ? <CheckCheck size={16} color="rgba(255, 255, 255, 0.8)" />
                                : <Check size={16} color="rgba(255, 255, 255, 0.6)" />
                            )}
                          </View>
                        </View>
                      </View>
                    );
                  }}
                  ListFooterComponent={() => (
                    isTyping ? <TypingIndicator colors={C} /> : null
                  )}
                />
              )}

              {/* Chat Input Bar (or a blocked banner) */}
              {isActiveThreadBlocked ? (
                <View style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
                  backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.border,
                }}>
                  <Text style={{ color: C.textMuted, fontSize: typography.body.fontSize, flex: 1 }}>
                    {t('chat', 'youBlockedThisPerson')}
                  </Text>
                  <TouchableOpacity onPress={handleBlockToggle}>
                    <Text style={{ color: C.primary, fontSize: typography.body.fontSize, fontWeight: '700' }}>{t('chat', 'unblock')}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: spacing.lg,
                  paddingVertical: spacing.sm,
                  backgroundColor: C.card,
                  borderTopWidth: 1,
                  borderTopColor: C.border,
                }}>
                  <TextInput
                    placeholder={t('chat', 'messagePlaceholder')}
                    placeholderTextColor={C.textFaint}
                    value={messageText}
                    onChangeText={handleTextChange}
                    style={{
                      flex: 1,
                      color: C.text,
                      backgroundColor: C.bg,
                      borderRadius: radius.xl,
                      paddingHorizontal: spacing.lg,
                      paddingVertical: Platform.OS === 'ios' ? spacing.sm + 2 : spacing.sm - 2,
                      marginRight: spacing.sm + 2,
                      fontSize: typography.body.fontSize,
                      borderWidth: 1,
                      borderColor: C.border,
                      fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined,
                    }}
                  />

                  <TouchableOpacity
                    onPress={handleSendMessage}
                    disabled={!messageText.trim()}
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: radius.full,
                      backgroundColor: messageText.trim() ? C.primary : C.border,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Send size={16} color="white" />
                  </TouchableOpacity>
                </View>
              )}
            </KeyboardAvoidingView>
          </View>
        </Modal>
      )}
    </View>
  );
}
