// Shared visual shell for every email Campus Chauffeur sends — the OTP
// reset code, ride receipts, rating reminders, email-change alerts, and
// admin-sent mass announcements all wrap their content in this same
// header/footer so they read as one brand instead of four one-off emails.
//
// Written as plain table markup with every style inlined on purpose: email
// clients (Outlook especially) strip <style> blocks and don't support
// flexbox/grid/CSS variables, so this can't be a normal web page — it has
// to be built the way email newsletters have always had to be built.

const BRAND_YELLOW = '#FFB800';
const BRAND_YELLOW_TINT = '#FFF6DE';
const BRAND_NAVY = '#1A1A2E';
const BRAND_NAVY_MUTED = '#6B6B80';
const CANVAS = '#F4F4F2';

// Hosted from the repo itself, the same approach already used for
// mobile/remote-config.json — no separate asset host to maintain.
const LOGO_URL = 'https://raw.githubusercontent.com/Campus-Chauffer/ride-campus-cool/main/mobile/assets/cc-logo.jpg';

const FONT_SERIF = "Georgia, 'Times New Roman', serif";
const FONT_SANS = "Arial, Helvetica, sans-serif";

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// The big, single focal number for an email that's really about one value
// — an OTP code or a fare. Deliberately the largest, boldest element on
// the page; everything else stays quiet so this is what a glance lands on.
function heroNumber({ label, value, letterSpaced }) {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
      <tr>
        <td align="center" style="background-color: ${BRAND_YELLOW_TINT}; border-radius: 12px; padding: 24px;">
          <div style="font-family: ${FONT_SANS}; font-size: 12px; font-weight: bold; color: ${BRAND_NAVY_MUTED}; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">${escapeHtml(label)}</div>
          <div style="font-family: ${FONT_SERIF}; font-size: 36px; font-weight: bold; color: ${BRAND_NAVY}; ${letterSpaced ? 'letter-spacing: 10px;' : ''}">${escapeHtml(value)}</div>
        </td>
      </tr>
    </table>
  `;
}

// A key/value line for a receipt-style layout — no hairline divider between
// rows, just a step in weight (label muted + regular, value full ink + bold)
// and spacing to tell them apart.
function infoRow({ label, value, emphasize }) {
  const valueColor = emphasize ? BRAND_YELLOW : BRAND_NAVY;
  const valueSize = emphasize ? '22px' : '15px';
  return `
    <tr>
      <td style="padding: 10px 0; font-family: ${FONT_SANS}; font-size: 13px; color: ${BRAND_NAVY_MUTED};">${escapeHtml(label)}</td>
      <td align="right" style="padding: 10px 0; font-family: ${FONT_SERIF}; font-size: ${valueSize}; font-weight: bold; color: ${valueColor};">${escapeHtml(value)}</td>
    </tr>
  `;
}

function ctaButton({ text, url }) {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 24px auto 4px;">
      <tr>
        <td align="center" style="background-color: ${BRAND_YELLOW}; border-radius: 10px;">
          <a href="${url}" style="display: inline-block; padding: 14px 32px; font-family: ${FONT_SANS}; font-size: 15px; font-weight: bold; color: ${BRAND_NAVY}; text-decoration: none;">${escapeHtml(text)}</a>
        </td>
      </tr>
    </table>
  `;
}

// Wraps any body content in the shared header (logo + wordmark) and footer
// (navy panel, support contact). `preheader` is the one-line preview text
// inbox lists show next to the subject — hidden on the page itself.
function renderEmailShell({ preheader, bodyHtml }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light">
<title>Campus Chauffeur</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${CANVAS};">
  ${preheader ? `<div style="display: none; max-height: 0; overflow: hidden; opacity: 0;">${escapeHtml(preheader)}</div>` : ''}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: ${CANVAS};">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px;">
          <tr>
            <td style="background-color: ${BRAND_YELLOW}; height: 6px; line-height: 6px; font-size: 0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="background-color: #FFFFFF; padding: 36px 32px 28px; text-align: center;">
              <img src="${LOGO_URL}" width="56" height="56" alt="Campus Chauffeur" style="display: block; margin: 0 auto 14px; border-radius: 14px;">
              <div style="font-family: ${FONT_SERIF}; font-size: 22px; font-weight: bold; color: ${BRAND_NAVY}; letter-spacing: -0.3px;">Campus Chauffeur</div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #FFFFFF; padding: 0 32px 40px;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="background-color: ${BRAND_NAVY}; padding: 28px 32px; text-align: center; border-radius: 0 0 4px 4px;">
              <div style="font-family: ${FONT_SANS}; font-size: 13px; color: #C8C8D4; line-height: 1.6;">
                Campus Chauffeur — Safe rides around UG Legon<br>
                Need help? <a href="mailto:campuschauffeur1@gmail.com" style="color: ${BRAND_YELLOW}; text-decoration: none;">campuschauffeur1@gmail.com</a>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function heading(text) {
  return `<h1 style="font-family: ${FONT_SERIF}; font-size: 22px; font-weight: bold; color: ${BRAND_NAVY}; margin: 28px 0 12px;">${escapeHtml(text)}</h1>`;
}

function paragraph(text) {
  return `<p style="font-family: ${FONT_SANS}; font-size: 15px; line-height: 1.6; color: ${BRAND_NAVY}; margin: 0 0 14px;">${text}</p>`;
}

function mutedNote(text) {
  return `<p style="font-family: ${FONT_SANS}; font-size: 12px; line-height: 1.5; color: ${BRAND_NAVY_MUTED}; margin: 20px 0 0;">${text}</p>`;
}

// Shared by every admin-sent mass announcement (passenger/driver/all) —
// same shell, a plain heading + paragraphs, and an optional CTA.
function buildAnnouncementEmail({ heading: headingText, bodyParagraphs = [], ctaText, ctaUrl }) {
  const body = `
    ${heading(headingText)}
    ${bodyParagraphs.map((p) => paragraph(escapeHtml(p))).join('')}
    ${ctaText && ctaUrl ? ctaButton({ text: ctaText, url: ctaUrl }) : ''}
  `;
  return renderEmailShell({ preheader: headingText, bodyHtml: body });
}

module.exports = {
  renderEmailShell,
  heroNumber,
  infoRow,
  ctaButton,
  heading,
  paragraph,
  mutedNote,
  buildAnnouncementEmail,
  escapeHtml,
  BRAND_YELLOW,
  BRAND_NAVY,
};
