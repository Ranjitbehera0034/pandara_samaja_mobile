// src/utils/pushNotifications.ts
//
// Registers this device's Expo push token with the backend so the member
// can receive real OS-level push notifications (new messages, likes,
// comments, follows, new posts from people they follow, announcements)
// even when the app is closed or backgrounded — not just the in-app
// Socket.IO-driven bell/badge, which only updates while the app is open.
//
// This must run quietly: permission denial is a completely normal, silent
// outcome (not an error to surface), and `requestPermissionsAsync()` itself
// won't re-prompt on iOS/Android if the user already denied it, so calling
// this on every login/launch does not nag the user.
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { registerPushToken } from '../api/members';

export async function registerForPushNotificationsAsync(): Promise<void> {
  try {
    // Push tokens aren't obtainable on simulators/emulators — skip entirely.
    if (!Device.isDevice) return;

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      // Permission denied — normal, silent outcome. Nothing to register.
      return;
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) return;

    const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
    await registerPushToken(tokenResponse.data);
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
