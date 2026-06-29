"use client";
import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";

type Contact = { name: string; ig_handle: string | null };

type Rsvp = {
  id: string;
  party_size: number;
  checked_in: boolean;
  checked_in_at: string | null;
  contacts: Contact | Contact[];
};

type Event = {
  id: string;
  title: string;
  date: string;
  location: string | null;
  capacity: number;
};

export default function DoorCheckinPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [rsvps, setRsvps] = useState<Rsvp[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/door/${eventId}`)
      .then((r) => {
        if (r.status === 401) { router.push("/door"); return null; }
        return r.json();
      })
      .then((d) => {
        if (!d) return;
        setEvent(d.event);
        setRsvps(d.rsvps ?? []);
        setLoading(false);
      });
  }, [eventId, router]);

  function getContact(rsvp: Rsvp): Contact {
    return Array.isArray(rsvp.contacts) ? rsvp.contacts[0] : rsvp.contacts;
  }

  async function toggleCheckin(rsvp: Rsvp) {
    if (toggling) return;
    setToggling(rsvp.id);
    const newVal = !rsvp.checked_in;
    setRsvps((prev) =>
      prev.map((r) =>
        r.id === rsvp.id
          ? { ...r, checked_in: newVal, checked_in_at: newVal ? new Date().toISOString() : null }
          : r
      )
    );
    await fetch("/api/door/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rsvp_id: rsvp.id, checked_in: newVal }),
    });
    setToggling(null);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rsvps;
    return rsvps.filter((r) => {
      const c = getContact(r);
      return (
        c.name.toLowerCase().includes(q) ||
        (c.ig_handle ?? "").toLowerCase().includes(q)
      );
    });
  }, [rsvps, search]);

  const checkedInCount = rsvps.filter((r) => r.checked_in).reduce((sum, r) => sum + r.party_size, 0);
  const totalRsvpd = rsvps.reduce((sum, r) => sum + r.party_size, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-espresso flex items-center justify-center">
        <div className="w-2 h-2 rounded-full bg-rust animate-pulse" />
      </div>
    );
  }

  if (!event) return null;

  const eventDate = new Date(event.date).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  return (
    <div className="min-h-screen bg-espresso text-ivory flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 border-b border-tan/20 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => router.push("/door/events")}
            className="font-body text-xs text-tan tracking-widest uppercase hover:text-ivory transition-colors"
          >
            ← Events
          </button>
          <button
            onClick={async () => {
              await fetch("/api/door/auth", { method: "DELETE" });
              router.push("/door");
            }}
            className="font-body text-xs text-tan/50 hover:text-tan transition-colors"
          >
            Sign out
          </button>
        </div>
        <h1 className="font-display text-2xl font-light">{event.title}</h1>
        <p className="font-body text-sm text-tan">{eventDate}{event.location ? ` · ${event.location}` : ""}</p>
      </header>

      {/* Tally bar */}
      <div className="px-6 py-4 bg-tan/10 border-b border-tan/20 shrink-0">
        <div className="flex items-end gap-3">
          <p className="font-display text-5xl font-light text-ivory leading-none">{checkedInCount}</p>
          <p className="font-body text-sm text-tan pb-1">of {totalRsvpd} checked in</p>
        </div>
        <div className="mt-3 h-1 bg-tan/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-rust rounded-full transition-all duration-500"
            style={{ width: totalRsvpd > 0 ? `${(checkedInCount / totalRsvpd) * 100}%` : "0%" }}
          />
        </div>
      </div>

      {/* Search */}
      <div className="px-6 py-3 border-b border-tan/20 shrink-0">
        <input
          type="text"
          placeholder="Search by name or @handle…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-tan/10 border border-tan/20 rounded px-4 py-3 font-body text-base text-ivory placeholder-tan/40 focus:outline-none focus:border-rust"
        />
      </div>

      {/* Guest list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="font-body text-sm text-tan italic text-center py-12">No results.</p>
        ) : (
          <div className="divide-y divide-tan/10">
            {filtered.map((rsvp) => {
              const contact = getContact(rsvp);
              const checkedIn = rsvp.checked_in;
              return (
                <button
                  key={rsvp.id}
                  onClick={() => toggleCheckin(rsvp)}
                  disabled={toggling === rsvp.id}
                  className={`w-full flex items-center gap-4 px-6 py-4 text-left transition-colors duration-150 ${
                    checkedIn ? "bg-green-900/30" : "hover:bg-tan/10"
                  }`}
                >
                  {/* Checkmark */}
                  <div
                    className={`shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-150 ${
                      checkedIn
                        ? "bg-green-500 border-green-500"
                        : "border-tan/40"
                    }`}
                  >
                    {checkedIn && (
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className={`font-body text-base font-medium truncate ${checkedIn ? "text-green-300" : "text-ivory"}`}>
                      {contact.name}
                    </p>
                    {contact.ig_handle && (
                      <p className={`font-body text-sm truncate ${checkedIn ? "text-green-500/70" : "text-tan"}`}>
                        @{contact.ig_handle.replace(/^@/, "")}
                      </p>
                    )}
                    {checkedIn && rsvp.checked_in_at && (
                      <p className="font-body text-xs text-green-600 mt-0.5">
                        In at {new Date(rsvp.checked_in_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                      </p>
                    )}
                  </div>

                  {/* Guests */}
                  {rsvp.party_size > 1 && (
                    <div className="shrink-0 text-right">
                      <p className={`font-body text-sm font-medium ${checkedIn ? "text-green-400" : "text-tan"}`}>
                        +{rsvp.party_size - 1}
                      </p>
                      <p className="font-body text-xs text-tan/50">
                        {rsvp.party_size - 1 === 1 ? "guest" : "guests"}
                      </p>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
