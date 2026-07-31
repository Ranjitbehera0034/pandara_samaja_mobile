import 'react-native-gesture-handler';
import "./global.css";
import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import Toast from 'react-native-toast-message';
import { AuthProvider } from './src/context/AuthContext';
import { AdminAuthProvider } from './src/context/AdminAuthContext';
import { LanguageProvider } from './src/context/LanguageContext';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import RootNavigator from './src/navigation/RootNavigator';
import UpdateBanner from './src/components/common/UpdateBanner';
import { navigateFromNotificationData } from './src/utils/notificationNavigation';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync().catch(() => {});

// Show notifications with a banner/sound/badge even while the app is in the
// foreground — by default Expo/OS would otherwise suppress the alert while
// the app is active. `shouldShowBanner`/`shouldShowList` are the current
// (non-deprecated) fields on the installed expo-notifications version.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

function AppContent() {
  const { scheme, colors } = useTheme();

  // Tapping a push notification (app backgrounded or fully closed) should
  // deep-link to the relevant screen — see notificationNavigation.ts for the
  // type -> screen mapping. Registered once here since AppContent already
  // mounts near the root, alongside RootNavigator/UpdateBanner.
  useEffect(() => {
    // Cold start: the app may have been launched BY tapping a notification —
    // handle that initial response too, not just ones received while running.
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        navigateFromNotificationData(response.notification.request.content.data as any);
      }
    });

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      navigateFromNotificationData(response.notification.request.content.data as any);
    });

    return () => subscription.remove();
  }, []);

  const toastConfig = {
    success: ({ text1, text2 }: any) => (
      <View style={{
        backgroundColor: colors.card,
        borderLeftWidth: 4, borderLeftColor: colors.success,
        paddingHorizontal: 16, paddingVertical: 12,
        borderRadius: 12, marginHorizontal: 16,
        width: '90%',
        shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 4,
      }}>
        <Text style={{ color: colors.text, fontWeight: '600', fontSize: 14 }}>{text1}</Text>
        {text2 ? <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>{text2}</Text> : null}
      </View>
    ),
    error: ({ text1, text2 }: any) => (
      <View style={{
        backgroundColor: colors.card,
        borderLeftWidth: 4, borderLeftColor: colors.error,
        paddingHorizontal: 16, paddingVertical: 12,
        borderRadius: 12, marginHorizontal: 16,
        width: '90%',
        shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 4,
      }}>
        <Text style={{ color: colors.text, fontWeight: '600', fontSize: 14 }}>{text1}</Text>
        {text2 ? <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>{text2}</Text> : null}
      </View>
    ),
  };

  return (
    <>
      {/* @ts-ignore */}
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} backgroundColor={colors.bg} />
      <RootNavigator />
      <UpdateBanner />
      <Toast config={toastConfig} />
    </>
  );
}

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

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <AdminAuthProvider>
              <AppContent />
            </AdminAuthProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
