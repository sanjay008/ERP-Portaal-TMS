import i18n from '@/src/screens/Translation/i18n';

/** Add these keys to your translation API (manual translations). */
export const TRACKING_NOTIFICATION_TITLE_KEY = 'GPS tracking notification title';
export const TRACKING_NOTIFICATION_BODY_KEY = 'GPS tracking notification body';

const FALLBACK_TITLE = 'ERP TMS Driver';
const FALLBACK_BODY = 'Location tracking is active';

export function getTrackingNotificationLabels(): {
  notificationTitle: string;
  notificationBody: string;
} {
  return {
    notificationTitle: i18n.t(TRACKING_NOTIFICATION_TITLE_KEY, {
      defaultValue: FALLBACK_TITLE,
    }),
    notificationBody: i18n.t(TRACKING_NOTIFICATION_BODY_KEY, {
      defaultValue: FALLBACK_BODY,
    }),
  };
}
