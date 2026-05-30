import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import Toast from 'react-native-toast-message';
import { AuthProvider } from './src/context/AuthContext';
import { LanguageProvider } from './src/context/LanguageContext';
import RootNavigator from './src/navigation/RootNavigator';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    'NotoSansOriya': require('./assets/fonts/NotoSansOriya-Regular.ttf'),
    'NotoSansOriya-Bold': require('./assets/fonts/NotoSansOriya-Bold.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  // Custom Toast configurations matching slate theme
  const toastConfig = {
    success: ({ text1, text2 }: any) => (
      <View style={{
        backgroundColor: '#1e293b',
        borderLeftWidth: 4, borderLeftColor: '#22c55e',
        paddingHorizontal: 16, paddingVertical: 12,
        borderRadius: 12, marginHorizontal: 16,
        width: '90%',
        shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 4,
      }}>
        <Text style={{ color: '#f8fafc', fontWeight: '600', fontSize: 14 }}>{text1}</Text>
        {text2 ? <Text style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>{text2}</Text> : null}
      </View>
    ),
    error: ({ text1, text2 }: any) => (
      <View style={{
        backgroundColor: '#1e293b',
        borderLeftWidth: 4, borderLeftColor: '#ef4444',
        paddingHorizontal: 16, paddingVertical: 12,
        borderRadius: 12, marginHorizontal: 16,
        width: '90%',
        shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 4,
      }}>
        <Text style={{ color: '#f8fafc', fontWeight: '600', fontSize: 14 }}>{text1}</Text>
        {text2 ? <Text style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>{text2}</Text> : null}
      </View>
    ),
  };

  return (
    <SafeAreaProvider>
      {/* @ts-ignore */}
      <StatusBar style="light" backgroundColor="#0f172a" />
      <AuthProvider>
        <LanguageProvider>
          <RootNavigator />
        </LanguageProvider>
      </AuthProvider>
      <Toast config={toastConfig} />
    </SafeAreaProvider>
  );
}
