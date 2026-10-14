"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import { normalizePhone, isUSPhoneNumber } from "@/lib/phone";
import { formatDoorTime, formatEventDateShort } from "@/lib/messageFormat";

type SignupEvent = {
  title: string;
  date: string;
  end_time: string | null;
  city: string | null;
  partners: string | null;
  flyerUrl: string | null;
  headline: string | null;
  copy: string | null;
};

type FormState = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  ig_handle: string;
  referred_by: string;
};

type SmsChoice = "yes" | "no" | null;
type Result = "pending" | "on_list" | "already_on_list" | "waitlisted";

// Scattered four-point stars, echoing the sparkles on the flyers. On phones
// the text runs edge to edge, so only the ones up by the flyer show there.
// ?ref=<key> links for social bios — fills "Referred by" with the value.
const SOCIAL_REFS: Record<string, string> = {
  tiktok: "TikTok",
  instagram: "Instagram",
};

// Which link someone arrived on, for the admin's visit/submission counts.
function linkSource(ref: string | null): string {
  if (!ref) return "direct";
  if (SOCIAL_REFS[ref.toLowerCase()]) return ref.toLowerCase();
  return "friend";
}

const STARS = [
  { top: "8%", left: "6%", size: 14, delay: "0s", mobile: true },
  { top: "18%", left: "88%", size: 10, delay: "1.2s", mobile: true },
  { top: "42%", left: "3%", size: 9, delay: "2.1s", mobile: false },
  { top: "58%", left: "94%", size: 16, delay: "0.6s", mobile: false },
  { top: "76%", left: "10%", size: 11, delay: "1.8s", mobile: false },
  { top: "90%", left: "80%", size: 9, delay: "2.7s", mobile: false },
  { top: "30%", left: "52%", size: 7, delay: "3.1s", mobile: false },
];

function Star({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 0c.6 6.6 5.4 11.4 12 12-6.6.6-11.4 5.4-12 12-.6-6.6-5.4-11.4-12-12C6.6 11.4 11.4 6.6 12 0z" />
    </svg>
  );
}

