import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { authAPI } from '../services/api';

export const registerPushToken = async () => {
  try {
    // Push tokens only work on real devices, not simulators
    if (!Device.isDevice) return;

    // Ask for permission
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permission denied');
      return;
    }

    // Get the Expo push token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: '3b913f57-d8c6-403a-8928-ed3c917d4c61',
    });

    const push_token = tokenData.data;
    console.log('Push token:', push_token);

    // Save to backend
    await authAPI.savePushToken(push_token);
    console.log('Push token saved to backend');

  } catch (err) {
    console.log('Push token registration error:', err);
  }
};