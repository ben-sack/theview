"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

type Contact = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  ig_handle: string | null;
  referred_by: string | null;
  created_at: string;
};

type Rsvp = {
  party_size: number;
  checked_in: boolean;
  created_at: string;
  events: {
    id: string;
    title: string;
    date: string;
    location: string | null;
  };
};

export default function MemberPortalPage() {
  const router = useRouter();
  const [contact, setContact] = useState<Contact | null>(null);
  const [rsvps, setRsvps] = useState<Rsvp[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/members/me")
      .then((r) => {
        if (r.status === 401) { router.push("/members"); return null; }
        return r.json();
      })
      .then((d) => {
        if (!d) return;
        setContact(d.contact);
        setRsvps(d.rsvps ?? []);
        setLoading(false);
      });
  }, [router]);

  async function logout() {
    await fetch("/api/members/auth", { method: "DELETE" });
    router.push("/members");
  }

  function copyReferral() {
    if (!contact) return;
    const link = `${window.location.origin}/?ref=${contact.id}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-oxblood flex items-center justify-center">
        <div className="w-2 h-2 rounded-full bg-rust/40 animate-pulse" />
      </div>
    );
  }

  if (!contact) return null;

  const firstName = contact.name.split(" ")[0];
  const now = new Date();
  const upcoming = rsvps.filter((r) => new Date(r.events.date) >= now);
  const past = rsvps.filter((r) => new Date(r.events.date) < now);
  const memberSince = new Date(contact.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="relative min-h-screen bg-oxblood overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 55% at 18% 72%, rgba(140,60,24,0.28) 0%, transparent 70%), " +
            "radial-gradient(ellipse 40% 40% at 78% 25%, rgba(90,28,14,0.18) 0%, transparent 65%)",
        }}
      />
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-espresso/50 via-transparent to-espresso/70" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5 border-b border-tan/10">
        <Image src="/logo.png" alt="" aria-hidden width={80} height={60} className="w-8 h-auto opacity-60" />
        <button
          onClick={logout}
          className="font-body text-xs tracking-widest uppercase text-tan/40 hover:text-tan/70 transition-colors"
        >
          Sign out
        </button>
      </header>

      <main className="relative z-10 px-6 py-10 max-w-lg mx-auto space-y-10">
        {/* Welcome */}
        <div className="space-y-1">
          <p className="font-body text-[10px] tracking-[0.36em] uppercase text-tan/40">Member since {memberSince}</p>
          <h1 className="font-display text-4xl text-ivory font-light">Hey, {firstName}.</h1>
        </div>

        {/* Upcoming RSVPs */}
        <div className="space-y-4">
          <p className="font-body text-xs tracking-widest uppercase text-tan/50">Upcoming</p>
          {upcoming.length === 0 ? (
            <p className="font-display italic text-cream/30 text-lg">No upcoming events.</p>
          ) : (
            <div className="space-y-3">
              {upcoming.map((r, i) => (
                <EventCard key={i} rsvp={r} />
              ))}
            </div>
          )}
        </div>

        {/* Referral */}
        <div className="border border-tan/15 rounded-lg px-5 py-5 space-y-3">
          <p className="font-body text-xs tracking-widest uppercase text-tan/50">Refer a Friend</p>
          <p className="font-body text-sm text-cream/50 leading-relaxed">
            Know someone who belongs here? Share your link and we'll take note of your referral.
          </p>
          <button
            onClick={copyReferral}
            className="w-full border border-tan/25 text-tan/60 hover:text-cream/70 hover:border-tan/40 font-body text-xs tracking-widest uppercase py-3 rounded transition-colors duration-200"
          >
            {copied ? "Copied!" : "Copy Referral Link"}
          </button>
        </div>

        {/* Past events */}
        {past.length > 0 && (
          <div className="space-y-4">
            <p className="font-body text-xs tracking-widest uppercase text-tan/50">Past Events</p>
            <div className="space-y-3">
              {past.map((r, i) => (
                <EventCard key={i} rsvp={r} isPast />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function EventCard({ rsvp, isPast }: { rsvp: Rsvp; isPast?: boolean }) {
  const date = new Date(rsvp.events.date).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", timeZone: "America/Los_Angeles",
  });

  return (
    <div className={`border rounded-lg px-5 py-4 space-y-1 ${isPast ? "border-tan/10 opacity-60" : "border-tan/20"}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="font-display text-xl text-ivory font-light">{rsvp.events.title}</p>
        {isPast && rsvp.checked_in && (
          <span className="font-body text-[10px] tracking-widest uppercase text-tan/50 shrink-0 mt-1">Attended</span>
        )}
      </div>
      <p className="font-body text-sm text-cream/40">{date}</p>
      {rsvp.events.location && (
        <p className="font-body text-xs text-tan/40">{rsvp.events.location}</p>
      )}
      {rsvp.party_size > 1 && (
        <p className="font-body text-xs text-tan/40">Party of {rsvp.party_size}</p>
      )}
    </div>
  );
}