export function EventSignupContent({
  slug,
  event,
  status,
}: {
  slug: string;
  event: SignupEvent;
  status: "open" | "preview" | "closed" | "ended";
}) {
  const [form, setForm] = useState<FormState>({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    ig_handle: "",
    referred_by: "",
  });
  const [smsChoice, setSmsChoice] = useState<SmsChoice>(null);
  const [showNoThanksModal, setShowNoThanksModal] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [inviteSmsHref, setInviteSmsHref] = useState<string | null>(null);
  const [optIn, setOptIn] = useState<{ contactId: string; token: string } | null>(null);
  const [optingIn, setOptingIn] = useState(false);
  const [optInError, setOptInError] = useState("");
  const [source, setSource] = useState("direct");

  // Counts one visit per browser tab session (refreshes don't recount).
  // Admin previews of a page that's off aren't counted.
  useEffect(() => {
    if (status !== "open") return;
    const src = linkSource(new URLSearchParams(window.location.search).get("ref"));
    const key = `visit:${slug}:${src}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {}
    fetch(`/api/event-signup/${slug}/visit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: src }),
    }).catch(() => {});
  }, [slug, status]);

  // A friend's invite link (?ref=<contact id>) pre-fills "Referred by",
  // same as the homepage access form. A social bio link (?ref=tiktok)
  // pre-fills the platform name instead.
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (!ref) return;
    setSource(linkSource(ref));
    const source = SOCIAL_REFS[ref.toLowerCase()];
    if (source) {
      setForm((prev) => (prev.referred_by ? prev : { ...prev, referred_by: source }));
      return;
    }
    fetch(`/api/referrer?id=${ref}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.name) setForm((prev) => (prev.referred_by ? prev : { ...prev, referred_by: d.name }));
      })
      .catch(() => {});
  }, []);

  // Like the RSVP page's "Invite a Friend", but invites to this event and
  // links to its page so friends can sign up for it directly.
  function prepareInvite(contactId: string) {
    const link = `${window.location.origin}/e/${slug}?ref=${contactId}`;
    const message = `You've been referred to attend ${event.title}, apply here: ${link}`;
    setInviteSmsHref(`sms:?&body=${encodeURIComponent(message)}`);
  }

  const start = new Date(event.date);
  const dateLabel = formatEventDateShort(start);
  const timeLabel = event.end_time
    ? `${formatDoorTime(start)} – ${formatDoorTime(new Date(event.end_time))}`
    : formatDoorTime(start);
  const paragraphs = (event.copy ?? "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const formOpen = status === "open" || status === "preview";

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function submitForm() {
    setLoading(true);
    try {
      const res = await fetch(`/api/event-signup/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, sms_opt_in: smsChoice === "yes", source }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }
      setResult(data.result);
      if (data.contact_id) prepareInvite(data.contact_id);
      if (data.contact_id && data.opt_in_token) setOptIn({ contactId: data.contact_id, token: data.opt_in_token });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.first_name.trim() || !form.last_name.trim() || !form.email.trim() || !form.phone.trim() || !form.ig_handle.trim()) {
      setError("Please fill out all required fields.");
      return;
    }
    if (!isUSPhoneNumber(normalizePhone(form.phone))) {
      setError("Sorry, we only accept US phone numbers at the moment.");
      return;
    }
    if (smsChoice === null) {
      setError("Please let us know if we can text you before submitting.");
      return;
    }
    if (smsChoice === "no") {
      setShowNoThanksModal(true);
      return;
    }
    await submitForm();
  }

  async function optInToTexts() {
    if (!optIn) return;
    setOptingIn(true);
    setOptInError("");
    try {
      const res = await fetch(`/api/event-signup/${slug}/opt-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact_id: optIn.contactId, token: optIn.token }),
      });
      const data = await res.json();
      if (!res.ok) {
        setOptInError(data.error || "Something went wrong. Please try again.");
        return;
      }
      setOptIn(null);
      setSmsChoice("yes");
    } catch {
      setOptInError("Something went wrong. Please try again.");
    } finally {
      setOptingIn(false);
    }
  }

  function googleCalendarLink() {
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const end = event.end_time ? new Date(event.end_time) : new Date(start.getTime() + 4 * 60 * 60 * 1000);
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: `${event.title} — The View`,
      dates: `${fmt(start)}/${fmt(end)}`,
      details: "See you there — The View",
    });
    if (event.city) params.set("location", event.city);
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }

  const labelClass = "font-body text-[9px] tracking-[0.3em] uppercase text-cream/35";

  return (
    <div className="relative min-h-svh bg-espresso text-cream overflow-hidden">
      {/* Atmosphere: warm red glow, slow light sweep, twinkling stars */}
      <div
        className="absolute inset-0 pointer-events-none signup-glow"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 25% 20%, rgba(160,24,40,0.30) 0%, transparent 70%), " +
            "radial-gradient(ellipse 55% 45% at 85% 80%, rgba(176,86,48,0.22) 0%, transparent 70%)",
        }}
      />
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="signup-sweep absolute -top-1/4 h-[150%] w-1/3"
          style={{ background: "linear-gradient(90deg, transparent, rgba(234,217,187,0.05), transparent)" }}
        />
      </div>
      {STARS.map((s, i) => (
        <span
          key={i}
          className={`absolute pointer-events-none text-ivory signup-twinkle ${s.mobile ? "" : "hidden md:block"}`}
          style={{ top: s.top, left: s.left, animationDelay: s.delay }}
        >
          <Star size={s.size} />
        </span>
      ))}

      {status === "preview" && (
        <div className="relative z-20 bg-amber/90 text-espresso text-center font-body text-xs py-2 px-4">
          Preview — this page is off, so only you can see the form. Turn it on from the event&apos;s admin page.
        </div>
      )}

      <div className="relative z-10 max-w-6xl mx-auto px-6 md:px-12 pt-8 pb-16 md:pt-12">
        <a href="/" className="inline-block signup-rise">
          <Image src="/logo.png" alt="The View" width={120} height={90} className="w-12 h-auto opacity-70" priority />
        </a>

        <div className="mt-8 md:mt-10 md:grid md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:gap-14 lg:gap-20 md:items-start">
          {/* Flyer */}
          {event.flyerUrl && (
            <div className="signup-rise md:sticky md:top-10" style={{ animationDelay: "0.1s" }}>
              <div className="relative mx-auto max-w-[340px] md:max-w-none">
                <div
                  className="absolute -inset-6 rounded-[28px] blur-2xl signup-glow"
                  style={{ background: "radial-gradient(ellipse at center, rgba(176,24,47,0.45), transparent 70%)" }}
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={event.flyerUrl}
                  alt={`${event.title} flyer`}
                  className="relative w-full rounded-md shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)] ring-1 ring-ivory/10"
                />
              </div>
            </div>
          )}

          <div className={`${event.flyerUrl ? "mt-10 md:mt-0" : ""} max-w-lg`}>
            {result ? (
              <ResultMessage
                result={result}
                eventTitle={event.title}
                textsOn={smsChoice === "yes"}
                calendarLink={googleCalendarLink()}
                inviteSmsHref={inviteSmsHref}
                needsOptIn={!!optIn}
                optingIn={optingIn}
                optInError={optInError}
                onOptIn={optInToTexts}
              />
            ) : (
              <>
                {/* Event details */}
                <div className="space-y-4 signup-rise" style={{ animationDelay: "0.2s" }}>
                  <p className="font-body text-[10px] tracking-[0.4em] uppercase text-tan/60">The View presents</p>
                  <h1 className="font-display text-5xl md:text-6xl lg:text-7xl text-ivory font-light leading-[1.02]">
                    {event.title}
                  </h1>
                  {event.headline && (
                    <p className="font-display italic text-2xl md:text-3xl text-cream/60 font-light leading-snug">
                      {event.headline}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-x-5 gap-y-1 pt-1 font-body text-xs tracking-[0.2em] uppercase text-cream/55">
                    <span>{dateLabel}</span>
                    <span className="text-rust/70">✦</span>
                    <span>{timeLabel}</span>
                    {event.city && (
                      <>
                        <span className="text-rust/70">✦</span>
                        <span>{event.city}</span>
                      </>
                    )}
                  </div>
                  {event.partners && (
                    <p className="font-body text-[10px] tracking-[0.3em] uppercase text-tan/50">With {event.partners}</p>
                  )}
                </div>

                {paragraphs.length > 0 && (
                  <div className="mt-8 space-y-4 signup-rise" style={{ animationDelay: "0.3s" }}>
                    {paragraphs.map((p, i) => (
                      <p key={i} className="font-body text-[15px] font-light text-cream/70 leading-relaxed whitespace-pre-line">
                        {p}
                      </p>
                    ))}
                  </div>
                )}

                {/* Form */}
                <div
                  className="mt-10 rounded-lg border border-rust/25 p-6 md:p-8 signup-rise"
                  style={{ animationDelay: "0.4s", background: "rgba(37,8,12,0.65)", backdropFilter: "blur(6px)" }}
                >
                  {formOpen ? (
                    <form onSubmit={onSubmit} className="space-y-3" noValidate>
                      <div className="space-y-1 mb-4">
                        <h2 className="font-display text-3xl text-ivory font-light">Join Us</h2>
                        <p className="font-body text-xs text-cream/45 leading-relaxed">
                          Spots are limited. Add your details and we&apos;ll text you once you&apos;re on.
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label htmlFor="first_name" className={labelClass}>First Name</label>
                          <input className="field" id="first_name" name="first_name" type="text" autoComplete="given-name" required value={form.first_name} onChange={onChange} placeholder="First" />
                        </div>
                        <div className="space-y-1">
                          <label htmlFor="last_name" className={labelClass}>Last Name</label>
                          <input className="field" id="last_name" name="last_name" type="text" autoComplete="family-name" required value={form.last_name} onChange={onChange} placeholder="Last" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label htmlFor="email" className={labelClass}>Email</label>
                        <input className="field" id="email" name="email" type="email" autoComplete="email" required value={form.email} onChange={onChange} placeholder="your@email.com" />
                      </div>
                      <div className="space-y-1">
                        <label htmlFor="phone" className={labelClass}>Phone</label>
                        <input className="field" id="phone" name="phone" type="tel" autoComplete="tel" required value={form.phone} onChange={onChange} placeholder="(555) 000-0000" />
                      </div>
                      <div className="space-y-1">
                        <label htmlFor="ig_handle" className={labelClass}>Instagram</label>
                        <input className="field" id="ig_handle" name="ig_handle" type="text" required value={form.ig_handle} onChange={onChange} placeholder="@handle" />
                      </div>
                      <div className="space-y-1">
                        <label htmlFor="referred_by" className={labelClass}>
                          Referred by <span className="text-cream/20 normal-case tracking-normal">(optional)</span>
                        </label>
                        <input className="field" id="referred_by" name="referred_by" type="text" value={form.referred_by} onChange={onChange} placeholder="Name or @handle" />
                      </div>

                      {/* SMS consent — keep word-for-word in sync with AccessForm (Twilio-approved opt-in) */}
                      <div className="space-y-2 pt-1">
                        <p className={labelClass}>Can we text you?</p>
                        <div className="flex gap-2" role="radiogroup" aria-label="SMS opt-in">
                          {(["yes", "no"] as const).map((choice) => (
                            <label
                              key={choice}
                              className={`flex-1 text-center rounded-sm border py-2 px-2 cursor-pointer transition-colors font-body text-[10px] tracking-[0.15em] uppercase ${
                                smsChoice === choice
                                  ? "border-amber/70 bg-amber/10 text-cream/90"
                                  : "border-rust/25 text-cream/40 hover:border-rust/40"
                              }`}
                            >
                              <input
                                type="radio"
                                name="sms_opt_in"
                                value={choice}
                                checked={smsChoice === choice}
                                onChange={() => setSmsChoice(choice)}
                                className="sr-only"
                              />
                              {choice === "yes" ? "Yes, text me" : "No thanks"}
                            </label>
                          ))}
                        </div>
                        <p className="font-body text-[10px] tracking-[0.15em] text-cream/50 leading-relaxed">
                          This is how we notify you if you&apos;re approved and invite you to events — without it, we can&apos;t reach you.
                        </p>
                      </div>

                      {error && <p className="font-body text-[10px] tracking-[0.2em] text-rust">{error}</p>}

                      <p className="font-body text-[10px] tracking-[0.15em] text-cream/55 leading-relaxed">
                        Message and data rates may apply. Reply STOP to any text to opt out at any time. See our{" "}
                        <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-cream/70 transition-colors">
                          Privacy Policy
                        </a>.
                      </p>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full mt-2 bg-ivory text-espresso font-body text-sm font-medium tracking-[0.25em] uppercase py-4 rounded hover:bg-cream transition-colors duration-200 disabled:opacity-50"
                      >
                        {loading ? "Sending…" : "Submit"}
                      </button>
                    </form>
                  ) : (
                    <div className="space-y-2 text-center py-4">
                      <p className="font-display text-2xl text-ivory font-light">
                        {status === "ended" ? "This one's over." : "The list is closed."}
                      </p>
                      <p className="font-body text-xs text-cream/45">
                        {status === "ended" ? "Thanks to everyone who came out." : "Signups for this event aren't open right now."}{" "}
                        <a href="/" className="underline hover:text-cream/70">Visit The View</a>
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {showNoThanksModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6 bg-black/70">
          <div className="max-w-sm w-full bg-espresso border border-rust/25 rounded-lg p-6 space-y-4">
            <p className="font-display italic text-cream/90 text-xl leading-snug">Before you submit —</p>
            <p className="font-body text-sm text-cream/60 leading-relaxed">
              Without text updates, we won&apos;t be able to notify you if you&apos;re approved or invite you to events. We likely won&apos;t be able to consider your request.
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNoThanksModal(false)}
                className="w-full font-body text-[10px] tracking-[0.3em] uppercase text-cream/90 bg-amber/20 border border-amber/40 rounded-sm py-2.5 hover:bg-amber/30 transition-colors"
              >
                Go back
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={async () => {
                  setShowNoThanksModal(false);
                  await submitForm();
                }}
                className="w-full font-body text-[10px] tracking-[0.2em] uppercase text-cream/35 hover:text-cream/60 transition-colors py-1 disabled:opacity-40"
              >
                {loading ? "Sending…" : "Submit without texts"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ResultMessage({
  result,
  eventTitle,
  textsOn,
  calendarLink,
  inviteSmsHref,
  needsOptIn,
  optingIn,
  optInError,
  onOptIn,
}: {
  result: Result;
  eventTitle: string;
  textsOn: boolean;
  calendarLink: string;
  inviteSmsHref: string | null;
  needsOptIn: boolean;
  optingIn: boolean;
  optInError: string;
  onOptIn: () => void;
}) {
  const copy: Record<Result, { eyebrow: string; title: string; body: string }> = {
    pending: {
      eyebrow: "Request received",
      title: "You're in review.",
      body: textsOn
        ? "Once you're approved, you'll be added to the list and receive a confirmation via text."
        : "Once you're approved, you'll be added to the list.",
    },
    on_list: {
      eyebrow: "You're in",
      title: "You're on the list.",
      body: `See you at ${eventTitle}. We'll send details as the night gets closer.`,
    },
    already_on_list: {
      eyebrow: "No need to resubmit",
      title: "You're already on the list.",
      body: `See you at ${eventTitle}.`,
    },
    waitlisted: {
      eyebrow: "Almost",
      title: "You're on the waitlist.",
      body: `${eventTitle} is at capacity right now. We'll text you if a spot opens up.`,
    },
  };
  const c = needsOptIn && result === "pending"
    ? {
        eyebrow: "Request received",
        title: "One more thing.",
        body: "Since you didn't opt into texts, we won't be able to admit you — texts are how we confirm your spot and send event details. If you'd like to opt in, tap below.",
      }
    : copy[result];
  const showCalendar = result === "on_list" || result === "already_on_list";

  return (
    <div className="space-y-5 signup-rise">
      <p className="font-body text-[10px] tracking-[0.4em] uppercase text-tan/60">{c.eyebrow}</p>
      <h1 className="font-display text-5xl md:text-6xl text-ivory font-light leading-[1.05]">{c.title}</h1>
      <p className="font-display italic text-xl text-cream/55 font-light leading-relaxed">{c.body}</p>
      {needsOptIn && result === "pending" && (
        <div className="space-y-3 max-w-sm">
          <button
            type="button"
            onClick={onOptIn}
            disabled={optingIn}
            className="w-full bg-ivory text-espresso font-body text-sm font-medium tracking-[0.2em] uppercase py-4 rounded hover:bg-cream transition-colors duration-200 disabled:opacity-50"
          >
            {optingIn ? "Updating…" : "Yes, text me"}
          </button>
          {optInError && <p className="font-body text-[10px] tracking-[0.2em] text-rust">{optInError}</p>}
          <p className="font-body text-[10px] tracking-[0.15em] text-cream/55 leading-relaxed">
            Message and data rates may apply. Reply STOP to any text to opt out at any time. See our{" "}
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-cream/70 transition-colors">
              Privacy Policy
            </a>.
          </p>
        </div>
      )}
      {showCalendar && (
        <a
          href={calendarLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-2 bg-ivory text-espresso font-body text-sm font-medium tracking-[0.2em] uppercase py-4 px-8 rounded hover:bg-cream transition-colors duration-200"
        >
          Add to Google Calendar
        </a>
      )}
      {inviteSmsHref && (
        <div className="border-t border-rust/15 pt-6 mt-4 space-y-3 max-w-sm">
          <p className="font-body text-xs text-tan/50 leading-relaxed">
            Know someone who should be here? Invite them — we&apos;ll take note of your referral!
          </p>
          <a
            href={inviteSmsHref}
            className="block w-full text-center border border-tan/25 text-tan/60 hover:text-cream/70 hover:border-tan/40 font-body text-xs tracking-widest uppercase py-3 rounded transition-colors duration-200"
          >
            Invite a Friend
          </a>
        </div>
      )}
    </div>
  );
}
