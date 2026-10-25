import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { isRunningInExpoGo, requireOptionalNativeModule } from 'expo';
import { Trip, ItineraryEntry, AppSettings } from '../types';

let _notificationsModule: typeof import('expo-notifications') | null = null;
let _checked = false;

/**
 * Ensures Android 8.0+ notification channel is created.
 * Required for local notifications to pop up and play sounds on Android.
 */
export async function setupAndroidNotificationChannel(Notifications = getNotifications()) {
  if (!Notifications || Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'TripSP Travel Alerts',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6C63FF',
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
    });
  } catch (err) {
    console.warn('Failed to set notification channel:', err);
  }
}

function getNotifications(): typeof import('expo-notifications') | null {
  if (_checked) return _notificationsModule;
  _checked = true;

  try {
    // 1. Official Expo check for Expo Go client
    if (typeof isRunningInExpoGo === 'function' && isRunningInExpoGo()) {
      return null;
    }

    // 2. Constants environment fallback
    const isStoreClient =
      Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
      (Constants as any).appOwnership === 'expo';
    if (isStoreClient) {
      return null;
    }

    // 3. On Android, Expo Go omits native module binaries.
    // Check if the binary exists before requiring to avoid uncaught fatal evaluation error.
    if (Platform.OS === 'android') {
      const hasTopicModule =
        typeof requireOptionalNativeModule === 'function'
          ? requireOptionalNativeModule('ExpoTopicSubscriptionModule')
          : null;
      if (!hasTopicModule) {
        return null;
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('expo-notifications');
    if (mod && mod.setNotificationHandler) {
      _notificationsModule = mod;
      mod.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });

      // Initialize channel on Android
      setupAndroidNotificationChannel(mod);
    }
  } catch (err) {
    _notificationsModule = null;
  }

  return _notificationsModule;
}

/**
 * Requests device notification permissions and sets up the Android channel.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  const Notifications = getNotifications();
  if (!Notifications) return false;

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus === 'granted') {
      await setupAndroidNotificationChannel(Notifications);
    }
    return finalStatus === 'granted';
  } catch (error) {
    console.warn('Failed to get notification permissions:', error);
    return false;
  }
}

/**
 * Cancels all scheduled notifications for a given trip.
 */
export async function cancelTripNotifications(tripId: string) {
  const Notifications = getNotifications();
  if (!Notifications) return;

  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const item of scheduled) {
      if (item.content.data && item.content.data.tripId === tripId) {
        await Notifications.cancelScheduledNotificationAsync(item.identifier);
      }
    }
  } catch (error) {
    console.warn('Failed to cancel notifications for trip:', error);
  }
}

/**
 * Cancels all scheduled notifications across all trips.
 */
export async function cancelAllTripNotifications() {
  const Notifications = getNotifications();
  if (!Notifications) return;

  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.warn('Failed to cancel all notifications:', error);
  }
}

/**
 * Helper to format lead minutes into human-friendly strings (e.g. "30 minutes", "1 hour", "3 hours", "1.5 hours")
 */
export function formatLeadTime(minutes: number): string {
  if (!minutes || minutes <= 0) return '0 minutes';
  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  }
  if (minutes % 1440 === 0) {
    const days = minutes / 1440;
    return `${days} day${days === 1 ? '' : 's'}`;
  }
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return `${hours} hour${hours === 1 ? '' : 's'}`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  if (hours === 0) {
    return `${remainingMins} mins`;
  }
  return `${hours}h ${remainingMins}m`;
}

/**
 * Schedules offline local notifications for upcoming flights, hotel checkouts, and activities.
 */
