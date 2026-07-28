// src/navigation/RootNavigator.tsx
import React, { useState, useEffect } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useTheme } from '../theme/ThemeContext';
import AuthStack from './AuthStack';
import MainTabs from './MainTabs';
import AdminStack from './AdminStack';
import LoadingScreen from '../components/common/LoadingScreen';
import AnimatedSplash from '../screens/SplashScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import { storage } from '../utils/secureStorage';

export default function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();
  const { isAdminAuthenticated, isLoading: isAdminLoading } = useAdminAuth();
  const { scheme, colors } = useTheme();
  const [showSplash, setShowSplash] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);

  const baseNavTheme = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...baseNavTheme,
    colors: {
      ...baseNavTheme.colors,
      background: colors.bg,
      card: colors.card,
      text: colors.text,
      border: colors.border,
      primary: colors.primary,
    },
  };

  // Check if onboarding was already shown
  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const val = await storage.getItem('onboardingComplete');
        setShowOnboarding(val !== 'true');
      } catch {
        setShowOnboarding(true);
      }
    };
    checkOnboarding();
  }, []);

  return (
    <NavigationContainer theme={navTheme}>
      {showSplash ? (
        <AnimatedSplash onFinish={() => setShowSplash(false)} />
      ) : showOnboarding === null || isLoading || isAdminLoading ? (
        <LoadingScreen />
      ) : showOnboarding ? (
        <OnboardingScreen onComplete={() => setShowOnboarding(false)} />
      ) : isAdminAuthenticated ? (
        // Admin (staff) and member sessions are independent auth systems.
        // If both happen to be logged in at once (unlikely — separate login
        // flows), the admin stack takes precedence since staff access is the
        // more privileged/intentional session.
        <AdminStack />
      ) : isAuthenticated ? (
        <MainTabs />
      ) : (
        <AuthStack />
      )}
    </NavigationContainer>
  );
}
