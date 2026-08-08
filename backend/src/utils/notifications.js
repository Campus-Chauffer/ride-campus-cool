const { Expo } = require('expo-server-sdk');

const expo = new Expo();

const sendPushNotification = async (pushToken, title, body, data = {}) => {
  if (!pushToken || !Expo.isExpoPushToken(pushToken)) {
    console.log(`Invalid or missing push token: ${pushToken}`);
    return;
  }

  const message = {
    to: pushToken,
    sound: 'default',
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