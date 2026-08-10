import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, StatusBar
} from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useThemeStore } from '../../store/themeStore';
import { getColors, spacing, fontSizes, radius } from '../../utils/theme';

const EFFECTIVE_DATE = 'August 10, 2026';
const SUPPORT_EMAIL = 'campuschauffeur1@gmail.com';

const PRIVACY_SECTIONS = [
  {
    heading: null,
    body: `Campus Chauffeur ("Campus Chauffeur," "we," "us," or "our") operates a ride-hailing platform connecting student and staff passengers with drivers within the University of Ghana, Legon campus. This Privacy Policy explains what information we collect, how we use it, who we share it with, and the choices you have. By creating an account or using the Campus Chauffeur app, you agree to the collection and use of information in accordance with this Policy.`,
  },
  {
    heading: '1. Information We Collect',
    body: `Account information: full name, phone number, and (optionally) email address; password (stored only as an irreversible hash — we never store or can see your actual password); profile photo, if you choose to add one; and your role (passenger or driver).

Driver verification information: if you register as a driver, we additionally collect your Ghana Card number and photo, driver's license number, expiry date and photo, vehicle make/model/color and plate number, vehicle photos, and a vehicle safety checklist — used solely to verify your identity and eligibility to drive.

Location information: passengers' device location while requesting or completing a ride, to match you with nearby drivers and calculate routes and fares. Drivers' precise location while online and available for rides, including in the background while a ride is in progress, so passengers can see your live position. Location is not collected while a driver is offline.

Ride and payment information: pickup/drop-off locations, ride history, timestamps, distance, and fare amounts. Fares are paid directly to drivers in cash — we do not process card payments or store payment card information. Driver commission and wallet records, for drivers.

Communications and feedback: ratings and comments after a ride, reports or complaints about another user, and messages you send to support.

Device and usage information: a push notification token, used to deliver ride status updates and admin announcements; basic technical information such as device type and app version for troubleshooting.`,
  },
  {
    heading: '2. How We Use Your Information',
    body: `To create and manage your account, and verify driver eligibility. To match passengers with nearby available drivers and calculate routes, ETAs, and fares. To show passengers and drivers each other's live location during an active or incoming ride. To send OTP verification codes (SMS), ride receipts and rating reminders (email), and ride status and announcement notifications (push). To operate ratings, reports, and safety review processes. To calculate driver commission owed and enforce the platform's commission-payment terms. To respond to support requests and investigate complaints. To maintain the security and integrity of the platform.`,
  },
  {
    heading: '3. How We Share Your Information',
    body: `We do not sell your personal information. We share it only: between a matched passenger and driver (name, photo, vehicle details, and phone number — limited to what's needed to complete the ride safely); with service providers who process data on our behalf (our hosting and database provider, Google for maps/directions/place search, our SMS provider for OTP delivery, our email provider for receipts and reminders, and Expo for push notification delivery — each only receives what's necessary for its function); with University of Ghana administration or law enforcement where required by law or necessary to investigate a safety incident, fraud, or violation of these terms; or with your consent, for any other purpose we disclose at the time.`,
  },
  {
    heading: '4. Data Retention',
    body: `We retain account and ride data for as long as your account is active, and for a reasonable period afterward for record-keeping, dispute resolution, fraud prevention, and legal compliance. Driver verification documents are retained for the duration of your driver registration and afterward as required for safety and compliance record-keeping. You may request deletion of your account and associated data as described in Section 6.`,
  },
  {
    heading: '5. Data Security',
    body: `We use industry-standard measures to protect your information, including encrypted connections (HTTPS), hashed password storage, and access controls limiting who on our team can view sensitive information such as verification documents. No method of transmission or storage is completely secure, and we cannot guarantee absolute security.`,
  },
  {
    heading: '6. Your Rights',
    body: `Under Ghana's Data Protection Act, 2012 (Act 843), and as a matter of our own policy, you have the right to access the personal information we hold about you, request correction of inaccurate or incomplete information, request deletion of your account and personal information (subject to our legitimate need to retain certain records as described in Section 4), and withdraw consent to location access at any time via your device settings — noting this will prevent you from requesting or fulfilling rides while disabled. To exercise these rights, contact us using the details in Section 10.`,
  },
  {
    heading: "7. Children's Privacy",
    body: `Campus Chauffeur is intended for use by university students and staff and is not directed at children. We do not knowingly collect personal information from anyone under 16. If you believe a minor has provided us with personal information, please contact us and we will take steps to delete it.`,
  },
  {
    heading: '8. Location Permissions',
    body: `The app will ask for permission to access your device's location. Passengers are asked for location access while using the app, to find nearby drivers and set pickup points. Drivers are additionally asked for background location access while online, so the app can continue sharing your position with a matched passenger and keep you eligible to receive ride requests even when the app isn't in the foreground. You can change these permissions at any time in your device settings, though doing so may limit or disable core features of the app.`,
  },
  {
    heading: '9. Changes to This Policy',
    body: `We may update this Privacy Policy from time to time. If we make material changes, we will notify you through the app (for example, via an in-app announcement) before the changes take effect. Continued use of the app after a change takes effect constitutes acceptance of the updated Policy.`,
  },
  {
    heading: '10. Contact Us',
    body: `If you have questions about this Privacy Policy or how your information is handled, contact us at ${SUPPORT_EMAIL}.`,
  },
];

