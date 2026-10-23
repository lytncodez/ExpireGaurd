import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  readNotificationPreferences,
  saveNotificationPreferences,
  type NotificationPreferences,
} from './registrationService';

export { DEFAULT_NOTIFICATION_PREFERENCES };
export type { NotificationPreferences };

export function loadNotificationPreferences(): NotificationPreferences {
  return readNotificationPreferences();
}

export function updateNotificationPreferences(preferences: NotificationPreferences): void {
  saveNotificationPreferences(preferences);
}

export const notificationDeliveryStatus = {
  email: 'not_connected',
  sms: 'not_connected',
} as const;
