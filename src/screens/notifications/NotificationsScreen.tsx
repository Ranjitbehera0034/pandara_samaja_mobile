// src/screens/notifications/NotificationsScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Bell, Check, Trash2 } from 'lucide-react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useSocket } from '../../hooks/useSocket';
import * as notificationsApi from '../../api/notifications';
import { NotificationRow } from '../../api/notifications';
import { timeAgoShort } from '../../utils/feedUtils';
import SkeletonBox from '../../components/common/SkeletonBox';
import EmptyState from '../../components/common/EmptyState';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
  senderId?: string;
  postId?: string;
}

function mapNotification(row: NotificationRow): Notification {
  return {
    id: row.id.toString(),
    type: row.type,
    title: row.actor_name,
    body: row.message,
    timestamp: timeAgoShort(row.created_at),
    read: row.read,
    senderId: row.actor_id,
    postId: row.post_id ?? undefined,
  };
}

function NotifSkeleton({ colors }: { colors: ReturnType<typeof useTheme>['colors'] }) {
  const { spacing, radius } = useTheme();
  return (
    <View style={{ gap: spacing.md, padding: spacing.lg }}>
      {[1, 2, 3, 4, 5].map(i => (
        <View key={i} style={{ flexDirection: 'row', gap: spacing.md, padding: spacing.md, backgroundColor: colors.card, borderRadius: radius.md }}>
          <SkeletonBox width={40} height={40} borderRadius={20} />
          <View style={{ flex: 1, gap: spacing.sm, justifyContent: 'center' }}>
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
  const { colors: C, spacing, radius, typography, shadow } = useTheme();
  const { t } = useLanguage();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  const loadNotifications = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await notificationsApi.fetchNotifications();
      if (data.success) {
        setNotifications(data.notifications.map(mapNotification));
      }
    } catch (e) {
      console.error('[NOTIFICATIONS] Failed to load:', e);
      Alert.alert(t('common', 'errorTitle'), t('notifications', 'loadError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Live push: bump the badge/list when a new notification arrives while viewing
  useSocket({
    onNotificationCount: () => {
      loadNotifications();
    },
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await loadNotifications(true);
  };

  const handleMarkAllRead = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try {
      await notificationsApi.markAllRead();
    } catch (e) {
      console.error('[NOTIFICATIONS] Mark all read failed:', e);
    }
  };

  const handleDelete = async (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setNotifications(prev => prev.filter(n => n.id !== id));
    try {
      await notificationsApi.deleteNotification(id);
    } catch (e) {
      console.error('[NOTIFICATIONS] Delete failed:', e);
    }
  };

  const handleNotificationTap = async (notif: Notification) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNotifications(prev =>
      prev.map(n => n.id === notif.id ? { ...n, read: true } : n)
    );
    if (!notif.read) {
      notificationsApi.markRead(notif.id).catch(e => console.error('[NOTIFICATIONS] Mark read failed:', e));
    }

    // Navigate based on type
    if ((notif.type === 'like' || notif.type === 'comment') && notif.postId) {
      navigation.navigate('FeedMain');
    } else if (notif.type === 'follow' && notif.senderId) {
      navigation.navigate('MemberProfile', { id: notif.senderId });
    } else if (notif.type === 'message' && notif.senderId) {
      navigation.navigate('Chat', { withId: notif.senderId, withName: notif.title });
    }
  };

  const renderRightActions = (id: string) => {
    return (
      <TouchableOpacity
        onPress={() => handleDelete(id)}
        style={{ backgroundColor: C.error, justifyContent: 'center', alignItems: 'center', width: 80, height: '100%', borderTopRightRadius: radius.md, borderBottomRightRadius: radius.md }}
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
        case 'message': return '✉️';
        default: return '📢';
      }
    };

    return (
      <Swipeable
        renderRightActions={() => renderRightActions(item.id)}
        containerStyle={{ marginBottom: spacing.sm }}
      >
        <TouchableOpacity
          onPress={() => handleNotificationTap(item)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
            padding: spacing.lg,
            backgroundColor: C.card,
            borderWidth: 1,
            borderColor: C.border,
            borderRadius: radius.md,
            borderLeftWidth: !item.read ? 4 : 1,
            borderLeftColor: !item.read ? C.primary : C.border,
            ...shadow.card,
          }}
        >
          {/* Emoji Icon Badge */}
          <View style={{ width: 40, height: 40, borderRadius: radius.full, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: typography.title.fontSize }}>{getIcon()}</Text>
          </View>

          {/* Texts */}
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.text, fontSize: typography.bodyEmphasis.fontSize, lineHeight: typography.bodyEmphasis.lineHeight, fontWeight: typography.bodyEmphasis.fontWeight }} numberOfLines={1}>{item.title}</Text>
            <Text style={{ color: C.textMuted, fontSize: typography.body.fontSize, lineHeight: typography.body.lineHeight, marginTop: 2 }} numberOfLines={1}>{item.body}</Text>
            <Text style={{ color: C.textFaint, fontSize: typography.caption.fontSize, lineHeight: typography.caption.lineHeight, marginTop: spacing.xs }}>{item.timestamp}</Text>
          </View>

          {/* Unread indicator */}
          {!item.read && (
            <View style={{ width: 10, height: 10, borderRadius: radius.full, backgroundColor: C.primary, marginLeft: spacing.xs }} />
          )}
        </TouchableOpacity>
      </Swipeable>
    );
  }, [C, spacing, radius, typography, shadow]);

  const keyExtractor = useCallback((item: Notification) => item.id, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
        {/* Top Header */}
        <View style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: C.border, flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg, justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.goBack(); }} style={{ padding: spacing.xs, borderRadius: radius.full, backgroundColor: C.card }}>
              <ArrowLeft size={20} color={C.text} />
            </TouchableOpacity>
            <Text style={{ color: C.text, fontWeight: typography.heading.fontWeight, fontSize: typography.heading.fontSize, lineHeight: typography.heading.lineHeight, letterSpacing: 0.3 }}>{t('notifications', 'title')}</Text>
          </View>
          {unreadCount > 0 && (
            <TouchableOpacity
              onPress={handleMarkAllRead}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2, paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2, backgroundColor: C.primary + '15', borderRadius: radius.full, borderWidth: 1, borderColor: C.primary + '30' }}
            >
              <Check size={16} color={C.primary} />
              <Text style={{ color: C.primary, fontSize: typography.caption.fontSize, fontWeight: '700' }}>{t('notifications', 'markAllRead')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {loading && !refreshing ? (
          <NotifSkeleton colors={C} />
        ) : notifications.length === 0 ? (
          <EmptyState
            emoji="🔔"
            title={t('notifications', 'allCaughtUpTitle')}
            subtitle={t('notifications', 'allCaughtUpSubtitle')}
          />
        ) : (
          <View style={{ flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
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
                  tintColor={C.primary}
                  colors={[C.primary]}
                  progressBackgroundColor={C.card}
                />
              }
            />
          </View>
        )}
      </View>
    </GestureHandlerRootView>
  );
}
