import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const TMS_NOTIFICATION_SOUND = 'tms_notification.wav';
export const TMS_NOTIFICATION_CHANNEL_ID = 'tms_notification';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const registerForPushNotificationsAsync = async () => {
  try {
    if (!Device.isDevice) {
      alert('Must use physical device');
      return null;
    }

    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();

    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } =
        await Notifications.requestPermissionsAsync();

      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      alert('Permission not granted');
      return null;
    }

    const token = (
      await Notifications.getExpoPushTokenAsync({
        projectId:
          Constants.expoConfig?.extra?.eas?.projectId,
      })
    ).data;

    if (Platform.OS === 'android') {
      // Android locks a channel's sound when the channel is first created, so
      // devices that already have "default" also need the separate tms_notification channel.
      await Notifications.setNotificationChannelAsync(
        'default',
        {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
          sound: TMS_NOTIFICATION_SOUND,
        }
      );
      await Notifications.setNotificationChannelAsync(
        TMS_NOTIFICATION_CHANNEL_ID,
        {
          name: 'TMS Notifications',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
          sound: TMS_NOTIFICATION_SOUND,
        }
      );
    }

    return token;
  } catch (error) {
    console.log('Notification Error:', error);
    return null;
  }
};