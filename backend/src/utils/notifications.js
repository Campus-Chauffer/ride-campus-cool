const { Expo } = require('expo-server-sdk');

const expo = new Expo();

// Mirrors RIDE_LIFECYCLE_NOTIFICATION_TYPES in mobile/src/navigation/AppNavigator.tsx
// — these get the distinct car-horn sound (bundled via the expo-notifications
// config plugin, see app.config.js) rather than the phone's default
// notification tone, since they're the events a driver/passenger most needs
// to notice immediately (a new offer with a countdown to accept, a driver
// arriving, etc.). Keep this list in sync with the client's if either changes.
const RIDE_LIFECYCLE_TYPES = new Set([
  'ride_request', 'driver_found', 'driver_arrived',
  'trip_started', 'trip_completed_passenger', 'trip_completed_driver',
]);

const sendPushNotification = async (pushToken, title, body, data = {}) => {
  if (!pushToken || !Expo.isExpoPushToken(pushToken)) {
    console.log(`Invalid or missing push token: ${pushToken}`);
    return;
  }

  const message = {
    to: pushToken,
    sound: RIDE_LIFECYCLE_TYPES.has(data.type) ? 'car_horn.wav' : 'default',
    title,
    body,
    data,
  };

  try {
    const chunks = expo.chunkPushNotifications([message]);
    for (const chunk of chunks) {
      const receipts = await expo.sendPushNotificationsAsync(chunk);
      console.log('Push notification sent:', receipts);
    }
  } catch (err) {
    console.error('Push notification error:', err);
  }
};

// For broadcasting to many users at once (e.g. admin announcements). Expo
// caps each push request at 100 messages, so sendPushNotificationsAsync
// needs its input pre-chunked — this batches all valid tokens through that
// chunking instead of firing one HTTP request per recipient.
const sendBulkPushNotifications = async (pushTokens, title, body, data = {}) => {
  const messages = pushTokens
    .filter((token) => token && Expo.isExpoPushToken(token))
    .map((token) => ({ to: token, sound: 'default', title, body, data }));

  if (messages.length === 0) return { sent: 0 };

  const chunks = expo.chunkPushNotifications(messages);
  let sent = 0;
  for (const chunk of chunks) {
    try {
      await expo.sendPushNotificationsAsync(chunk);
      sent += chunk.length;
    } catch (err) {
      console.error('Bulk push notification error:', err);
    }
  }
  return { sent };
};

module.exports = { sendPushNotification, sendBulkPushNotifications };