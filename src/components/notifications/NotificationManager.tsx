import { useEffect } from "react";

import { useAuth } from "../../context/AuthContext";
import {
  clearReminderNotifications,
  synchronizeReminderNotifications,
} from "../../services/notifications/reminderNotifications";

export default function NotificationManager() {
  const { preferences, user } = useAuth();

  useEffect(() => {
    const synchronize = user
      ? synchronizeReminderNotifications(preferences)
      : clearReminderNotifications();

    synchronize.catch((error) => {
      console.warn("Unable to synchronize reminder notifications", error);
    });
  }, [preferences.dailyReminder, preferences.practiceReminder, user]);

  return null;
}
