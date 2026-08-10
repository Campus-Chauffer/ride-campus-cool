const EFFECTIVE_DATE = "August 10, 2026";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <div className="max-w-3xl mx-auto px-6 py-12 prose prose-neutral">
        <h1>Campus Chauffeur Terms of Service</h1>
        <p className="text-sm text-neutral-500">Effective date: {EFFECTIVE_DATE}</p>

        <p>
          These Terms of Service ("Terms") govern your access to and use of
          the Campus Chauffeur mobile application and related services
          (together, the "Service"), operated for the University of Ghana,
          Legon campus community. By creating an account or using the
          Service, you agree to be bound by these Terms and by our{" "}
          <a href="/privacy">Privacy Policy</a>, which is incorporated into
          these Terms by reference. If you do not agree, do not use the
          Service.
        </p>

        <h2>1. Description of Service</h2>
        <p>
          Campus Chauffeur is a technology platform that connects passengers
          seeking rides with independent drivers, within and around the
          University of Ghana, Legon campus. Campus Chauffeur is not a
          transportation carrier — drivers using the Service are independent
          and are not our employees or agents. We do not own, operate, or
          control any vehicle used to provide rides.
        </p>

        <h2>2. Eligibility</h2>
        <p>
          You must be at least 16 years old to use the Service as a
          passenger, and at least 18 years old with a valid driver's license
          to register as a driver. By using the Service, you represent that
          you meet these requirements and that all information you provide is
          accurate and current.
        </p>

        <h2>3. Account Registration</h2>
        <ul>
          <li>You must register using a valid phone number, which is verified by one-time passcode (OTP), and provide accurate account details.</li>
          <li>You are responsible for maintaining the confidentiality of your password and for all activity that occurs under your account.</li>
          <li>Notify us immediately at <a href="mailto:campuschauffeur1@gmail.com">campuschauffeur1@gmail.com</a> if you suspect unauthorized use of your account.</li>
          <li>One account per person. You may not create an account on behalf of someone else without their permission.</li>
        </ul>

        <h2>4. Driver Terms</h2>
        <ul>
          <li>
            To register as a driver, you must submit a valid Ghana Card,
            driver's license, and vehicle information for review. We reserve
            the right to approve, reject, or later revoke driver status at
            our discretion, including for expired documents, failed safety
            checklist items, or violations of these Terms.
          </li>
          <li>
            You are responsible for maintaining your vehicle in safe,
            roadworthy condition, and for holding any insurance and licenses
            required by applicable law to operate your vehicle.
          </li>
          <li>
            A commission is deducted from each completed ride's fare, at the
            rate displayed in the app at the time of the ride. Commission
            owed accrues to your in-app wallet balance and must be settled as
            described in the app; failure to settle outstanding commission
            may result in your account being temporarily locked from
            accepting new rides until the balance is cleared.
          </li>
          <li>
            You must conduct yourself professionally and safely at all times,
            and must not discriminate against passengers on any unlawful
            basis.
          </li>
        </ul>

        <h2>5. Passenger Terms</h2>
        <ul>
          <li>Fares are calculated by the app based on distance and time of day, and are payable directly to the driver in cash at the end of the ride.</li>
          <li>If you cancel a ride after a driver has been matched, or after the driver has arrived, a cancellation or wait-time charge may apply, as disclosed in the app.</li>
          <li>You must treat drivers respectfully and must not request rides with fraudulent, harassing, or unsafe intent.</li>
        </ul>

        <h2>6. Ratings, Reports, and Complaints</h2>
        <p>
          After each ride, passengers and drivers may rate and leave comments
          about each other. You may also submit a report or complaint about
          another user through the app. We review reports and may take
          action against an account, including warnings, temporary
          suspension, or permanent removal from the Service, at our
          discretion, based on the severity and pattern of conduct reported.
        </p>

        <h2>7. Prohibited Conduct</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Provide false, misleading, or someone else's identity information</li>
          <li>Use the Service for any unlawful purpose, or to harass, threaten, or endanger another user</li>
          <li>Attempt to circumvent, disable, or interfere with the Service's security features, fare calculation, or commission system</li>
          <li>Use the Service while impaired, or operate a vehicle unsafely while driving for the Service</li>
          <li>Scrape, reverse-engineer, or misuse the app or its data beyond ordinary use of the Service</li>
        </ul>

        <h2>8. Safety Disclaimer and Assumption of Risk</h2>
        <p>
          Campus Chauffeur facilitates connections between passengers and
          independent drivers but does not supervise rides in progress and
          cannot guarantee the conduct, driving ability, or vehicle condition
          of any user. You acknowledge that in-person transportation carries
          inherent risks, and you agree to exercise your own judgment and
          take reasonable precautions when requesting or accepting a ride. If
          you feel unsafe at any point, end the ride and contact campus
          security or local emergency services.
        </p>

        <h2>9. Account Suspension and Termination</h2>
        <p>
          We may suspend or terminate your account at any time, with or
          without notice, for violation of these Terms, fraudulent or unsafe
          conduct, or at our reasonable discretion to protect the safety and
          integrity of the Service. You may stop using the Service and
          request account deletion at any time by contacting us.
        </p>

        <h2>10. Limitation of Liability</h2>
        <p>
          To the fullest extent permitted by law, Campus Chauffeur and its
          operators are not liable for any indirect, incidental, or
          consequential damages arising from your use of the Service,
          including but not limited to injury, loss, or damage occurring
          during a ride arranged through the app. The Service is provided
          "as is" and "as available," without warranties of any kind, express
          or implied.
        </p>

        <h2>11. Indemnification</h2>
        <p>
          You agree to indemnify and hold harmless Campus Chauffeur, its
          operators, and staff from any claims, damages, or expenses
          (including reasonable legal fees) arising from your violation of
          these Terms or your use of the Service.
        </p>

        <h2>12. Changes to These Terms</h2>
        <p>
          We may update these Terms from time to time. If we make material
          changes, we will notify you through the app before the changes
          take effect. Continued use of the Service after a change takes
          effect constitutes acceptance of the updated Terms.
        </p>

        <h2>13. Governing Law</h2>
        <p>
          These Terms are governed by the laws of the Republic of Ghana,
          without regard to conflict-of-law principles. Any dispute arising
          from these Terms or the Service shall be subject to the exclusive
          jurisdiction of the courts of Ghana.
        </p>

        <h2>14. Contact Us</h2>
        <p>
          Questions about these Terms can be sent to{" "}
          <a href="mailto:campuschauffeur1@gmail.com">campuschauffeur1@gmail.com</a>.
        </p>
      </div>
    </div>
  );
}
