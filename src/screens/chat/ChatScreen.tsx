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
  Dimensions,
  Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Search, Send, ArrowLeft, MessageSquare, Circle, Check, CheckCheck } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../hooks/useSocket';
import * as chatApi from '../../api/chat';
import { ChatContact } from '../../api/chat';
import { cleanPhoto } from '../../utils/googleDriveUrl';
import { timeAgoShort } from '../../utils/feedUtils';
import SkeletonBox from '../../components/common/SkeletonBox';
import EmptyState from '../../components/common/EmptyState';
import Avatar from '../../components/common/Avatar';

const { width: W } = Dimensions.get('window');

interface ChatMessage {
  id: string;
  sender: 'me' | 'other';
  text: string;
  timestamp: string;
  read: boolean;
}

interface ChatThread {
  id: string;
  name: string;
  avatarUrl: string | null;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  online: boolean;
}

function mapContactToThread(c: ChatContact, online: boolean): ChatThread {
  return {
    id: c.contact_id,
    name: c.contact_name,
    avatarUrl: cleanPhoto(c.contact_avatar),
    lastMessage: c.last_message,
    timestamp: timeAgoShort(c.last_message_at),
    unreadCount: c.unread_count,
    online,
  };
}

function mapRowToMessage(row: chatApi.ChatMessageRow, myId: string): ChatMessage {
  return {
    id: row.id,
    sender: row.sender_id === myId ? 'me' : 'other',
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
  const { lang, t } = useLanguage();
  const { colors: C, spacing, radius, typography, shadow } = useTheme();
  const { member } = useAuth();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const myId = member?.membership_no;

  const [search, setSearch] = useState('');
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());

  const [activeThread, setActiveThread] = useState<ChatThread | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const activeThreadIdRef = useRef<string | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    activeThreadIdRef.current = activeThread?.id ?? null;
  }, [activeThread?.id]);

  const loadContacts = useCallback(async () => {
    try {
      const data = await chatApi.fetchContacts();
      if (data.success) {
        setThreads(data.contacts.map(c => mapContactToThread(c, onlineIds.has(c.contact_id))));
      }
    } catch (e) {
      console.error('[CHAT] Failed to load contacts:', e);
      Alert.alert(t('common', 'errorTitle'), t('chat', 'loadError'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const openThread = useCallback(async (thread: ChatThread) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveThread(thread);
    setThreads(prev => prev.map(t2 => (t2.id === thread.id ? { ...t2, unreadCount: 0 } : t2)));
    setMessagesLoading(true);
    setMessages([]);
    try {
      const data = await chatApi.fetchConversation(thread.id);
      if (data.success && myId) {
        setMessages(data.messages.map(row => mapRowToMessage(row, myId)));
      }
    } catch (e) {
      console.error('[CHAT] Failed to load conversation:', e);
    } finally {
      setMessagesLoading(false);
    }
  }, [myId]);

  // Deep-link into a thread from the member directory (navigation.navigate('Chat', { withId, withName }))
  useEffect(() => {
    const withId = route.params?.withId;
    const withName = route.params?.withName;
    if (!withId || loading) return;

    const existing = threads.find(t2 => t2.id === withId);
    if (existing) {
      openThread(existing);
    } else {
      openThread({ id: withId, name: withName || withId, avatarUrl: null, lastMessage: '', timestamp: '', unreadCount: 0, online: onlineIds.has(withId) });
    }
    navigation.setParams({ withId: undefined, withName: undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.params?.withId, loading]);

  const { joinChat, sendMessage, typingStart, typingStop } = useSocket({
    onReceiveMessage: (msg) => {
      handleIncomingMessage(msg);
    },
    onMessageSent: (msg) => {
      handleIncomingMessage(msg);
    },
    onMessageError: () => {
      Alert.alert(t('common', 'errorTitle'), t('chat', 'sendError'));
    },
    onTypingStart: ({ senderId }) => {
      if (senderId === activeThreadIdRef.current) setIsTyping(true);
    },
    onTypingStop: ({ senderId }) => {
      if (senderId === activeThreadIdRef.current) setIsTyping(false);
    },
    onMessagesRead: ({ readerId }) => {
      if (readerId === activeThreadIdRef.current) {
        setMessages(prev => prev.map(m => (m.sender === 'me' ? { ...m, read: true } : m)));
      }
    },
    onUserOnline: ({ userId }) => {
      setOnlineIds(prev => new Set(prev).add(userId));
      setThreads(prev => prev.map(t2 => (t2.id === userId ? { ...t2, online: true } : t2)));
      setActiveThread(prev => (prev && prev.id === userId ? { ...prev, online: true } : prev));
    },
    onUserOffline: ({ userId }) => {
      setOnlineIds(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
      setThreads(prev => prev.map(t2 => (t2.id === userId ? { ...t2, online: false } : t2)));
      setActiveThread(prev => (prev && prev.id === userId ? { ...prev, online: false } : prev));
    },
  });

  const handleIncomingMessage = useCallback((msg: any) => {
    if (!myId) return;
    const otherParty = msg.senderId === myId ? msg.receiverId : msg.senderId;
    const isFromOther = msg.senderId !== myId;

    if (otherParty === activeThreadIdRef.current) {
      setMessages(prev => (prev.some(m => m.id === msg.id) ? prev : [...prev, mapRowToMessage({
        id: msg.id, sender_id: msg.senderId, receiver_id: msg.receiverId,
        content: msg.content, type: msg.type, read: msg.read, created_at: msg.timestamp,
      }, myId)]));
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      if (isFromOther) setIsTyping(false);
    }

    setThreads(prev => {
      const idx = prev.findIndex(t2 => t2.id === otherParty);
      const bump = {
        id: otherParty,
        name: idx >= 0 ? prev[idx].name : msg.senderName || otherParty,
        avatarUrl: idx >= 0 ? prev[idx].avatarUrl : cleanPhoto(msg.senderAvatar),
        lastMessage: msg.content,
        timestamp: timeAgoShort(msg.timestamp),
        unreadCount: isFromOther && otherParty !== activeThreadIdRef.current ? (idx >= 0 ? prev[idx].unreadCount + 1 : 1) : (idx >= 0 ? prev[idx].unreadCount : 0),
        online: idx >= 0 ? prev[idx].online : onlineIds.has(otherParty),
      };
      const rest = prev.filter(t2 => t2.id !== otherParty);
      return [bump, ...rest];
    });
  }, [myId, onlineIds]);

  useEffect(() => {
    if (myId) joinChat(myId);
  }, [myId, joinChat]);

  const handleThreadPress = (thread: ChatThread) => openThread(thread);

  const handleCloseThread = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (activeThread) typingStop(activeThread.id);
    setActiveThread(null);
    setIsTyping(false);
  };

  const handleTextChange = (value: string) => {
    setMessageText(value);
    if (!activeThread) return;
    typingStart(activeThread.id);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => typingStop(activeThread.id), 2000);
  };

  const handleSendMessage = () => {
    if (!messageText.trim() || !activeThread) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    sendMessage(activeThread.id, messageText.trim());
    setMessageText('');
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingStop(activeThread.id);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const filteredThreads = threads.filter(t2 =>
    t2.name.toLowerCase().includes(search.toLowerCase()) ||
    t2.lastMessage.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md + 2,
        backgroundColor: C.card,
        borderBottomWidth: 1,
        borderBottomColor: C.border,
      }}>
        <Text style={{ color: C.text, fontSize: typography.heading.fontSize, lineHeight: typography.heading.lineHeight, fontWeight: typography.heading.fontWeight, fontFamily: lang === 'od' ? 'NotoSansOriya-Bold' : undefined }}>
          {t('chat', 'title')}
        </Text>
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
                    <Text style={{ color: C.text, fontSize: typography.label.fontSize, lineHeight: typography.label.lineHeight, fontWeight: typography.label.fontWeight }}>{item.name}</Text>
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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2 }}>
                <TouchableOpacity onPress={handleCloseThread} style={{ padding: spacing.xs }}>
                  <ArrowLeft size={20} color={C.text} />
                </TouchableOpacity>

                <Avatar name={activeThread.name} photoUrl={activeThread.avatarUrl} size={40} showOnlineDot={activeThread.online} />

                <View>
                  <Text style={{ color: C.text, fontSize: typography.label.fontSize, lineHeight: typography.label.lineHeight, fontWeight: typography.label.fontWeight }}>
                    {activeThread.name}
                  </Text>
                  <Text style={{ color: C.success, fontSize: typography.caption.fontSize, lineHeight: typography.caption.lineHeight, fontWeight: '600' }}>
                    {activeThread.online ? t('chat', 'online') : t('chat', 'offline')}
                  </Text>
                </View>
              </View>
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

              {/* Chat Input Bar */}
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
            </KeyboardAvoidingView>
          </View>
        </Modal>
      )}
    </View>
  );
}
