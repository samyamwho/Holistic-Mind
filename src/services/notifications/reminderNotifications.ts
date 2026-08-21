import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import type { ProfilePreferences } from "../../context/AuthContext";

const REMINDER_CHANNEL_ID = "wellness-reminders";
const DAILY_CHECK_IN_ID = "holistic-mind-daily-check-in";
const PRACTICE_REMINDER_ID = "holistic-mind-practice-reminder";

const reminderSchedules = {
  dailyCheckIn: { hour: 9, minute: 0 },
  practice: { hour: 18, minute: 0 },
} as const;

if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

async function ensureAndroidChannel() {
  if (Platform.OS !== "android") return;

  await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
    name: "Wellness reminders",
    description: "Daily check-in and gentle practice reminders",
    importance: Notifications.AndroidImportance.DEFAULT,
    lightColor: "#F6E3C5",
    vibrationPattern: [0, 180],
  });
}

async function hasNotificationPermission() {
  if (Platform.OS === "web") return false;
  const permissions = await Notifications.getPermissionsAsync();
  return permissions.status === Notifications.PermissionStatus.GRANTED;
}

export async function requestReminderPermission() {
  if (Platform.OS === "web") return false;

  await ensureAndroidChannel();
  if (await hasNotificationPermission()) return true;

  const permissions = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: false,
      allowSound: true,
    },
  });
  return permissions.status === Notifications.PermissionStatus.GRANTED;
}

async function cancelKnownReminders() {
  if (Platform.OS === "web") return;
  await Promise.all([
    Notifications.cancelScheduledNotificationAsync(DAILY_CHECK_IN_ID),
    Notifications.cancelScheduledNotificationAsync(PRACTICE_REMINDER_ID),
  ]);
}

async function scheduleDailyReminder({
  body,
  hour,
  identifier,
  minute,
  route,
  title,
}: {
  body: string;
  hour: number;
  identifier: string;
  minute: number;
  route: "daily-check-in" | "explore";
  title: string;
}) {
  await Notifications.scheduleNotificationAsync({
    identifier,
    content: {
      title,
      body,
      data: { route },
      sound: "default",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      ...(Platform.OS === "android" ? { channelId: REMINDER_CHANNEL_ID } : {}),
    },
  });
}

export async function synchronizeReminderNotifications(
  preferences: Pick<ProfilePreferences, "dailyReminder" | "practiceReminder">
) {
  if (Platform.OS === "web") return { permissionGranted: false };

  await ensureAndroidChannel();
  await cancelKnownReminders();

  const permissionGranted = await hasNotificationPermission();
  if (!permissionGranted) return { permissionGranted };

  const schedules: Promise<void>[] = [];
  if (preferences.dailyReminder) {
    schedules.push(scheduleDailyReminder({
      identifier: DAILY_CHECK_IN_ID,
      title: "A gentle moment for you",
      body: "Take a minute to notice how your nervous system feels today.",
      route: "daily-check-in",
      ...reminderSchedules.dailyCheckIn,
    }));
  }
  if (preferences.practiceReminder) {
    schedules.push(scheduleDailyReminder({
      identifier: PRACTICE_REMINDER_ID,
      title: "Pause and come back to yourself",
      body: "A short practice can help you reset and reconnect.",
      route: "explore",
      ...reminderSchedules.practice,
    }));
  }

  await Promise.all(schedules);
  return { permissionGranted };
}

export async function clearReminderNotifications() {
  await cancelKnownReminders();
}

export async function scheduleTestReminder() {
  if (Platform.OS === "web") return false;
  await ensureAndroidChannel();
  if (!(await requestReminderPermission())) return false;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Holistic Mind reminders are ready",
      body: "You’ll receive gentle prompts based on your reminder preferences.",
      data: { route: "daily-check-in" },
      sound: "default",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 2,
      ...(Platform.OS === "android" ? { channelId: REMINDER_CHANNEL_ID } : {}),
    },
  });
  return true;
}

export const reminderTimes = {
  dailyCheckIn: "9:00 AM",
  practice: "6:00 PM",
} as const;
