// src/navigation/RootNavigator.tsx
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import AuthStack from './AuthStack';
import MainTabs from './MainTabs';
import LoadingScreen from '../components/common/LoadingScreen';
import AnimatedSplash from '../screens/SplashScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import { storage } from '../utils/secureStorage';

export default function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);

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
    <NavigationContainer>
      {showSplash ? (
        <AnimatedSplash onFinish={() => setShowSplash(false)} />
      ) : showOnboarding === null || isLoading ? (
        <LoadingScreen />
      ) : showOnboarding ? (
        <OnboardingScreen onComplete={() => setShowOnboarding(false)} />
      ) : isAuthenticated ? (
        <MainTabs />
      ) : (
        <AuthStack />
      )}
    </NavigationContainer>
  );
}
