const EFFECTIVE_DATE = "August 10, 2026";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <div className="max-w-3xl mx-auto px-6 py-12 prose prose-neutral">
        <h1>Campus Chauffeur Privacy Policy</h1>
        <p className="text-sm text-neutral-500">Effective date: {EFFECTIVE_DATE}</p>

        <p>
          Campus Chauffeur ("Campus Chauffeur," "we," "us," or "our") operates a
          ride-hailing platform connecting student and staff passengers with
          drivers within the University of Ghana, Legon campus. This Privacy
          Policy explains what information we collect, how we use it, who we
          share it with, and the choices you have. By creating an account or
          using the Campus Chauffeur app, you agree to the collection and use
          of information in accordance with this Policy.
        </p>

        <h2>1. Information We Collect</h2>

        <h3>1.1 Account Information</h3>
        <ul>
          <li>Full name, phone number, and (optionally) email address</li>
          <li>Password (stored only as a irreversible hash — we never store or
            can see your actual password)</li>
          <li>Profile photo, if you choose to add one</li>
          <li>Role on the platform (passenger or driver)</li>
        </ul>

        <h3>1.2 Driver Verification Information</h3>
        <p>If you register as a driver, we additionally collect:</p>
        <ul>
          <li>Ghana Card number and a photo of your Ghana Card</li>
          <li>Driver's license number, license expiry date, and a photo of your license</li>
          <li>Vehicle make, model, color, and license plate number</li>
          <li>Photos of your vehicle (front, side, and rear) and a vehicle safety checklist</li>
        </ul>
        <p>
          This information is used solely to verify your identity and
          eligibility to drive on the platform, and is reviewed by our admin
          team as part of the approval process.
        </p>

        <h3>1.3 Location Information</h3>
        <ul>
          <li>
            <strong>Passengers:</strong> your device's location when you open
            the app and while requesting or completing a ride, so we can match
            you with nearby drivers and calculate routes and fares.
          </li>
          <li>
            <strong>Drivers:</strong> your device's precise location while you
            are online and available for rides, including in the background
            while a ride is in progress, so passengers can see your live
            position and we can dispatch nearby ride requests to you. Location
            is not collected while you are offline.
          </li>
        </ul>

        <h3>1.4 Ride and Payment Information</h3>
        <ul>
          <li>Pickup and drop-off locations and addresses</li>
          <li>Ride history, timestamps, distance, and fare amounts</li>
          <li>
            Fares on Campus Chauffeur are paid directly to drivers in cash. We
            do not process card payments and do not collect or store payment
            card information.
          </li>
          <li>Driver commission and wallet records, for drivers</li>
        </ul>

        <h3>1.5 Communications and Feedback</h3>
        <ul>
          <li>Ratings and written comments you give or receive after a ride</li>
          <li>Reports or complaints submitted about another user</li>
          <li>Messages you send to our support team</li>
        </ul>

        <h3>1.6 Device and Usage Information</h3>
        <ul>
          <li>A push notification token, used to deliver ride status updates and admin announcements to your device</li>
          <li>Basic technical information such as device type and app version, for troubleshooting</li>
        </ul>

        <h2>2. How We Use Your Information</h2>
        <ul>
          <li>To create and manage your account, and verify driver eligibility</li>
          <li>To match passengers with nearby available drivers and calculate routes, ETAs, and fares</li>
          <li>To show passengers and drivers each other's live location during an active or incoming ride</li>
          <li>To send OTP verification codes (by SMS), ride receipts and rating reminders (by email), and ride status and announcement notifications (by push notification)</li>
          <li>To operate ratings, reports, and safety review processes</li>
          <li>To calculate driver commission owed and enforce the platform's commission-payment terms</li>
          <li>To respond to support requests and investigate complaints</li>
          <li>To maintain the security and integrity of the platform, including detecting misuse</li>
        </ul>

        <h2>3. How We Share Your Information</h2>
        <p>We do not sell your personal information. We share it only as follows:</p>
        <ul>
          <li>
            <strong>Between passengers and drivers:</strong> when a ride is
            matched, the passenger sees the driver's name, photo, vehicle
            details, and phone number, and the driver sees the passenger's
            name and phone number — limited to what's needed to complete the
            ride safely.
          </li>
          <li>
            <strong>Service providers who process data on our behalf:</strong>
            our hosting and database provider, Google (for maps, directions,
            and place search), our SMS provider (for OTP delivery), our email
            provider (for receipts and reminders), and Expo (for push
            notification delivery). These providers only receive what's
            necessary to perform their function and are not permitted to use
            your data for their own purposes.
          </li>
          <li>
            <strong>University of Ghana administration or law enforcement,</strong>
            where required by law, or where necessary to investigate a safety
            incident, fraud, or violation of these terms.
          </li>
          <li>
            <strong>With your consent,</strong> for any other purpose we
            disclose to you at the time.
          </li>
        </ul>

        <h2>4. Data Retention</h2>
        <p>
          We retain account and ride data for as long as your account is
          active. When you request account deletion, your name, contact
          details, and profile photo are anonymized immediately and you're
          signed out everywhere. Ride and payment history, and (for drivers)
          verification documents, are kept for up to 30 days afterward
          specifically to preserve evidence for any in-progress fraud,
          safety, or dispute investigation tied to the account, after which
          they are permanently deleted. Completed ride and payment records
          belonging to the other party in a trip (e.g. a driver's copy of a
          ride with a deleted passenger) are retained as part of that other
          user's own account history.
        </p>

        <h2>5. Data Security</h2>
        <p>
          We use industry-standard measures to protect your information,
          including encrypted connections (HTTPS) between the app and our
          servers, hashed password storage, and access controls limiting who
          on our team can view sensitive information such as verification
          documents. No method of transmission or storage is completely
          secure, and we cannot guarantee absolute security.
        </p>

        <h2>6. Your Rights</h2>
        <p>
          Under Ghana's Data Protection Act, 2012 (Act 843), and as a matter
          of our own policy, you have the right to:
        </p>
        <ul>
          <li>Access the personal information we hold about you</li>
          <li>Request correction of inaccurate or incomplete information</li>
          <li>Request deletion of your account and personal information — available directly in the app under Settings, or by contacting us — subject to our legitimate need to retain certain records for a limited period as described in Section 4</li>
          <li>Withdraw consent to location access at any time via your device settings — note that this will prevent you from requesting or fulfilling rides while location access is disabled</li>
        </ul>
        <p>
          To exercise any of these rights, contact us using the details in
          Section 10.
        </p>

        <h2>7. Children's Privacy</h2>
        <p>
          Campus Chauffeur is intended for use by university students and
          staff and is not directed at children. We do not knowingly collect
          personal information from anyone under 16. If you believe a minor
          has provided us with personal information, please contact us and we
          will take steps to delete it.
        </p>

        <h2>8. Location Permissions</h2>
        <p>
          The app will ask for permission to access your device's location.
          Passengers are asked for location access while using the app, to
          find nearby drivers and set pickup points. Drivers are additionally
          asked for background location access while online, so the app can
          continue sharing your position with a matched passenger and keep
          you eligible to receive ride requests even when the app isn't in
          the foreground. You can change these permissions at any time in
          your device settings, though doing so may limit or disable core
          features of the app.
        </p>

        <h2>9. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. If we make
          material changes, we will notify you through the app (for example,
          via an in-app announcement) before the changes take effect.
          Continued use of the app after a change takes effect constitutes
          acceptance of the updated Policy.
        </p>

        <h2>10. Contact Us</h2>
        <p>
          If you have questions about this Privacy Policy or how your
          information is handled, contact us at{" "}
          <a href="mailto:campuschauffeur1@gmail.com">campuschauffeur1@gmail.com</a>.
        </p>
      </div>
    </div>
  );
}
