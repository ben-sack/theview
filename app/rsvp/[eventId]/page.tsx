"use client";
import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Image from "next/image";

type Event = {
  id: string;
  title: string;
  date: string;
  location: string | null;
  partners: string | null;
  capacity: number;
  allow_guests: boolean;
};

export default function RsvpPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const searchParams = useSearchParams();
  const contactId = searchParams.get("c");

  const [event, setEvent] = useState<Event | null>(null);
  const [rsvpCount, setRsvpCount] = useState(0);
  const [partySize, setPartySize] = useState(1);
  const [state, setState] = useState<"loading" | "ready" | "submitting" | "confirmed" | "waitlisted" | "already_waitlisted" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [waitlistCount, setWaitlistCount] = useState(0);

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
    if (data.waitlisted) setState("waitlisted");
    else setState("confirmed");
  }

  const eventDate = event
    ? new Date(event.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
    : "";

  const siteUrl = typeof window !== "undefined" ? window.location.origin : "https://theview.la";
  const referralLink = `${siteUrl}/?ref=${contactId}`;

  function calendarLink() {
    if (!event) return "";
    const start = new Date(event.date);
    const end = new Date(start.getTime() + 4 * 60 * 60 * 1000);
    const formatIcsDate = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//The View//RSVP//EN",
      "BEGIN:VEVENT",
      `UID:${event.id}@theview.la`,
      `DTSTAMP:${formatIcsDate(new Date())}`,
      `DTSTART:${formatIcsDate(start)}`,
      `DTEND:${formatIcsDate(end)}`,
      `SUMMARY:${event.title}`,
      event.location ? `LOCATION:${event.location}` : "",
      "DESCRIPTION:See you there — The View",
      "END:VEVENT",
      "END:VCALENDAR",
    ].filter(Boolean).join("\r\n");

    return `data:text/calendar;charset=utf8,${encodeURIComponent(lines)}`;
  }

  return (
    <div className="relative flex flex-col items-center justify-center min-h-svh bg-oxblood overflow-hidden px-6">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 55% at 18% 72%, rgba(140,60,24,0.28) 0%, transparent 70%), " +
            "radial-gradient(ellipse 40% 40% at 78% 25%, rgba(90,28,14,0.18) 0%, transparent 65%)",
        }}
      />
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-espresso/50 via-transparent to-espresso/70" />

      <div className="relative z-10 flex flex-col items-center gap-8 text-center max-w-sm w-full">
        <Image src="/logo.png" alt="" aria-hidden width={120} height={90} className="w-14 h-auto opacity-70" priority />

        {state === "loading" && (
          <div className="w-2 h-2 rounded-full bg-rust/40 animate-pulse" />
        )}

        {(state === "ready" || state === "submitting") && event && (
          <>
            <div className="space-y-3">
              <p className="font-body text-[10px] tracking-[0.36em] uppercase text-tan/50">
                You're invited
              </p>
              <h1 className="font-display text-3xl md:text-4xl text-ivory font-light">
                {event.title}
              </h1>
              <p className="font-body text-sm text-cream/50">{eventDate}</p>
              {event.location && (
                <p className="font-body text-sm text-cream/40">{event.location}</p>
              )}
              {event.partners && (
                <p className="font-body text-xs text-tan/40 tracking-widest uppercase">
                  With {event.partners}
                </p>
              )}
            </div>

            {rsvpCount >= event.capacity ? (
              <div className="w-full space-y-4 text-center">
                <p className="font-display italic text-cream/50 text-lg">This event is at capacity.</p>
                <p className="font-body text-xs text-tan/50 leading-relaxed">
                  {waitlistCount > 0 ? `${waitlistCount} ${waitlistCount === 1 ? "person is" : "people are"} already on the waitlist.` : "Be the first on the waitlist."}
                </p>
                <button
                  onClick={confirmRsvp}
                  disabled={state === "submitting"}
                  className="w-full border border-tan/30 text-tan/70 hover:text-cream hover:border-tan/50 font-body text-sm font-medium tracking-widest uppercase py-4 rounded transition-colors duration-200 disabled:opacity-50"
                >
                  {state === "submitting" ? "Joining…" : "Join Waitlist"}
                </button>
              </div>
            ) : (
              <div className="w-full space-y-5">
                {event.allow_guests && (
                  <div className="space-y-2">
                    <p className="font-body text-xs tracking-widest uppercase text-tan/50">
                      Party size
                    </p>
                    <div className="flex justify-center gap-3">
                      {[1, 2, 3].map((n) => (
                        <button
                          key={n}
                          onClick={() => setPartySize(n)}
                          className={`w-12 h-12 rounded font-body text-sm font-medium transition-colors duration-200 ${
                            partySize === n
                              ? "bg-amber text-espresso"
                              : "border border-tan/30 text-cream/50 hover:border-tan/60"
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
                  className="w-full bg-ivory text-espresso font-body text-sm font-medium tracking-widest uppercase py-4 rounded hover:bg-cream transition-colors duration-200 disabled:opacity-50"
                >
                  {state === "submitting" ? "Confirming…" : "Confirm RSVP"}
                </button>
              </div>
            )}
          </>
        )}

        {state === "confirmed" && (
          <div className="space-y-6 w-full">
            <div className="space-y-3">
              <p className="font-body text-[10px] tracking-[0.36em] uppercase text-tan/50">
                You're in
              </p>
              <h1 className="font-display text-3xl text-ivory font-light">
                See you there.
              </h1>
              <p className="font-display italic text-cream/40 text-lg font-light">
                We'll be in touch with more details as the date approaches.
              </p>
            </div>

            <a
              href={calendarLink()}
              className="block w-full bg-ivory text-espresso font-body text-sm font-medium tracking-widest uppercase py-4 rounded hover:bg-cream transition-colors duration-200 text-center"
            >
              Add to Calendar
            </a>

            <div className="border-t border-rust/15 pt-6 space-y-3">
              <p className="font-body text-xs text-tan/50 leading-relaxed">
                Know someone who should be here? They can apply using this link — we'll take note of your referral!
              </p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(referralLink);
                }}
                className="w-full border border-tan/25 text-tan/60 hover:text-cream/70 hover:border-tan/40 font-body text-xs tracking-widest uppercase py-3 rounded transition-colors duration-200"
              >
                Copy Referral Link
              </button>
            </div>
          </div>
        )}

        {state === "waitlisted" && (
          <div className="space-y-3 text-center">
            <p className="font-body text-[10px] tracking-[0.36em] uppercase text-tan/50">Waitlist</p>
            <h1 className="font-display text-3xl text-ivory font-light">You're on the list.</h1>
            <p className="font-display italic text-cream/40 text-lg font-light">
              We'll text you if a spot opens up.
            </p>
          </div>
        )}

        {state === "already_waitlisted" && (
          <div className="space-y-3 text-center">
            <p className="font-body text-[10px] tracking-[0.36em] uppercase text-tan/50">Waitlist</p>
            <h1 className="font-display text-3xl text-ivory font-light">You're already on the waitlist.</h1>
            <p className="font-display italic text-cream/40 text-lg font-light">
              We'll text you if a spot opens up.
            </p>
          </div>
        )}

        {state === "error" && (
          <div className="space-y-3">
            <h1 className="font-display text-2xl text-ivory font-light">Something went wrong.</h1>
            <p className="font-body text-sm text-cream/40">{errorMsg}</p>
          </div>
        )}
      </div>
    </div>
  );
}
