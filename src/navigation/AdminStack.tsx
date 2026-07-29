// src/navigation/AdminStack.tsx
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AdminMembersScreen from '../screens/admin/AdminMembersScreen';
import AdminMemberDetailScreen from '../screens/admin/AdminMemberDetailScreen';
import AdminReportsScreen from '../screens/admin/AdminReportsScreen';
import AdminUsersScreen from '../screens/admin/AdminUsersScreen';
import AdminTrackerScreen from '../screens/admin/AdminTrackerScreen';
import AdminMatrimonyScreen from '../screens/admin/AdminMatrimonyScreen';
import AdminMatrimonyFormScreen from '../screens/admin/AdminMatrimonyFormScreen';
import AdminPostsScreen from '../screens/admin/AdminPostsScreen';
import AdminAnnouncementsScreen from '../screens/admin/AdminAnnouncementsScreen';
import AdminExpensesScreen from '../screens/admin/AdminExpensesScreen';
import AdminSettingsScreen from '../screens/admin/AdminSettingsScreen';

export type AdminStackParams = {
  AdminDashboard: undefined;
  AdminMembers: undefined;
  AdminMemberDetail: { id: string };
  AdminReports: undefined;
  AdminUsers: undefined;
  AdminTracker: undefined;
  AdminMatrimony: undefined;
  AdminMatrimonyForm: { id?: string | number };
  AdminPosts: undefined;
  AdminAnnouncements: undefined;
  AdminExpenses: undefined;
  AdminSettings: undefined;
};

const Stack = createStackNavigator<AdminStackParams>();

export default function AdminStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
      <Stack.Screen name="AdminMembers" component={AdminMembersScreen} />
      <Stack.Screen name="AdminMemberDetail" component={AdminMemberDetailScreen} />
      <Stack.Screen name="AdminReports" component={AdminReportsScreen} />
      <Stack.Screen name="AdminUsers" component={AdminUsersScreen} />
      <Stack.Screen name="AdminTracker" component={AdminTrackerScreen} />
      <Stack.Screen name="AdminMatrimony" component={AdminMatrimonyScreen} />
      <Stack.Screen name="AdminMatrimonyForm" component={AdminMatrimonyFormScreen} />
      <Stack.Screen name="AdminPosts" component={AdminPostsScreen} />
      <Stack.Screen name="AdminAnnouncements" component={AdminAnnouncementsScreen} />
      <Stack.Screen name="AdminExpenses" component={AdminExpensesScreen} />
      <Stack.Screen name="AdminSettings" component={AdminSettingsScreen} />
    </Stack.Navigator>
  );
}
