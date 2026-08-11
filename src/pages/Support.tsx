const SUPPORT_EMAIL = "campuschauffeur1@gmail.com";

const FAQS = [
  {
    q: "How do I request a ride?",
    a: "Open the app, set your pickup location and destination, and tap Request Ride. You'll see an upfront fare estimate before you confirm, and once a driver accepts, you can track their live location on the map.",
  },
  {
    q: "How is the fare calculated?",
    a: "Fares are based on distance and time of day (day and night rates differ). The estimated fare is shown before you request a ride, and the final fare reflects the actual route taken. Fares are paid directly to your driver in cash.",
  },
  {
    q: "How do I become a driver?",
    a: "Select \"Driver\" when creating your account, then submit your Ghana Card, driver's license, and vehicle information for review. Once approved, you can go online and start accepting ride requests.",
  },
  {
    q: "I didn't receive my verification code (OTP). What do I do?",
    a: "Double check the phone number you entered is correct, and make sure you have signal. If it still doesn't arrive after a minute, try requesting a new code. If the problem continues, contact us below with the phone number you're trying to register.",
  },
  {
    q: "How do I report a safety concern or issue with a ride?",
    a: "After a ride, you can rate your driver or passenger and leave a comment. For anything more serious, use the report option in the app, or email us directly with the trip details (date, time, and driver/passenger name if known) so we can look into it.",
  },
  {
    q: "How do I delete my account?",
    a: "Email us at the address below with your registered phone number and we'll process the deletion request, in line with our Privacy Policy.",
  },
  {
    q: "I'm a driver — how does commission and payout work?",
    a: "A commission is deducted from each completed ride's fare, at the rate shown in the app. This accrues to your in-app wallet balance, which you settle as described in the app. Outstanding balances above the threshold may temporarily limit your ability to accept new rides until cleared.",
  },
];

export default function Support() {
  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <div className="max-w-3xl mx-auto px-6 py-12 prose prose-neutral">
        <h1>Campus Chauffeur Support</h1>
        <p>
          Need help with a ride, your account, or anything else? Check the
          frequently asked questions below, or reach out to us directly —
          we're happy to help.
        </p>

        <h2>Contact Us</h2>
        <p>
          Email us at{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> and we'll
          get back to you as soon as we can. For ride-related issues, please
          include the approximate date/time of the trip and, if you have it,
          the name of the driver or passenger involved — it helps us look
          into things faster.
        </p>

        <h2>Frequently Asked Questions</h2>
        {FAQS.map((item, i) => (
          <div key={i} className="mb-6">
            <h3 className="mb-1">{item.q}</h3>
            <p className="mt-0">{item.a}</p>
          </div>
        ))}

        <h2>More Information</h2>
        <p>
          See our <a href="/terms">Terms of Service</a> and{" "}
          <a href="/privacy">Privacy Policy</a> for details on how Campus
          Chauffeur works and how we handle your information.
        </p>
      </div>
    </div>
  );
}
