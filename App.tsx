import 'react-native-gesture-handler';
import "./global.css";
import React, { useEffect } from 'react';
import { View, Text, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { Audio } from 'expo-av';
import { File, Paths } from 'expo-file-system';
import Toast from 'react-native-toast-message';
import { ShareIntentProvider, useShareIntentContext } from 'expo-share-intent';
import { AuthProvider } from './src/context/AuthContext';
import { ChatProvider } from './src/context/ChatContext';
import { AdminAuthProvider } from './src/context/AdminAuthContext';
import { LanguageProvider } from './src/context/LanguageContext';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import RootNavigator, { navigationRef } from './src/navigation/RootNavigator';
import UpdateBanner from './src/components/common/UpdateBanner';
import ErrorBoundary from './src/components/common/ErrorBoundary';
import { navigateFromNotificationData } from './src/utils/notificationNavigation';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync().catch(() => {});

// Temporary crash-visibility net: there's no crash reporter (Sentry etc.)
// wired up yet, so a fatal JS error in a release build otherwise just closes
// the app with nothing to go on. Write it to disk synchronously (a Promise
// write is too slow — the JS thread can be torn down before it flushes)
// before handing off to the default handler, then surface it once on the
// next launch so whoever's holding the phone can screenshot it.
const CRASH_LOG_FILE = new File(Paths.document, 'last_crash_log.json');
const defaultErrorHandler = ErrorUtils.getGlobalHandler();
ErrorUtils.setGlobalHandler((error, isFatal) => {
  try {
    CRASH_LOG_FILE.write(JSON.stringify({
      message: error?.message ?? String(error),
      stack: error?.stack ?? null,
      isFatal: !!isFatal,
      at: new Date().toISOString(),
    }, null, 2));
  } catch {
    // best-effort only — never let logging itself block the crash path
  }
  defaultErrorHandler(error, isFatal);
});

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
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();

  // If the app fatally crashed last launch, the global handler above wrote
  // details to disk — surface them once, then delete so this doesn't repeat
  // on every future normal launch.
  useEffect(() => {
    if (!CRASH_LOG_FILE.exists) return;
    CRASH_LOG_FILE.text()
      .then((contents) => {
        Alert.alert('Last crash report', contents);
      })
      .catch(() => {})
      .finally(() => {
        try { CRASH_LOG_FILE.delete(); } catch {}
      });
  }, []);

  // Sharing a link into the app from Facebook/YouTube/Instagram/etc (OS
  // share sheet) should land on the post composer pre-filled with that
  // link, not just open the app to wherever it was — same "external event
  // drives navigation via the ref" pattern as the notification-tap
  // handler right below. webUrl is set when the OS recognizes the shared
  // content as a URL specifically; text is the fallback raw shared string
  // (some apps share a caption + link together as plain text).
  useEffect(() => {
    if (!hasShareIntent || !shareIntent) return;
    const sharedText = shareIntent.webUrl || shareIntent.text;
    if (sharedText && navigationRef.isReady()) {
      navigationRef.navigate('Feed', { screen: 'FeedMain', params: { sharedText } });
    }
    resetShareIntent();
  }, [hasShareIntent, shareIntent, resetShareIntent]);

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

  // Plays once per app launch, like Netflix's "ta-dum" — starts as soon as
  // AppContent mounts (during the splash animation) and keeps playing
  // through the transition into the login/main screen, since it isn't tied
  // to the splash screen's own mount lifecycle. Cut short at 6s regardless
  // of the source clip's actual length. Respects the device's silent/mute
  // setting by design — this is a branding touch, not essential audio.
  useEffect(() => {
    let sound: Audio.Sound | null = null;
    let cancelled = false;

    Audio.Sound.createAsync(require('./assets/sounds/jagannath-ghanta.mp3'), { shouldPlay: true })
      .then(({ sound: loadedSound }) => {
        if (cancelled) {
          loadedSound.unloadAsync().catch(() => {});
          return;
        }
        sound = loadedSound;
      })
      .catch((e) => console.warn('[LaunchSound] Failed to play:', e));

    const stopTimer = setTimeout(() => {
      sound?.stopAsync().catch(() => {});
      sound?.unloadAsync().catch(() => {});
    }, 6000);

    return () => {
      cancelled = true;
      clearTimeout(stopTimer);
      sound?.unloadAsync().catch(() => {});
    };
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
    <ShareIntentProvider>
      <SafeAreaProvider>
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>
              <ChatProvider>
                <AdminAuthProvider>
                  <ErrorBoundary>
                    <AppContent />
                  </ErrorBoundary>
                </AdminAuthProvider>
              </ChatProvider>
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </ShareIntentProvider>
  );
}
