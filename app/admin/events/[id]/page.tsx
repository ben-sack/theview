"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

type Event = {
  id: string;
  title: string;
  date: string;
  capacity: number;
  location: string | null;
  partners: string | null;
  allow_guests: boolean;
};

type Rsvp = {
  id: string;
  party_size: number;
  checked_in: boolean;
  created_at: string;
  contacts: {
    name: string;
    email: string;
    phone: string | null;
    ig_handle: string | null;
  };
};

type WaitlistEntry = {
  id: string;
  party_size: number;
  created_at: string;
  contacts: {
    name: string;
    email: string;
    phone: string | null;
    ig_handle: string | null;
  };
};

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [rsvps, setRsvps] = useState<Rsvp[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [showWaitlist, setShowWaitlist] = useState(false);
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [blasting, setBlasting] = useState(false);
  const [blastResult, setBlastResult] = useState<{ sent: number; failures: string[] } | null>(null);
  const [blastTemplate, setBlastTemplate] = useState("");
  const [eventMessage, setEventMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageResult, setMessageResult] = useState<{ sent: number; failures: string[] } | null>(null);

  useEffect(() => {
    fetch(`/api/admin/events/${id}`)
      .then((r) => {
        if (r.status === 401) { router.push("/admin"); return null; }
        return r.json();
      })
      .then((d) => {
        if (!d) return;
        setEvent(d.event);
        setRsvps(d.rsvps ?? []);
        setWaitlist(d.waitlist ?? []);
        const ev = d.event;
        const eventDate = new Date(ev.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
        setBlastTemplate(`Hey {name}, the next one is happening. ${ev.title} - ${eventDate}${ev.location ? ` - ${ev.location}` : ""}. Secure your spot before it fills up: {rsvp_link}`);
        setEventMessage(`Hey, just a reminder that doors open at 10pm this Saturday. Entry is first come first serve based on capacity — make sure you arrive early to secure your spot.`);
        setLoading(false);
      });
  }, [id, router]);

  async function sendEventMessage() {
    if (!eventMessage.trim()) return;
    setSendingMessage(true);
    setMessageResult(null);
    const res = await fetch(`/api/admin/events/${id}/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: eventMessage }),
    });
    const data = await res.json();
    setMessageResult(data);
    setSendingMessage(false);
    if (data.sent > 0) setEventMessage("");
  }

  async function sendBlast() {
    setBlasting(true);
    setBlastResult(null);
    const res = await fetch(`/api/admin/events/${id}/blast`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message_template: blastTemplate }),
    });
    const data = await res.json();
    setBlastResult(data);
    setBlasting(false);
  }

  async function promoteFromWaitlist(waitlistId: string) {
    setPromotingId(waitlistId);
    const res = await fetch(`/api/admin/events/${id}/promote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ waitlist_id: waitlistId }),
    });
    if (res.ok) {
      const promoted = waitlist.find((w) => w.id === waitlistId);
      if (promoted) {
        setWaitlist((prev) => prev.filter((w) => w.id !== waitlistId));
        setRsvps((prev) => [...prev, { ...promoted, checked_in: false } as Rsvp]);
      }
    }
    setPromotingId(null);
  }

  const totalAttending = rsvps.reduce((sum, r) => sum + r.party_size, 0);
  const totalCheckedIn = rsvps.filter((r) => r.checked_in).reduce((sum, r) => sum + r.party_size, 0);
  const capacityPct = event ? totalAttending / event.capacity : 0;
  const capacityColor = capacityPct >= 1 ? "text-rust" : capacityPct >= 0.8 ? "text-amber" : "text-espresso";
  const eventDate = event
    ? new Date(event.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
    : "";

  if (loading) {
    return (
      <div className="min-h-screen bg-ivory flex items-center justify-center">
        <div className="w-2 h-2 rounded-full bg-rust animate-pulse" />
      </div>
    );
  }

  if (!event) return null;

  return (
    <div className="min-h-screen bg-ivory text-espresso">
      <header className="bg-espresso px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/admin")}
            className="font-body text-xs tracking-widest uppercase text-tan hover:text-ivory transition-colors"
          >
            ← Admin
          </button>
          <span className="text-tan text-sm">/</span>
          <span className="font-display text-lg text-ivory font-light">{event.title}</span>
        </div>
      </header>

      <main className="px-8 py-8">
        <div className="flex gap-8 items-start">
          {/* Left column — controls */}
          <div className="flex-1 min-w-0 space-y-8">
            {/* Event info */}
            <div className="bg-white rounded-lg border border-tan/20 shadow-sm p-6 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h1 className="font-display text-3xl text-espresso font-light">{event.title}</h1>
                  <p className="font-body text-sm text-tan">{eventDate}</p>
                  {event.location && <p className="font-body text-sm text-tan">{event.location}</p>}
                  {event.partners && <p className="font-body text-sm text-tan">With {event.partners}</p>}
                </div>
                <div className="text-right shrink-0 space-y-2">
                  <div>
                    <p className={`font-display text-4xl font-light ${capacityColor}`}>{totalAttending}<span className="text-tan/50 text-2xl">/{event.capacity}</span></p>
                    <p className="font-body text-xs text-tan tracking-widest uppercase">
                      {capacityPct >= 1 ? "Full" : capacityPct >= 0.8 ? "Nearly Full" : "Attending"}
                    </p>
                  </div>
                  {totalCheckedIn > 0 && (
                    <div>
                      <p className="font-display text-2xl text-green-600 font-light">{totalCheckedIn}</p>
                      <p className="font-body text-xs text-tan tracking-widest uppercase">Checked In ({totalAttending > 0 ? Math.round((totalCheckedIn / totalAttending) * 100) : 0}%)</p>
                    </div>
                  )}
                </div>
              </div>
              {event.allow_guests && (
                <p className="font-body text-xs text-tan/50 tracking-widest uppercase">Guests allowed</p>
              )}
            </div>

            {/* Send RSVP blast */}
            <div className="bg-white rounded-lg border border-tan/20 shadow-sm p-6 space-y-4">
              <div>
                <p className="font-body text-sm font-medium text-espresso">RSVP Invite Blast</p>
                <p className="font-body text-xs text-tan mt-1">
                  Sends a personalized invite to every approved member. Edit the message below before sending. Use{" "}
                  <span className="font-mono bg-tan/10 px-1 rounded text-espresso">{"{name}"}</span> for their first name and{" "}
                  <span className="font-mono bg-tan/10 px-1 rounded text-espresso">{"{rsvp_link}"}</span> for their unique RSVP link.
                </p>
              </div>
              <div className="space-y-1">
                <textarea
                  value={blastTemplate}
                  onChange={(e) => setBlastTemplate(e.target.value)}
                  rows={4}
                  className="w-full bg-ivory border border-tan/30 rounded px-4 py-3 font-body text-sm text-black placeholder-tan/40 focus:outline-none focus:border-rust resize-none leading-relaxed"
                />
                <p className="font-body text-xs text-tan">{blastTemplate.length} characters</p>
              </div>
              {blastResult && (
                <div className={`rounded-lg px-4 py-3 font-body text-sm ${blastResult.failures.length === 0 ? "bg-green-50 border border-green-200 text-green-800" : "bg-amber-50 border border-amber-200 text-amber-800"}`}>
                  <p>Sent to {blastResult.sent} members.</p>
                  {blastResult.failures.length > 0 && <p className="mt-1">Failed: {blastResult.failures.join(", ")}</p>}
                </div>
              )}
              <button
                onClick={sendBlast}
                disabled={blasting || !blastTemplate.trim()}
                className="font-body text-sm font-medium px-6 py-3 bg-espresso text-ivory rounded hover:bg-rust transition-colors duration-200 disabled:opacity-50"
              >
                {blasting ? "Sending…" : "Send RSVP Blast to All Members"}
              </button>
            </div>

            {/* Event-specific text blast */}
            <div className="bg-white rounded-lg border border-tan/20 shadow-sm p-6 space-y-4">
              <div>
                <p className="font-body text-sm font-medium text-espresso">Event Text Blast</p>
                <p className="font-body text-xs text-tan mt-1">
                  Send a message only to the {rsvps.length} {rsvps.length === 1 ? "person" : "people"} who have RSVP'd to this event.
                </p>
              </div>
              <div className="space-y-1">
                <textarea
                  value={eventMessage}
                  onChange={(e) => setEventMessage(e.target.value)}
                  rows={5}
                  placeholder=""
                  className="w-full bg-ivory border border-tan/30 rounded px-4 py-3 font-body text-sm text-black placeholder-tan/40 focus:outline-none focus:border-rust resize-none leading-relaxed"
                />
                <p className="font-body text-xs text-tan">{eventMessage.length} characters</p>
              </div>
              {messageResult && (
                <div className={`rounded-lg px-4 py-3 font-body text-sm ${messageResult.failures.length === 0 ? "bg-green-50 border border-green-200 text-green-800" : "bg-amber-50 border border-amber-200 text-amber-800"}`}>
                  <p>Sent to {messageResult.sent} {messageResult.sent === 1 ? "person" : "people"}.</p>
                  {messageResult.failures.length > 0 && <p className="mt-1">Failed: {messageResult.failures.join(", ")}</p>}
                </div>
              )}
              <button
                onClick={sendEventMessage}
                disabled={sendingMessage || !eventMessage.trim()}
                className="font-body text-sm font-medium px-6 py-2.5 bg-espresso text-ivory rounded hover:bg-rust transition-colors duration-200 disabled:opacity-50"
              >
                {sendingMessage ? "Sending…" : `Send to ${rsvps.length} ${rsvps.length === 1 ? "RSVP" : "RSVPs"}`}
              </button>
            </div>
          </div>

          {/* Right column — RSVP list + waitlist */}
          <div className="w-80 shrink-0 sticky top-8 space-y-4">
            {/* Guest list */}
            <div className="bg-white rounded-lg border border-tan/20 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-tan/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowWaitlist(false)}
                    className={`font-body text-sm font-medium transition-colors ${!showWaitlist ? "text-espresso" : "text-tan hover:text-espresso"}`}
                  >
                    Guest List
                  </button>
                  {waitlist.length > 0 && (
                    <>
                      <span className="text-tan/30">|</span>
                      <button
                        onClick={() => setShowWaitlist(true)}
                        className={`font-body text-sm font-medium transition-colors ${showWaitlist ? "text-espresso" : "text-tan hover:text-espresso"}`}
                      >
                        Waitlist
                        <span className={`ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-body ${showWaitlist ? "bg-rust text-ivory" : "bg-tan/20 text-espresso"}`}>
                          {waitlist.length}
                        </span>
                      </button>
                    </>
                  )}
                </div>
                <span className="font-body text-xs text-tan">
                  {showWaitlist ? `${waitlist.length} waiting` : `${totalAttending} / ${event.capacity}`}
                </span>
              </div>

              {!showWaitlist ? (
                rsvps.length === 0 ? (
                  <p className="font-body text-sm text-tan italic px-5 py-6 text-center">No RSVPs yet.</p>
                ) : (
                  <div className="overflow-y-auto max-h-[calc(100vh-12rem)] divide-y divide-tan/10">
                    {rsvps.map((r) => (
                      <div key={r.id} className="px-5 py-3 hover:bg-ivory/60 transition-colors">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-body text-sm font-medium text-espresso truncate">{r.contacts.name}</p>
                          {r.party_size > 1 && (
                            <span className="font-body text-xs text-tan shrink-0">+{r.party_size - 1}</span>
                          )}
                        </div>
                        <p className="font-body text-xs text-tan truncate">{r.contacts.ig_handle ?? r.contacts.email}</p>
                        <p className="font-body text-xs text-tan/50 mt-0.5">
                          {new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </p>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                waitlist.length === 0 ? (
                  <p className="font-body text-sm text-tan italic px-5 py-6 text-center">Waitlist is empty.</p>
                ) : (
                  <div className="overflow-y-auto max-h-[calc(100vh-12rem)] divide-y divide-tan/10">
                    {waitlist.map((w, i) => (
                      <div key={w.id} className="px-5 py-3 hover:bg-ivory/60 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-body text-xs text-tan/50 shrink-0">#{i + 1}</span>
                              <p className="font-body text-sm font-medium text-espresso truncate">{w.contacts.name}</p>
                              {w.party_size > 1 && (
                                <span className="font-body text-xs text-tan shrink-0">+{w.party_size - 1}</span>
                              )}
                            </div>
                            <p className="font-body text-xs text-tan truncate">{w.contacts.ig_handle ?? w.contacts.email}</p>
                            <p className="font-body text-xs text-tan/50 mt-0.5">
                              Joined {new Date(w.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </p>
                          </div>
                          <button
                            onClick={() => promoteFromWaitlist(w.id)}
                            disabled={promotingId === w.id}
                            className="shrink-0 font-body text-xs px-2.5 py-1 bg-espresso text-ivory rounded hover:bg-rust transition-colors disabled:opacity-50 mt-0.5"
                          >
                            {promotingId === w.id ? "…" : "Admit"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
