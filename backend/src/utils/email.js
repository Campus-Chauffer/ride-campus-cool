const { Resend } = require('resend');
const { renderEmailShell, heroNumber, infoRow, heading, paragraph, mutedNote, escapeHtml } = require('./emailTemplate');

const resend = new Resend(process.env.RESEND_API_KEY);
// Without a verified sending domain in Resend, this can only be
// onboarding@resend.dev, and Resend will only actually deliver to the
// address the account was signed up with - fine for confirming the
// integration itself works, not for real users until a domain is
// verified and this is pointed at an address on it.
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
const FROM = `Campus Chauffeur <${FROM_EMAIL}>`;

// Resend's SDK returns { data, error } rather than throwing - this
// normalizes it back to the throw-on-failure shape the rest of this file
// (and authController's forgotPassword, which relies on sendPasswordResetOTP
// rejecting on failure) already expects.
async function send(params) {
  const { error } = await resend.emails.send(params);
  if (error) throw new Error(error.message);
}

const sendRatingReminder = async (email, firstName, tripId, role) => {
  if (!email) return;

  const subject = 'Rate your recent Campus Chauffeur ride';
  const action = role === 'passenger' ? 'rate your driver' : 'rate your passenger';

  const html = renderEmailShell({
    preheader: 'Your feedback helps keep Campus Chauffeur safe and reliable.',
    bodyHtml: `
      ${heading('How was your ride?')}
      ${paragraph(`Hi ${escapeHtml(firstName)}, your recent ride has been completed. Please take a moment to ${escapeHtml(action)} — open the Campus Chauffeur app to leave a rating.`)}
      ${paragraph('Your feedback helps keep Campus Chauffeur safe and reliable for everyone.')}
      ${mutedNote('You have 3 hours from trip completion to submit your rating.')}
    `,
  });

  try {
    await send({ from: FROM, to: email, subject, html });
    console.log(`Rating reminder sent to ${email}`);
  } catch (err) {
    console.error('Email error:', err);
  }
};

const sendRideReceipt = async (email, firstName, trip) => {
  if (!email) return;

  const html = renderEmailShell({
    preheader: `Your ride is complete — GH₵${trip.fare}`,
    bodyHtml: `
      ${heading('Your ride is complete')}
      ${paragraph(`Hi ${escapeHtml(firstName)}, thanks for riding with Campus Chauffeur. Here's your receipt.`)}
      ${heroNumber({ label: 'Fare', value: `GH₵${trip.fare}` })}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top: 4px;">
        ${infoRow({ label: 'From', value: trip.pickup_address })}
        ${infoRow({ label: 'To', value: trip.dropoff_address })}
        ${infoRow({ label: 'Date', value: new Date(trip.completed_at).toLocaleString() })}
      </table>
    `,
  });

  try {
    await send({ from: FROM, to: email, subject: 'Your Campus Chauffeur ride receipt', html });
    console.log(`Receipt sent to ${email}`);
  } catch (err) {
    console.error('Email error:', err);
  }
};

// Sent to the OLD address whenever an account's email is changed — the one
// notification a hijacked account can't suppress, since the attacker only
// controls the new address. Lets the real owner catch an unauthorized
// change even if they never open the app again after losing access.
const sendEmailChangedAlert = async (oldEmail, firstName, newEmail) => {
  if (!oldEmail) return;

  const html = renderEmailShell({
    preheader: 'The email address on your account was just changed.',
    bodyHtml: `
      ${heading('Your email was changed')}
      ${paragraph(`Hi ${escapeHtml(firstName)}, the email address on your Campus Chauffeur account was just changed to <strong>${escapeHtml(newEmail)}</strong>.`)}
      ${paragraph('<strong>If you made this change, you can ignore this email.</strong>')}
      ${paragraph(`If you didn't make this change, someone else may have access to your account. Contact us immediately at campuschauffeur1@gmail.com and change your password from the app's login screen using "Forgot Password."`)}
    `,
  });

  try {
    await send({ from: FROM, to: oldEmail, subject: 'Your Campus Chauffeur account email was changed', html });
    console.log(`Email-change alert sent to ${oldEmail}`);
  } catch (err) {
    console.error('Email error:', err);
  }
};

const sendPasswordResetOTP = async (email, firstName, otp) => {
  if (!email) return;

  const html = renderEmailShell({
    preheader: `Your password reset code is ${otp}`,
    bodyHtml: `
      ${heading('Reset your password')}
      ${paragraph(`Hi ${escapeHtml(firstName)}, use this code to reset your password.`)}
      ${heroNumber({ label: 'Reset code', value: otp, letterSpaced: true })}
      ${mutedNote("This code expires in 1 hour. If you didn't request this, you can safely ignore this email.")}
    `,
  });

  await send({ from: FROM, to: email, subject: 'Reset your Campus Chauffeur password', html });
};

module.exports = { sendRatingReminder, sendRideReceipt, sendEmailChangedAlert, sendPasswordResetOTP };
