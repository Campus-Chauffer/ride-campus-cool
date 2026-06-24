const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendRatingReminder = async (email, firstName, tripId, role) => {
  if (!email) return;

  const subject = 'Rate your recent Campus Chauffeur ride';
  const action = role === 'passenger' ? 'rate your driver' : 'rate your passenger';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
      <div style="background: #FFB800; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: #1A1A2E; margin: 0;">🚗 Campus Chauffeur</h1>
      </div>
      <div style="background: #f5f5f5; padding: 24px; border-radius: 0 0 8px 8px;">
        <h2 style="color: #1A1A2E;">Hi ${firstName},</h2>
        <p style="color: #555;">Your recent ride has been completed. Please take a moment to ${action}.</p>
        <p style="color: #555;">Your feedback helps keep Campus Chauffeur safe and reliable for everyone.</p>
        <p style="color: #999; font-size: 12px;">You have 3 hours from trip completion to submit your rating.</p>
        <hr style="border: 1px solid #e0e0e0; margin: 20px 0;">
        <p style="color: #999; font-size: 11px; text-align: center;">Campus Chauffeur — Safe rides around UG Legon</p>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `Campus Chauffeur <${process.env.EMAIL_USER}>`,
      to: email,
      subject,
      html,
    });
    console.log(`Rating reminder sent to ${email}`);
  } catch (err) {
    console.error('Email error:', err);
  }
};

const sendRideReceipt = async (email, firstName, trip) => {
  if (!email) return;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
      <div style="background: #FFB800; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: #1A1A2E; margin: 0;">🚗 Campus Chauffeur</h1>
      </div>
      <div style="background: #f5f5f5; padding: 24px; border-radius: 0 0 8px 8px;">
        <h2 style="color: #1A1A2E;">Hi ${firstName}, your ride is complete!</h2>
        <div style="background: white; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 8px 0;"><strong>From:</strong> ${trip.pickup_address}</p>
          <p style="margin: 8px 0;"><strong>To:</strong> ${trip.dropoff_address}</p>
          <p style="margin: 8px 0;"><strong>Fare:</strong> GH₵${trip.fare}</p>
          <p style="margin: 8px 0;"><strong>Date:</strong> ${new Date(trip.completed_at).toLocaleString()}</p>
        </div>
        <p style="color: #999; font-size: 11px; text-align: center;">Campus Chauffeur — Safe rides around UG Legon</p>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `Campus Chauffeur <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Your Campus Chauffeur ride receipt',
      html,
    });
    console.log(`Receipt sent to ${email}`);
  } catch (err) {
    console.error('Email error:', err);
  }
};

module.exports = { sendRatingReminder, sendRideReceipt };