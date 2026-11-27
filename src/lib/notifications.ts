// Device notifications: push registration and local session reminders.
//
// Push notifications are sent by the database (see the social migration). In
// Expo Go, remote push only works on iOS; every call here fails quietly where
// a platform does not support it, and the in-app notifications screen still
// shows everything.

import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { hobby } from './hobbies';
import type { Session } from './types';

const REMINDER_MINUTES = 60;
const supported = Platform.OS !== 'web';

if (supported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

async function ensurePermission(): Promise<boolean> {
  if (!supported) return false;
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'صحبة',
        // Re-exported through `export *`, which the lint rule cannot follow; tsc checks it.
        // eslint-disable-next-line import/namespace
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    const asked = await Notifications.requestPermissionsAsync();
    return asked.granted;
  } catch {
    return false;
  }
}

/** Asks for permission and returns this device's Expo push token, or null. */
export async function getPushToken(): Promise<string | null> {
  if (!supported || !Device.isDevice) return null;
  if (!(await ensurePermission())) return null;
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    const { data } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    return data;
  } catch {
    // Not available here (for example Android in Expo Go).
    return null;
  }
}

const reminderId = (sessionId: string) => `reminder-${sessionId}`;

/** Schedules a reminder an hour before the session (replacing any earlier one). */
export async function scheduleReminder(session: Pick<Session, 'id' | 'hobbyId' | 'startsAt' | 'venueName'>) {
  if (!supported || !session.startsAt) return;
  const at = new Date(new Date(session.startsAt).getTime() - REMINDER_MINUTES * 60_000);
  if (at.getTime() <= Date.now()) return;
  if (!(await ensurePermission())) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(reminderId(session.id)).catch(() => {});
    await Notifications.scheduleNotificationAsync({
      identifier: reminderId(session.id),
      content: {
        title: 'جلستك بعد ساعة',
        body: `${hobby(session.hobbyId).name}${session.venueName ? ` · ${session.venueName}` : ''}`,
        data: { sessionId: session.id, kind: 'reminder' },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at },
    });
  } catch {
    // Scheduling is best effort.
  }
}

export async function cancelReminder(sessionId: string) {
  if (!supported) return;
  await Notifications.cancelScheduledNotificationAsync(reminderId(sessionId)).catch(() => {});
}

export async function cancelAllReminders() {
  if (!supported) return;
  await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
}

/** Calls `onOpen` with the session id when the user taps a notification. */
export function onNotificationTap(onOpen: (sessionId: string) => void) {
  if (!supported) return () => {};
  const sub = Notifications.addNotificationResponseReceivedListener((r) => {
    const id = r.notification.request.content.data?.sessionId;
    if (typeof id === 'string') onOpen(id);
  });
  return () => sub.remove();
}
