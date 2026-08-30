// src/navigation/MainTabs.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Home, Compass, MessageSquare, Users, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useChat } from '../context/ChatContext';

// Import all screen placeholders
import FeedScreen from '../screens/feed/FeedScreen';
import ExploreScreen from '../screens/explore/ExploreScreen';
import ChatScreen from '../screens/chat/ChatScreen';
import MembersScreen from '../screens/members/MembersScreen';
import GalleryScreen from '../screens/gallery/GalleryScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';
import SettingsScreen from '../screens/profile/SettingsScreen';
import MemberProfileScreen from '../screens/members/MemberProfileScreen';
import AnnouncementsScreen from '../screens/community/AnnouncementsScreen';
import EventsScreen from '../screens/community/EventsScreen';
import GroupsScreen from '../screens/community/GroupsScreen';
import LeadersScreen from '../screens/community/LeadersScreen';
import MatrimonyScreen from '../screens/community/MatrimonyScreen';
import LiveStreamScreen from '../screens/community/LiveStreamScreen';
import LiveViewerScreen from '../screens/live/LiveViewerScreen';
import FamilyTreeScreen from '../screens/family/FamilyTreeScreen';
import FamilyMemberFormScreen from '../screens/family/FamilyMemberFormScreen';
import FamilyAlbumsScreen from '../screens/family/FamilyAlbumsScreen';
import FamilyEventsScreen from '../screens/family/FamilyEventsScreen';
import JobsScreen from '../screens/community/JobsScreen';
import JobDetailScreen from '../screens/community/JobDetailScreen';
import JobSubmitScreen from '../screens/community/JobSubmitScreen';

const Tab = createBottomTabNavigator();

// Feed Stack
function FeedStack() {
  const S = createStackNavigator();
  return (
    <S.Navigator screenOptions={{ headerShown: false }}>
      <S.Screen name="FeedMain" component={FeedScreen} />
      <S.Screen name="MemberProfile" component={MemberProfileScreen} />
      <S.Screen name="Announcements" component={AnnouncementsScreen} />
      <S.Screen name="Leaders" component={LeadersScreen} />
      <S.Screen name="Events" component={EventsScreen} />
      <S.Screen name="Groups" component={GroupsScreen} />
      <S.Screen name="Matrimony" component={MatrimonyScreen} />
      <S.Screen name="Jobs" component={JobsScreen} />
      <S.Screen name="JobDetail" component={JobDetailScreen} />
      <S.Screen name="JobSubmit" component={JobSubmitScreen} />
      <S.Screen name="LiveStream" component={LiveStreamScreen} />
      <S.Screen name="LiveViewer" component={LiveViewerScreen} options={{ presentation: 'modal' }} />
      <S.Screen name="FamilyTree" component={FamilyTreeScreen} />
      <S.Screen name="FamilyMemberForm" component={FamilyMemberFormScreen} />
      <S.Screen name="FamilyAlbums" component={FamilyAlbumsScreen} />
      <S.Screen name="FamilyEvents" component={FamilyEventsScreen} />
      <S.Screen name="Gallery" component={GalleryScreen} />
      <S.Screen name="Notifications" component={NotificationsScreen} />
      <S.Screen name="Settings" component={SettingsScreen} />
    </S.Navigator>
  );
}

// Explore Stack
function ExploreStack() {
  const S = createStackNavigator();
  return (
    <S.Navigator screenOptions={{ headerShown: false }}>
      <S.Screen name="ExploreMain" component={ExploreScreen} />
      <S.Screen name="MemberProfile" component={MemberProfileScreen} />
    </S.Navigator>
  );
}

// Members Stack
function MembersStack() {
  const S = createStackNavigator();
  return (
    <S.Navigator screenOptions={{ headerShown: false }}>
      <S.Screen name="MembersMain" component={MembersScreen} />
      <S.Screen name="MemberProfile" component={MemberProfileScreen} />
    </S.Navigator>
  );
}

// Profile Stack
function ProfileStack() {
  const S = createStackNavigator();
  return (
    <S.Navigator screenOptions={{ headerShown: false }}>
      <S.Screen name="ProfileMain" component={ProfileScreen} />
      <S.Screen name="Settings" component={SettingsScreen} />
    </S.Navigator>
  );
}

export default function MainTabs() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { unreadCount } = useChat();

  const handleTabPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 6,
          shadowOpacity: 0,
          elevation: 0,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginBottom: 2,
        },
      }}
    >
      <Tab.Screen
        name="Feed"
        component={FeedStack}
        options={{ tabBarIcon: ({ color }) => <Home size={22} color={color} />, tabBarLabel: t('nav', 'home') }}
        listeners={{ tabPress: handleTabPress }}
      />
      <Tab.Screen
        name="Explore"
        component={ExploreStack}
        options={{ tabBarIcon: ({ color }) => <Compass size={22} color={color} />, tabBarLabel: t('nav', 'explore') }}
        listeners={{ tabPress: handleTabPress }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatScreen}
        options={{
          tabBarIcon: ({ color }) => <MessageSquare size={22} color={color} />,
          tabBarLabel: t('nav', 'messages'),
          tabBarBadge: unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : undefined,
          tabBarBadgeStyle: { fontSize: 10, minWidth: 16, height: 16, lineHeight: 16 },
        }}
        listeners={{ tabPress: handleTabPress }}
      />
      <Tab.Screen
        name="Members"
        component={MembersStack}
        options={{ tabBarIcon: ({ color }) => <Users size={22} color={color} />, tabBarLabel: t('nav', 'members') }}
        listeners={{ tabPress: handleTabPress }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={{ tabBarIcon: ({ color }) => <User size={22} color={color} />, tabBarLabel: t('nav', 'profile') }}
        listeners={{ tabPress: handleTabPress }}
      />
    </Tab.Navigator>
  );
}
