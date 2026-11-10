"use client";
import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Image from "next/image";
import { formatDoorTime, formatEventDateShort } from "@/lib/messageFormat";

// Members reach this page from their RSVP blast link. It mirrors the public
// event signup page (/e/<slug>): same flyer, details and description, but
// with an RSVP button in place of the signup form.

type Event = {
  id: string;
  title: string;
  date: string;
  end_time: string | null;
  city: string | null;
  partners: string | null;
  capacity: number;
  allow_guests: boolean;
  signup_slug: string | null;
  signup_flyer_url: string | null;
  signup_headline: string | null;
  signup_copy: string | null;
};

type PageState = "loading" | "ready" | "submitting" | "confirmed" | "waitlisted" | "already_waitlisted" | "error";

const INSTAGRAM_URL = "https://www.instagram.com/theview.la/";

// Same scattered stars as the signup page.
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

export default function RsvpPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const searchParams = useSearchParams();
  const contactId = searchParams.get("c");

  const [event, setEvent] = useState<Event | null>(null);
  const [rsvpCount, setRsvpCount] = useState(0);
  const [partySize, setPartySize] = useState(1);
  const [state, setState] = useState<PageState>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [waitlistCount, setWaitlistCount] = useState(0);
  const [inviteSmsHref, setInviteSmsHref] = useState<string | null>(null);

  // Invites go to this event's signup page when it has one open (same message
  // as that page's own "Invite a Friend"); otherwise to the general access form.
  useEffect(() => {
    if (!contactId || !event) return;
    const siteUrl = window.location.origin;
    if (event.signup_slug) {
      const link = `${siteUrl}/e/${event.signup_slug}?ref=${contactId}`;
      const message = `You've been invited to ${event.title}, apply here: ${link}`;
      setInviteSmsHref(`sms:?&body=${encodeURIComponent(message)}`);
      return;
    }
    fetch("/api/invite-template")
      .then((r) => r.json())
      .then((d) => {
        const referralLink = `${siteUrl}/?ref=${contactId}`;
        const message = (d.template || "").replace(/\{link\}/g, referralLink);
        setInviteSmsHref(`sms:?&body=${encodeURIComponent(message)}`);
      });
  }, [contactId, event]);

  useEffect(() => {
    fetch(`/api/rsvp/${eventId}${contactId ? `?c=${contactId}` : ""}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setState("error"); setErrorMsg(d.error); return; }
        setEvent(d.event);
        setRsvpCount(d.rsvp_count);
        setWaitlistCount(d.waitlist_count ?? 0);
        if (d.already_waitlisted) setState("already_waitlisted");
        else if (d.already_rsvped) setState("confirmed");
        else setState("ready");
      })
      .catch(() => { setState("error"); setErrorMsg("Something went wrong."); });
  }, [eventId]);

  async function confirmRsvp() {
    if (!contactId) { setState("error"); setErrorMsg("Invalid RSVP link."); return; }
    setState("submitting");
    const res = await fetch(`/api/rsvp/${eventId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contact_id: contactId, party_size: partySize }),
    });
    const data = await res.json();
    if (!res.ok) { setState("error"); setErrorMsg(data.error); return; }
    setState(data.waitlisted ? "waitlisted" : "confirmed");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function googleCalendarLink() {
    if (!event) return "";
    const start = new Date(event.date);
    const end = event.end_time ? new Date(event.end_time) : new Date(start.getTime() + 4 * 60 * 60 * 1000);
    const formatDate = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: event.title,
      dates: `${formatDate(start)}/${formatDate(end)}`,
      details: "See you there — The View",
    });
    if (event.city) params.set("location", event.city);
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }

  const start = event ? new Date(event.date) : null;
  const dateLabel = start ? formatEventDateShort(start) : "";
  const timeLabel = start
    ? event!.end_time
      ? `${formatDoorTime(start)} – ${formatDoorTime(new Date(event!.end_time))}`
      : formatDoorTime(start)
    : "";
  const paragraphs = (event?.signup_copy ?? "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const flyerUrl = event?.signup_flyer_url ?? null;
  const showResult = state === "confirmed" || state === "waitlisted" || state === "already_waitlisted";
  const atCapacity = !!event && rsvpCount >= event.capacity;

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

      <div className="relative z-10 max-w-6xl mx-auto px-6 md:px-12 pt-8 pb-16 md:pt-12">
        <div className="flex items-center justify-between gap-4 signup-rise">
          <a href="/" className="inline-block">
            <Image src="/logo.png" alt="The View" width={120} height={90} className="w-12 h-auto opacity-70" priority />
          </a>
          <div className="flex items-center gap-5">
            <a href="/" className="font-body text-[10px] tracking-[0.36em] uppercase text-tan/50 hover:text-tan/80 transition-colors">
              The View
            </a>
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="text-tan/50 hover:text-tan/80 transition-colors p-1 -m-1"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
              </svg>
            </a>
          </div>
        </div>

        {state === "loading" && (
          <div className="flex justify-center py-32">
            <div className="w-2 h-2 rounded-full bg-rust/40 animate-pulse" />
          </div>
        )}

        {state === "error" && (
          <div className="mt-16 max-w-lg space-y-3 signup-rise">
            <h1 className="font-display text-4xl text-ivory font-light">Something went wrong.</h1>
            <p className="font-body text-sm text-cream/50">{errorMsg}</p>
          </div>
        )}

        {event && state !== "loading" && state !== "error" && (
          <div className="mt-8 md:mt-10 md:grid md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:gap-14 lg:gap-20 md:items-start">
            {/* Flyer */}
            {flyerUrl && (
              <div className="signup-rise md:sticky md:top-10" style={{ animationDelay: "0.1s" }}>
                <div className="relative mx-auto max-w-[340px] md:max-w-none">
                  <div
                    className="absolute -inset-6 rounded-[28px] blur-2xl signup-glow"
                    style={{ background: "radial-gradient(ellipse at center, rgba(176,24,47,0.45), transparent 70%)" }}
                  />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={flyerUrl}
                    alt={`${event.title} flyer`}
                    className="relative w-full rounded-md shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)] ring-1 ring-ivory/10"
                  />
                </div>
              </div>
            )}

            <div className={`${flyerUrl ? "mt-10 md:mt-0" : ""} max-w-lg`}>
              {showResult ? (
                <RsvpResult
                  state={state as "confirmed" | "waitlisted" | "already_waitlisted"}
                  eventTitle={event.title}
                  calendarLink={googleCalendarLink()}
                  inviteSmsHref={inviteSmsHref}
                />
              ) : (
                <>
                  {/* Event details */}
                  <div className="space-y-4 signup-rise" style={{ animationDelay: "0.2s" }}>
                    <p className="font-body text-[10px] tracking-[0.4em] uppercase text-tan/60">You&apos;re invited to</p>
                    <h1 className="font-display text-5xl md:text-6xl lg:text-7xl text-ivory font-light leading-[1.02]">
                      {event.title}
                    </h1>
                    {event.signup_headline && (
                      <p className="font-display italic text-2xl md:text-3xl text-cream/60 font-light leading-snug">
                        {event.signup_headline}
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

                  {/* RSVP box, in place of the signup page's form */}
                  <div
                    className="mt-10 rounded-lg border border-rust/25 p-6 md:p-8 signup-rise"
                    style={{ animationDelay: "0.4s", background: "rgba(37,8,12,0.65)", backdropFilter: "blur(6px)" }}
                  >
                    {atCapacity ? (
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <h2 className="font-display text-3xl text-ivory font-light">At Capacity</h2>
                          <p className="font-body text-xs text-cream/45 leading-relaxed">
                            {waitlistCount > 0
                              ? `This event is full. ${waitlistCount} ${waitlistCount === 1 ? "person is" : "people are"} already on the waitlist.`
                              : "This event is full. Be the first on the waitlist."}{" "}
                            We&apos;ll text you if a spot opens up.
                          </p>
                        </div>
                        <button
                          onClick={confirmRsvp}
                          disabled={state === "submitting"}
                          className="w-full border border-tan/30 text-cream/80 hover:text-cream hover:border-tan/50 font-body text-sm font-medium tracking-[0.25em] uppercase py-4 rounded transition-colors duration-200 disabled:opacity-50"
                        >
                          {state === "submitting" ? "Joining…" : "Join Waitlist"}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-5">
                        <div className="space-y-1">
                          <h2 className="font-display text-3xl text-ivory font-light">RSVP</h2>
                          <p className="font-body text-xs text-cream/45 leading-relaxed">
                            Spots are limited. Confirm below to claim yours.
                          </p>
                        </div>

                        {event.allow_guests && (
                          <div className="space-y-2">
                            <p className="font-body text-[9px] tracking-[0.3em] uppercase text-cream/35">Party size</p>
                            <div className="flex gap-2">
                              {[1, 2, 3].map((n) => (
                                <button
                                  key={n}
                                  type="button"
                                  onClick={() => setPartySize(n)}
                                  className={`flex-1 rounded-sm border py-2.5 font-body text-[10px] tracking-[0.15em] uppercase transition-colors ${
                                    partySize === n
                                      ? "border-amber/70 bg-amber/10 text-cream/90"
                                      : "border-rust/25 text-cream/40 hover:border-rust/40"
                                  }`}
                                >
                                  {n === 1 ? "Just me" : `+${n - 1}`}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        <button
                          onClick={confirmRsvp}
                          disabled={state === "submitting"}
                          className="w-full bg-ivory text-espresso font-body text-sm font-medium tracking-[0.25em] uppercase py-4 rounded hover:bg-cream transition-colors duration-200 disabled:opacity-50"
                        >
                          {state === "submitting" ? "Confirming…" : "Confirm RSVP"}
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RsvpResult({
  state,
  eventTitle,
  calendarLink,
  inviteSmsHref,
}: {
  state: "confirmed" | "waitlisted" | "already_waitlisted";
  eventTitle: string;
  calendarLink: string;
  inviteSmsHref: string | null;
}) {
  const copy = {
    confirmed: {
      eyebrow: "You're in",
      title: "See you there.",
      body: `You're on the list for ${eventTitle}. We'll be in touch with more details as the date approaches.`,
    },
    waitlisted: {
      eyebrow: "Waitlist",
      title: "You're on the waitlist.",
      body: `${eventTitle} is at capacity right now. We'll text you if a spot opens up.`,
    },
    already_waitlisted: {
      eyebrow: "Waitlist",
      title: "You're already on the waitlist.",
      body: "We'll text you if a spot opens up.",
    },
  }[state];

  return (
    <div className="space-y-5 signup-rise">
      <p className="font-body text-[10px] tracking-[0.4em] uppercase text-tan/60">{copy.eyebrow}</p>
      <h1 className="font-display text-5xl md:text-6xl text-ivory font-light leading-[1.05]">{copy.title}</h1>
      <p className="font-display italic text-xl text-cream/55 font-light leading-relaxed">{copy.body}</p>
      {state === "confirmed" && (
        <a
          href={calendarLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-2 bg-ivory text-espresso font-body text-sm font-medium tracking-[0.2em] uppercase py-4 px-8 rounded hover:bg-cream transition-colors duration-200"
        >
          Add to Google Calendar
        </a>
      )}
      {state === "confirmed" && inviteSmsHref && (
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