const TERMS_SECTIONS = [
  {
    heading: null,
    body: `These Terms of Service ("Terms") govern your access to and use of the Campus Chauffeur mobile application and related services (together, the "Service"), operated for the University of Ghana, Legon campus community. By creating an account or using the Service, you agree to be bound by these Terms and by our Privacy Policy, which is incorporated into these Terms by reference. If you do not agree, do not use the Service.`,
  },
  {
    heading: '1. Description of Service',
    body: `Campus Chauffeur is a technology platform that connects passengers seeking rides with independent drivers, within and around the University of Ghana, Legon campus. Campus Chauffeur is not a transportation carrier — drivers using the Service are independent and are not our employees or agents. We do not own, operate, or control any vehicle used to provide rides.`,
  },
  {
    heading: '2. Eligibility',
    body: `You must be at least 16 years old to use the Service as a passenger, and at least 18 years old with a valid driver's license to register as a driver. By using the Service, you represent that you meet these requirements and that all information you provide is accurate and current.`,
  },
  {
    heading: '3. Account Registration',
    body: `You must register using a valid phone number, verified by one-time passcode (OTP), and provide accurate account details. You are responsible for maintaining the confidentiality of your password and for all activity under your account. Notify us immediately at ${SUPPORT_EMAIL} if you suspect unauthorized use of your account. One account per person — you may not create an account on behalf of someone else without their permission.`,
  },
  {
    heading: '4. Driver Terms',
    body: `To register as a driver, you must submit a valid Ghana Card, driver's license, and vehicle information for review. We reserve the right to approve, reject, or later revoke driver status at our discretion, including for expired documents, failed safety checklist items, or violations of these Terms. You are responsible for maintaining your vehicle in safe, roadworthy condition, and for holding any insurance and licenses required by applicable law. A commission is deducted from each completed ride's fare, at the rate displayed in the app at the time of the ride, and accrues to your in-app wallet balance; failure to settle outstanding commission may result in your account being temporarily locked from accepting new rides. You must conduct yourself professionally and safely at all times, and must not discriminate against passengers on any unlawful basis.`,
  },
  {
    heading: '5. Passenger Terms',
    body: `Fares are calculated by the app based on distance and time of day, and are payable directly to the driver in cash at the end of the ride. If you cancel a ride after a driver has been matched, or after the driver has arrived, a cancellation or wait-time charge may apply, as disclosed in the app. You must treat drivers respectfully and must not request rides with fraudulent, harassing, or unsafe intent.`,
  },
  {
    heading: '6. Ratings, Reports, and Complaints',
    body: `After each ride, passengers and drivers may rate and leave comments about each other. You may also submit a report or complaint about another user through the app. We review reports and may take action against an account, including warnings, temporary suspension, or permanent removal from the Service, at our discretion, based on the severity and pattern of conduct reported.`,
  },
  {
    heading: '7. Prohibited Conduct',
    body: `You agree not to: provide false, misleading, or someone else's identity information; use the Service for any unlawful purpose, or to harass, threaten, or endanger another user; attempt to circumvent, disable, or interfere with the Service's security features, fare calculation, or commission system; use the Service while impaired, or operate a vehicle unsafely while driving for the Service; or scrape, reverse-engineer, or misuse the app or its data beyond ordinary use of the Service.`,
  },
  {
    heading: '8. Safety Disclaimer and Assumption of Risk',
    body: `Campus Chauffeur facilitates connections between passengers and independent drivers but does not supervise rides in progress and cannot guarantee the conduct, driving ability, or vehicle condition of any user. You acknowledge that in-person transportation carries inherent risks, and you agree to exercise your own judgment and take reasonable precautions when requesting or accepting a ride. If you feel unsafe at any point, end the ride and contact campus security or local emergency services.`,
  },
  {
    heading: '9. Account Suspension and Termination',
    body: `We may suspend or terminate your account at any time, with or without notice, for violation of these Terms, fraudulent or unsafe conduct, or at our reasonable discretion to protect the safety and integrity of the Service. You may stop using the Service and request account deletion at any time by contacting us.`,
  },
  {
    heading: '10. Limitation of Liability',
    body: `To the fullest extent permitted by law, Campus Chauffeur and its operators are not liable for any indirect, incidental, or consequential damages arising from your use of the Service, including but not limited to injury, loss, or damage occurring during a ride arranged through the app. The Service is provided "as is" and "as available," without warranties of any kind, express or implied.`,
  },
  {
    heading: '11. Indemnification',
    body: `You agree to indemnify and hold harmless Campus Chauffeur, its operators, and staff from any claims, damages, or expenses (including reasonable legal fees) arising from your violation of these Terms or your use of the Service.`,
  },
  {
    heading: '12. Changes to These Terms',
    body: `We may update these Terms from time to time. If we make material changes, we will notify you through the app before the changes take effect. Continued use of the Service after a change takes effect constitutes acceptance of the updated Terms.`,
  },
  {
    heading: '13. Governing Law',
    body: `These Terms are governed by the laws of the Republic of Ghana, without regard to conflict-of-law principles. Any dispute arising from these Terms or the Service shall be subject to the exclusive jurisdiction of the courts of Ghana.`,
  },
  {
    heading: '14. Contact Us',
    body: `Questions about these Terms can be sent to ${SUPPORT_EMAIL}.`,
  },
];

