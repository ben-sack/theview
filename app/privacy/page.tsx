export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-oxblood px-6 py-16 md:py-24">
      <div className="max-w-2xl mx-auto space-y-10">
        <div className="space-y-2">
          <a href="/" className="font-body text-[10px] tracking-[0.36em] uppercase text-tan/50 hover:text-tan/80 transition-colors">
            ← The View
          </a>
          <h1 className="font-display text-3xl md:text-4xl text-ivory font-light">
            Privacy Policy
          </h1>
          <p className="font-body text-xs text-tan/40">Last updated July 2026</p>
        </div>

        <div className="space-y-8 font-body text-sm text-cream/60 leading-relaxed">
          <section className="space-y-2">
            <h2 className="font-body text-xs tracking-widest uppercase text-tan/70">Information We Collect</h2>
            <p>
              When you request access to The View, we collect your name, email address, phone number,
              Instagram handle, and (optionally) who referred you. If you RSVP to an event, we track your
              attendance status for that event.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-body text-xs tracking-widest uppercase text-tan/70">How We Use It</h2>
            <p>
              We use this information to review membership requests, communicate with approved members about
              upcoming events, manage RSVPs and guest lists, and track referrals. We do not sell or share your
              information with third parties for their own marketing purposes.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-body text-xs tracking-widest uppercase text-tan/70">SMS Communications</h2>
            <p>
              By submitting your phone number, you agree to receive SMS text messages from The View, including
              event invitations, RSVP confirmations, and event reminders. Message frequency varies. Message and
              data rates may apply. You can opt out at any time by replying STOP to any message. Reply HELP for
              assistance.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-body text-xs tracking-widest uppercase text-tan/70">How We Store Your Information</h2>
            <p>
              Your information is stored securely using Supabase, and SMS messages are sent through Twilio. We
              take reasonable measures to protect your data but cannot guarantee absolute security.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-body text-xs tracking-widest uppercase text-tan/70">Your Choices</h2>
            <p>
              You can request that we remove your information from our records at any time by contacting us
              below. Removing your information means you would need to submit a new request to attend future
              events.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-body text-xs tracking-widest uppercase text-tan/70">Contact Us</h2>
            <p>
              Questions about this policy or your data? Email us at{" "}
              <a href="mailto:info@theview.la" className="text-tan/70 hover:text-tan underline transition-colors">
                info@theview.la
              </a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
