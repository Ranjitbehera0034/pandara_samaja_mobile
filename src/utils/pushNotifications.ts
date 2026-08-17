// src/utils/pushNotifications.ts
//
// Registers this device's Expo push token with the backend so the member
// can receive real OS-level push notifications (new messages, likes,
// comments, follows, new posts, new stories, announcements) even when the
// app is closed or backgrounded — not just the in-app Socket.IO-driven
// bell/badge, which only updates while the app is open.
//
// Only ~0.4% of members had a registered token at one point — almost
// entirely because the bare OS permission dialog was the very first thing
// shown, with zero context, right after login. A primer screen explaining
// the value before asking is a well-established way to raise opt-in
// meaningfully, and matters doubly on iOS: a denied system prompt can only
// be undone via Settings, there's no second native ask.
//
// This must still run quietly: permission denial (at the primer, or at the
// real OS prompt) is a completely normal outcome, never an error to
// surface, and this never blocks or interrupts login/app-launch.
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Alert } from 'react-native';
import { registerPushToken } from '../api/members';

// `t` isn't imported here — this module sits below LanguageContext in the
// dependency graph and is called from AuthContext before any provider
// tree exists. Keeping the primer's copy as plain bilingual strings here
// avoids a circular import; it's two short sentences, not worth the
// context plumbing.
const PRIMER_TITLE = 'Stay in the loop';
const PRIMER_MESSAGE = 'Turn on notifications to hear about new posts, stories, and comments — even when the app is closed.';
const PRIMER_NOT_NOW = 'Not now';
const PRIMER_ENABLE = 'Enable';

async function completeRegistration(): Promise<void> {
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) return;
  const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
  await registerPushToken(tokenResponse.data);
}

export async function registerForPushNotificationsAsync(): Promise<void> {
  try {
    // Push tokens aren't obtainable on simulators/emulators — skip entirely.
    if (!Device.isDevice) return;

    const existing = await Notifications.getPermissionsAsync();

    if (existing.status === 'granted') {
      await completeRegistration();
      return;
    }

    // Already permanently denied (or the platform won't show a dialog
    // again) — a primer here would just be nagging toward a dead end.
    // Silent no-op, same as before.
    if (!existing.canAskAgain) return;

    // Not yet decided — show the primer before the real OS prompt.
    const wantsToEnable = await new Promise<boolean>((resolve) => {
      Alert.alert(
        PRIMER_TITLE,
        PRIMER_MESSAGE,
        [
          { text: PRIMER_NOT_NOW, style: 'cancel', onPress: () => resolve(false) },
          { text: PRIMER_ENABLE, onPress: () => resolve(true) },
        ],
        { cancelable: true, onDismiss: () => resolve(false) }
      );
    });
    if (!wantsToEnable) return;

    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;

    await completeRegistration();
  } catch (err) {
    // Never let a push-registration failure surface to the user or break
    // login/app-launch — this is best-effort background plumbing.
    console.warn('[pushNotifications] Failed to register push token:', err);
  }
}

// Clears the stored push token server-side (e.g. on logout, or if the user
// disables notifications) so a signed-out device stops receiving pushes
// meant for the account that just logged out.
export async function clearPushToken(): Promise<void> {
  try {
    await registerPushToken(null);
  } catch (err) {
    console.warn('[pushNotifications] Failed to clear push token:', err);
  }
}