export default function LegalScreen({ navigation, route }: any) {
  const { isDark } = useThemeStore();
  const colors = getColors(isDark);
  const styles = getStyles(colors);
  const isPrivacy = route.params.type === 'privacy';
  const sections = isPrivacy ? PRIVACY_SECTIONS : TERMS_SECTIONS;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={colors.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isPrivacy ? 'Privacy Policy' : 'Terms of Service'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{isPrivacy ? 'Campus Chauffeur Privacy Policy' : 'Campus Chauffeur Terms of Service'}</Text>
        <Text style={styles.effectiveDate}>Effective date: {EFFECTIVE_DATE}</Text>

        {sections.map((section, i) => (
          <View key={i} style={styles.section}>
            {section.heading && <Text style={styles.sectionHeading}>{section.heading}</Text>}
            <Text style={styles.sectionBody}>{section.body}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray2,
  },
  backBtn: {
    width: 40, height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.gray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: colors.dark,
  },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: '800',
    color: colors.dark,
    marginBottom: spacing.xs,
  },
  effectiveDate: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  section: { marginBottom: spacing.lg },
  sectionHeading: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: colors.dark,
    marginBottom: spacing.xs,
  },
  sectionBody: {
    fontSize: fontSizes.sm,
    color: colors.textDark,
    lineHeight: 21,
  },
});
