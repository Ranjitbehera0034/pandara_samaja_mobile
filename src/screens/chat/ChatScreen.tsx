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
  SafeAreaView,
  Animated,
  Dimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Search, Send, ArrowLeft, MessageSquare, Circle, Check, CheckCheck } from 'lucide-react-native';
import { C } from '../../theme/colors';
import { useLanguage } from '../../context/LanguageContext';
import SkeletonBox from '../../components/common/SkeletonBox';
import EmptyState from '../../components/common/EmptyState';
import { Image } from 'expo-image';

const { width: W } = Dimensions.get('window');

interface ChatMessage {
  id: string;
  sender: 'me' | 'other';
  text: string;
  timestamp: string;
}

interface ChatThread {
  id: string;
  name: string;
  avatarUrl: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  online: boolean;
  messages: ChatMessage[];
}

const INITIAL_THREADS: ChatThread[] = [
  {
    id: 't1',
    name: 'Sasmita Das',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    lastMessage: 'Yes, I will attend the upcoming executive meeting.',
    timestamp: '10:42 AM',
    unreadCount: 2,
    online: true,
    messages: [
      { id: 'm1', sender: 'other', text: 'Namaskar! Did you receive the agenda for the general body assembly?', timestamp: '10:30 AM' },
      { id: 'm2', sender: 'me', text: 'Yes, I got the email copy. Are the timings finalized?', timestamp: '10:35 AM' },
      { id: 'm3', sender: 'other', text: 'Yes, it starts at 10 AM. I will attend the upcoming executive meeting.', timestamp: '10:42 AM' }
    ]
  },
  {
    id: 't2',
    name: 'Bipin Bihari Pandara',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    lastMessage: 'Please check the draft for the temple ritual timings.',
    timestamp: 'Yesterday',
    unreadCount: 0,
    online: false,
    messages: [
      { id: 'm4', sender: 'me', text: 'Bipin Babu, did we finish the layout draft?', timestamp: 'Yesterday' },
      { id: 'm5', sender: 'other', text: 'Please check the draft for the temple ritual timings.', timestamp: 'Yesterday' }
    ]
  },
  {
    id: 't3',
    name: 'Ramesh Chandra Behera',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    lastMessage: 'Jai Jagannath! Are you coming to Puri tomorrow?',
    timestamp: '2 days ago',
    unreadCount: 0,
    online: true,
    messages: [
      { id: 'm6', sender: 'other', text: 'Jai Jagannath! Are you coming to Puri tomorrow?', timestamp: '2 days ago' }
    ]
  },
  {
    id: 't4',
    name: 'Gitanjali Samal',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    lastMessage: 'Thank you for sharing the matrimonial profile.',
    timestamp: '3 days ago',
    unreadCount: 0,
    online: false,
    messages: [
      { id: 'm7', sender: 'me', text: 'Shared the profile of the candidate.', timestamp: '3 days ago' },
      { id: 'm8', sender: 'other', text: 'Thank you for sharing the matrimonial profile.', timestamp: '3 days ago' }
    ]
  }
];

