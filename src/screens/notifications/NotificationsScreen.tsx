// src/screens/notifications/NotificationsScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, RefreshControl, Dimensions, Alert } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Bell, Check, Trash2 } from 'lucide-react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SkeletonBox from '../../components/common/SkeletonBox';
import EmptyState from '../../components/common/EmptyState';

const { width: W } = Dimensions.get('window');

interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'system';
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
  senderId?: string;
  postId?: string;
}

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'notif-1',
    type: 'like',
    title: 'Sasmita Das liked your post',
    body: 'Annual Meetup Details',
    timestamp: '2 hours ago',
    read: false,
    senderId: 'MEM101',
    postId: '12',
  },
  {
    id: 'notif-2',
    type: 'comment',
    title: 'Ranjit Behera commented on your post',
    body: '"Looking forward to attending!"',
    timestamp: '5 hours ago',
    read: false,
    senderId: 'MEM102',
    postId: '12',
  },
  {
    id: 'notif-3',
    type: 'follow',
    title: 'Priyabrata Samal followed you',
    body: 'You are now connected.',
    timestamp: '1 day ago',
    read: true,
    senderId: 'MEM103',
  },
  {
    id: 'notif-4',
    type: 'system',
    title: 'Welcome to Pandara Samaja app!',
    body: 'Explore resources, events, matrimony profiles, and connect with members.',
    timestamp: '3 days ago',
    read: true,
  },
];

function NotifSkeleton() {
  return (
    <View style={{ gap: 12, padding: 16 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <View key={i} style={{ flexDirection: 'row', gap: 12, padding: 12, backgroundColor: '#1e293b', borderRadius: 12 }}>
          <SkeletonBox width={40} height={40} borderRadius={20} />
          <View style={{ flex: 1, gap: 8, justifyContent: 'center' }}>
            <SkeletonBox width="70%" height={12} />
            <SkeletonBox width="50%" height={10} />
          </View>
        </View>
      ))}
    </View>
  );
}

export default function NotificationsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  const loadNotifications = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 800));
      setNotifications(MOCK_NOTIFICATIONS);
    } catch {
      Alert.alert('Error', 'Failed to load notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleRefresh = async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await loadNotifications(true);
  };

  const handleMarkAllRead = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleDelete = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleNotificationTap = (notif: Notification) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Mark as read
    setNotifications(prev =>
      prev.map(n => n.id === notif.id ? { ...n, read: true } : n)
    );

    // Navigate based on type
    if ((notif.type === 'like' || notif.type === 'comment') && notif.postId) {
      navigation.navigate('FeedMain');
    } else if (notif.type === 'follow' && notif.senderId) {
      navigation.navigate('MemberProfile', { id: notif.senderId });
    }
  };

  const renderRightActions = (id: string) => {
    return (
      <TouchableOpacity
        onPress={() => handleDelete(id)}
        className="bg-red-650 justify-center items-center w-20 h-full rounded-r-xl"
        style={{ backgroundColor: '#ef4444' }}
      >
        <Trash2 size={20} color="white" />
      </TouchableOpacity>
    );
  };

  const renderNotifRow = useCallback(({ item }: { item: Notification }) => {
    const getIcon = () => {
      switch (item.type) {
        case 'like': return '❤️';
        case 'comment': return '💬';
        case 'follow': return '👥';
        default: return '📢';
      }
    };

    return (
      <Swipeable
        renderRightActions={() => renderRightActions(item.id)}
        containerStyle={{ marginBottom: 8 }}
      >
        <TouchableOpacity
          onPress={() => handleNotificationTap(item)}
          className={`flex-row items-center gap-3 p-4 bg-slate-800 border border-slate-700/50 rounded-xl ${
            !item.read ? 'border-l-4 border-l-blue-500' : ''
          }`}
        >
          {/* Emoji Icon Badge */}
          <View className="w-10 h-10 rounded-full bg-slate-900 border border-slate-700 items-center justify-center">
            <Text className="text-lg">{getIcon()}</Text>
          </View>

          {/* Texts */}
          <View className="flex-1">
            <Text className="text-white text-sm font-semibold" numberOfLines={1}>{item.title}</Text>
            <Text className="text-slate-400 text-xs mt-0.5" numberOfLines={1}>{item.body}</Text>
            <Text className="text-slate-500 text-[10px] mt-1">{item.timestamp}</Text>
          </View>

          {/* Unread indicator */}
          {!item.read && (
            <View className="w-2.5 h-2.5 rounded-full bg-blue-500 ml-1 shrink-0" />
          )}
        </TouchableOpacity>
      </Swipeable>
    );
  }, [notifications]);

  const keyExtractor = useCallback((item: Notification) => item.id, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: '#0f172a', paddingTop: insets.top }}>
        {/* Top Header */}
        <View className="px-4 py-3 border-b border-slate-800 flex-row items-center bg-slate-900 justify-between">
          <View className="flex-row items-center gap-3">
            <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.goBack(); }} className="p-1 rounded-full bg-slate-800/50">
              <ArrowLeft size={22} color="#ffffff" />
            </TouchableOpacity>
            <Text className="text-white font-bold text-xl tracking-wide">Notifications</Text>
          </View>
          {unreadCount > 0 && (
            <TouchableOpacity
              onPress={handleMarkAllRead}
              className="flex-row items-center gap-1.5 px-3 py-1.5 bg-blue-600/10 rounded-full border border-blue-500/20"
            >
              <Check size={14} color="#3b82f6" />
              <Text className="text-blue-400 text-xs font-bold">Mark all read</Text>
            </TouchableOpacity>
          )}
        </View>

        {loading && !refreshing ? (
          <NotifSkeleton />
        ) : notifications.length === 0 ? (
          <EmptyState
            emoji="🔔"
            title="All caught up"
            subtitle="No new notifications"
          />
        ) : (
          <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 12 }}>
            <FlashList
              data={notifications}
              keyExtractor={keyExtractor}
              renderItem={renderNotifRow}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  tintColor="#2563eb"
                  colors={['#2563eb']}
                  progressBackgroundColor="#1e293b"
                />
              }
            />
          </View>
        )}
      </View>
    </GestureHandlerRootView>
  );
}
