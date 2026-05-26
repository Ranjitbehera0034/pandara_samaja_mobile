import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { LanguageProvider } from './src/context/LanguageContext';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      {/* @ts-ignore */}
      <StatusBar style="light" backgroundColor="#0f172a" />
      <AuthProvider>
        <LanguageProvider>
          <RootNavigator />
        </LanguageProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
