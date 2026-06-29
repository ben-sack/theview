"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type Event = {
  id: string;
  title: string;
  date: string;
  location: string | null;
  capacity: number;
};

export default function DoorEventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/door/events")
      .then((r) => {
        if (r.status === 401) { router.push("/door"); return null; }
        return r.json();
      })
      .then((d) => {
        if (!d) return;
        setEvents(d);
        setLoading(false);
      });
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-espresso flex items-center justify-center">
        <div className="w-2 h-2 rounded-full bg-rust animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-espresso text-ivory">
      <header className="px-6 py-5 border-b border-tan/20 flex items-center justify-between">
        <h1 className="font-display text-2xl font-light">The View</h1>
        <p className="font-body text-xs text-tan tracking-widest uppercase">Door</p>
      </header>

      <main className="px-6 py-8 space-y-4 max-w-lg mx-auto">
        <p className="font-body text-xs text-tan tracking-widest uppercase mb-6">Select Event</p>
        {events.length === 0 ? (
          <p className="font-body text-base text-tan italic text-center py-12">No upcoming events.</p>
        ) : (
          events.map((ev) => {
            const date = new Date(ev.date).toLocaleDateString("en-US", {
              weekday: "long", month: "long", day: "numeric",
            });
            return (
              <button
                key={ev.id}
                onClick={() => router.push(`/door/${ev.id}`)}
                className="w-full text-left bg-tan/10 hover:bg-tan/20 border border-tan/20 rounded-lg px-5 py-4 transition-colors duration-150 space-y-1"
              >
                <p className="font-display text-xl font-light text-ivory">{ev.title}</p>
                <p className="font-body text-sm text-tan">{date}</p>
                {ev.location && <p className="font-body text-sm text-tan/60">{ev.location}</p>}
              </button>
            );
          })
        )}
      </main>
    </div>
  );
}
