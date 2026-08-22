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
import AdminMatrimonyApplicationsScreen from '../screens/admin/AdminMatrimonyApplicationsScreen';
import AdminMatrimonyHistoryScreen from '../screens/admin/AdminMatrimonyHistoryScreen';
import AdminPostsScreen from '../screens/admin/AdminPostsScreen';
import AdminAnnouncementsScreen from '../screens/admin/AdminAnnouncementsScreen';
import AdminExpensesScreen from '../screens/admin/AdminExpensesScreen';
import AdminSettingsScreen from '../screens/admin/AdminSettingsScreen';
import AdminLeadersScreen from '../screens/admin/AdminLeadersScreen';
import AdminLeaderFormScreen from '../screens/admin/AdminLeaderFormScreen';
import AdminMemberEditScreen from '../screens/admin/AdminMemberEditScreen';
import AdminMemberFamilyFormScreen from '../screens/admin/AdminMemberFamilyFormScreen';
import AdminDemographicsScreen from '../screens/admin/AdminDemographicsScreen';
import AdminAnalyticsScreen from '../screens/admin/AdminAnalyticsScreen';
import GoLiveScreen from '../screens/live/GoLiveScreen';
import AdminExportScreen from '../screens/admin/AdminExportScreen';
import AdminStoryReportsScreen from '../screens/admin/AdminStoryReportsScreen';
import AdminJobsScreen from '../screens/admin/AdminJobsScreen';
import AdminJobSubmissionsScreen from '../screens/admin/AdminJobSubmissionsScreen';
import AdminJobReportsScreen from '../screens/admin/AdminJobReportsScreen';
import { Leader } from '../api/admin';
import { FamilyMember } from '../types';

export type AdminStackParams = {
  AdminDashboard: undefined;
  AdminMembers: undefined;
  AdminMemberDetail: { id: string };
  AdminMemberEdit: { id: string };
  AdminMemberFamilyForm: { memberId: string; index?: number; member?: FamilyMember };
  AdminDemographics: undefined;
  AdminAnalytics: undefined;
  AdminReports: undefined;
  AdminUsers: undefined;
  AdminTracker: undefined;
  AdminMatrimony: undefined;
  AdminMatrimonyForm: { id?: string | number };
  AdminMatrimonyApplications: undefined;
  AdminMatrimonyHistory: undefined;
  AdminPosts: undefined;
  AdminAnnouncements: undefined;
  AdminExpenses: undefined;
  AdminSettings: undefined;
  AdminLeaders: undefined;
  AdminLeaderForm: { id?: string | number; leader?: Leader };
  AdminLive: undefined;
  AdminExport: undefined;
  AdminStoryReports: undefined;
  AdminJobs: undefined;
  AdminJobSubmissions: undefined;
  AdminJobReports: undefined;
};

const Stack = createStackNavigator<AdminStackParams>();

export default function AdminStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
      <Stack.Screen name="AdminMembers" component={AdminMembersScreen} />
      <Stack.Screen name="AdminMemberDetail" component={AdminMemberDetailScreen} />
      <Stack.Screen name="AdminMemberEdit" component={AdminMemberEditScreen} />
      <Stack.Screen name="AdminMemberFamilyForm" component={AdminMemberFamilyFormScreen} />
      <Stack.Screen name="AdminDemographics" component={AdminDemographicsScreen} />
      <Stack.Screen name="AdminAnalytics" component={AdminAnalyticsScreen} />
      <Stack.Screen name="AdminReports" component={AdminReportsScreen} />
      <Stack.Screen name="AdminUsers" component={AdminUsersScreen} />
      <Stack.Screen name="AdminTracker" component={AdminTrackerScreen} />
      <Stack.Screen name="AdminMatrimony" component={AdminMatrimonyScreen} />
      <Stack.Screen name="AdminMatrimonyForm" component={AdminMatrimonyFormScreen} />
      <Stack.Screen name="AdminMatrimonyApplications" component={AdminMatrimonyApplicationsScreen} />
      <Stack.Screen name="AdminMatrimonyHistory" component={AdminMatrimonyHistoryScreen} />
      <Stack.Screen name="AdminPosts" component={AdminPostsScreen} />
      <Stack.Screen name="AdminAnnouncements" component={AdminAnnouncementsScreen} />
      <Stack.Screen name="AdminExpenses" component={AdminExpensesScreen} />
      <Stack.Screen name="AdminSettings" component={AdminSettingsScreen} />
      <Stack.Screen name="AdminLeaders" component={AdminLeadersScreen} />
      <Stack.Screen name="AdminLeaderForm" component={AdminLeaderFormScreen} />
      <Stack.Screen name="AdminLive" component={GoLiveScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="AdminExport" component={AdminExportScreen} />
      <Stack.Screen name="AdminStoryReports" component={AdminStoryReportsScreen} />
      <Stack.Screen name="AdminJobs" component={AdminJobsScreen} />
      <Stack.Screen name="AdminJobSubmissions" component={AdminJobSubmissionsScreen} />
      <Stack.Screen name="AdminJobReports" component={AdminJobReportsScreen} />
    </Stack.Navigator>
  );
}
