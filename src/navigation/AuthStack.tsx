// src/navigation/AuthStack.tsx
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from '../screens/auth/LoginScreen';
import OtpScreen from '../screens/auth/OtpScreen';
import AdminLoginScreen from '../screens/admin/AdminLoginScreen';
import FindMembershipScreen from '../screens/auth/FindMembershipScreen';

export type AuthStackParams = {
  Login: { prefillMembershipNo?: string } | undefined;
  Otp: { membershipNo: string; mobile: string; useFirebase?: boolean };
  AdminLogin: undefined;
  FindMembership: undefined;
};

const Stack = createStackNavigator<AuthStackParams>();

export default function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Otp" component={OtpScreen} />
      <Stack.Screen name="AdminLogin" component={AdminLoginScreen} />
      <Stack.Screen name="FindMembership" component={FindMembershipScreen} />
    </Stack.Navigator>
  );
}
