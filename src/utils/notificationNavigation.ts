// src/utils/notificationNavigation.ts
//
// Maps a push notification's `data` payload (set by the backend — see
// src/utils/pushNotifications.ts and the createNotification call sites in
// the backend repo) to an in-app navigation action, so tapping a
// notification while the app is backgrounded/closed lands the member on
// the relevant screen instead of just opening the app to wherever it was.
import { navigationRef } from '../navigation/RootNavigator';

export interface NotificationData {
  type?: 'message' | 'like' | 'comment' | 'new_post' | 'follow' | 'announcement' | string;
  fromId?: string;
  postId?: string | number;
  [key: string]: any;
}

export function navigateFromNotificationData(data: NotificationData | undefined | null): void {
  if (!data || !data.type) return;
  if (!navigationRef.isReady()) return;

  try {
    switch (data.type) {
      case 'message':
        // ChatScreen is a top-level tab (not nested in a stack) and already
        // supports deep-linking into a specific thread via {withId, withName}.
        navigationRef.navigate('Chat', { withId: data.fromId });
        break;

      case 'like':
      case 'comment':
      case 'new_post':
        // No single "view post" screen exists yet — the Feed tab is the
        // documented acceptable fallback for these types.
        navigationRef.navigate('Feed', { screen: 'FeedMain' });
        break;

      case 'follow':
        navigationRef.navigate('Feed', { screen: 'MemberProfile', params: { id: data.fromId } });
        break;

      case 'announcement':
        navigationRef.navigate('Feed', { screen: 'Announcements' });
        break;

      case 'news':
        // News is a pill within the Explore tab (not a separate route) —
        // no per-article deep link exists yet, so this lands on the News
        // pill specifically rather than just the Explore tab. ExploreScreen
        // stays mounted across tab switches, so passing initialTab forces
        // News even if the member last left a different pill selected —
        // see ExploreScreen's own effect that consumes this param.
        navigationRef.navigate('Explore', { screen: 'ExploreMain', params: { initialTab: 'news' } });
        break;

      case 'new_job':
        navigationRef.navigate('Feed', { screen: 'Jobs' });
        break;

      default:
        break;
    }
  } catch (err) {
    // Navigation from a background OS event is best-effort — a bad/unknown
    // payload shape must never crash the app.
    console.warn('[notificationNavigation] Failed to navigate from notification data:', err);
  }
}