function InboxSkeleton() {
  return (
    <View style={{ padding: 16, gap: 16 }}>
      {[1, 2, 3, 4].map(i => (
        <View key={i} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <SkeletonBox width={50} height={50} borderRadius={25} />
          <View style={{ flex: 1, gap: 8 }}>
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
function TypingIndicator() {
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
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: C.card, borderRadius: 16, alignSelf: 'flex-start', marginLeft: 44, marginTop: 4 }}>
      <Animated.View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.textMuted, transform: [{ translateY: dot1 }] }} />
      <Animated.View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.textMuted, transform: [{ translateY: dot2 }] }} />
      <Animated.View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.textMuted, transform: [{ translateY: dot3 }] }} />
    </View>
  );
}

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { lang } = useLanguage();

  const [search, setSearch] = useState('');
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeThread, setActiveThread] = useState<ChatThread | null>(null);
  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    // Simulate loading inboxes
    setTimeout(() => {
      setThreads(INITIAL_THREADS);
      setLoading(false);
    }, 800);
  }, []);

  const handleThreadPress = (thread: ChatThread) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Mark as read locally
    setThreads(prev =>
      prev.map(t => (t.id === thread.id ? { ...t, unreadCount: 0 } : t))
    );
    setActiveThread({ ...thread, unreadCount: 0 });
  };

  const handleSendMessage = () => {
    if (!messageText.trim() || !activeThread) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newMsg: ChatMessage = {
      id: `m-me-${Date.now()}`,
      sender: 'me',
      text: messageText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const updatedMessages = [...activeThread.messages, newMsg];
    const threadId = activeThread.id;
    const threadName = activeThread.name;

    // Update state
    setThreads(prev =>
      prev.map(t =>
        t.id === threadId
          ? { ...t, lastMessage: newMsg.text, timestamp: 'Just now', messages: updatedMessages }
          : t
      )
    );

    setActiveThread(prev => prev ? { ...prev, messages: updatedMessages } : null);
    setMessageText('');

    // Trigger auto scroll
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    // Simulate smart replies/responses!
    setIsTyping(true);
    setTimeout(() => {
      const responses = [
        `Jai Jagannath! Yes, I received your message. Let's align soon.`,
        `Okay, sounds good! I will get back to you by evening.`,
        `Thank you for confirming. See you at the Pandara Samaja meeting!`,
        `Dhanyabaad! I will review the documents and ping you.`
      ];
      const randomReply = responses[Math.floor(Math.random() * responses.length)];

      const replyMsg: ChatMessage = {
        id: `m-reply-${Date.now()}`,
        sender: 'other',
        text: randomReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setIsTyping(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const finalMessages = [...updatedMessages, replyMsg];

      setThreads(prev =>
        prev.map(t =>
          t.id === threadId
            ? { ...t, lastMessage: replyMsg.text, timestamp: 'Just now', messages: finalMessages }
            : t
        )
      );

      if (activeThread && activeThread.id === threadId) {
        setActiveThread(prev => prev ? { ...prev, messages: finalMessages } : null);
      }

      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    }, 2000);
  };

  const filteredThreads = threads.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.lastMessage.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: C.card,
        borderBottomWidth: 1,
        borderBottomColor: C.border,
      }}>
        <Text style={{ color: C.text, fontSize: 20, fontWeight: '800', fontFamily: lang === 'od' ? 'NotoSansOriya-Bold' : undefined }}>
          {lang === 'od' ? 'ସନ୍ଦେଶ' : 'Direct Messages'}
        </Text>
      </View>

      {/* Inbox view */}
      <View style={{ flex: 1 }}>
        {/* Search */}
        <View style={{ padding: 16 }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: C.card,
            borderRadius: 12,
            paddingHorizontal: 12,
            height: 44,
            borderWidth: 1,
            borderColor: C.border,
          }}>
            <Search size={16} color={C.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              placeholder={lang === 'od' ? 'ସନ୍ଦେଶ ବା ସଦସ୍ୟ ଖୋଜନ୍ତୁ...' : 'Search conversations...'}
              placeholderTextColor={C.textFaint}
              value={search}
              onChangeText={setSearch}
              style={{ flex: 1, color: C.text, fontSize: 14, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined }}
            />
          </View>
        </View>

        {loading ? (
          <InboxSkeleton />
        ) : filteredThreads.length === 0 ? (
          <EmptyState
            emoji="💬"
            title={lang === 'od' ? 'କୌଣସି ଆଲାପ ମିଳିଲା ନାହିଁ' : 'No Conversations'}
            subtitle={lang === 'od' ? 'ସଦସ୍ୟ ତାଲିକାରୁ ଯାଇ ଚାଟ୍ ଆରମ୍ଭ କରନ୍ତୁ' : 'Start a chat from the member directory to connect.'}
          />
        ) : (
          <FlatList
            data={filteredThreads}
            keyExtractor={item => item.id}
            contentContainerStyle={{ paddingHorizontal: 16 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => handleThreadPress(item)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 14,
                  borderBottomWidth: 0.5,
                  borderBottomColor: C.border,
                }}
              >
                {/* Avatar with Online indicator */}
                <View style={{ position: 'relative', marginRight: 12 }}>
                  <Image
                    source={{ uri: item.avatarUrl }}
                    style={{ width: 50, height: 50, borderRadius: 25 }}
                  />
                  {item.online && (
                    <View style={{
                      position: 'absolute',
                      bottom: 0,
                      right: 0,
                      backgroundColor: C.success,
                      width: 14,
                      height: 14,
                      borderRadius: 7,
                      borderWidth: 2,
                      borderColor: C.bg,
                    }} />
                  )}
                </View>

                {/* Info */}
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={{ color: C.text, fontSize: 15, fontWeight: '700' }}>{item.name}</Text>
                    <Text style={{ color: C.textFaint, fontSize: 11 }}>{item.timestamp}</Text>
                  </View>
                  <Text
                    numberOfLines={1}
                    style={{
                      color: item.unreadCount > 0 ? C.text : C.textMuted,
                      fontSize: 13,
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
                    borderRadius: 10,
                    minWidth: 20,
                    height: 20,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginLeft: 10,
                    paddingHorizontal: 4,
                  }}>
                    <Text style={{ color: 'white', fontSize: 10, fontWeight: '700' }}>
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
          onRequestClose={() => setActiveThread(null)}
        >
          <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
            {/* Header */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: C.border,
              backgroundColor: C.card,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setActiveThread(null);
                  }}
                  style={{ padding: 4 }}
                >
                  <ArrowLeft size={20} color={C.text} />
                </TouchableOpacity>

                <View style={{ position: 'relative' }}>
                  <Image
                    source={{ uri: activeThread.avatarUrl }}
                    style={{ width: 38, height: 38, borderRadius: 19 }}
                  />
                  {activeThread.online && (
                    <View style={{
                      position: 'absolute',
                      bottom: 0,
                      right: 0,
                      backgroundColor: C.success,
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      borderWidth: 1.5,
                      borderColor: C.card,
                    }} />
                  )}
                </View>

                <View>
                  <Text style={{ color: C.text, fontSize: 15, fontWeight: '700' }}>
                    {activeThread.name}
                  </Text>
                  <Text style={{ color: C.success, fontSize: 11, fontWeight: '600' }}>
                    {activeThread.online ? 'Online' : 'Offline'}
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
              <FlatList
                ref={flatListRef}
                data={activeThread.messages}
                keyExtractor={item => item.id}
                contentContainerStyle={{ padding: 16, gap: 12 }}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                renderItem={({ item }) => {
                  const isMe = item.sender === 'me';
                  return (
                    <View style={{
                      flexDirection: 'row',
                      justifyContent: isMe ? 'flex-end' : 'flex-start',
                      alignItems: 'flex-end',
                      gap: 8,
                    }}>
                      {/* Avatar for received messages ONLY */}
                      {!isMe && (
                        <Image
                          source={{ uri: activeThread.avatarUrl }}
                          style={{ width: 28, height: 28, borderRadius: 14 }}
                        />
                      )}
                      
                      <View style={{
                        maxWidth: W * 0.7,
                        backgroundColor: isMe ? C.primary : C.card,
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        borderRadius: 18,
                        borderTopRightRadius: isMe ? 2 : 18,
                        borderTopLeftRadius: isMe ? 18 : 2,
                        borderWidth: isMe ? 0 : 1,
                        borderColor: C.border,
                      }}>
                        <Text style={{ color: C.text, fontSize: 14, lineHeight: 18 }}>
                          {item.text}
                        </Text>
                        
                        <View style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          marginTop: 4,
                          gap: 4
                        }}>
                          <Text style={{ color: isMe ? 'rgba(255, 255, 255, 0.6)' : C.textMuted, fontSize: 10 }}>
                            {item.timestamp}
                          </Text>
                          {isMe && <CheckCheck size={12} color="rgba(255, 255, 255, 0.8)" />}
                        </View>
                      </View>
                    </View>
                  );
                }}
                ListFooterComponent={() => (
                  isTyping ? <TypingIndicator /> : null
                )}
              />

              {/* Chat Input Bar */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                paddingVertical: 8,
                backgroundColor: C.card,
                borderTopWidth: 1,
                borderTopColor: C.border,
              }}>
                <TextInput
                  placeholder={lang === 'od' ? 'ବାର୍ତ୍ତା ଲେଖନ୍ତୁ...' : 'Type a message...'}
                  placeholderTextColor={C.textFaint}
                  value={messageText}
                  onChangeText={setMessageText}
                  style={{
                    flex: 1,
                    color: C.text,
                    backgroundColor: C.bg,
                    borderRadius: 20,
                    paddingHorizontal: 16,
                    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
                    marginRight: 10,
                    fontSize: 14,
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
                    borderRadius: 19,
                    backgroundColor: messageText.trim() ? C.primary : C.border,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Send size={16} color="white" />
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </Modal>
      )}
    </View>
  );
}
