// src/navigation/AdminStack.tsx
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AdminMembersScreen from '../screens/admin/AdminMembersScreen';
import AdminMemberDetailScreen from '../screens/admin/AdminMemberDetailScreen';
import AdminReportsScreen from '../screens/admin/AdminReportsScreen';
import AdminUsersScreen from '../screens/admin/AdminUsersScreen';

export type AdminStackParams = {
  AdminDashboard: undefined;
  AdminMembers: undefined;
  AdminMemberDetail: { id: string };
  AdminReports: undefined;
  AdminUsers: undefined;
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
    </Stack.Navigator>
  );
}