export async function scheduleTripNotifications(
  trip: Trip,
  entries: ItineraryEntry[],
  settings?: AppSettings
): Promise<number> {
  const Notifications = getNotifications();
  if (!Notifications) return 0;

  try {
    // If user disabled notifications in settings, cancel existing and return
    if (settings?.notificationSettings?.enabled === false) {
      await cancelTripNotifications(trip.id);
      return 0;
    }

    // Ensure Android notification channel is established
    await setupAndroidNotificationChannel(Notifications);

    // Cancel old scheduled notifications for this trip to prevent duplicate alarms
    await cancelTripNotifications(trip.id);

    const now = Date.now();
    const flightPref = settings?.notificationSettings?.flightReminders !== false;
    const flightLeadMinutes = settings?.notificationSettings?.flightLeadMinutes ?? 180;
    const flightLeadMs = flightLeadMinutes * 60 * 1000;

    const hotelPref = settings?.notificationSettings?.hotelReminders !== false;
    const hotelLeadMinutes = settings?.notificationSettings?.hotelLeadMinutes ?? 60;
    const hotelLeadMs = hotelLeadMinutes * 60 * 1000;

    const activityPref = settings?.notificationSettings?.activityReminders !== false;
    const activityLeadMinutes = settings?.notificationSettings?.activityLeadMinutes ?? 30;
    const activityLeadMs = activityLeadMinutes * 60 * 1000;

    let scheduledCount = 0;

    for (const entry of entries) {
      if (entry.tripId !== trip.id) continue;

      // 1. Flights: Configurable hours/mins before departure
      if (flightPref && entry.type === 'flight' && entry.flightDetails) {
        const { flightDetails } = entry;
        const flightName = flightDetails.flightName ? ` (${flightDetails.flightName})` : '';

        // If connecting flight with separate legs, schedule alarms for each upcoming leg
        if (flightDetails.isConnecting && flightDetails.connections && flightDetails.connections.length > 0) {
          for (let i = 0; i < flightDetails.connections.length; i++) {
            const conn = flightDetails.connections[i];
            if (!conn.departureTime) continue;
            const depTime = new Date(conn.departureTime).getTime();
            const triggerTime = depTime - flightLeadMs;

            if (triggerTime > now) {
              const leadText = formatLeadTime(flightLeadMinutes);
              const legFlightName = conn.flightName ? ` (${conn.flightName})` : flightName;
              const legTitle = flightDetails.connections.length > 1
                ? `✈️ Upcoming Flight Leg ${i + 1}${legFlightName}`
                : `✈️ Upcoming Flight${flightName}`;

              await Notifications.scheduleNotificationAsync({
                content: {
                  title: legTitle,
                  body: `Flight from ${conn.from} to ${conn.to} departs in ${leadText}. Check terminals & passports!`,
                  data: { tripId: trip.id, entryId: entry.id, legIndex: i },
                  sound: true,
                  priority: Notifications.AndroidNotificationPriority.HIGH,
                },
                trigger: {
                  type: Notifications.SchedulableTriggerInputTypes.DATE,
                  date: triggerTime,
                  channelId: 'default',
                },
              }).catch((err) => console.warn('Failed scheduling flight leg notification:', err));
              scheduledCount++;
            }
          }
        } else if (flightDetails.departureTime) {
          const depTime = new Date(flightDetails.departureTime).getTime();
          const triggerTime = depTime - flightLeadMs;

          if (triggerTime > now) {
            const leadText = formatLeadTime(flightLeadMinutes);
            await Notifications.scheduleNotificationAsync({
              content: {
                title: `✈️ Upcoming Flight${flightName}`,
                body: `Flight from ${flightDetails.from} to ${flightDetails.to} departs in ${leadText}. Check terminals & passports!`,
                data: { tripId: trip.id, entryId: entry.id },
                sound: true,
                priority: Notifications.AndroidNotificationPriority.HIGH,
              },
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: triggerTime,
                channelId: 'default',
              },
            }).catch((err) => console.warn('Failed scheduling flight notification:', err));
            scheduledCount++;
          }
        }
      }

      // 2. Hotel Check-out: Configurable hours/mins before checkout
      if (hotelPref && entry.type === 'hotel' && entry.hotelDetails?.checkOutTime) {
        const outTime = new Date(entry.hotelDetails.checkOutTime).getTime();
        const triggerTime = outTime - hotelLeadMs;

        if (triggerTime > now) {
          const leadText = formatLeadTime(hotelLeadMinutes);
          const hotelName = entry.hotelDetails.name || 'Hotel';
          await Notifications.scheduleNotificationAsync({
            content: {
              title: `🏨 Hotel Check-out in ${leadText}`,
              body: `Reminder: Check-out from ${hotelName} is coming up soon in ${leadText}. Ensure all belongings are packed!`,
              data: { tripId: trip.id, entryId: entry.id },
              sound: true,
              priority: Notifications.AndroidNotificationPriority.HIGH,
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: triggerTime,
              channelId: 'default',
            },
          }).catch((err) => console.warn('Failed scheduling hotel notification:', err));
          scheduledCount++;
        }
      }

      // 3. Attractions / Activities: Configurable hours/mins before start
      if (activityPref && entry.type === 'attraction' && entry.attractionDetails?.startTime) {
        const startTime = new Date(entry.attractionDetails.startTime).getTime();
        const triggerTime = startTime - activityLeadMs;

        if (triggerTime > now) {
          const leadText = formatLeadTime(activityLeadMinutes);
          await Notifications.scheduleNotificationAsync({
            content: {
              title: `🎟️ Activity Reminder: ${entry.title}`,
              body: `Your booking for ${entry.title} starts in ${leadText}!`,
              data: { tripId: trip.id, entryId: entry.id },
              sound: true,
              priority: Notifications.AndroidNotificationPriority.HIGH,
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: triggerTime,
              channelId: 'default',
            },
          }).catch((err) => console.warn('Failed scheduling activity notification:', err));
          scheduledCount++;
        }
      }
    }

    return scheduledCount;
  } catch (error) {
    console.warn('Failed to schedule trip notifications:', error);
    return 0;
  }
}
let _isSyncing = false;
let _pendingSync: { trips: Trip[]; entries: ItineraryEntry[]; settings?: AppSettings; resolve: (val: number) => void } | null = null;

