const https = require('https');

const sendSMS = async (to, message) => {
  const apiKey = process.env.MNOTIFY_API_KEY;

  if (!apiKey) {
    console.warn('mNotify API key not set — SMS not sent. Message:', message);
    return { success: false, reason: 'credentials_missing' };
  }

  // Format phone number — mNotify expects 0XXXXXXXXX format for Ghana
  let formattedTo = to.replace(/\s+/g, '');
  if (formattedTo.startsWith('+233')) {
    formattedTo = '0' + formattedTo.slice(4);
  } else if (formattedTo.startsWith('233')) {
    formattedTo = '0' + formattedTo.slice(3);
  }

  const payload = JSON.stringify({
    recipient: [formattedTo],
    sender: process.env.MNOTIFY_SENDER_ID,
    message: message,
    is_schedule: false,
    schedule_date: '',
    sms_otp: true,
  });

  return new Promise((resolve) => {
    const options = {
      hostname: 'api.mnotify.com',
      path: `/api/sms/quick?key=${apiKey}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode === 200 || parsed.status === 'success') {
            console.log(`SMS sent to ${to}:`, parsed);
            resolve({ success: true, data: parsed });
          } else {
            console.error(`SMS failed to ${to}:`, parsed);
            resolve({ success: false, data: parsed });
          }
        } catch (e) {
          console.error('SMS parse error:', data);
          resolve({ success: false, reason: 'parse_error' });
        }
      });
    });

    req.on('error', (err) => {
      console.error('SMS request error:', err);
      resolve({ success: false, reason: err.message });
    });

    req.write(payload);
    req.end();
  });
};

module.exports = { sendSMS };