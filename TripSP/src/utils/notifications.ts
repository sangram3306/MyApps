import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Trip, ItineraryEntry, AppSettings } from '../types';

let _notificationsModule: typeof import('expo-notifications') | null = null;
let _checked = false;

function getNotifications(): typeof import('expo-notifications') | null {
  if (_checked) return _notificationsModule;
  _checked = true;

  try {
    // 1. In Expo Go (StoreClient), expo-notifications native modules were removed in SDK 52+
    const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
    if (isExpoGo) {
      return null;
    }

    // 2. Safe check: ensure native binary actually includes the module before importing
    if (Platform.OS === 'android') {
      const topicSub = requireOptionalNativeModule('ExpoTopicSubscriptionModule');
      if (!topicSub) {
        return null;
      }
    } else if (Platform.OS === 'ios') {
      const notifEmitter = requireOptionalNativeModule('ExpoNotificationsEmitter');
      if (!notifEmitter) {
        return null;
      }
    }

    // 3. Only require expo-notifications if native binary module exists
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('expo-notifications');
    if (mod && mod.setNotificationHandler) {
      _notificationsModule = mod;
      mod.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
    }
  } catch {
    _notificationsModule = null;
  }

  return _notificationsModule;
}

/**
 * Requests device notification permissions.
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
 * Schedules offline local notifications for upcoming flights, hotel checkouts, and activities.
 */
export async function scheduleTripNotifications(
  trip: Trip,
  entries: ItineraryEntry[],
  settings?: AppSettings
) {
  const Notifications = getNotifications();
  if (!Notifications) return;

  try {
    // If user disabled notifications in settings, cancel existing and return
    if (settings?.notificationSettings?.enabled === false) {
      await cancelTripNotifications(trip.id);
      return;
    }

    // Cancel old scheduled notifications for this trip to prevent duplicate alarms
    await cancelTripNotifications(trip.id);

    const now = Date.now();
    const flightPref = settings?.notificationSettings?.flightReminders !== false;
    const hotelPref = settings?.notificationSettings?.hotelReminders !== false;
    const activityPref = settings?.notificationSettings?.activityReminders !== false;

    for (const entry of entries) {
      if (entry.tripId !== trip.id) continue;

      // 1. Flights: 3 hours before departure
      if (flightPref && entry.type === 'flight' && entry.flightDetails?.departureTime) {
        const depTime = new Date(entry.flightDetails.departureTime).getTime();
        const triggerTime = depTime - 3 * 60 * 60 * 1000; // 3 hours before

        if (triggerTime > now) {
          const flightName = entry.flightDetails.flightName ? ` (${entry.flightDetails.flightName})` : '';
          await Notifications.scheduleNotificationAsync({
            content: {
              title: `✈️ Upcoming Flight${flightName}`,
              body: `Flight from ${entry.flightDetails.from} to ${entry.flightDetails.to} departs in 3 hours. Check terminals & passports!`,
              data: { tripId: trip.id, entryId: entry.id },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: triggerTime,
            },
          }).catch(() => {});
        }
      }

      // 2. Hotel Check-out: 1 hour before checkout
      if (hotelPref && entry.type === 'hotel' && entry.hotelDetails?.checkOutTime) {
        const outTime = new Date(entry.hotelDetails.checkOutTime).getTime();
        const triggerTime = outTime - 1 * 60 * 60 * 1000; // 1 hour before

        if (triggerTime > now) {
          const hotelName = entry.hotelDetails.name || 'Hotel';
          await Notifications.scheduleNotificationAsync({
            content: {
              title: `🏨 Hotel Check-out in 1 Hour`,
              body: `Reminder: Check-out from ${hotelName} is coming up soon. Ensure all belongings are packed!`,
              data: { tripId: trip.id, entryId: entry.id },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: triggerTime,
            },
          }).catch(() => {});
        }
      }

      // 3. Attractions / Activities: 30 minutes before start
      if (activityPref && entry.type === 'attraction' && entry.attractionDetails?.startTime) {
        const startTime = new Date(entry.attractionDetails.startTime).getTime();
        const triggerTime = startTime - 30 * 60 * 1000; // 30 minutes before

        if (triggerTime > now) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: `🎟️ Activity Reminder: ${entry.title}`,
              body: `Your booking for ${entry.title} starts in 30 minutes!`,
              data: { tripId: trip.id, entryId: entry.id },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: triggerTime,
            },
          }).catch(() => {});
        }
      }
    }
  } catch (error) {
    console.warn('Failed to schedule trip notifications:', error);
  }
}