async function doSyncAllNotifications(
  Notifications: typeof import('expo-notifications'),
  trips: Trip[],
  entries: ItineraryEntry[],
  settings?: AppSettings
): Promise<number> {
  try {
    // If user disabled notifications in settings, cancel all and return
    if (settings?.notificationSettings?.enabled === false) {
      await cancelAllTripNotifications();
      return 0;
    }

    // Ensure Android notification channel is established
    await setupAndroidNotificationChannel(Notifications);

    // Active trips that are not cancelled or completed
    const eligibleTrips = trips.filter(
      (t) => t.status !== 'CANCELLED' && t.status !== 'COMPLETED'
    );
    const eligibleTripIds = new Set(eligibleTrips.map((t) => t.id));

    // Cancel notifications for trips that no longer exist or are completed/cancelled
    const scheduled = await Notifications.getAllScheduledNotificationsAsync().catch(() => []);
    for (const item of scheduled) {
      const tripId = item.content?.data?.tripId as string | undefined;
      if (tripId && !eligibleTripIds.has(tripId)) {
        await Notifications.cancelScheduledNotificationAsync(item.identifier).catch(() => {});
      }
    }

    let totalScheduled = 0;
    for (const trip of eligibleTrips) {
      const tripEntries = entries.filter((e) => e.tripId === trip.id);
      const count = await scheduleTripNotifications(trip, tripEntries, settings);
      totalScheduled += count;
    }

    return totalScheduled;
  } catch (err) {
    console.warn('Failed to sync all notifications:', err);
    return 0;
  }
}

/**
 * Fully synchronizes all offline notifications across all active trips and entries.
 * Handles additions, modifications, cancellations, and settings changes.
 * Guarantees serial execution through an internal mutex to prevent native bridge race conditions.
 */
export async function syncAllNotifications(
  trips: Trip[],
  entries: ItineraryEntry[],
  settings?: AppSettings
): Promise<number> {
  const Notifications = getNotifications();
  if (!Notifications) return 0;

  if (_isSyncing) {
    return new Promise<number>((resolve) => {
      _pendingSync = { trips, entries, settings, resolve };
    });
  }

  _isSyncing = true;
  try {
    return await doSyncAllNotifications(Notifications, trips, entries, settings);
  } finally {
    _isSyncing = false;
    if (_pendingSync) {
      const next = _pendingSync;
      _pendingSync = null;
      syncAllNotifications(next.trips, next.entries, next.settings).then(next.resolve);
    }
  }
}

/**
 * Schedules a local test notification after a 3-second delay
 * to allow immediate verification of sound, banner, and offline alarm delivery.
 */
export async function sendTestNotification(): Promise<{ success: boolean; message?: string }> {
  const Notifications = getNotifications();
  if (!Notifications) {
    const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
    return {
      success: false,
      message: isExpoGo
        ? 'Notifications use Android native AlarmManager which is omitted by Expo in the generic Expo Go app (SDK 52+). It works automatically in a standalone APK or Development Build (npx expo run:android).'
        : 'expo-notifications native module could not be initialized on this device.',
    };
  }

  const granted = await requestNotificationPermissions();
  if (!granted) {
    return {
      success: false,
      message: 'Notification permission was not granted on this device.',
    };
  }

  await setupAndroidNotificationChannel(Notifications);

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '✈️ TripSP Offline Test Alert',
        body: 'Local offline device notifications are working properly! Reminders will trigger for your flights, hotels, and activities.',
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 3,
        channelId: 'default',
      },
    });
    return { success: true };
  } catch (err: any) {
    console.error('Failed to schedule test notification:', err);
    return {
      success: false,
      message: err?.message || 'Failed to schedule notification.',
    };
  }
}

/**
 * Returns the count of all currently scheduled alarms.
 */
export async function getScheduledNotificationsCount(): Promise<number> {
  const Notifications = getNotifications();
  if (!Notifications) return 0;
  try {
    const list = await Notifications.getAllScheduledNotificationsAsync();
    return list.length;
  } catch {
    return 0;
  }
}
